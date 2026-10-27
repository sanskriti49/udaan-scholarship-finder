import { createHash } from 'node:crypto';
import { parseResearchIntent, INTENT_PROMPT, intentMessages } from './researchIntent.js';
import { applyEvidenceAnswer } from './evidenceAnswer.js';

const normalized = value => String(value).normalize('NFC').replace(/\s+/gu, ' ').trim().toLowerCase();
function signature(constraint) {
  const freeText = ['other', 'stream', 'scheme'].includes(constraint.field);
  const value = Array.isArray(constraint.value) ? constraint.value.map(normalized).sort() : normalized(constraint.value);
  return JSON.stringify([constraint.field, constraint.role, constraint.operator, freeText ? null : value]);
}
export const packetFingerprint = messages => createHash('sha256').update(JSON.stringify(messages)).digest('hex');

/** Reference statuses are independent synthetic policy expectations. Exact
 * quote validation is still performed by the real application validator.
 * Free-text semantic equivalence remains explicitly marked for human review. */
export function scoreComparisonIntent(prepared, response) {
  const intent = parseResearchIntent(response, intentMessages(prepared.item.question, prepared.item.conversation ?? []));
  const actual = intent.constraints.map(signature), expected = prepared.intent.constraints.map(signature);
  return { schemaValid: true, expectedConstraints: expected.length, matchedConstraints: expected.filter(key => actual.includes(key)).length,
    unexpectedConstraints: actual.filter(key => !expected.includes(key)).length, ambiguities: intent.ambiguities.length,
    freeTextNeedsReview: intent.constraints.some(c => ['other', 'stream', 'scheme'].includes(c.field)),
    expectedQuestions: prepared.intent.questions.length, extractedQuestions: intent.questions.length,
    extracted: intent.constraints.map(({ field, role, operator, value }) => ({ field, role, operator, value })) };
}

export function scoreComparisonAnswer(prepared, response) {
  const plan = applyEvidenceAnswer(prepared.plan, prepared.packet, response);
  const entry = plan.entries.find(entry => entry.schemeId === prepared.schemeId);
  const conditions = entry?.answer?.conditions ?? [];
  const requirements = prepared.session.retrieval.requirements;
  let proposed = [];
  try { const value = JSON.parse(response.message?.content ?? response.message?.tool_calls?.[0]?.function.arguments); if (Array.isArray(value.assessments)) proposed = value.assessments; } catch { /* Validator reports malformed output. */ }
  let correctConditions = 0, unsupportedClaims = 0, unsupportedProposals = 0, missingAssessments = 0;
  for (let index = 0; index < requirements.length; index++) {
    const condition = conditions.find(c => c.requirementId === requirements[index].id), expected = prepared.item.expected[index];
    const clause = prepared.item.clauses[prepared.item.proofs?.[index] ?? 0];
    const sourceProof = condition?.evidence?.some(proof => normalized(proof.quote).includes(normalized(clause)));
    const rows = proposed.filter(row => row?.schemeId === prepared.schemeId && row.requirementId === requirements[index].id);
    const modelStatus = rows.length === 1 ? rows[0].status : null;
    if (modelStatus === expected && condition?.status === expected && condition.basis !== 'unresolved' && (expected === 'unknown' || sourceProof || condition.basis === 'recorded_check')) correctConditions++;
    if (modelStatus && modelStatus !== 'unknown' && modelStatus !== expected) unsupportedProposals++;
    if (condition && condition.status !== 'unknown' && (condition.status !== expected || (!sourceProof && condition.basis === 'source_interpretation'))) unsupportedClaims++;
    if (!condition || condition.basis === 'unresolved') missingAssessments++;
  }
  return { answerStatus: plan.answer.status, expectedConditions: requirements.length, correctConditions, unsupportedClaims, unsupportedProposals,
    missingAssessments, acceptedAssessments: plan.answer.acceptedAssessments, rejectedAssessments: plan.answer.rejectedAssessments,
    unknownConditions: conditions.filter(c => c.status === 'unknown').length,
    excluded: entry?.qualification.status === 'excluded', explanationNeedsReview: true, diagnostics: plan.answer.diagnostics.map(d => d.code),
    findings: conditions.map(({ requirementId, status, basis, explanation, evidence }) => ({ requirementId, status, basis, explanation, evidence })) };
}

/** Calls only a supplied provider. No automatic transport, environment access,
 * database initialization, retries, storage or hidden evaluation inference. */
export async function comparePreparedCases({ cases, providers, reserveCall, maxCalls = 4, signal, onResult = () => {} }) {
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 12 || typeof reserveCall !== 'function' || !providers.length || providers.length > 2) throw new Error('Invalid bounded comparison configuration');
  const results = []; let calls = 0, stopped = null;
  outer: for (const prepared of cases) {
    const questionMessages = intentMessages(prepared.item.question, prepared.item.conversation ?? []);
    const stages = [{ mode: 'research_intent', messages: [{ role: 'system', content: INTENT_PROMPT }, ...questionMessages], score: scoreComparisonIntent }];
    if (prepared.packet.context.candidates.length) stages.push({ mode: 'evidence_answer', messages: prepared.packet.messages, score: scoreComparisonAnswer });
    // Interleave providers per stage; both receive the exact same canonical
    // packet. Answering uses reference intent to isolate it from extraction.
    for (const stage of stages) for (const provider of providers) {
      if (signal?.aborted) { stopped = 'CANCELLED'; break outer; }
      if (calls >= maxCalls) { stopped = 'COMPARISON_LIMIT'; break outer; }
      const started = performance.now();
      const result = { caseId: prepared.item.id, provider: provider.name, model: provider.model, stage: stage.mode,
        inputFingerprint: packetFingerprint(stage.messages), inputCharacters: JSON.stringify(stage.messages).length,
        charged: false, pricing: 'account billing not verified', estimatedCostUsd: null };
      try {
        const response = await provider.complete({ mode: stage.mode, messages: structuredClone(stage.messages), signal,
          reserveCall: async request => {
            if (calls >= maxCalls) throw Object.assign(new Error(), { code: 'COMPARISON_LIMIT' });
            await reserveCall(provider, request); calls++; result.charged = true;
          } });
        result.usage = response.usage ?? null;
        result.scores = stage.score(prepared, response);
      } catch (error) {
        result.error = /^[A-Z_]{1,60}$/.test(error.code ?? '') ? error.code : 'COMPARISON_FAILURE';
        const d = error.providerDiagnostics;
        if (d && ['schema_rejected', 'request_rejected', 'model_unavailable', 'service_unavailable', 'response_blocked', 'output_limit', 'incomplete_response', 'transport_unavailable', 'response_timeout', 'body_timeout'].includes(d.reason)) {
          result.providerDiagnostics = { reason: d.reason, ...(Number.isInteger(d.httpStatus) && d.httpStatus >= 100 && d.httpStatus <= 599 ? { httpStatus: d.httpStatus } : {}),
            ...(Number.isInteger(d.budgetMs) && d.budgetMs >= 1 && d.budgetMs <= 60000 ? { budgetMs: d.budgetMs } : {}),
            ...(Number.isInteger(d.elapsedMs) && d.elapsedMs >= 0 && d.elapsedMs <= 120000 ? { elapsedMs: d.elapsedMs } : {}),
            ...(['other', 'tool_use_failed', 'invalid_json_schema', 'invalid_request_error', 'json_validate_failed', 'model_not_found', 'INVALID_ARGUMENT', 'NOT_FOUND', 'FAILED_PRECONDITION',
              'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(d.providerCode) ? { providerCode: d.providerCode } : {}) };
        }
        if (Array.isArray(error.intentDiagnostics)) result.intentDiagnostics = error.intentDiagnostics.slice(0, 8).filter(d => ['INVALID_INTENT_SCHEMA', 'INTENT_SOURCE_MISMATCH', 'MALFORMED_INTENT'].includes(d.code))
          .map(d => ({ code: d.code, ...(['constraints', 'questions', 'ambiguities', 'objective', 'searchQuery', 'response'].includes(d.section) ? { section: d.section } : {}),
            ...(Number.isInteger(d.index) && d.index >= 0 && d.index < 12 ? { index: d.index } : {}) }));
        if (result.error.startsWith('PROVIDER_') || ['MODEL_PROTOCOL', 'QUOTA_EXHAUSTED', 'CANCELLED', 'LEASE_LOST', 'MODEL_LIMIT', 'RUN_FINISHED', 'PERSISTENCE_UNAVAILABLE', 'STORE_NOT_INITIALIZED', 'RUN_NOT_FOUND', 'RUN_CONFLICT'].includes(result.error)) stopped = result.error;
      }
      result.latencyMs = Math.round(performance.now() - started); results.push(result); await onResult(result);
      if (stopped) break outer;
    }
  }
  const summaries = providers.map(provider => {
    const rows = results.filter(row => row.provider === provider.name), answers = rows.filter(row => row.stage === 'evidence_answer' && row.scores);
    const total = key => answers.reduce((sum, row) => sum + row.scores[key], 0);
    const usages = rows.filter(row => row.usage);
    return { provider: provider.name, model: provider.model, reservedCalls: rows.filter(row => row.charged).length, responsesValidated: rows.filter(row => row.scores).length,
      expectedConditions: total('expectedConditions'), correctConditions: total('correctConditions'), unsupportedClaims: total('unsupportedClaims'), unsupportedProposals: total('unsupportedProposals'), unknownConditions: total('unknownConditions'),
      meanLatencyMs: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.latencyMs, 0) / rows.length) : null,
      inputTokens: usages.reduce((sum, row) => sum + row.usage.inputTokens, 0), outputTokens: usages.reduce((sum, row) => sum + row.usage.outputTokens, 0),
      usageIncomplete: rows.some(row => row.charged && !row.usage), estimatedCostUsd: null };
  });
  return { version: 1, synthetic: true, comparisonType: 'fixed-evidence component comparison; not a full discovery benchmark', calls, maxCalls, stopped, summaries,
    coverage: cases.map(c => ({ caseId: c.item.id, answerPacketAvailable: c.packet.context.candidates.length > 0,
      excludedByRecordedRules: c.recordedExclusion, omittedCandidates: c.packet.omittedCandidates })), results };
}
