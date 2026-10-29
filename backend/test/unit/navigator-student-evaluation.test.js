import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { studentQuestions, loadStudentCorpus, PRAGATI } from '../../evaluations/studentQuestions.js';
import { scoreStudentResult, responseFingerprint, oracleFingerprint, summarizeStudentResults, validateReview, quotationDiagnostics } from '../../evaluations/studentScoring.js';
import { evaluateStudentCases, runStudentCase, studentCorpusFingerprint } from '../../evaluations/studentRunner.js';
import { NavigatorError } from '../../src/agents/navigator/contracts.js';

const recorded = JSON.parse(fs.readFileSync(new URL('../fixtures/navigator-pragati-live-journey.json', import.meta.url)));
const quality = JSON.parse(fs.readFileSync(new URL('../fixtures/navigator-student-quality.json', import.meta.url)));
const item = { id: 'scorer-positive-control', target: PRAGATI, facts: ['entry', 'income'], minimumFacts: ['entry', 'income'], unknowns: [], requiredIntent: [], tags: [] };
const observation = () => ({ caseId: item.id, question: recorded.question, conversation: [], provider: recorded.provider, model: recorded.model,
  corpusFingerprint: 'test-only', status: 'completed', error: null, elapsedMs: 100, usage: recorded.usage, plan: structuredClone(recorded.plan) });
function reviewFor(result, question = item) {
  const conditions = result.plan.entries[0].answer.conditions;
  // Positive scoring control, not a generated answer or a model-quality result.
  conditions[0].explanation += ' Obtain the required State/UT income certificate before applying.';
  return { caseId: question.id, responseFingerprint: responseFingerprint(result), oracleFingerprint: oracleFingerprint(question), reviewer: 'Unit-test scoring control', allExplanationsReviewed: true,
    facts: question.facts.map(id => ({ id, explained: true, supported: true,
      excerpt: id === 'entry' ? conditions.find(c => c.requirementId === 'q0').explanation : conditions.find(c => c.requirementId === 'c3').explanation })),
    unknowns: [], claimsChecked: 5, incorrectClaims: [], nextStep: { useful: true, excerpt: 'Obtain the required State/UT income certificate before applying.' } };
}

test('seven preregistered questions use intact primary-source anchors and cover every requested dimension', () => {
  const corpus = loadStudentCorpus(); assert.equal(studentQuestions.length, 7); assert.ok(corpus.snapshots.length > 2);
  // File order must never let an older duplicate overwrite the newer capture.
  assert.equal(corpus.schemes.find(s => s._id === PRAGATI).freshness.lastVerifiedAt, recorded.catalogue.scheme.freshness.lastVerifiedAt);
  const tags = new Set(studentQuestions.filter(c => c.pilot).flatMap(c => c.tags));
  for (const tag of ['unknown-income', 'category-exclusions', 'renewal', 'schooling-versus-domicile', 'intended-course', 'follow-ups', 'missing-guidance']) assert.ok(tags.has(tag));
});

test('actual recorded student answers score one useful completion, with whitespace loss and unsupported year scope exposed', () => {
  const scores = quality.observations.map(o => scoreStudentResult(o, studentQuestions.find(c => c.id === o.caseId), quality.reviews.find(r => r.caseId === o.caseId)));
  const summary = summarizeStudentResults(scores, 4);
  assert.equal(summary.usefulCompletions, 1); assert.equal(summary.incorrectClaims, 0); assert.equal(summary.unsupportedClaims, 1);
  assert.equal(scores.find(s => s.caseId === 'context-and-unknown-income').answer.quotationDiagnostics.whitespaceOnlyDifferences, 6);
  assert.equal(scores.find(s => s.caseId === 'missing-mode-guidance').usefulCompletion, false);
  assert.equal(scores.find(s => s.caseId === 'renewal-fourth-year').evidence.retrievedFacts.includes('duration'), false);
});

test('reused validated intent reaches the newest policy bundle without another extraction request', async () => {
  const question = studentQuestions[0], modes = [];
  const cachedIntent = { objective: 'Inspect the named degree scholarship', searchQuery: 'AICTE Pragati', constraints: [
    { field: 'scheme', role: 'scholarship', operator: 'include', value: 'AICTE Pragati (Technical Degree)', source: { messageIndex: 0, quote: 'AICTE Pragati (Technical Degree)' } },
  ], questions: [{ text: question.question, source: { messageIndex: 1, quote: question.question } }], ambiguities: [] };
  const provider = { name: 'gemini', model: 'scripted-transport-control', async complete(request) {
    modes.push(request.mode); assert.equal(request.mode, 'evidence_answer');
    const packet = JSON.parse(request.messages.at(-1).content);
    assert.equal(packet.candidates[0].stale, false);
    return { message: { content: '{"assessments":[]}' } };
  } };
  const config = { maxModelCalls: 3, maxToolCalls: 8, maxResearchDecisions: 1, maxResearchCandidates: 5, answerContextChars: 16000 };
  const result = await runStudentCase({ item: question, corpus: loadStudentCorpus(), provider, config, cachedIntent, reusedIntentFrom: 'test-control' });
  assert.equal(result.status, 'completed'); assert.deepEqual(modes, ['evidence_answer']);
  assert.equal(result.reusedIntentFrom, 'test-control'); assert.equal(result.modelResponses.length, 1);
  assert.equal(result.corpusFingerprintVersion, 2);
  const changed = loadStudentCorpus(); changed.schemes[0].freshness.lastVerifiedAt = '2020-01-01T00:00:00Z';
  assert.notEqual(studentCorpusFingerprint(changed), studentCorpusFingerprint(loadStudentCorpus()));
});

test('a source-reviewed exclusion answers eligibility without requiring a pointless follow-up action', () => {
  const question = studentQuestions.find(c => c.id === 'category-exclusion');
  const result = observation(); result.caseId = question.id;
  result.plan = { entries: [], intent: { requirements: question.requiredIntent.map(r => ({ ...r, operator: 'include' })) },
    coverage: { excluded: [{ schemeId: question.target, qualification: { reasons: ['This scheme is restricted to SC applicants; the applicant is OBC.'] } }] } };
  const review = { caseId: question.id, responseFingerprint: responseFingerprint(result), oracleFingerprint: oracleFingerprint(question), reviewer: 'Synthetic scoring control', allExplanationsReviewed: true,
    facts: [{ id: 'category', explained: true, supported: true, excerpt: 'This scheme is restricted to SC applicants; the applicant is OBC.' }],
    unknowns: [], claimsChecked: 1, incorrectClaims: [], nextStep: { useful: false, excerpt: '' } };
  assert.equal(scoreStudentResult(result, question, review).usefulCompletion, true);
});

test('safe all-unknown answers are unhelpful, not successful, even with an accurate source block attached', () => {
  const result = observation(), review = reviewFor(result);
  result.plan.entries[0].answer.conditions.forEach(c => { c.status = 'unknown'; c.explanation = 'Eligibility could not be established. Check with the provider.'; });
  review.facts.forEach(f => { f.explained = false; f.supported = false; f.excerpt = ''; });
  review.nextStep = { useful: false, excerpt: '' }; review.responseFingerprint = responseFingerprint(result);
  const score = scoreStudentResult(result, item, review);
  assert.equal(score.answer.incorrectClaims, 0); assert.equal(score.usefulCompletion, false);
  assert.equal(score.verdict, 'safe_but_unhelpful'); assert.ok(score.evidence.citationCoverage > 0);
});

test('a useful source-reviewed answer needs explained policy, not just correct status labels or citation IDs', () => {
  const result = observation(), review = reviewFor(result);
  assert.equal(scoreStudentResult(result, item, review).usefulCompletion, true);
  review.facts[0].explained = false;
  assert.equal(scoreStudentResult(result, item, review).usefulCompletion, false);
});

test('quoted but unexplained requirements cannot masquerade as covered explanations', () => {
  const result = observation(), review = reviewFor(result);
  review.facts[0].excerpt = 'Maximum two girl child per family are eligible.';
  assert.throws(() => validateReview(result, item, review), /INVALID_FACT_REVIEW/);
});

test('wrong claims, wrong candidates and stale reviews cannot earn useful completion', () => {
  const result = observation(), review = reviewFor(result);
  review.incorrectClaims.push({ excerpt: result.plan.entries[0].answer.conditions[0].explanation, reason: 'Synthetic negative scoring control' });
  assert.equal(scoreStudentResult(result, item, review).answer.incorrectClaims, 1);
  assert.equal(scoreStudentResult(result, item, review).usefulCompletion, false);
  assert.equal(scoreStudentResult(result, { ...item, target: 'irrelevant' }, { ...review, oracleFingerprint: oracleFingerprint({ ...item, target: 'irrelevant' }) }).relevance.targetFound, false);
  result.plan.entries[0].answer.conditions[0].explanation += ' changed';
  assert.throws(() => scoreStudentResult(result, item, review), /FINGERPRINT_MISMATCH/);
});

test('an unsupported condition is reported separately from factual error and still blocks success', () => {
  const result = observation(), review = reviewFor(result);
  review.incorrectClaims = [{ kind: 'unsupported', excerpt: result.plan.entries[0].answer.conditions[0].explanation, reason: 'Negative scoring control: the cited text does not establish the conclusion.' }];
  const score = scoreStudentResult(result, item, review);
  assert.equal(score.answer.incorrectClaims, 0); assert.equal(score.answer.unsupportedClaims, 1); assert.equal(score.usefulCompletion, false);
});

test('unreviewed output never becomes a zero-error success, and slow useful content fails interactive success', () => {
  const result = observation(), unreviewed = scoreStudentResult(result, item);
  assert.equal(unreviewed.usefulCompletion, null); assert.equal(unreviewed.answer.incorrectClaims, null);
  const review = reviewFor(result); result.elapsedMs = 40000;
  const slow = scoreStudentResult(result, item, review); assert.equal(slow.usefulCompletion, true); assert.equal(slow.interactiveSuccess, false);
  const summary = summarizeStudentResults([unreviewed], 7);
  assert.equal(summary.notRun, 6); assert.equal(summary.usefulCompletions, 0); assert.equal(summary.unreviewedAnswers, 1);
  assert.equal(summary.incorrectClaims, null); assert.equal(summary.incorrectClaimRate, null);
});

test('formatting diagnostics distinguish line-wrap changes from altered conditions without accepting either', () => {
  const result = { retrievedPassages: [{ id: 'p', evidence: { quote: 'Only SC applicants\nmay apply.' } }], modelResponses: [{ mode: 'evidence_answer', message: { content: JSON.stringify({ assessments: [
    { evidence: [{ evidenceId: 'p', quote: 'Only SC applicants may apply.' }] },
    { evidence: [{ evidenceId: 'p', quote: 'Only OBC applicants may apply.' }] },
  ] }) } }] };
  assert.deepEqual(quotationDiagnostics(result), { exact: 0, whitespaceOnlyDifferences: 1, otherDifferences: 1, unknownEvidence: 0 });
});

test('a real graph provider failure is charged once, diagnosed, and stops remaining cases without a fabricated answer', async () => {
  let requests = 0, reservations = 0;
  const provider = { name: 'gemini', model: 'synthetic-only', async complete(request) {
    assert.doesNotMatch(JSON.stringify(request.messages), /minimumFacts|answerKey|expectedIncome/);
    await request.reserveCall({}); requests++; throw new NavigatorError('PROVIDER_TIMEOUT', 'Synthetic timeout');
  } };
  const config = { maxModelCalls: 3, maxToolCalls: 8, maxResearchDecisions: 1, maxResearchCandidates: 5, answerContextChars: 16000 };
  const result = await evaluateStudentCases({ cases: studentQuestions.slice(0, 2), corpus: loadStudentCorpus(), provider, config,
    maxCalls: 2, reserveCall: async () => { reservations++; } });
  assert.equal(requests, 1); assert.equal(reservations, 1); assert.equal(result.stopped, 'PROVIDER_TIMEOUT');
  assert.equal(result.notRun.length, 1); assert.equal(result.observations[0].plan, null);
  assert.equal(result.summary.usefulCompletions, 0); assert.equal(result.observations[0].usage.tokenUsageIncomplete, true);
});

test('student evaluation defaults to an offline manifest and does not read deliberately invalid credentials', () => {
  const output = execFileSync(process.execPath, ['src/scripts/evaluateNavigatorStudents.js'], { cwd: new URL('../../', import.meta.url),
    env: { ...process.env, MONGO_URI: 'MUST_NOT_CONNECT', GEMINI_API_KEY: 'MUST_NOT_USE' }, encoding: 'utf8' });
  const manifest = JSON.parse(output); assert.equal(manifest.mode, 'offline_manifest'); assert.equal(manifest.cases.length, 4);
  assert.doesNotMatch(output, /MUST_NOT/);
});
