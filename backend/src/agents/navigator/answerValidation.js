import { z } from 'zod';
import { quotationSpan } from './quotationSpan.js';
import { canonicalCategories } from './retrievalCoverage.js';

const support = z.strictObject({ evidenceId: z.string().regex(/^ev_[a-f\d]{40}$/), quote: z.string().min(1).max(1400).refine(value => Boolean(value.trim())), relation: z.enum(['supports', 'contradicts']) });
const assessmentSchema = z.strictObject({
  schemeId: z.string().regex(/^[a-f\d]{24}$/), requirementId: z.string().regex(/^(?:c\d|c1[01]|q[0-5]|t0)$/),
  status: z.enum(['supported', 'contradicted', 'unknown']), explanation: z.string().trim().min(1).max(600), evidence: z.array(support).max(3),
  dependsOn: z.array(z.string().regex(/^(?:c\d|c1[01]|q[0-5]|t0)$/)).max(19).default([]),
});
export const evidenceAnswerSchema = z.strictObject({ assessments: z.array(assessmentSchema).max(30) });
const envelope = z.strictObject({ assessments: z.array(z.unknown()).max(30) });
const keyOf = row => `${row.schemeId}:${row.requirementId}`;

/** Diagnostics contain enums/indices/public IDs only, never model prose, source
 * text, validation issue values, user inputs, secrets or stack traces. */
export function validateEvidenceAnswer(plan, packet, response) {
  const diagnostics = [], accepted = new Map(), rejected = new Map();
  const candidates = new Map(packet.context.candidates.map(c => [c.schemeId, c]));
  const entries = new Map(plan.entries.map(e => [e.schemeId, e]));
  const diagnostic = (code, index, row, fields = []) => {
    const known = candidates.get(row?.schemeId)?.requirements.some(c => c.id === row?.requirementId);
    diagnostics.push({ code, ...(index != null ? { index } : {}), ...(known ? { schemeId: row.schemeId, requirementId: row.requirementId } : {}), ...(fields.length ? { fields } : {}) });
    if (known) rejected.set(keyOf(row), code);
  };
  let raw;
  try {
    const calls = response?.message?.tool_calls;
    if (calls?.length) {
      if (calls.length !== 1 || calls[0].function?.name !== 'answerFromEvidence') throw new Error();
      raw = JSON.parse(calls[0].function.arguments);
    } else raw = JSON.parse(response?.message?.content);
  } catch { diagnostic('MALFORMED_ANSWER'); return { accepted, rejected, diagnostics, rejectedCount: 0 }; }
  const top = envelope.safeParse(raw);
  if (!top.success) { diagnostic('INVALID_ANSWER_SCHEMA'); return { accepted, rejected, diagnostics, rejectedCount: 0 }; }
  if (!top.data.assessments.length) diagnostic('EMPTY_ANSWER');

  const counts = new Map();
  for (const row of top.data.assessments) if (row && typeof row.schemeId === 'string' && typeof row.requirementId === 'string') counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1);
  let rejectedCount = 0;
  top.data.assessments.forEach((value, index) => {
    const fail = (code, fields) => { rejectedCount++; diagnostic(code, index, value, fields); };
    const parsed = assessmentSchema.safeParse(value);
    if (!parsed.success) {
      const allowed = new Set(['schemeId', 'requirementId', 'status', 'explanation', 'evidence', 'evidenceId', 'quote', 'relation', 'dependsOn']);
      return fail('INVALID_ASSESSMENT_SCHEMA', [...new Set(parsed.error.issues.flatMap(issue => issue.path.filter(part => allowed.has(part))))].slice(0, 9));
    }
    const row = parsed.data, candidate = candidates.get(row.schemeId), entry = entries.get(row.schemeId);
    if (!candidate || !entry) return fail('UNKNOWN_SCHEME');
    if (!candidate.requirements.some(c => c.id === row.requirementId)) return fail('UNKNOWN_REQUIREMENT');
    if (counts.get(keyOf(row)) !== 1) return fail('CONTRADICTORY_ASSESSMENTS');
    const evidence = [];
    for (const proof of row.evidence) {
      const passage = candidate.passages.find(p => p.id === proof.evidenceId);
      const citation = entry.citations.find(p => p.id === proof.evidenceId && p.schemeId === row.schemeId);
      if (!passage || !citation) return fail('EVIDENCE_MISSING');
      if (passage.quote !== citation.evidence.quote) return fail('EVIDENCE_MISMATCH');
      const located = quotationSpan(passage.quote, proof.quote, citation.evidence.charStart, citation.sourceEdges);
      if (!located.ok) return fail(located.code);
      evidence.push({ ...proof, quote: located.quote ?? proof.quote, span: located.span });
    }
    if (row.status !== 'unknown' && !evidence.some(p => p.relation === (row.status === 'supported' ? 'supports' : 'contradicts'))) return fail('UNSUPPORTED_CONCLUSION');
    const requirement = packet.context.requirements.find(c => c.id === row.requirementId);
    // Promotion alone does not establish the years for which funding is allowed.
    // This is a necessary scope check, not proof that a duration permits this year.
    if (requirement?.field === 'studyYear' && row.status === 'supported'
      && !evidence.some(proof => /\b(?:years?|duration)\b/iu.test(proof.quote))) return fail('YEAR_SCOPE_MISSING');
    const recorded = candidate.requirements.find(c => c.id === row.requirementId);
    // Necessary evidence-coverage check, NOT semantic proof: a named category
    // cannot be positively generalized from text naming only other categories.
    // Missing audience language stays unknown, never an ineligibility decision.
    const audience = Array.isArray(requirement?.value) ? requirement.value : [requirement?.value];
    if (row.status === 'supported' && recorded.status === 'unknown' && requirement?.field === 'category' && requirement.operator === 'include'
      && audience.every(value => canonicalCategories.includes(value))) {
      const words = new Set([...new Intl.Segmenter('en', { granularity: 'word' }).segment(evidence.map(p => p.quote).join('\n').normalize('NFKC'))].filter(w => w.isWordLike).map(w => w.segment.toLowerCase()));
      if (canonicalCategories.some(value => words.has(value.toLowerCase())) && !audience.some(value => words.has(value.toLowerCase()))) return fail('UNSUPPORTED_CONCLUSION');
    }
    const conflict = new Set(evidence.map(p => p.relation)).size > 1 || (recorded.status !== 'unknown' &&
      ((row.status !== 'unknown' && row.status !== (recorded.status === 'match' ? 'supported' : 'contradicted')) || evidence.some(p => p.relation === (recorded.status === 'match' ? 'contradicts' : 'supports'))));
    if (conflict) diagnostics.push({ code: 'CONFLICTING_EVIDENCE', index, schemeId: row.schemeId, requirementId: row.requirementId });
    accepted.set(keyOf(row), { ...row, evidence, index, conflict,
      status: conflict || entry.stale || entry.sourceChecks?.some(c => c.status === 'changed') ? 'unknown' : row.status });
  });

  // Equivalent constraints must not receive incompatible conclusions even when
  // the model references two different IDs. Roles stay distinct.
  const facts = new Map();
  for (const [key, row] of accepted) {
    const req = packet.context.requirements.find(c => c.id === row.requirementId);
    if (!req?.field || req.field === 'question') continue;
    const identity = JSON.stringify([row.schemeId, req.field, req.role ?? 'funding', req.operator, Array.isArray(req.value) ? [...req.value].sort() : req.value]);
    if (!facts.has(identity)) facts.set(identity, []);
    facts.get(identity).push(key);
  }
  const reject = (key, code) => { const row = accepted.get(key); if (!row) return; accepted.delete(key); rejectedCount++; diagnostic(code, row.index, row); };
  for (const keys of facts.values()) if (new Set(keys.map(k => accepted.get(k).status).filter(s => s !== 'unknown')).size > 1) for (const key of keys) reject(key, 'CONTRADICTORY_ASSESSMENTS');

  // Resolve a bounded dependency DAG before exposing any explanations. A missing,
  // rejected, conflicting, cyclic or unknown premise invalidates its dependents.
  const resolving = new Set(), resolved = new Map();
  const recordedSupport = key => { const split = key.indexOf(':'); return !rejected.has(key) && candidates.get(key.slice(0, split))?.requirements.some(c => c.id === key.slice(split + 1) && c.status === 'match'); };
  const usable = key => {
    if (resolved.has(key)) return resolved.get(key);
    const row = accepted.get(key);
    if (!row) return Boolean(recordedSupport(key));
    if (resolving.has(key)) { reject(key, 'DEPENDENCY_INVALID'); return false; }
    resolving.add(key);
    const unique = new Set(row.dependsOn);
    if (unique.size !== row.dependsOn.length || unique.has(row.requirementId)) {
      resolving.delete(key); reject(key, 'DEPENDENCY_INVALID'); resolved.set(key, false); return false;
    }
    let valid = true;
    for (const id of unique) {
      const dependency = `${row.schemeId}:${id}`;
      valid = usable(dependency) && (accepted.get(dependency)?.status === 'supported' || (!accepted.has(dependency) && recordedSupport(dependency))) && valid;
    }
    resolving.delete(key);
    if (!valid) reject(key, 'DEPENDENCY_UNRESOLVED');
    resolved.set(key, valid); return valid;
  };
  for (const key of [...accepted.keys()]) usable(key);
  return { accepted, rejected, diagnostics: diagnostics.slice(0, 60), rejectedCount };
}
