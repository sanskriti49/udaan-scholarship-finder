import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { parseResearchIntent, intentMessages, compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { answerContext, answerResponseFormat, applyEvidenceAnswer } from '../../src/agents/navigator/evidenceAnswer.js';
import { matchesTarget, withinTargetScope, balanceTargets } from '../../src/agents/navigator/researchTargets.js';
import { publicRun } from '../../src/agents/navigator/durableContracts.js';
import { verifyEvidence } from '../../src/pipeline/core/evidence.js';
import { researchSummary, findingGroup } from '../../../frontend/src/navigator/researchSummary.js';
import { admissionBrief, admissionIntent } from '../admissionIntentFixture.js';
import { namedResearchFixture, TOP_CLASS_SC, POST_MATRIC_REGIONAL } from '../namedResearchFixture.js';

const compile = (raw = admissionIntent, messages = intentMessages(admissionBrief)) => compileResearchIntent(parseResearchIntent({ intentFormat: 'json_schema', message: { content: JSON.stringify(raw) } }, messages));
const makeTools = (f, retrieval) => createResearchTools({ repository: f.repository, retrieval, includeContext: true, now: () => new Date(f.now) });

test('named comparisons are separate research targets, never simultaneous funding requirements', () => {
  const { retrieval, report } = compile();
  assert.equal(report.status, 'interpreted'); assert.equal(retrieval.targets.length, 2);
  assert.deepEqual(retrieval.requirements.map(r => r.field), ['category', 'educationLevel', 'incomeCeiling']);
  assert.ok(!report.requirements.some(r => /Top Class|Post-Matric/.test(r.label)));
  assert.equal(retrieval.targets[1].name, 'Post-Matric SC scholarship');
});

test('a name-only investigation retains a general source research question without inventing applicant facts', () => {
  const raw = structuredClone(admissionIntent); raw.constraints = raw.constraints.filter(c => c.field === 'scheme');
  const { retrieval } = compile(raw);
  assert.equal(retrieval.targets.length, 2); assert.equal(retrieval.requirements.length, 1);
  assert.equal(retrieval.requirements[0].field, 'question');
  assert.doesNotMatch(retrieval.requirements[0].text, /Top Class|Post-Matric|500000|UG/);
});

test('entity matching generalizes across punctuation, order and unfamiliar names while keeping exclusions scoped', () => {
  const target = { name: 'Orchid—Applied Sciences Grant', operator: 'include' };
  assert.equal(matchesTarget({ officialTitle: 'Applied Sciences: ORCHID fellowship' }, target), true);
  assert.equal(matchesTarget({ title: 'Orchid Medical Sciences Grant' }, target), false);
  const scope = { targets: [target, { name: 'Orchid Applied Sciences for ST', operator: 'exclude' }] };
  assert.equal(withinTargetScope({ title: 'Orchid Applied Sciences for ST' }, scope), false);
  assert.equal(withinTargetScope({ title: 'Orchid Applied Sciences' }, scope), true, 'an unspecified audience cannot establish the excluded identity');
  assert.equal(withinTargetScope({ title: 'Orchid Applied Sciences for SC' }, scope), true);
  assert.equal(matchesTarget({ title: 'Post Matric OBC Scholarship' }, { name: 'Post-Matric SC scholarship', operator: 'include' }), false);
});

test('named targets survive follow-ups without turning them into applicant conditions', () => {
  const raw = structuredClone(admissionIntent);
  raw.constraints[2] = { ...raw.constraints[2], value: 420000, source: { messageIndex: 1, quote: 'income is 420000' } };
  const result = compile(raw, intentMessages('Correction: income is 420000. Keep comparing those two.', [{ role: 'user', content: admissionBrief }]));
  assert.equal(result.retrieval.targets.length, 2);
  assert.equal(result.retrieval.requirements.find(r => r.field === 'incomeCeiling').value, 420000);
});

test('distinct names are alternatives to investigate, but explicitly including and excluding the same entity needs clarification', () => {
  const raw = structuredClone(admissionIntent);
  raw.constraints.push({ ...raw.constraints[3], operator: 'exclude' });
  const result = compile(raw);
  assert.equal(result.report.status, 'needs_clarification');
  assert.match(result.report.ambiguities[0], /research.*leave it out/);
});

test('bounded investigation covers different requested entities before more versions of one', () => {
  const targets = [{ id: 's0', operator: 'include' }, { id: 's1', operator: 'include' }, { id: 's2', operator: 'include' }];
  const cards = [{ schemeId: 'a', targetIds: ['s0'] }, { schemeId: 'b', targetIds: ['s0'] }, { schemeId: 'c', targetIds: ['s1'] }, { schemeId: 'd', targetIds: ['s2'] }];
  assert.deepEqual(balanceTargets(cards, targets, 2).map(c => c.schemeId), ['a', 'c']);
  assert.deepEqual(balanceTargets(cards, targets, 4).map(c => c.schemeId), ['a', 'c', 'd', 'b']);
});

test('rich policy text from a less-specific identity cannot replace the explicitly named record whose policy is missing', async () => {
  const f = namedResearchFixture(), { retrieval } = compile();
  const precise = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', title: 'Post Matric Scholarship for SC Students', publication: { state: 'published' }, rules: [], fieldEvidence: [] };
  const broad = { ...structuredClone(f.schemes[0]), _id: 'cccccccccccccccccccccccc', title: 'Post Matric Scholarship', officialTitle: 'Post Matric Scholarship' };
  f.state.schemes.push(precise, broad);
  const search = await makeTools(f, retrieval).execute('searchScholarships', {});
  const exact = search.schemes.find(card => card.schemeId === precise._id), related = search.schemes.find(card => card.schemeId === broad._id);
  assert.equal(exact.research.evidenceAvailable, false); assert.equal(exact.research.identityUnresolved, undefined);
  assert.equal(related.research.identityUnresolved, true); assert.equal(related.research.evidenceAvailable, false);
  assert.equal(related.qualification.status, 'needs_verification', 'identity deferral is not an eligibility rejection');
  assert.ok(search.schemes.indexOf(exact) < search.schemes.indexOf(related));
  assert.ok(!search.schemes.filter(card => card.research.evidenceAvailable).some(card => card.targetIds.includes('s1')));
});

test('no named entity match is reported as a gap without substituting other scholarships', async () => {
  const f = namedResearchFixture(), { retrieval } = compile(); retrieval.targets = [{ id: 's0', name: 'Unrecorded Quantum Ceramics Award', operator: 'include' }];
  const search = await makeTools(f, retrieval).execute('searchScholarships', {});
  assert.equal(search.schemes.length, 0); assert.equal(search.targets[0].status, 'not_found');
  assert.equal(search.discovery.snapshots, 0);
});

test('saved-source replay investigates the requested SC scheme, retains its complete admission clause and exposes the regional income restriction', async t => {
  const started = performance.now(), f = namedResearchFixture(), { retrieval, report } = compile(), tools = makeTools(f, retrieval);
  const search = await tools.execute('searchScholarships', {});
  assert.deepEqual(search.schemes.filter(s => s.research.evidenceAvailable).map(s => s.schemeId), [TOP_CLASS_SC]);
  assert.ok(search.excluded.some(s => s.schemeId === POST_MATRIC_REGIONAL));
  assert.ok(search.schemes.filter(s => f.previousSelection.includes(s.title)).every(s => s.qualification.status === 'needs_verification' && !s.research.evidenceAvailable), 'a vaguely named regional variant without policy stays unconfirmed, never a useful finding');
  const found = await tools.execute('findGuidelinePassages', { schemeId: TOP_CLASS_SC, query: 'education eligibility' });
  const anchor = found.passages.find(p => p.fieldAnchored && p.evidence.quote.includes('notified institutions'));
  assert.ok(anchor, 'the income field was clipped at any of the; recover its actual admission restriction');
  assert.match(anchor.evidence.quote, /slots.*allocated[\s\S]*course\./s);
  const snapshot = f.snapshots.find(s => s._id === String(anchor.evidence.snapshotId));
  assert.ok(verifyEvidence(anchor.evidence, { ...snapshot, id: snapshot._id }).ok);
  let plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: TOP_CLASS_SC, evidenceIds: found.passages.map(p => p.id) }] });
  plan = { ...plan, targets: search.targets, intent: report, coverage: { reviewed: [], deferred: [], excluded: search.excluded } };
  const packet = answerContext({ goal: admissionBrief, intent: admissionIntent, retrieval }, plan);
  assert.equal(packet.context.targets.length, 2); assert.equal(packet.context.candidates.length, 1);
  assert.ok(packet.context.candidates[0].passages.some(p => p.quote.includes('notified institutions')));
  const answer = applyEvidenceAnswer(plan, packet, { message: { content: JSON.stringify({ assessments: [] }) } });
  const candidate = answer.entries[0];
  assert.equal(candidate.answer.conditions.find(c => c.requirementId === 'c0').status, 'supported');
  assert.equal(candidate.answer.conditions.find(c => c.requirementId === 'c2').status, 'supported');
  assert.equal(candidate.answer.conditions.find(c => c.requirementId === 'c1').status, 'unknown', 'no model output or generic prescribed-course phrase certifies B.Tech eligibility');
  assert.equal(candidate.qualification.status, 'needs_verification'); assert.equal(findingGroup(candidate), 'promising');
  const publicPlan = publicRun({ _id: 'fixture', goal: admissionBrief, status: 'completed', createdAt: new Date(f.now), expiresAt: new Date(f.now), plan: answer }).plan;
  assert.equal(researchSummary(publicPlan).nextField, null, 'income stated in the brief must not be asked again');
  t.diagnostic(`Public-source replay: no previous irrelevant selection consumed an evidence action; 1 candidate researched, ${found.passages.length} excerpts; ${JSON.stringify(packet.messages).length} input characters; ${Math.round(performance.now() - started)}ms locally. No live inference or current-year eligibility proof.`);
});

test('answer wire schema binds real references and schema diagnostics identify properties without leaking rejected values', async () => {
  const f = namedResearchFixture(), { retrieval } = compile(), tools = makeTools(f, retrieval);
  const read = await tools.execute('findGuidelinePassages', { schemeId: TOP_CLASS_SC, query: 'eligibility' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: TOP_CLASS_SC, evidenceIds: read.passages.map(p => p.id) }] });
  const packet = answerContext({ goal: admissionBrief, retrieval }, plan), format = answerResponseFormat(packet.messages);
  const row = format.json_schema.schema.properties.assessments.items.properties;
  assert.deepEqual(row.schemeId.enum, [TOP_CLASS_SC]); assert.deepEqual(row.requirementId.enum, ['c0', 'c1', 'c2']);
  assert.deepEqual(row.evidence.items.properties.evidenceId.enum, packet.context.candidates[0].passages.map(p => p.id));
  assert.equal(row.schemeId.pattern, undefined, 'keep the shallow portable decoder');
  const result = applyEvidenceAnswer(plan, packet, { message: { content: JSON.stringify({ assessments: [{ schemeId: 'PRIVATE_WRONG_ID', requirementId: 'c1', status: 'supported', explanation: 'x'.repeat(601), evidence: [] }] }) } });
  assert.deepEqual(result.answer.diagnostics[0].fields, ['schemeId', 'explanation']);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_WRONG_ID|xxxx/);
  assert.equal(result.answer.acceptedAssessments, 0);
});
