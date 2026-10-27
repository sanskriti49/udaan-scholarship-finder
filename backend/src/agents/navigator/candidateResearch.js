import { answerablePassage, findPassages, passageTargets, queryTerms, normalizeRetrievalText, schemeEvidenceReferences } from './passages.js';
import { assessRetrieval, evidenceQueries, evidenceTargets } from './retrievalCoverage.js';
import { normalizeState } from '../../engine/stateVocabulary.js';

// Local evidence admission is separate from inference/network allowances. These
// ceilings bound a search, including when the catalogue becomes much larger.
export const RESEARCH_POOL = 48;
export const SOURCE_PREFLIGHT = { snapshots: 32, characters: 1200000 };
const values = value => Array.isArray(value) ? value : [value];

function snapshotOrder(scheme) {
  return [...new Set([...schemeEvidenceReferences(scheme)].sort((a, b) =>
    Number(b.url === scheme.officialLinks?.guidelinesUrl) - Number(a.url === scheme.officialLinks?.guidelinesUrl)
    || Number(/^(rules|eligibility|description|familyIncome)/.test(b.field ?? '')) - Number(/^(rules|eligibility|description|familyIncome)/.test(a.field ?? '')))
    .map(ref => String(ref.snapshotId)).filter(id => /^[a-f\d]{24}$/i.test(id)))];
}

export function researchOpportunity(scheme, plan, passages, coverage = assessRetrieval(scheme, plan)) {
  const policy = passages.filter(answerablePassage);
  const words = new Set(normalizeRetrievalText(policy.map(p => p.evidence.quote).join(' ')).match(/[\p{L}\p{N}]+/gu) ?? []);
  const unresolved = coverage.conditions.filter(c => c.status === 'unknown');
  const targets = evidenceTargets(scheme, plan, coverage.conditions);
  const located = new Set(policy.flatMap(passage => passageTargets(passage, targets)));
  const addressable = unresolved.filter(c => {
    return c.evidenceIds.some(id => policy.some(p => p.id === id))
      || located.has(c.id);
  });
  const locationRequirements = plan.requirements.filter(r => r.field === 'state' && r.operator === 'include');
  // An explicit scheme/study destination guides source investigation before
  // background location. All locations still reach evidence checking; this is
  // an ordering preference, never an inferred domicile or an exclusion.
  const destination = locationRequirements.filter(r => !r.role || ['funding', 'funding_location'].includes(r.role));
  const domicile = locationRequirements.filter(r => r.role === 'applicant_domicile');
  const locations = (destination.length ? destination : domicile.length ? domicile : locationRequirements).flatMap(r => values(r.value)).map(normalizeState);
  const region = normalizeState(scheme.state ?? '');
  // A schooling/location hint guides investigation order, never eligibility or
  // exclusion. National/default scope also cannot establish domicile.
  const contextAffinity = !locations.length || !region ? 1 : locations.includes(region) ? 2 : region === 'all india' ? 1 : 0;
  // Applicant attributes describe who is asking, not what study or expense needs
  // funding. A category word in a policy must not become subject relevance. Group
  // equivalent discovery/constraint terms so duplicated intent does not amplify
  // a candidate. Word overlap locates useful evidence; it establishes no rule.
  const objectives = plan.requirements.filter(r => (r.id === 't0' && r.field !== 'question') || (['educationLevel', 'stream', 'other'].includes(r.field)
    && r.operator === 'include' && (!r.role || r.role === 'funding')));
  const objectiveGroups = new Map();
  for (const requirement of objectives) {
    const terms = queryTerms(values(requirement.value).join(' '));
    if (!terms.length) continue;
    const key = [...terms].sort().join('\n');
    const existing = objectiveGroups.get(key) ?? { terms, ids: [] };
    existing.ids.push(requirement.id); objectiveGroups.set(key, existing);
  }
  const subjectMatches = [...objectiveGroups.values()].filter(group => group.terms.some(term => words.has(term))
    || coverage.conditions.some(c => group.ids.includes(c.id) && c.status === 'match')).length;
  return { policyPassages: policy.length, addressable: addressable.map(c => c.id), unresolved: unresolved.map(c => c.id),
    policyPreview: policy[0] ? { id: policy[0].id, quote: policy[0].evidence.quote, url: policy[0].evidence.url, documentDate: policy[0].documentDate } : null,
    recordedMatches: coverage.conditions.filter(c => c.status === 'match').length, contextAffinity,
    subjectMatches, subjectObjectives: objectiveGroups.size, topicMatches: subjectMatches,
    evidenceAvailable: policy.length > 0 };
}

/** Inspect only a bounded pool of public, scheme-bound sources. This locates
 * questions a document could answer; it never interprets its eligibility prose.
 */
export async function inspectCandidateEvidence(schemes, repository, plan, { signal } = {}) {
  const byScheme = schemes.slice(0, RESEARCH_POOL).map(snapshotOrder);
  const ids = new Set();
  // Round-robin admission prevents a single many-source record monopolizing IO.
  for (let depth = 0; depth < 12 && ids.size < SOURCE_PREFLIGHT.snapshots; depth++) {
    for (const queue of byScheme) {
      if (ids.size >= SOURCE_PREFLIGHT.snapshots) break;
      if (queue[depth]) ids.add(queue[depth]);
    }
  }
  const snapshots = [];
  let characters = 0;
  const admitted = [...ids];
  for (let start = 0; start < admitted.length; start += 12) {
    signal?.throwIfAborted();
    const batch = await repository.getSnapshots(admitted.slice(start, start + 12));
    for (const snapshot of batch) {
      const length = snapshot.text?.length ?? 0;
      if (characters + length > SOURCE_PREFLIGHT.characters) continue;
      characters += length; snapshots.push(snapshot);
    }
  }
  signal?.throwIfAborted();
  const byId = new Map(snapshots.map(snapshot => [String(snapshot._id ?? snapshot.id), snapshot]));
  return { candidates: new Map(schemes.map(scheme => {
    signal?.throwIfAborted();
    const sourceIds = snapshotOrder(scheme).slice(0, 12);
    const relevant = sourceIds.map(id => byId.get(id)).filter(Boolean);
    const targets = evidenceTargets(scheme, plan);
    const passages = findPassages(scheme, relevant, '', { includeContext: true, queries: evidenceQueries(scheme, plan, targets), targets });
    return [String(scheme._id ?? scheme.id), { ...researchOpportunity(scheme, plan, passages, assessRetrieval(scheme, plan, passages)),
      preflightComplete: relevant.length === sourceIds.length }];
  })), diagnostics: { candidates: schemes.length, snapshots: snapshots.length, characters,
    sourceLimitReached: ids.size >= SOURCE_PREFLIGHT.snapshots || snapshots.length < admitted.length } };
}
