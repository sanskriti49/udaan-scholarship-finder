import { createHash } from 'node:crypto';
import { policyFacts } from './studentQuestions.js';
import { findingGroup } from '../../frontend/src/navigator/researchSummary.js';
import { studentCondition } from '../../frontend/src/navigator/studentFindings.js';

/** Diagnose proposal fidelity without relaxing the production validator. A
 * whitespace-only difference is NOT automatically an accepted or true claim. */
export function quotationDiagnostics(result) {
  if (!result.modelResponses?.length) return null;
  const counts = { exact: 0, whitespaceOnlyDifferences: 0, otherDifferences: 0, unknownEvidence: 0 };
  const normalized = value => value.replace(/\p{White_Space}+/gu, ' ').trim();
  for (const response of result.modelResponses.filter(r => r.mode === 'evidence_answer')) {
    let rows;
    try { rows = JSON.parse(response.message.content).assessments; } catch { continue; }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) for (const proof of Array.isArray(row.evidence) ? row.evidence : []) {
      if (typeof proof.quote !== 'string' || !proof.quote.trim()) continue;
      const passage = result.retrievedPassages?.find(p => p.id === proof.evidenceId);
      if (!passage) counts.unknownEvidence++;
      else if (passage.evidence.quote.includes(proof.quote)) counts.exact++;
      else if (normalized(passage.evidence.quote).includes(normalized(proof.quote))) counts.whitespaceOnlyDifferences++;
      else counts.otherDifferences++;
    }
  }
  return counts;
}

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const oracleFingerprint = item => digest({ version: 2, item, facts: item.facts.map(id => [id, policyFacts[id]]) });
export const responseFingerprint = result => digest({ caseId: result.caseId, question: result.question, conversation: result.conversation,
  provider: result.provider, model: result.model, plan: result.plan, error: result.error, corpusFingerprint: result.corpusFingerprint, modelResponses: result.modelResponses });

export function answerText(result) {
  const plan = result.plan;
  return [plan?.answer?.message, ...(plan?.entries ?? []).flatMap(e => (e.answer?.conditions ?? []).map(c =>
    `${studentCondition(c, plan.intent?.requirements)} — ${c.status === 'unknown' ? 'still to confirm' : c.status}\n${c.explanation}`)),
    ...(plan?.coverage?.excluded ?? []).flatMap(e => e.qualification?.reasons ?? []),
    ...(plan?.research?.gaps ?? []).map(g => g.message)].filter(Boolean).join('\n');
}

function matches(row, expected) {
  return row.field === expected.field && row.role === expected.role && row.operator === 'include'
    && (Array.isArray(row.value) ? row.value.includes(expected.value) : row.value === expected.value);
}
function factLocated(id, passages) {
  const fact = policyFacts[id];
  return passages.some(p => String(p.evidence?.snapshotId) === fact.snapshotId && p.evidence.quote.includes(fact.quote));
}
function citedPassages(plan) {
  return (plan?.entries ?? []).flatMap(entry => (entry.answer?.conditions ?? []).flatMap(c => c.evidence.map(proof => {
    const citation = entry.citations.find(c => c.id === proof.evidenceId);
    return citation ? { ...citation, evidence: { ...citation.evidence, quote: proof.quote } } : null;
  }))).filter(Boolean);
}

/** Exact excerpt binding prevents stale/invented reviews from grading a changed
 * answer. Semantic judgments remain explicit source review, not keyword scores. */
export function validateReview(result, item, review) {
  if (!review || review.responseFingerprint !== responseFingerprint(result) || review.oracleFingerprint !== oracleFingerprint(item)) throw new Error('REVIEW_FINGERPRINT_MISMATCH');
  if (typeof review.reviewer !== 'string' || !review.reviewer.trim()) throw new Error('REVIEWER_REQUIRED');
  if (review.allExplanationsReviewed !== true) throw new Error('INCOMPLETE_EXPLANATION_REVIEW');
  const text = answerText(result), excerpt = row => typeof row.excerpt === 'string' && row.excerpt.trim().length > 0 && text.includes(row.excerpt);
  if (!Array.isArray(review.facts) || review.facts.length !== item.facts.length || new Set(review.facts.map(r => r.id)).size !== item.facts.length
    || review.facts.some(row => !item.facts.includes(row.id) || typeof row.explained !== 'boolean' || (row.explained && (!excerpt(row) || row.supported !== true)))) throw new Error('INVALID_FACT_REVIEW');
  if (!Array.isArray(review.unknowns) || review.unknowns.length !== item.unknowns.length || new Set(review.unknowns.map(r => r.id)).size !== item.unknowns.length
    || review.unknowns.some(row => !item.unknowns.includes(row.id) || typeof row.communicated !== 'boolean' || (row.communicated && !excerpt(row)))) throw new Error('INVALID_UNKNOWN_REVIEW');
  const unmet = review.unmetConditions ?? [], expectedUnmet = item.unmetConditions ?? [];
  if (unmet.length !== expectedUnmet.length || new Set(unmet.map(r => r.id)).size !== expectedUnmet.length
    || unmet.some(row => !expectedUnmet.includes(row.id) || typeof row.communicated !== 'boolean' || (row.communicated && !excerpt(row)))) throw new Error('INVALID_UNMET_CONDITION_REVIEW');
  if (!Array.isArray(review.incorrectClaims) || review.incorrectClaims.some(row => !excerpt(row) || typeof row.reason !== 'string' || !row.reason.trim()
    || (row.kind != null && !['factually_wrong', 'unsupported'].includes(row.kind)))
    || !Number.isInteger(review.claimsChecked) || review.claimsChecked < review.incorrectClaims.length || review.claimsChecked < review.facts.filter(f => f.explained).length) throw new Error('INVALID_CLAIM_REVIEW');
  if (typeof review.nextStep?.useful !== 'boolean' || (review.nextStep.useful && !excerpt(review.nextStep))) throw new Error('INVALID_NEXT_STEP_REVIEW');
  return review;
}

/** Measure delivery quality, not the number of safe-looking unknown statuses.
 * Unreviewed free text has UNKNOWN correctness/helpfulness, never zero errors. */
export function scoreStudentResult(result, item, review = null) {
  const entries = result.plan?.entries ?? [], exclusions = result.plan?.coverage?.excluded ?? [];
  const recommendations = entries.filter(e => !['excluded', 'concern'].includes(findingGroup(e)));
  const relevant = recommendations.filter(e => e.schemeId === item.target);
  const targetFound = item.excluded ? exclusions.some(e => e.schemeId === item.target) && !recommendations.some(e => e.schemeId === item.target)
    : entries.some(e => e.schemeId === item.target);
  const requirements = result.plan?.intent?.requirements ?? result.intent?.constraints ?? [];
  const required = item.requiredIntent ?? [], forbidden = item.forbiddenIntent ?? [];
  const missingIntent = required.filter(e => !requirements.some(r => matches(r, e)));
  const wrongIntent = forbidden.filter(e => requirements.some(r => matches(r, e)));
  const passages = result.retrievedPassages ?? entries.flatMap(e => e.citations);
  const retrievedFacts = item.facts.filter(id => factLocated(id, passages));
  const citedFacts = item.facts.filter(id => factLocated(id, citedPassages(result.plan)));
  const checked = review ? validateReview(result, item, review) : null;
  const explainedFacts = checked?.facts.filter(f => f.explained && f.supported).map(f => f.id) ?? [];
  const unknownsExplained = checked?.unknowns.filter(f => f.communicated).map(f => f.id) ?? [];
  const unmetExplained = checked?.unmetConditions?.filter(f => f.communicated).map(f => f.id) ?? [];
  const unsafeClaims = checked ? checked.incorrectClaims.length : null;
  const incorrectClaims = checked ? checked.incorrectClaims.filter(c => c.kind !== 'unsupported').length : null;
  const unsupportedClaims = checked ? checked.incorrectClaims.filter(c => c.kind === 'unsupported').length : null;
  const hasGroundedContent = checked && item.minimumFacts.every(id => explainedFacts.includes(id)
    && (citedFacts.includes(id) || (item.excluded && targetFound && id === 'category')));
  const useful = checked ? Boolean(!result.error && result.status === 'completed' && targetFound && recommendations.every(e => e.schemeId === item.target)
    && !missingIntent.length && !wrongIntent.length && !unsafeClaims && hasGroundedContent
    && item.unknowns.every(id => unknownsExplained.includes(id)) && (item.unmetConditions ?? []).every(id => unmetExplained.includes(id))
    && (item.excluded || checked.nextStep.useful)) : null;
  return { caseId: item.id, tags: item.tags, status: result.status,
    reviewStatus: checked ? 'source_reviewed' : 'awaiting_source_review', relevance: { targetFound, precision: recommendations.length ? relevant.length / recommendations.length : null,
      presentedCandidates: recommendations.length, relevant: relevant.length, supportedRecommendations: recommendations.filter(e => findingGroup(e) === 'promising').length }, intent: { expected: required.length, matched: required.length - missingIntent.length, missing: missingIntent, forbidden: wrongIntent },
    evidence: { expectedFacts: item.facts.length, retrievedFacts, citedFacts, retrievalCoverage: retrievedFacts.length / item.facts.length, citationCoverage: citedFacts.length / item.facts.length },
    answer: { explainedFacts: checked ? explainedFacts : null, unansweredFacts: checked ? item.facts.filter(id => !explainedFacts.includes(id)) : null,
      unknownsExplained: checked ? unknownsExplained : null, missingUnknowns: checked ? item.unknowns.filter(id => !unknownsExplained.includes(id)) : null,
      unmetConditionsExplained: checked ? unmetExplained : null, missingUnmetConditions: checked ? (item.unmetConditions ?? []).filter(id => !unmetExplained.includes(id)) : null,
      incorrectClaims, unsupportedClaims, unsafeClaims, claimsChecked: checked?.claimsChecked ?? null, nextStepUseful: checked?.nextStep.useful ?? null,
      rejectedAssessments: result.plan?.answer?.rejectedAssessments ?? 0, quotationDiagnostics: quotationDiagnostics(result) },
    usefulCompletion: useful, interactiveSuccess: useful == null ? null : useful && result.elapsedMs <= (item.latencyTargetMs ?? 30000),
    latencyMs: result.elapsedMs, inference: result.usage ?? null, error: result.error,
    verdict: result.error ? 'execution_failed' : !checked ? 'awaiting_review' : unsafeClaims || wrongIntent.length ? 'incorrect_or_unsupported'
      : useful ? explainedFacts.length === item.facts.length ? 'useful_complete' : 'useful_partial' : explainedFacts.length ? 'partial_findings_insufficient' : 'safe_but_unhelpful' };
}

const percentile = (values, q) => values.length ? [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(q * values.length) - 1)] : null;
export function summarizeStudentResults(results, totalCases) {
  const reviewed = results.filter(r => r.reviewStatus === 'source_reviewed'), latencies = results.map(r => r.latencyMs).filter(Number.isFinite);
  const tokenRows = results.filter(r => r.inference && !r.inference.tokenUsageIncomplete);
  const expectedFacts = results.reduce((sum, r) => sum + r.evidence.expectedFacts, 0), claims = reviewed.reduce((sum, r) => sum + r.answer.claimsChecked, 0);
  const wrong = reviewed.reduce((sum, r) => sum + r.answer.incorrectClaims, 0);
  const presented = results.reduce((sum, r) => sum + r.relevance.presentedCandidates, 0);
  return { totalCases, attempted: results.length, notRun: totalCases - results.length, reviewed: reviewed.length,
    usefulCompletions: reviewed.filter(r => r.usefulCompletion).length,
    usefulRateAcrossAttemptedLowerBound: results.length ? reviewed.filter(r => r.usefulCompletion).length / results.length : null,
    interactiveSuccesses: reviewed.filter(r => r.interactiveSuccess).length,
    targetFound: results.filter(r => r.relevance.targetFound).length,
    selectedCandidatePrecision: presented ? results.reduce((sum, r) => sum + r.relevance.relevant, 0) / presented : null,
    retrievedFactCoverage: expectedFacts ? results.reduce((sum, r) => sum + r.evidence.retrievedFacts.length, 0) / expectedFacts : null,
    citedFactCoverage: expectedFacts ? results.reduce((sum, r) => sum + r.evidence.citedFacts.length, 0) / expectedFacts : null,
    explainedFactCoverageLowerBound: expectedFacts ? reviewed.reduce((sum, r) => sum + r.answer.explainedFacts.length, 0) / expectedFacts : null,
    incorrectClaims: reviewed.length ? wrong : null, unsupportedClaims: reviewed.length ? reviewed.reduce((sum, r) => sum + r.answer.unsupportedClaims, 0) : null,
    claimsReviewed: claims, incorrectClaimRate: claims ? wrong / claims : null, unreviewedAnswers: results.length - reviewed.length,
    medianLatencyMs: latencies.length ? (percentile(latencies, .5) + [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)]) / 2 : null,
    p95LatencyMs: percentile(latencies, .95), latencySampleCount: latencies.length,
    modelCalls: results.reduce((sum, r) => sum + (r.inference?.modelCalls ?? 0), 0),
    inputTokens: tokenRows.reduce((sum, r) => sum + r.inference.inputTokens, 0), outputTokens: tokenRows.reduce((sum, r) => sum + r.inference.outputTokens, 0),
    usageIncomplete: tokenRows.length !== results.length, estimatedCostUsd: null,
    measurementNote: 'Small sample, not a production latency distribution. No monetary estimate without verified billing/prices. Unreviewed answers are not credited as useful or error-free.' };
}
