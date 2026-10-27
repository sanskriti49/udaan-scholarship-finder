import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEME_ID, FIXTURE_NOW } from '../navigatorHelpers.js';
import { policyFixture, renewalPlanFixture } from '../evidenceBudgetFixture.js';
import { verifyEvidence } from '../../src/pipeline/core/evidence.js';
import { assessRetrieval, evidenceTargets, evidenceQueries } from '../../src/agents/navigator/retrievalCoverage.js';
import { findPassages, passageTargets } from '../../src/agents/navigator/passages.js';
import { selectEvidence } from '../../src/agents/navigator/evidenceSelection.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { answerContext, applyEvidenceAnswer, ANSWER_PROMPT } from '../../src/agents/navigator/evidenceAnswer.js';


test('four excerpts cover later renewal and joint conditions instead of four narrow exclusions', () => {
  const f = policyFixture(), targets = evidenceTargets(f.scheme, f.retrieval);
  const found = findPassages(f.scheme, [f.snapshot], '', { includeContext: true, queries: evidenceQueries(f.scheme, f.retrieval), targets });
  assert.equal(found.length, 4);
  assert.ok(found.some(p => p.evidence.quote.includes(f.renewal)));
  assert.ok(found.some(p => p.evidence.quote.includes(f.combined)));
  assert.ok(found.some(p => p.policyRole === 'exclusion'), 'explicit restrictions must survive coverage optimization');
  assert.deepEqual([...new Set(found.flatMap(p => passageTargets(p, targets)))].sort(), ['c0', 'c1', 'c2', 'c3', 'c4']);
  assert.ok(found.every(p => verifyEvidence(p.evidence, f.snapshot).ok));
  assert.ok(assessRetrieval(f.scheme, f.retrieval, found).conditions.every(c => c.status === 'unknown'), 'finding a clause is not a verified eligibility result');
});

test('evidence opportunity is stable across constraint order and ignores already checked metadata', () => {
  const f = policyFixture();
  const find = plan => findPassages(f.scheme, [f.snapshot], '', { includeContext: true, queries: evidenceQueries(f.scheme, plan), targets: evidenceTargets(f.scheme, plan) }).map(p => p.id).sort();
  assert.deepEqual(find(f.retrieval), find({ ...f.retrieval, requirements: [...f.retrieval.requirements].reverse() }));
  f.scheme.level = 'UG';
  assert.ok(!evidenceTargets(f.scheme, f.retrieval).some(target => target.id === 'c0'));
  assert.ok(evidenceTargets(f.scheme, f.retrieval).some(target => target.id === 'c4'));
});

test('empty and filler-only queries do not shift the topic index for later questions', () => {
  const f = policyFixture();
  const queries = ['Female', 'renewal', 'domicile'];
  const find = queries => findPassages(f.scheme, [f.snapshot], '', { includeContext: true, queries }).map(passage => passage.id);
  assert.deepEqual(find(['', 'the and', ...queries]), find(queries));
});

test('generic eligibility wording does not count as an answer opportunity for unrelated material questions', () => {
  const f = policyFixture();
  const targets = evidenceTargets(f.scheme, f.retrieval);
  const generic = { policyTopics: ['eligibility'], evidence: { quote: 'Applicants must meet the eligibility requirements.' } };
  assert.deepEqual(passageTargets(generic, targets), []);
  const renewal = { policyTopics: ['renewal'], evidence: { quote: 'Continuing award holders can request continuation.' } };
  assert.deepEqual(passageTargets(renewal, targets), ['c4']);
});

test('better retrieval does not promote a stale guideline into current eligibility support', async () => {
  const plan = await renewalPlanFixture({ now: () => new Date(FIXTURE_NOW.getTime() + 4 * 86400000) });
  assert.equal(plan.answer.acceptedAssessments, 1, 'the exact cited clause remains valid');
  assert.equal(plan.entries[0].stale, true);
  assert.equal(plan.entries[0].answer.conditions.find(condition => condition.requirementId === 'c4').status, 'unknown');
  assert.equal(plan.entries[0].qualification.status, 'needs_verification');
});

test('selection does not spend another slot on a covered question while a new question is available', () => {
  const items = [{ id: 'restriction', policyRole: 'exclusion' }, { id: 'duplicate' }, { id: 'joint' }, { id: 'renewal' }];
  const covers = { restriction: ['category'], duplicate: ['category'], joint: ['course', 'domicile'], renewal: ['renewal'] };
  assert.deepEqual(selectEvidence(items, 3, item => covers[item.id]).map(item => item.id), ['restriction', 'joint', 'renewal']);
  assert.deepEqual(selectEvidence(items, 0, item => covers[item.id]), []);
});

test('retrieval, final citations, bounded answering and student findings retain a useful renewal answer', async () => {
  const f = policyFixture();
  const tools = createResearchTools({ repository: f.repository, retrieval: f.retrieval, includeContext: true, now: () => FIXTURE_NOW });
  const search = await tools.execute('searchScholarships', {});
  assert.equal(search.schemes[0].schemeId, SCHEME_ID);
  const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'degree award' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
  const session = { goal: 'Find a degree award for OBC women domiciled in Goa, including renewal options.', intent: f.intent, retrieval: f.retrieval, conversation: [] };
  const packet = answerContext(session, plan);
  const passage = packet.context.candidates[0].passages.find(p => p.quote.includes(f.renewal));
  assert.ok(passage, 'the actual answering call must receive the renewal clause');
  assert.ok(JSON.stringify(packet.messages).length <= 16000);
  assert.equal(packet.context.requirements.length, 5);
  const answered = applyEvidenceAnswer(plan, packet, { message: { content: JSON.stringify({ assessments: [{ schemeId: SCHEME_ID, requirementId: 'c4', status: 'supported',
    explanation: 'The guideline provides renewal for existing award holders subject to satisfactory progress. This does not confirm that you already hold an award or meet the progress condition.',
    evidence: [{ evidenceId: passage.id, quote: f.renewal, relation: 'supports' }], dependsOn: [] }] }) } });
  assert.equal(answered.answer.acceptedAssessments, 1);
  assert.equal(answered.entries[0].answer.conditions.find(c => c.requirementId === 'c4').status, 'supported');
  assert.equal(answered.entries[0].qualification.status, 'needs_verification');
  assert.equal(answered.entries[0].answer.conditions.filter(c => c.status === 'unknown').length, 4);
  assert.equal(answered.entries[0].matching.failedCount, 0);
  assert.equal(answered.answer.status, 'partial');
  const missing = answerContext(session, { ...plan, entries: plan.entries.map(entry => ({ ...entry, citations: entry.citations.filter(c => !c.evidence.quote.includes(f.renewal)) })) });
  assert.notEqual(missing.fingerprint, packet.fingerprint);
});

test('answer character allocation prefers a compact new question over redundant long policy text', () => {
  const f = policyFixture();
  const candidates = [
    { id: 'guard', policyRole: 'exclusion', policyTopics: ['category'], quote: 'Only applicants from the listed categories may apply.' },
    { id: 'repeat', policyRole: 'eligibility', policyTopics: ['category'], quote: 'OBC applicants must meet the category conditions. '.repeat(20) },
    { id: 'renew', policyRole: 'renewal', policyTopics: ['renewal'], quote: f.renewal },
  ];
  const entry = { schemeId: SCHEME_ID, title: f.scheme.title, qualification: { status: 'needs_verification' }, matching: { status: 'unknown' },
    retrieval: { conditions: f.retrieval.requirements.map(r => ({ id: r.id, status: 'unknown', reason: 'requires_evidence_review' })) },
    citations: candidates.map(p => ({ ...p, scope: 'linked_guideline', sourceFields: ['eligibility'], evidence: { quote: p.quote, url: f.snapshot.url } })) };
  const session = { goal: 'Check renewal', intent: f.intent, retrieval: f.retrieval,
    conversation: Array.from({ length: 5 }, () => ({ role: 'user', content: 'Earlier context about the intended course. '.repeat(18) })) };
  const full = answerContext(session, { entries: [entry] }, { maxCharacters: 28000 });
  const context = structuredClone(full.context);
  context.candidates[0].passages = full.context.candidates[0].passages.filter(p => ['guard', 'repeat'].includes(p.id));
  const budget = JSON.stringify([{ role: 'system', content: ANSWER_PROMPT }, { role: 'user', content: JSON.stringify(context) }]).length;
  assert.ok(budget >= 8000 && budget <= 28000);
  const packet = answerContext(session, { entries: [entry] }, { maxCharacters: budget });
  assert.deepEqual(packet.context.candidates[0].passages.map(p => p.id), ['guard', 'renew']);
  assert.ok(JSON.stringify(packet.messages).length <= budget);
  assert.equal(packet.context.candidates[0].passages[1].quote, f.renewal);
});
