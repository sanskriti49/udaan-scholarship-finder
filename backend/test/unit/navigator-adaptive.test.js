import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveFixture, adaptiveProvider, memoryJourney } from '../adaptiveFixture.js';
import { decisionResponseFormat, parseDecision, decisionMessages, initialResearch } from '../../src/agents/navigator/adaptiveResearch.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { admissionIntent } from '../admissionIntentFixture.js';
import { SCHEME_ID } from '../navigatorHelpers.js';
import { researchSummary } from '../../../frontend/src/navigator/researchSummary.js';
import { createGroqProvider } from '../../src/agents/navigator/groqProvider.js';
import { NavigatorError } from '../../src/agents/navigator/contracts.js';

test('stored sufficient evidence finishes without an unnecessary planner or acquisition call', async () => {
  const f = adaptiveFixture(), result = await memoryJourney(f);
  assert.equal(result.session.status, 'completed');
  assert.deepEqual(result.provider.calls, ['research_intent', 'evidence_answer']);
  assert.equal(result.run.usage.toolCalls, 4); assert.equal(f.captures.length, 0);
  assert.equal(result.session.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c1').status, 'supported');
  assert.equal(result.session.plan.entries[0].qualification.status, 'needs_verification');
});

test('an optional missing profile field cannot block a source-backed preliminary answer', async () => {
  const f = adaptiveFixture();
  // The request identifies the funded course, without authorizing a stored
  // current-enrollment value. That unknown must survive, but need not stop the
  // independent explanation of the actual course and policy clauses.
  f.goal = f.goal.replace('got admitted to B.Tech', 'am looking for B.Tech funding');
  f.intent.constraints.find(c => c.field === 'educationLevel').role = 'funding';
  f.intent.constraints.find(c => c.field === 'educationLevel').source.quote = 'B.Tech funding';
  f.scheme.rules.push({ id: 'enrollment', field: 'educationLevel', operator: 'EQ', targetValue: 'UG' });
  const result = await memoryJourney(f);
  assert.equal(result.session.status, 'completed');
  assert.equal(result.run.events.some(e => e.tool === 'requestClarification'), false);
  const entry = result.session.plan.entries[0];
  assert.ok(entry.matching.missingFields.includes('educationLevel'));
  assert.equal(entry.matching.status, 'unknown');
  assert.equal(entry.answer.conditions.find(c => c.requirementId === 'c1').status, 'supported');
  assert.ok(entry.answer.conditions.find(c => c.requirementId === 'c1').evidence.length);
  assert.deepEqual(result.provider.calls, ['research_intent', 'evidence_answer']);
});

test('a newly fetched document does not automatically certify current applicability of an outdated catalogue', async () => {
  const f = adaptiveFixture(); f.scheme.freshness.lastVerifiedAt = new Date('2025-01-01T00:00:00Z');
  const result = await memoryJourney(f);
  assert.equal(result.session.status, 'completed'); assert.ok(f.captures.length > 0);
  assert.equal(result.session.plan.entries[0].stale, true);
  assert.ok(result.session.plan.entries[0].answer.conditions.every(condition => condition.status === 'unknown'));
  assert.ok(result.session.plan.research.gaps.some(gap => gap.kind === 'outdated_source'));
});

test('missing policy is acquired, indexed, cited and answered without publishing rules or requiring another model to schedule a sole action', async () => {
  const f = adaptiveFixture({ missing: true }), original = JSON.stringify(f.scheme), result = await memoryJourney(f);
  assert.equal(result.session.status, 'completed'); assert.deepEqual(f.captures, ['guidelines']);
  assert.deepEqual(result.provider.calls, ['research_intent', 'evidence_answer']);
  const entry = result.session.plan.entries[0], proof = entry.answer.conditions.find(c => c.requirementId === 'c1').evidence[0];
  assert.equal(proof.quote, f.clause); assert.ok(entry.citations.some(c => c.id === proof.evidenceId && String(c.evidence.snapshotId) !== f.snapshot._id));
  assert.equal(JSON.stringify(f.scheme), original); assert.equal(result.run.sourceCheckAttempts, 1);
});

test('a semantic decision selects among real source alternatives and preserves a separate answer allowance', async () => {
  const f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true });
  const result = await memoryJourney(f, { choose: packet => {
    assert.ok(packet.evidence.some(passage => passage.quote.includes(f.clause)), 'semantic planning must inspect actual policy evidence first');
    const detail = packet.actions.find(action => action.tool === 'retrieveOfficialGuideline' && action.args.role === 'detail');
    assert.ok(detail); return detail;
  } });
  assert.equal(result.session.status, 'completed');
  assert.deepEqual(result.provider.calls, ['research_intent', 'research_decision', 'evidence_answer']);
  assert.deepEqual(f.captures, ['guidelines', 'detail']); assert.equal(result.session.plan.research.decisions, 1);
  assert.match(result.session.plan.entries[0].answer.conditions.find(c => c.requirementId === 'q0').explanation, /authorised break/);
  assert.ok(result.run.usage.toolCalls <= 10);
});

test('blocked official documents yield an actionable coverage gap, not an inference failure or eligibility rejection', async () => {
  const f = adaptiveFixture({ missing: true, twoSources: true, unavailable: true }), result = await memoryJourney(f);
  assert.equal(result.session.status, 'completed'); assert.equal(result.session.plan.entries.length, 0);
  assert.equal(result.session.plan.answer.reason, 'SOURCE_COVERAGE_GAP');
  assert.equal(result.session.plan.research.stopReason, 'source_coverage_gap');
  assert.equal(result.session.plan.research.gaps[0].attemptedOfficialSource, true);
  assert.match(result.session.plan.research.gaps[0].message, /official source was attempted/);
  assert.equal(result.provider.calls.filter(c => c === 'evidence_answer').length, 0);
  assert.equal(new Set(f.captures).size, f.captures.length); assert.ok(result.run.sourceCheckAttempts <= 2);
  assert.equal(researchSummary(result.session.plan).counts.excluded, 0);
});

test('tool exhaustion stops before network/inference work with preserved source-gap diagnostics', async () => {
  const f = adaptiveFixture({ missing: true }), result = await memoryJourney(f, { tools: 2 });
  assert.equal(result.session.status, 'completed'); assert.equal(result.run.usage.toolCalls, 2);
  assert.equal(result.session.plan.research.stopReason, 'budget_exhausted');
  assert.deepEqual(result.provider.calls, ['research_intent']); assert.equal(f.captures.length, 0);
});

test('provider quota during planning preserves deterministic research and never retries or attempts synthesis', async () => {
  const f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), result = await memoryJourney(f, { failDecision: 'PROVIDER_QUOTA' });
  assert.equal(result.session.status, 'completed');
  assert.deepEqual(result.provider.calls, ['research_intent', 'research_decision']);
  assert.equal(result.session.plan.answer.reason, 'PROVIDER_QUOTA');
  assert.ok(result.session.plan.entries[0].citations.length > 0);
  assert.equal(result.session.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c2').status, 'supported');
});

test('a synthesis timeout preserves the researched sources and independent recorded findings', async () => {
  const f = adaptiveFixture(), base = adaptiveProvider(f);
  const provider = { ...base, async complete(input) { if (input.mode === 'evidence_answer') { base.calls.push(input.mode); throw new NavigatorError('PROVIDER_TIMEOUT', 'Synthetic timeout'); } return base.complete(input); } };
  const result = await memoryJourney(f, { provider });
  assert.equal(result.session.status, 'completed'); assert.equal(result.session.plan.answer.reason, 'PROVIDER_TIMEOUT');
  assert.equal(result.session.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c2').status, 'supported');
  assert.ok(result.session.plan.entries[0].citations.length > 0); assert.deepEqual(base.calls, ['research_intent', 'evidence_answer']);
});

test('malformed decisions fall back to bounded local actions instead of repeating inference', async () => {
  const f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), provider = adaptiveProvider(f, { choose: () => ({ id: 'invented action' }) });
  const result = await memoryJourney(f, { provider });
  assert.equal(result.session.status, 'completed'); assert.equal(provider.calls.filter(c => c === 'research_decision').length, 1);
  assert.ok(result.session.plan.answer.acceptedAssessments > 0);
});

test('decision wire IDs are constrained to the actual menu and arbitrary tools or requirement IDs cannot execute', () => {
  const menu = [{ id: 'read-actual-source', tool: 'findGuidelinePassages', args: { schemeId: SCHEME_ID, query: 'admission' } }], requirements = [{ id: 'c1' }];
  const messages = [{ role: 'user', content: JSON.stringify({ actions: menu, requirements }) }];
  assert.deepEqual(decisionResponseFormat(messages).json_schema.schema.properties.actionId.enum, ['read-actual-source', 'stop']);
  for (const value of [{ actionId: 'publishRule', query: '', focus: [] }, { actionId: 'read-actual-source', query: '', focus: ['arbitrary'] }]) {
    assert.throws(() => parseDecision({ message: { content: JSON.stringify(value) } }, menu, requirements), error => error.code === 'MODEL_PROTOCOL');
  }
});

test('semantic action selection can compare actual scoped policy for unread candidates, not merely their titles', async () => {
  const f = adaptiveFixture(), { retrieval } = compileResearchIntent(admissionIntent), tools = createResearchTools({ repository: f.repository, retrieval, includeContext: true });
  const search = await tools.execute('searchScholarships', {}), card = search.schemes[0];
  assert.ok(card.research.policyPreview.quote.includes(f.clause));
  assert.ok(card.research.policyPreview.id.startsWith('ev_'));
  const session = { goal: f.goal, conversation: [], retrieval, research: { ...initialResearch(), cards: search.schemes }, context: tools.exportState() };
  const packet = JSON.parse(decisionMessages(session, [{ id: 'read', tool: 'findGuidelinePassages', args: { schemeId: SCHEME_ID, query: 'admission' } }], { limits: { maxToolCalls: 8 }, usage: { toolCalls: 1 } }).at(-1).content);
  assert.equal(packet.candidates[0].policyPreview.quote, card.research.policyPreview.quote);
  assert.equal(packet.candidates[0].policyPreview.url, f.snapshot.url);
  assert.equal(card.qualification.status, 'needs_verification', 'a preview is never promoted to a verified finding');
});

test('the actual provider adapter sends a bounded strict decision schema and accounts for one request', async () => {
  const actions = [{ id: 'a-source-action', tool: 'findGuidelinePassages', args: { schemeId: SCHEME_ID, query: 'conditions' }, reason: 'inspect_policy' }];
  let calls = 0, reserved = 0;
  const provider = createGroqProvider({ apiKey: 'synthetic-only', model: 'openai/gpt-oss-120b', fetchImpl: async (url, request) => {
    calls++; const body = JSON.parse(request.body);
    assert.equal(body.tools, undefined); assert.equal(body.response_format.json_schema.strict, true);
    assert.deepEqual(body.response_format.json_schema.schema.properties.actionId.enum, ['a-source-action', 'stop']);
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ actionId: 'a-source-action', query: 'admission conditions', focus: ['c1'] }) } }], usage: { prompt_tokens: 50, completion_tokens: 30 } }), { headers: { 'content-type': 'application/json' } });
  } });
  const result = await provider.complete({ mode: 'research_decision', messages: [{ role: 'user', content: JSON.stringify({ actions, requirements: [{ id: 'c1' }] }) }], reserveCall: async () => reserved++ });
  assert.equal(parseDecision(result, actions, [{ id: 'c1' }]).args.query, 'admission conditions');
  assert.equal(calls, 1); assert.equal(reserved, 1);
});

test('retrieval focus reaches passage selection and cannot modify validated exclusions or invent a requirement', async () => {
  const f = adaptiveFixture(), { retrieval } = compileResearchIntent(admissionIntent), tools = createResearchTools({ repository: f.repository, retrieval, includeContext: true });
  await assert.rejects(tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'something new', focus: ['c9'] }), error => error.code === 'INVALID_TOOL_ARGUMENTS');
  const first = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'admission', focus: ['c1'] });
  const second = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'admission', focus: ['c1'], excludeEvidenceIds: first.passages.map(p => p.id) });
  assert.ok(second.passages.every(p => !first.passages.some(old => old.id === p.id)));
});
