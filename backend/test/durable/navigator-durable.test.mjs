import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { makeEvidence } from '../../src/pipeline/core/evidence.js';
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../../src/models/User.js";
import { createNavigatorRouter } from "../../src/agents/navigator/http.js";
import { createMongoRunStore } from "../../src/agents/navigator/mongoRunStore.js";
import { NavigatorMongoCheckpointer } from "../../src/agents/navigator/mongoCheckpointer.js";
import { createDurableNavigator } from "../../src/agents/navigator/durableNavigator.js";
import { createMongoResearchRepository } from "../../src/agents/navigator/mongoRepository.js";
import { createGroqProvider } from "../../src/agents/navigator/groqProvider.js";
import { createGeminiProvider } from '../../src/agents/navigator/geminiProvider.js';
import { researchExecutionBudgets } from '../../src/agents/navigator/executionBudgets.js';
import { createResearchProvider } from '../../src/agents/navigator/provider.js';
import { compareWithPersistentQuotas } from '../../src/scripts/compareNavigatorProviders.js';
import { comparisonCases, prepareComparisonCase } from '../../evaluations/navigatorCases.js';
import { NavigatorError } from "../../src/agents/navigator/contracts.js";
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { researchFixture, SCHEME_ID, FIXTURE_NOW, toolCall, intentCall } from "../navigatorHelpers.js";
import { savedReplayFixture, reviewedReplayAnswer, UP_ID, PRAGATI_ID } from '../navigatorReplayFixture.js';
import { admissionBrief, admissionIntent, admissionFixture } from '../admissionIntentFixture.js';
import { namedResearchFixture, TOP_CLASS_SC, POST_MATRIC_REGIONAL } from '../namedResearchFixture.js';
import { researchSummary } from '../../../frontend/src/navigator/researchSummary.js';
import { parseRun } from '../../../frontend/src/navigator/contracts.js';
import { adaptiveFixture, adaptiveProvider } from '../adaptiveFixture.js';

const uri = process.env.NAVIGATOR_TEST_MONGO;
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/\?directConnection=true$/.test(uri ?? "")) throw new Error("Run test:navigator:durable to create an isolated local database.");
const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 1000 });
const databases = [];
before(() => client.connect());
after(async () => { for (const db of databases) await db.dropDatabase(); await client.close(); });
const owner = () => randomUUID().replaceAll("-", "").slice(0, 24);
const code = expected => error => error instanceof NavigatorError && error.code === expected;
const config = { enabled: true, maxModelCalls: 6, maxToolCalls: 12, globalDailyLimit: 100, userDailyLimit: 20 };
const limits = { maxModelCalls: 6, maxToolCalls: 12 };

test('frequent execution checks omit research payloads while retaining ownership, cancellation and lease fencing', async () => {
  const { store } = await setup();
  const run = await start(store), { lease } = await acquire(store, run);
  await store.mutate(lease, () => ({ checkpoints: [{ payload: 'x'.repeat(180000) }],
    pendingCheckpointWrites: [{ payload: 'y'.repeat(90000) }], plan: { payload: 'z'.repeat(60000) } }));
  const full = await store.readLease(lease), control = await store.readControl(lease);
  assert.equal(control.checkpoints, undefined); assert.equal(control.pendingCheckpointWrites, undefined); assert.equal(control.plan, undefined);
  for (const field of ['ownerId', 'provider', 'model', 'limits', 'usage', 'lease', '_version', 'privateProfile']) assert.deepEqual(control[field], full[field]);
  const fullBytes = Buffer.byteLength(JSON.stringify(full)), controlBytes = Buffer.byteLength(JSON.stringify(control));
  assert.ok(controlBytes < fullBytes / 100);
  await assert.rejects(store.readControl({ ...lease, ownerId: owner() }), code('LEASE_LOST'));
  await store.cancel(run.ownerId, run._id);
  await assert.rejects(store.readControl(lease), code('LEASE_LOST'));
});

test('Gemini timeout preserves the brief, stage diagnostics and single charged attempt in MongoDB', async () => {
  const budget = researchExecutionBudgets({ timeoutMs: 45000 }), { store } = await setup({ leaseMs: budget.leaseMs });
  let calls = 0;
  const provider = createGeminiProvider({ apiKey: 'synthetic-only', model: 'gemini-3.8-flash', timeoutMs: 8,
    fetchImpl: async () => { calls++; return new Promise(() => {}); } });
  const agent = createDurableNavigator({ store, provider, repository: researchFixture().repository,
    config, maxAdvanceMs: budget.maxAdvanceMs, env: {}, now: () => FIXTURE_NOW });
  const ownerId = owner(), initial = await agent.start(ownerId, request('Synthetic unchanged question for timeout recovery'));
  const run = await advance(agent, ownerId, initial);
  assert.equal(run.status, 'partial'); assert.equal(run.error.code, 'PROVIDER_TIMEOUT');
  assert.match(run.error.message, /do not need to rewrite/); assert.equal(run.goal, initial.goal);
  assert.equal(run.usage.modelCalls, 1); assert.equal(run.usage.toolCalls, 0); assert.equal(calls, 1);
  assert.equal(run.events.find(event => event.type === 'model_failed').provider.reason, 'response_timeout');
  assert.equal(run.events.find(event => event.type === 'model_failed').provider.budgetMs, 8);
});

test('Gemini native transport persists adaptive findings, usage and provider pinning across executor restarts', async () => {
  const { store } = await setup(), f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), scripted = adaptiveProvider(f);
  const provider = createGeminiProvider({ apiKey: 'synthetic-only', model: 'gemini-3.8-flash', fetchImpl: async (_, request) => {
    const body = JSON.parse(request.body), schema = body.generationConfig.responseJsonSchema;
    const mode = schema.properties.assessments ? 'evidence_answer' : schema.properties.actionId ? 'research_decision' : 'research_intent';
    const messages = [{ role: 'system', content: body.systemInstruction.parts.map(p => p.text).join('\n') }, ...body.contents.map(c => ({ role: 'user', content: c.parts[0].text }))];
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: (await scripted.complete({ mode, messages })).message.content }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, thoughtsTokenCount: 20, totalTokenCount: 160 } }), { headers: { 'content-type': 'application/json' } });
  } });
  const ownerId = owner(), make = selected => createDurableNavigator({ store, provider: selected ?? provider, repository: f.repository, sourceChecker: f.sourceChecker,
    config: { ...config, adaptiveResearch: true, maxModelCalls: 3, maxToolCalls: 10 }, env: {}, now: () => FIXTURE_NOW });
  let run = await make().start(ownerId, request(f.goal));
  assert.equal(run.provider, 'gemini'); assert.equal(run.model, provider.model);
  await assert.rejects(advance(make({ name: 'groq', model: 'openai/gpt-oss-120b', complete: async () => assert.fail('must never fail over') }), ownerId, run), code('MODEL_CHANGED'));
  assert.equal((await make().get(ownerId, run.runId)).usage.modelCalls, 0);
  for (let i = 0; i < 40 && ['ready', 'awaiting_input'].includes(run.status); i++) run = await advance(make(), ownerId, run, run.status === 'awaiting_input' ? { clarification: { skip: true, answers: {} } } : {});
  assert.equal(run.status, 'completed', JSON.stringify(run.error));
  assert.equal(run.usage.modelCalls, 3); assert.equal(run.usage.reportedModelCalls, 3); assert.equal(run.usage.outputTokens, 180);
  const parsed = parseRun(await publicRead(make(), store, ownerId, run.runId));
  assert.equal(parsed.provider, 'gemini'); assert.equal(parsed.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c1').status, 'supported');
  assert.equal(parsed.plan.entries[0].answer.conditions.find(c => c.requirementId === 'q0').status, 'unknown');
});

function comparisonProvider(name, prepared, quota = false) {
  return createResearchProvider({ provider: name, apiKey: 'synthetic-only', model: name === 'groq' ? 'openai/gpt-oss-120b' : 'gemini-3.8-flash', fetchImpl: async (_, request) => {
    if (quota) return new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '2s' }] } }), { status: 429, headers: { 'content-type': 'application/json' } });
    const body = JSON.parse(request.body), schema = name === 'groq' ? body.response_format.json_schema.schema : body.generationConfig.responseJsonSchema;
    const text = schema.properties.assessments ? JSON.stringify({ assessments: [{ schemeId: prepared.schemeId, requirementId: 'c0', status: 'contradicted', dependsOn: [],
      explanation: 'The SC/ST-only clause conflicts with the OBC condition.', evidence: [{ evidenceId: prepared.packet.context.candidates[0].passages[0].id, quote: prepared.item.clauses[0], relation: 'contradicts' }] }] }) : JSON.stringify(prepared.intent);
    return new Response(JSON.stringify(name === 'groq' ? { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: text } }], usage: { prompt_tokens: 100, completion_tokens: 40 } }
      : { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, thoughtsTokenCount: 20, totalTokenCount: 160 } }), { headers: { 'content-type': 'application/json' } });
  } });
}

test('provider comparison uses the real persistent quota ledger and deletes only its synthetic runs', async () => {
  const { store, db } = await setup(), prepared = await prepareComparisonCase(comparisonCases[0]);
  const report = await compareWithPersistentQuotas({ store, configs: new Map([['groq', config], ['gemini', config]]), providers: ['groq', 'gemini'].map(name => comparisonProvider(name, prepared)), cases: [prepared], maxCalls: 4 });
  assert.equal(report.calls, 4); assert.equal(report.stopped, null);
  assert.ok(report.summaries.every(summary => summary.correctConditions === 1 && summary.unsupportedClaims === 0 && summary.reservedCalls === 2));
  assert.equal(report.summaries.find(s => s.provider === 'gemini').outputTokens, 120);
  assert.equal(await db.collection('navigator_runs').countDocuments(), 0);
  for (const provider of ['groq', 'gemini']) assert.equal((await db.collection('navigator_quotas').findOne({ _id: provider })).used, 2);
});

test('student evaluation callback retains daily quotas across temporary case runs and never retries a blocked call', async () => {
  const { store, db } = await setup(); let requests = 0;
  const provider = { name: 'gemini', model: 'synthetic-ledger-only', async complete(request) {
    await request.reserveCall({}); requests++; return { message: { content: '{}' }, usage: { inputTokens: 10, outputTokens: 5 } };
  } };
  const invoke = () => compareWithPersistentQuotas({ store, providers: [provider], configs: new Map([['gemini', { ...config, userDailyLimit: 2 }]]),
    cases: [], maxCalls: 1, evaluate: async ({ providers, reserveCall }) => {
      await providers[0].complete({ reserveCall: () => reserveCall(providers[0]) }); return { charged: 1 };
    } });
  await invoke(); await invoke();
  await assert.rejects(invoke(), code('QUOTA_EXHAUSTED'));
  assert.equal(requests, 2); assert.equal((await db.collection('navigator_quotas').findOne({ _id: 'gemini' })).used, 2);
  assert.equal(await db.collection('navigator_runs').countDocuments(), 0);
});

test('Gemini cooldown cannot block Groq reservations or consume a second Gemini request', async () => {
  const { store } = await setup();
  const create = async provider => { const run = await store.create({ ownerId: owner(), requestId: randomUUID(), goal: 'Synthetic quota isolation', profile: {}, provider, model: 'synthetic', limits }); return (await acquire(store, run)).lease; };
  const gemini = await create('gemini'), groq = await create('groq');
  await store.reserveModel(gemini, config); await store.cooldown('gemini', 30);
  await assert.rejects(store.reserveModel(gemini, config), code('PROVIDER_QUOTA'));
  await store.reserveModel(groq, config);
  assert.equal((await store.readLease(gemini)).usage.modelCalls, 1); assert.equal((await store.readLease(groq)).usage.modelCalls, 1);
});

test('comparison 429 stops both-provider evaluation without retries, preserves cooldown and never refunds calls', async () => {
  const { store, db } = await setup(), prepared = await prepareComparisonCase(comparisonCases[0]);
  const report = await compareWithPersistentQuotas({ store, configs: new Map([['groq', config], ['gemini', config]]), providers: [comparisonProvider('groq', prepared), comparisonProvider('gemini', prepared, true)], cases: [prepared], maxCalls: 4 });
  assert.equal(report.calls, 2); assert.equal(report.stopped, 'PROVIDER_QUOTA'); assert.equal(report.results.length, 2);
  assert.equal(await db.collection('navigator_runs').countDocuments(), 0);
  const quota = await db.collection('navigator_quotas').findOne({ _id: 'gemini' }); assert.equal(quota.used, 1); assert.ok(quota.cooldownUntil instanceof Date);
});
const request = (goal = "Research recorded scholarship support") => ({ requestId: randomUUID(), goal, profile: {} });

test('adaptive official acquisition survives Mongo checkpoints and HTTP without publishing policy or losing immutable versions', async t => {
  const { store, db } = await setup(), f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), ownerId = owner();
  const connection = await mongoose.createConnection(uri, { dbName: db.databaseName, autoIndex: false }).asPromise();
  try {
    const snapshotModel = connection.model('AdaptiveSnapshot', new mongoose.Schema({}, { strict: false, collection: 'adaptive_snapshots' }));
    await snapshotModel.collection.createIndex({ url: 1, textHash: 1 }, { unique: true });
    await snapshotModel.create(f.snapshot);
    const archive = createMongoResearchRepository({ SnapshotModel: snapshotModel });
    f.repository.saveSnapshot = archive.saveSnapshot;
    f.repository.getSnapshots = ids => snapshotModel.find({ _id: { $in: ids } }).lean();
    const acquire = f.sourceChecker.acquire;
    f.sourceChecker.acquire = async args => {
      const result = await acquire(args); result.snapshot.text += '\nThe scholarship provider reviews applications before making any award decision.';
      result.snapshot.textHash = createHash('sha256').update(result.snapshot.text).digest('hex'); result.snapshot.sha256 = result.snapshot.textHash; return result;
    };
    const provider = adaptiveProvider(f), original = JSON.stringify(f.scheme);
    const make = () => createDurableNavigator({ store, provider, repository: f.repository, sourceChecker: f.sourceChecker, config: { ...config, adaptiveResearch: true, maxToolCalls: 10, maxModelCalls: 3 }, env: {}, now: () => FIXTURE_NOW });
    let run = await make().start(ownerId, request(f.goal));
    assert.equal(run.workflow, 'adaptive_v2'); assert.equal(run.limits.maxModelCalls, 3);
    for (let i = 0; i < 40 && ['ready', 'awaiting_input'].includes(run.status); i++) run = await advance(make(), ownerId, run, run.status === 'awaiting_input' ? { clarification: { skip: true, answers: {} } } : {});
    assert.equal(run.status, 'completed', JSON.stringify(run.error));
    assert.deepEqual(provider.calls, ['research_intent', 'research_decision', 'evidence_answer']);
    assert.equal(run.plan.research.decisions, 1); assert.ok(run.plan.research.actions.some(action => action.tool === 'retrieveOfficialGuideline' && action.status === 'captured'));
    assert.equal(await snapshotModel.countDocuments(), 3); assert.equal((await snapshotModel.findById(f.snapshot._id).lean()).text, f.snapshot.text);
    assert.equal(JSON.stringify(f.scheme), original); assert.deepEqual(f.captures, ['guidelines', 'detail']);
    const parsed = parseRun(await publicRead(make(), store, ownerId, run.runId));
    assert.equal(parsed.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c1').evidence[0].quote, f.clause);
    assert.equal(parsed.plan.entries[0].qualification.status, 'needs_verification');
    await publicRead(make(), store, ownerId, run.runId); assert.equal(provider.calls.length, 3);
    t.diagnostic(`Adaptive fixture: ${run.usage.modelCalls} model calls; ${run.usage.toolCalls} tool calls; ${run.plan.answer.inputCharacters} answer-context characters. Scripted inference only.`);
  } finally { await connection.close(); }
});

test('adaptive interrupted charged semantic decision is not repeated after reconstruction', async () => {
  const { store } = await setup(), f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), ownerId = owner(), base = adaptiveProvider(f);
  const provider = { ...base, async complete(input) { if (input.mode === 'research_decision') { base.calls.push(input.mode); throw new NavigatorError('CANCELLED', 'Synthetic process interruption'); } return base.complete(input); } };
  const make = () => createDurableNavigator({ store, provider, repository: f.repository, sourceChecker: f.sourceChecker, config: { ...config, adaptiveResearch: true, maxModelCalls: 3, maxToolCalls: 10 }, env: {}, now: () => FIXTURE_NOW });
  let run = await make().start(ownerId, request(f.goal));
  for (let i = 0; i < 8 && run.status === 'ready'; i++) run = await advance(make(), ownerId, run);
  assert.equal(run.status, 'interrupted'); assert.equal(run.usage.modelCalls, 2);
  run = await advance(make(), ownerId, run);
  for (let i = 0; i < 30 && run.status === 'ready'; i++) run = await advance(make(), ownerId, run);
  assert.equal(run.status, 'completed', JSON.stringify(run.error));
  assert.equal(base.calls.filter(mode => mode === 'research_decision').length, 1); assert.equal(run.usage.modelCalls, 3);
});

test('adaptive network acquisition interrupted after reservation is not automatically repeated', async () => {
  const { store } = await setup(), f = adaptiveFixture({ missing: true }), ownerId = owner(), provider = adaptiveProvider(f); let attempts = 0;
  f.sourceChecker.acquire = async ({ reserve }) => { await reserve(); attempts++; throw new NavigatorError('CANCELLED', 'Synthetic interrupted fetch'); };
  const make = () => createDurableNavigator({ store, provider, repository: f.repository, sourceChecker: f.sourceChecker, config: { ...config, adaptiveResearch: true, maxModelCalls: 3, maxToolCalls: 10 }, env: {}, now: () => FIXTURE_NOW });
  let run = await make().start(ownerId, request(admissionBrief));
  for (let i = 0; i < 10 && run.status === 'ready'; i++) run = await advance(make(), ownerId, run);
  assert.equal(run.status, 'interrupted'); assert.equal(attempts, 1);
  run = await advance(make(), ownerId, run);
  for (let i = 0; i < 30 && run.status === 'ready'; i++) run = await advance(make(), ownerId, run);
  assert.equal(run.status, 'completed', JSON.stringify(run.error)); assert.equal(attempts, 1);
  assert.equal(run.plan.answer.reason, 'SOURCE_COVERAGE_GAP'); assert.ok(!provider.calls.includes('evidence_answer'));
});

test('adaptive planning leaves the last daily allowance for synthesis instead of consuming it', async () => {
  const { store } = await setup(), f = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), ownerId = owner(), provider = adaptiveProvider(f);
  const make = () => createDurableNavigator({ store, provider, repository: f.repository, sourceChecker: f.sourceChecker, config: { ...config, adaptiveResearch: true, maxModelCalls: 3, maxToolCalls: 10, userDailyLimit: 2 }, env: {}, now: () => FIXTURE_NOW });
  let run = await make().start(ownerId, request(f.goal));
  for (let i = 0; i < 40 && run.status === 'ready'; i++) run = await advance(make(), ownerId, run);
  assert.equal(run.status, 'completed', JSON.stringify(run.error));
  assert.deepEqual(provider.calls, ['research_intent', 'evidence_answer']);
  assert.equal(run.usage.modelCalls, 2); assert.ok(run.plan.answer.acceptedAssessments > 0);
});

test('adaptive public-source replay prioritizes the engineering request while preserving unknown income and schooling versus domicile', async () => {
  const { store } = await setup(), f = savedReplayFixture(), ownerId = owner(), calls = [];
  const provider = providerFor(async ({ mode, messages }) => {
    calls.push(mode);
    if (mode === 'research_intent') return { intentFormat: 'json_schema', message: { content: JSON.stringify(f.intent) } };
    if (mode === 'research_decision') { const packet = JSON.parse(messages.at(-1).content); return { message: { content: JSON.stringify({ actionId: packet.actions.find(a => a.tool === 'findGuidelinePassages' && a.args.schemeId === PRAGATI_ID)?.id ?? packet.actions[0]?.id ?? 'stop', query: '', focus: [] }) } }; }
    return reviewedReplayAnswer(messages);
  });
  const make = () => createDurableNavigator({ store, provider, repository: f.repository, config: { ...config, adaptiveResearch: true, maxModelCalls: 3, maxToolCalls: 10 }, env: {}, now: () => new Date(f.now) });
  let run = await make().start(ownerId, request(f.question));
  for (let i = 0; i < 40 && ['ready', 'awaiting_input'].includes(run.status); i++) run = await advance(make(), ownerId, run, run.status === 'awaiting_input' ? { clarification: { skip: true, answers: {} } } : {});
  assert.equal(run.status, 'completed', JSON.stringify(run.error));
  const up = run.plan.entries.find(e => e.schemeId === UP_ID); assert.ok(up);
  assert.ok(run.plan.entries.some(e => e.schemeId === PRAGATI_ID));
  assert.equal(up.matching.failedCount, 0);
  // This UP capture has no encoded income rule; Pragati has a recorded limit.
  // Unknown income must be retained where it is actually required, not invented.
  assert.ok(run.plan.entries.find(e => e.schemeId === PRAGATI_ID).matching.missingFields.includes('familyIncome'));
  assert.equal(up.answer.conditions.find(c => c.requirementId === 'c3').status, 'unknown');
  assert.ok(!run.plan.entries.some(e => /VJNT|Swami Vivekananda/.test(e.title)));
  assert.ok(run.plan.answer.acceptedAssessments > 0); assert.ok(calls.length <= 3);
  parseRun(await publicRead(make(), store, ownerId, run.runId));
});

async function publicRead(agent, store, ownerId, runId) {
	const app = express(); app.use('/api/navigator', createNavigatorRouter({ getRuntime: () => ({ service: agent, store, ready: () => true }),
		authenticate: (req, res, next) => { req.user = { _id: ownerId }; next(); } }));
	const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
	try {
		const result = await fetch(`http://127.0.0.1:${server.address().port}/api/navigator/runs/${runId}`);
		assert.equal(result.status, 200); return (await result.json()).run;
	} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('the admission/income comparison reaches cited findings through strict transport, restart and HTTP in two synthetic calls', async t => {
	const { store } = await setup(), f = admissionFixture(), ownerId = owner(), requests = [];
	const provider = createGroqProvider({ apiKey: 'synthetic-only', model: 'openai/gpt-oss-120b', fetchImpl: async (url, request) => {
		assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
		const body = JSON.parse(request.body), mode = body.response_format.json_schema.name;
		requests.push({ mode, characters: request.body.length });
		assert.equal(body.response_format.json_schema.strict, true); assert.equal(body.tools, undefined);
		let content = admissionIntent;
		if (mode === 'evidence_answer') {
			const packet = JSON.parse(body.messages.at(-1).content), candidate = packet.candidates.find(c => c.schemeId === SCHEME_ID);
			assert.equal(packet.question, admissionBrief); assert.equal(packet.candidates.length, 1);
			assert.equal(packet.requirements.find(r => r.field === 'incomeCeiling').value, 500000);
			const passage = candidate.passages.find(p => p.quote.includes(f.clause));
			assert.ok(passage);
			content = { assessments: [{ schemeId: SCHEME_ID, requirementId: 'c1', status: 'supported', dependsOn: [],
				explanation: 'The guideline includes students admitted to undergraduate engineering. Your institution approval and the other complete conditions still need confirmation.',
				evidence: [{ evidenceId: passage.id, quote: f.clause, relation: 'supports' }] }] };
		} else assert.equal(mode, 'research_intent');
		return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(content) } }],
			usage: { prompt_tokens: 100, completion_tokens: 100 } }), { headers: { 'content-type': 'application/json' } });
	} });
	const create = () => catalogueService(store, provider, { repository: f.repository, now: f.now, config: { ...config, maxModelCalls: 2, maxToolCalls: 8 } });
	let agent = create(), run = await advance(agent, ownerId, await agent.start(ownerId, request(admissionBrief)));
	agent = create(); run = await finishCatalogue(agent, ownerId, run);
	assert.equal(run.usage.modelCalls, 2); assert.ok(run.usage.toolCalls <= 8);
	assert.deepEqual(requests.map(r => r.mode), ['research_intent', 'evidence_answer']);
	assert.ok(!run.events.some(event => event.tool === 'requestClarification'), 'do not ask again for stated income/category');
	assert.equal(run.plan.entries.length, 1); assert.equal(run.plan.entries[0].schemeId, SCHEME_ID);
	const excluded = run.plan.coverage.excluded.find(entry => entry.schemeId === String(f.other._id));
	assert.equal(excluded.conditions.find(c => c.id === 'c2').status, 'mismatch');
	const entry = run.plan.entries[0]; assert.equal(entry.qualification.status, 'needs_verification');
	assert.equal(entry.answer.conditions.find(c => c.requirementId === 'c2').status, 'supported');
	assert.equal(entry.answer.conditions.find(c => c.requirementId === 'c1').evidence[0].quote, f.clause);
	assert.equal(run.plan.answer.status, 'answered', 'all three requested conditions have findings; this still does not certify institution approval or whole eligibility');
	const read = await publicRead(agent, store, ownerId, run.runId);
	assert.equal(read.plan.entries[0].schemeId, SCHEME_ID); assert.equal(requests.length, 2);
	assert.deepEqual((await store.getOwned(ownerId, run.runId)).privateProfile, {});
	t.diagnostic(`Synthetic comparison: ${run.usage.toolCalls} tools; request characters ${requests.map(r => `${r.mode}=${r.characters}`).join(', ')}. No live accuracy/token claim.`);
});

test('captured named-scheme failure replays through real Mongo discovery, independent answer recovery, restart and student contract', async t => {
  const { store, db } = await setup(), f = namedResearchFixture(), ownerId = owner(), calls = [];
  const connection = await mongoose.createConnection(uri, { dbName: db.databaseName, autoIndex: false }).asPromise();
  try {
    const schemes = connection.model('NamedScheme', new mongoose.Schema({}, { strict: false, collection: 'named_schemes' }));
    const snapshots = connection.model('NamedSnapshot', new mongoose.Schema({}, { strict: false, collection: 'named_snapshots' }));
    await schemes.insertMany(f.schemes); await snapshots.insertMany(f.snapshots);
    const repository = createMongoResearchRepository({ ScholarshipModel: schemes, SnapshotModel: snapshots });
    const provider = createGroqProvider({ apiKey: 'synthetic-only', model: 'openai/gpt-oss-120b', fetchImpl: async (url, request) => {
      const body = JSON.parse(request.body), mode = body.response_format.json_schema.name; calls.push(mode);
      let output = admissionIntent;
      if (mode === 'evidence_answer') {
        const packet = JSON.parse(body.messages.at(-1).content), row = body.response_format.json_schema.schema.properties.assessments.items.properties;
        assert.deepEqual(row.schemeId.enum, [TOP_CLASS_SC]); assert.equal(packet.targets.length, 2);
        assert.equal(packet.candidates.length, 1); const candidate = packet.candidates[0];
        const clause = candidate.passages.find(p => p.quote.includes('notified institutions') && p.quote.includes('allocated to the institution'));
        assert.ok(clause);
        output = { assessments: [
          { schemeId: TOP_CLASS_SC, requirementId: 'c1', status: 'unknown', dependsOn: [],
            explanation: 'The saved guideline requires admission to a prescribed course at a notified institution, with an available scholarship slot. B.Tech admission alone does not establish those conditions; confirm your institution and course against the current guideline.',
            evidence: [{ evidenceId: clause.id, quote: clause.quote, relation: 'supports' }] },
          { schemeId: TOP_CLASS_SC, requirementId: 'c2', status: 'supported', dependsOn: [], explanation: 'PRIVATE_OVERSIZED_EXPLANATION'.repeat(30), evidence: [] },
        ] };
      }
      return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(output) } }], usage: { prompt_tokens: 100, completion_tokens: 100 } }), { headers: { 'content-type': 'application/json' } });
    } });
    const rebuild = () => catalogueService(store, provider, { repository, now: () => new Date(f.now), config: { ...config, maxModelCalls: 2, maxToolCalls: 8 } });
    let agent = rebuild(), run = await advance(agent, ownerId, await agent.start(ownerId, request(admissionBrief)));
    agent = rebuild(); run = await finishCatalogue(agent, ownerId, run);
    assert.equal(run.status, 'completed'); assert.equal(run.plan.answer.status, 'partial');
    assert.deepEqual(run.plan.entries.map(e => e.schemeId), [TOP_CLASS_SC]);
    assert.equal(run.plan.targets.find(t => t.id === 's0').status, 'reviewed');
    assert.equal(run.plan.targets.find(t => t.id === 's1').status, 'needs_evidence', 'a regional contradiction is not a nationwide verdict and an ambiguous identity is not established eligibility');
    const excluded = run.plan.coverage.excluded.find(e => e.schemeId === POST_MATRIC_REGIONAL);
    assert.equal(excluded.conditions.find(c => c.id === 'c2').status, 'mismatch');
    assert.ok(run.plan.coverage.deferred.some(e => e.title === 'Bihar Post Matric Scholarship' && e.reason === 'policy_evidence_unavailable'));
    assert.equal(run.plan.answer.acceptedAssessments, 1); assert.equal(run.plan.answer.rejectedAssessments, 1);
    assert.deepEqual(run.plan.answer.diagnostics[0].fields, ['explanation']);
    assert.equal(run.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c2').status, 'supported', 'an invalid additional explanation cannot erase an independent recorded income check');
    assert.match(run.plan.entries[0].answer.conditions.find(c => c.requirementId === 'c1').explanation, /notified institution/);
    assert.equal(run.usage.modelCalls, 2); assert.ok(run.usage.toolCalls <= 8);
    assert.ok(!run.events.some(e => e.tool === 'requestClarification'));
    const read = parseRun(await publicRead(agent, store, ownerId, run.runId));
    assert.equal(researchSummary(read.plan).nextField, null); assert.ok(!JSON.stringify(read).includes('PRIVATE_OVERSIZED'));
    assert.deepEqual((await store.getOwned(ownerId, run.runId)).privateProfile, {});
    await publicRead(rebuild(), store, ownerId, run.runId); assert.equal(calls.length, 2);
    t.diagnostic(`Captured-source Mongo/HTTP replay: 2 mocked model requests, ${run.usage.toolCalls} tools, ${run.plan.answer.inputCharacters} answer input characters. One invalid explanation withheld; cited institution/slot uncertainty and recorded category/income findings retained.`);
  } finally { await connection.close(); }
});

test('intent validation diagnostics survive HTTP recovery without storing rejected values or repeating inference', async () => {
	const { store } = await setup(), ownerId = owner(); let calls = 0;
	const bad = structuredClone(admissionIntent); bad.constraints[2].value = '500000';
	const provider = providerFor(async () => { calls++; return response([intentCall(bad)]); });
	const agent = catalogueService(store, provider);
	let run = await advance(agent, ownerId, await agent.start(ownerId, request(admissionBrief)));
	assert.equal(run.status, 'partial'); assert.equal(run.error.code, 'INVALID_RESEARCH_INTENT');
	assert.match(run.error.message, /income condition/); assert.equal(run.usage.toolCalls, 0);
	const diagnostic = run.events.find(event => event.type === 'model_failed').validation;
	assert.deepEqual(diagnostic, [{ code: 'INVALID_INTENT_SCHEMA', section: 'constraints', index: 2, field: 'incomeCeiling' }]);
	assert.doesNotMatch(JSON.stringify(diagnostic), /500000|5 lakhs|B.Tech/);
	const read = await publicRead(agent, store, ownerId, run.runId);
	assert.deepEqual(read.events.find(event => event.type === 'model_failed').validation, diagnostic);
	run = await advance(agent, ownerId, run);
	assert.equal(calls, 1); assert.equal(run.usage.modelCalls, 1); assert.equal(run.usage.toolCalls, 0);
	await agent.cancel(ownerId, run.runId);
	const fresh = await agent.start(ownerId, request(admissionBrief));
	assert.notEqual(fresh.runId, run.runId); assert.equal(fresh.usage.modelCalls, 0); assert.equal(calls, 1);
	assert.equal((await publicRead(agent, store, ownerId, run.runId)).status, 'cancelled');
});

test('real Mongo entity discovery reserves room across requested names and a missing target finishes honestly without another model call', async () => {
  const { store, db } = await setup(), ownerId = owner();
  const connection = await mongoose.createConnection(uri, { dbName: db.databaseName, autoIndex: false }).asPromise();
  try {
    const model = connection.model('EntityBudget', new mongoose.Schema({}, { strict: false, collection: 'entity_budget' }));
    await model.insertMany([
      ...Array.from({ length: 30 }, (_, index) => ({ title: `Aster Ceramics Award ${index}`, publication: { state: 'published' }, level: 'PG' })),
      { title: 'Different display name', officialTitle: 'LYRA Marine-Science Grant', publication: { state: 'published' }, level: null },
      { title: 'Lyra Marine Science Grant hidden', publication: { state: 'needs_review' } },
    ]);
    const source = { messageIndex: 0, quote: 'fixture' }, repository = createMongoResearchRepository({ ScholarshipModel: model });
    const { retrieval } = compileResearchIntent({ objective: 'Compare named awards', searchQuery: 'Ceramics', questions: [], ambiguities: [], constraints: [
      { field: 'scheme', value: 'Aster Ceramics Award', operator: 'include', role: 'investigate', source },
      { field: 'scheme', value: 'Lyra Marine Science Grant', operator: 'include', role: 'investigate', source },
      { field: 'educationLevel', value: 'UG', operator: 'include', role: 'funding', source },
    ] });
    const candidates = await repository.searchPublished({ retrieval, limit: 6 });
    assert.ok(candidates.length <= 6); assert.equal(candidates[1].officialTitle, 'LYRA Marine-Science Grant');
    assert.equal(candidates[0].level, 'PG', 'an explicitly requested entity is retained so its incompatibility can be explained');
    assert.ok(candidates.every(c => c.publication.state === 'published'));
    let calls = 0; const goal = 'Research Unrecorded Quantum Ceramics Award.';
    const provider = providerFor(async () => { calls++; return response([intentCall({ objective: 'Research the named award', searchQuery: 'Unrecorded Quantum Ceramics Award', constraints: [
      { field: 'scheme', value: 'Unrecorded Quantum Ceramics Award', operator: 'include', role: 'investigate', source: { messageIndex: 0, quote: 'Unrecorded Quantum Ceramics Award' } },
    ] })]); });
    const agent = catalogueService(store, provider, { repository });
    const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, request(goal)));
    assert.equal(run.plan.targets[0].status, 'not_found'); assert.equal(run.plan.entries.length, 0);
    assert.equal(calls, 1); assert.equal(run.usage.modelCalls, 1); assert.equal(run.usage.toolCalls, 2);
    assert.ok(!run.events.some(event => event.tool === 'findGuidelinePassages'));
    parseRun(await publicRead(agent, store, ownerId, run.runId));
  } finally { await connection.close(); }
});
async function setup(options = {}) {
	const db = client.db(`navigator_test_${randomUUID().replaceAll("-", "")}`); databases.push(db);
	const store = createMongoRunStore({ db, ...options }); await store.initialize();
	return { db, store };
}
const start = (store, ownerId = owner(), input = request()) => store.create({ ...input, ownerId, provider: "fixture", model: "scripted", limits });
const acquire = (store, run, extra = {}) => store.acquire({ ownerId: run.ownerId, runId: run._id, revision: run.revision, ...extra });
const response = calls => ({ message: { role: "assistant", content: null, tool_calls: calls }, usage: { inputTokens: 100, outputTokens: 20 } });
const providerFor = complete => ({ name: "fixture", model: "scripted", complete });
// Keep legacy checkpoint/resume coverage; new production defaults are tested separately below.
const service = (store, provider, options = {}) => createDurableNavigator({ store, provider, repository: researchFixture().repository, config, env: {}, workflow: null, ...options });
const advance = (agent, ownerId, run, extra = {}) => agent.advance(ownerId, { runId: run.runId, revision: run.revision, ...extra });

// Preserve the one-call operator configuration and legacy recovery regressions.
// The production two-call answer path is exercised separately below.
const catalogueService = (store, provider, options = {}) => createDurableNavigator({ store, provider, repository: researchFixture().repository, config: { ...config, maxModelCalls: 1, maxToolCalls: 8 }, env: {}, ...options });
async function finishCatalogue(agent, ownerId, run) {
	for (let i = 0; i < 14 && ["ready", "awaiting_input"].includes(run.status); i++) run = await advance(agent, ownerId, run, run.status === "awaiting_input" ? { clarification: { skip: true, answers: {} } } : {});
	assert.equal(run.status, "completed", JSON.stringify(run.error)); return run;
}

test("one-call configured workflow plans once, resumes across service reconstruction and finishes local tools without more inference", async () => {
	const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0;
	const provider = providerFor(async ({ messages, mode }) => {
		calls++; assert.equal(mode, "research_intent"); assert.equal(messages.length, 2); assert.ok(!JSON.stringify(messages).includes("218765"));
		return response([intentCall()]);
	});
	let agent = catalogueService(store, provider, { repository: fixture.repository });
	let run = await advance(agent, ownerId, await agent.start(ownerId, { ...request(), profile: { familyIncome: 218765 } }));
	assert.equal(run.limits.maxModelCalls, 1); assert.equal(calls, 1);
	agent = catalogueService(store, provider, { repository: fixture.repository });
	run = await finishCatalogue(agent, ownerId, run);
	assert.equal(calls, 1); assert.equal(run.plan.preparation, "catalogue"); assert.equal(run.plan.aiAssistance, "search_planning");
	assert.equal(run.plan.entries.length, 2); assert.ok(run.plan.entries.every(entry => entry.matching.status === "passed"));
	assert.equal(run.collectedPassageCount, 2); assert.equal(run.usage.toolCalls, 5);
	assert.ok(!JSON.stringify(run).includes("218765"));
	const raw = await store.getOwned(ownerId, run.runId); assert.deepEqual(raw.privateProfile, {}); assert.deepEqual(raw.checkpoints, []);
});

test("a broad brief uses validated semantic filters and never copies an income hint into matching", async () => {
	const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0, input;
	const repository = { ...fixture.repository, async searchPublished(request) { input = request; return fixture.repository.searchPublished(request); } };
	const agent = catalogueService(store, providerFor(async () => { calls++; return response([intentCall({ searchQuery: "", constraints: [
		{ field: "educationLevel", operator: "include", value: "UG", source: { messageIndex: 0, quote: "undergraduate" } },
		{ field: "state", operator: "include", value: "All India", source: { messageIndex: 0, quote: "national" } },
		{ field: "incomeCeiling", operator: "lt", value: 450000, source: { messageIndex: 0, quote: "under 4.5 lakhs" } },
	] })]); }), { repository });
	const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, request("Find national scholarships for undergraduate college students with family income under 4.5 lakhs.")));
	const { retrieval, ...query } = input;
	assert.deepEqual(query, { query: "", levels: ["UG"], states: ["All India"], incomeCeiling: 450000, limit: 48 });
	assert.deepEqual(retrieval.requirements.map(item => [item.field, item.stage]), [['educationLevel', 'metadata'], ['state', 'metadata'], ['incomeCeiling', 'ranking']]);
	assert.equal(calls, 1); assert.equal(run.usage.modelCalls, 1); assert.equal(run.plan.aiAssistance, "search_planning"); assert.equal(run.plan.entries.length, 2);
	assert.ok(run.plan.entries.every(entry => entry.matching.missingFields.includes("familyIncome")));
	assert.deepEqual(run.plan.intent.unresolved, ["under 4.5 lakhs"]);
});

test("missing inputs ask one durable optional question and answering refreshes matching without another model call", async () => {
	const { store } = await setup(), ownerId = owner(); let calls = 0;
	const provider = providerFor(async () => { calls++; return response([intentCall()]); });
	let agent = catalogueService(store, provider), run = await agent.start(ownerId, request());
	for (let i = 0; i < 10 && run.status === "ready"; i++) run = await advance(agent, ownerId, run);
	assert.equal(run.status, "awaiting_input"); assert.deepEqual(run.clarification.fields, ["familyIncome"]); assert.equal(calls, 1);
	agent = catalogueService(store, provider);
	run = await advance(agent, ownerId, run, { clarification: { skip: false, answers: { familyIncome: 218765 } } });
	run = await finishCatalogue(agent, ownerId, run);
	assert.ok(run.plan.entries.every(entry => entry.matching.status === "passed")); assert.equal(calls, 1);
	assert.ok(!JSON.stringify(run).includes("218765"));
});

test("an empty semantic search preserves its filters instead of silently broadening the request", async () => {
	const { store } = await setup(), fixture = researchFixture(), ownerId = owner(), searches = []; let calls = 0;
	const repository = { ...fixture.repository, async searchPublished(input) { searches.push(input.query); return input.query === "hostel" ? fixture.state.schemes : []; } };
	const agent = catalogueService(store, providerFor(async () => { calls++; return response([intentCall({ searchQuery: "Nonexistent phrase" })]); }), { repository });
	const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, request("Find hostel scholarships")));
	assert.deepEqual(searches, ["Nonexistent phrase"]); assert.equal(calls, 1);
	assert.equal(run.plan.entries.length, 0); assert.equal(run.plan.outcome, "insufficient_evidence"); assert.equal(run.plan.intent.status, "interpreted");
	assert.ok(run.usage.toolCalls <= 8);
});

test("semantic intent retains ordered context, is idempotent and is reused during no-AI recovery after reconstruction", async () => {
	const { db, store } = await setup(), fixture = researchFixture(), ownerId = owner(), inputs = []; let calls = 0;
	const conversation = [{ role: "user", content: "Bachelor's scholarships in Goa." }], goal = "Actually master's only; same location, and exclude national programmes.";
	const provider = providerFor(async ({ messages }) => {
		calls++; assert.deepEqual(messages.slice(1), [...conversation, { role: "user", content: goal }]);
		return response([intentCall({ searchQuery: "", constraints: [
			{ field: "educationLevel", operator: "include", value: "PG", source: { messageIndex: 1, quote: "master's only" } },
			{ field: "state", operator: "include", value: "Goa", source: { messageIndex: 0, quote: "Goa" } },
			{ field: "state", operator: "exclude", value: "All India", source: { messageIndex: 1, quote: "exclude national programmes" } },
		] })]);
	});
	const repository = { ...fixture.repository, async searchPublished(input) { inputs.push(input); return fixture.state.schemes; } };
	let agent = catalogueService(store, provider, { repository }), input = { ...request(goal), conversation };
	let run = await agent.start(ownerId, input); run = await advance(agent, ownerId, run);
	assert.equal((await agent.start(ownerId, input)).runId, run.runId);
	await assert.rejects(agent.start(ownerId, { ...input, conversation: [{ role: "user", content: "Different context" }] }), code("IDEMPOTENCY_CONFLICT"));
	agent = catalogueService(store, provider, { repository });
	run = await agent.researchCatalogue(ownerId, { runId: run.runId, revision: run.revision });
	run = await finishCatalogue(agent, ownerId, run);
	assert.equal(calls, 1); assert.equal(inputs.length, 1);
	const { retrieval, ...query } = inputs[0];
	assert.deepEqual(query, { query: "", levels: ["PG"], states: ["Goa"], excludeStates: ["All India"], limit: 48 });
	assert.equal(retrieval.requirements.find(item => item.field === 'state' && item.operator === 'include').source.messageIndex, 0);
	assert.equal(run.plan.intent.status, "interpreted"); assert.ok(run.plan.intent.constraints.includes("exclude national programmes"));
	assert.equal(run.conversation, undefined); assert.equal((await db.collection("navigator_quotas").findOne({ _id: "fixture" })).used, 1);
});

test("conflicting semantic filters stop with visible clarification requirements without a catalogue search", async () => {
	const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let reads = 0;
	const goal = "Include only PG but exclude PG.";
	const agent = catalogueService(store, providerFor(async () => response([intentCall({ constraints: [
		{ field: "educationLevel", operator: "include", value: "PG", source: { messageIndex: 0, quote: "Include only PG" } },
		{ field: "educationLevel", operator: "exclude", value: "PG", source: { messageIndex: 0, quote: "exclude PG" } },
	] })])), { repository: { ...fixture.repository, async searchPublished() { reads++; return []; } } });
	const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, request(goal)));
	assert.equal(reads, 0); assert.equal(run.plan.intent.status, "needs_clarification");
	assert.equal(run.plan.intent.ambiguities.length, 1); assert.equal(run.plan.entries.length, 0); assert.equal(run.error, null);
});

test("invalid intent anchors expose the failure and never apply guessed filters or repeat inference", async () => {
	const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0, search;
	const goal = "Do not show national schemes; only postgraduate opportunities.";
	const agent = catalogueService(store, providerFor(async () => { calls++; return response([intentCall({ constraints: [
		{ field: "educationLevel", operator: "include", value: "UG", source: { messageIndex: 0, quote: "invented evidence" } },
	] })]); }), { repository: { ...fixture.repository, async searchPublished(input) { search = input; return fixture.state.schemes; } } });
	let run = await agent.start(ownerId, request(goal)); run = await advance(agent, ownerId, run);
    assert.equal(run.status, 'partial'); assert.equal(run.error.code, 'INVALID_RESEARCH_INTENT');
    assert.equal(calls, 1); assert.equal(search, undefined); assert.equal(run.plan, null); assert.equal(run.usage.toolCalls, 0);
    assert.ok(run.events.some(event => event.type === "model_failed" && event.code === "INVALID_RESEARCH_INTENT"));
    // Repeating advance cannot spend another model call or silently discard exclusions.
    run = await advance(agent, ownerId, run); assert.equal(calls, 1); assert.equal(search, undefined);
    run = await agent.researchCatalogue(ownerId, {runId:run.runId,revision:run.revision});
    run = await finishCatalogue(agent, ownerId, run);
    assert.deepEqual(search, { query: goal, limit: 8 }); assert.equal(calls, 1);
    assert.equal(run.plan.intent.status, 'unavailable'); assert.equal(run.plan.aiAssistance, 'not_requested');
});

test("Groq quota pauses intent research; explicit catalogue browsing respects cooldown without inference", async () => {
	const { db, store } = await setup(); let calls = 0;
	const agent = catalogueService(store, providerFor(async () => { calls++; throw new NavigatorError("PROVIDER_QUOTA", "Synthetic limit", { retryAfterSeconds: 42 }); }));
	for (let i = 0; i < 2; i++) {
		const ownerId = owner(); let run = await agent.start(ownerId, request());
        run = await advance(agent, ownerId, run);
        assert.equal(run.status, 'quota_exhausted'); assert.equal(run.error.code, 'PROVIDER_QUOTA');
        assert.equal(run.plan, null); assert.equal(run.usage.toolCalls, 0);
        assert.ok(run.events.some(event => event.type === 'model_failed'));
        run = await agent.researchCatalogue(ownerId, { runId:run.runId, revision:run.revision });
        run = await finishCatalogue(agent, ownerId, run);
        assert.equal(run.plan.aiAssistance, 'not_requested'); assert.equal(run.plan.entries.length, 2);
        assert.equal(run.error, null);
	}
	assert.equal(calls, 1); const quota = await db.collection("navigator_quotas").findOne({ _id: "fixture" });
	assert.equal(quota.used, 1); assert.ok(quota.cooldownUntil instanceof Date);
});

test("invalid planning and empty source coverage terminate honestly without search loops", async () => {
	for (const noSnapshots of [false, true]) {
		const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0;
		if (noSnapshots) fixture.state.snapshots = [];
		const agent = catalogueService(store, providerFor(async () => { calls++; return response([noSnapshots ? intentCall() : toolCall("finishInvestigation", { selections: [] })]); }), { repository: fixture.repository });
        let run = await agent.start(ownerId, request());
        if (!noSnapshots) {
            run = await advance(agent, ownerId, run);
            assert.equal(run.status, 'partial'); assert.equal(run.plan, null); assert.equal(run.usage.toolCalls, 0);
            assert.equal(run.error.code, 'MODEL_PROTOCOL');
            run = await agent.researchCatalogue(ownerId, {runId:run.runId,revision:run.revision});
        }
        run = await finishCatalogue(agent, ownerId, run);
		assert.equal(calls, 1); assert.equal(run.plan.aiAssistance, noSnapshots ? 'search_planning' : 'not_requested');
		assert.equal(run.plan.entries.length, noSnapshots ? 0 : 2);
		assert.equal(run.plan.outcome, noSnapshots ? "insufficient_evidence" : "review_required");
		assert.ok(run.events.filter(event => event.tool === "searchScholarships").length <= 4);
		assert.equal(run.collectedPassageCount, noSnapshots ? 0 : 2);
	}
});

test("a stalled legacy investigation can explicitly recover through authenticated catalogue HTTP with zero additional inference", async () => {
	const { db, store } = await setup(), ownerId = owner(); let calls = 0;
	const provider = providerFor(async () => { calls++; throw new NavigatorError("PROVIDER_QUOTA", "Synthetic limit", { retryAfterSeconds: 42 }); });
	const agent = service(store, provider);
	let run = await advance(agent, ownerId, await agent.start(ownerId, request()));
	const usage = structuredClone(run.usage), quota = await db.collection("navigator_quotas").findOne({ _id: "fixture" });
	await assert.rejects(agent.researchCatalogue(owner(), { runId: run.runId, revision: run.revision }), code("RUN_NOT_FOUND"));
	const app = express(); app.use("/api/navigator", createNavigatorRouter({ getRuntime: () => ({ service: agent, store, ready: () => true }),
		authenticate: (req, res, next) => { req.user = { _id: ownerId }; next(); } }));
	const server = await new Promise(resolve => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
	try {
		const result = await fetch(`http://127.0.0.1:${server.address().port}/api/navigator/runs/${run.runId}/catalogue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision: run.revision }) });
		assert.equal(result.status, 200); run = (await result.json()).run;
		assert.equal(run.catalogueNoAI, true); assert.equal(run.workflow, "catalogue_v1");
	} finally { await new Promise(resolve => server.close(resolve)); }
	run = await finishCatalogue(catalogueService(store, provider), ownerId, run);
	assert.equal(calls, 1); assert.deepEqual(run.usage, usage); assert.equal(run.plan.aiAssistance, "not_requested");
	assert.equal(run.plan.entries.length, 2); assert.equal((await db.collection("navigator_quotas").findOne({ _id: "fixture" })).used, quota.used);
});

test("an ambiguous already charged planning attempt is not repeated, and storage failure never starts inference", async () => {
	const { db, store } = await setup(), ownerId = owner(); let calls = 0;
	const provider = providerFor(async () => { calls++; throw new Error("Must not call"); });
	const agent = catalogueService(store, provider);
	let run = await agent.start(ownerId, request());
	await db.collection("navigator_runs").updateOne({ _id: run.runId }, { $set: { "usage.modelCalls": 1, "usage.tokenUsageIncomplete": true } });
	run = await advance(agent, ownerId, await agent.get(ownerId, run.runId));
    assert.equal(run.status, 'partial'); assert.equal(run.plan, null); assert.equal(run.error.code, 'INVALID_RESEARCH_INTENT');
    assert.equal(calls, 0); assert.equal(run.usage.toolCalls, 0);
    run = await agent.researchCatalogue(ownerId, {runId:run.runId,revision:run.revision});
    run = await finishCatalogue(agent, ownerId, run);
    assert.equal(run.plan.aiAssistance, 'not_requested'); assert.equal(calls, 0);
	const failing = catalogueService({ ...store, reserveModel: async () => { throw new NavigatorError("PERSISTENCE_UNAVAILABLE", "Synthetic storage failure"); } }, provider);
	const failed = await advance(failing, ownerId, await failing.start(ownerId, request()));
	assert.equal(failed.status, "partial"); assert.equal(failed.error.code, "PERSISTENCE_UNAVAILABLE"); assert.equal(calls, 0);
});

test("collected-evidence notes survive a model failure and exhausted budgets with zero further inference", async () => {
	const { db, store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0;
	const provider = providerFor(async () => {
		calls++;
		if (calls === 3) throw new NavigatorError("MODEL_PROTOCOL", "Synthetic invalid tool response");
		return response([calls === 1 ? toolCall("searchScholarships", { query: "income" }) : toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" })]);
	});
	const agent = service(store, provider, { repository: fixture.repository, config: { ...config, maxModelCalls: 3, maxToolCalls: 2 } });
	let run = await agent.start(ownerId, { ...request(), profile: { familyIncome: 218765 } });
	for (let i = 0; i < 3; i++) run = await advance(agent, ownerId, run);
	assert.equal(run.status, "partial"); assert.equal(run.error.code, "MODEL_PROTOCOL");
	const before = JSON.stringify(fixture.state), usage = structuredClone(run.usage);
	await assert.rejects(agent.prepareNotes(owner(), { runId: run.runId, revision: run.revision }), code("RUN_NOT_FOUND"));
	await assert.rejects(agent.prepareNotes(ownerId, { runId: run.runId, revision: run.revision, clarification: { skip: true, answers: {} } }), code("INVALID_RUN_INPUT"));
	const app = express(); app.use("/api/navigator", createNavigatorRouter({ getRuntime: () => ({ service: agent, store, ready: () => true }),
		authenticate: (req, res, next) => { req.user = { _id: ownerId }; next(); } }));
	const server = await new Promise(resolve => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
	let notes;
	try {
		const result = await fetch(`http://127.0.0.1:${server.address().port}/api/navigator/runs/${run.runId}/notes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision: run.revision }) });
		assert.equal(result.status, 200); notes = (await result.json()).run;
	} finally { await new Promise(resolve => server.close(resolve)); }
	assert.equal(notes.status, "completed"); assert.equal(notes.plan.preparation, "collected_evidence"); assert.equal(notes.plan.entries.length, 1);
	assert.equal(notes.plan.entries[0].matching.status, "passed"); assert.equal(calls, 3); assert.deepEqual(notes.usage, usage);
	assert.ok(!JSON.stringify(notes).includes("218765")); assert.equal(JSON.stringify(fixture.state), before);
	assert.equal((await db.collection("navigator_quotas").findOne({ _id: "fixture" })).used, 3);
	const raw = await store.getOwned(ownerId, run.runId); assert.deepEqual(raw.privateProfile, {}); assert.deepEqual(raw.checkpoints, []);
});

test("a zero-call notes request without evidence preserves the existing failure and quota ledger", async () => {
	const { db, store } = await setup(), ownerId = owner(); let calls = 0;
	const agent = service(store, providerFor(async () => { calls++; throw new NavigatorError("PROVIDER_QUOTA", "Synthetic cooldown", { retryAfterSeconds: 42 }); }));
	const run = await advance(agent, ownerId, await agent.start(ownerId, request()));
	const quota = await db.collection("navigator_quotas").findOne({ _id: "fixture" });
	assert.equal(run.error.retryAt, quota.cooldownUntil.toISOString());
	await assert.rejects(agent.prepareNotes(ownerId, { runId: run.runId, revision: run.revision }), code("NO_COLLECTED_EVIDENCE"));
	assert.deepEqual(await agent.get(ownerId, run.runId), run); assert.equal(calls, 1);
	assert.equal((await db.collection("navigator_quotas").findOne({ _id: "fixture" })).used, quota.used);
});

test("catalogue search filters filler/substrings and ranks meaningful matches before the MongoDB result limit", async () => {
	const { db } = await setup();
	const connection = await mongoose.createConnection(uri, { dbName: db.databaseName, autoIndex: false }).asPromise();
	try {
		const model = connection.model("SearchFixture", new mongoose.Schema({}, { strict: false, collection: "search_fixtures" }));
		const published = { publication: { state: "published" }, level: "UG", state: "Goa" };
		await db.collection("search_fixtures").insertMany([
			...Array.from({ length: 10 }, (_, i) => ({ ...published, title: `Hostel travel ${i}`, sortDeadline: new Date("2020-01-01") })),
			{ ...published, title: "Hostel fees support", sortDeadline: new Date("2030-01-01"), privateField: "must not be returned" },
			{ ...published, title: "Residential support", description: "Hostel fees", sortDeadline: new Date("2019-01-01") },
			{ ...published, title: "National art fellowship" }, { ...published, title: "Department fellowship" },
			{ ...published, title: "Hostel fees hidden", publication: { state: "needs_review" } },
			{ ...published, title: "Hostel fees legacy", legacy: true },
			{ ...published, title: "Hostel fees in another state", state: "Maharashtra" },
			{ ...published, title: "Hostel fees postgraduate", level: "PG" },
			{ ...published, title: "छात्रवृत्ति आवास", organization: null, description: null, tags: null },
		]);
		const repo = createMongoResearchRepository({ ScholarshipModel: model });
		const input = { query: "help me find a scholarship for hostel fees", level: "UG", state: "Goa" };
		const found = await repo.searchPublished(input);
		assert.equal(found.length, 8); assert.equal(found[0].title, "Hostel fees support"); assert.equal(found[1].title, "Residential support");
		assert.ok(found.slice(2).every(scheme => scheme.title.startsWith("Hostel travel")));
		assert.ok(found.every(scheme => Object.keys(scheme).every(key => ["_id", "title", "organization", "description", "level", "state", "publication"].includes(key))));
		assert.deepEqual((await repo.searchPublished({ ...input, query: "hostel hostel fees fees" })).map(s => String(s._id)), found.map(s => String(s._id)));
		assert.deepEqual((await repo.searchPublished({ query: "art" })).map(s => s.title), ["National art fellowship"]);
		assert.deepEqual((await repo.searchPublished({ query: "छात्रवृत्ति" })).map(s => s.title), ["छात्रवृत्ति आवास"]);
		assert.deepEqual(await repo.searchPublished({ query: "please help me find a scholarship" }), []);
		assert.equal((await repo.searchPublished({ query: "", limit: 1000 })).length, 8);
		assert.equal((await repo.searchPublished({ query: "hostel", limit: 1 })).length, 1);
		// Undated/null-level records must not displace known undergraduate schemes in a broad query.
		await db.collection("search_fixtures").insertMany([
			{ publication: { state: "published" }, title: "Postdoctoral fellowship with unrecorded level", level: null, state: "All India", sortDeadline: new Date("2000-01-01") },
			{ publication: { state: "published" }, title: "Recorded undergraduate scheme", level: "UG", state: "All India", sortDeadline: new Date("2030-01-01") },
		]);
		const national = await repo.searchPublished({ query: "", level: "UG", state: "All India", limit: 1 });
		assert.equal(national[0].title, "Recorded undergraduate scheme");
		await db.collection("search_fixtures").insertOne({ publication: { state: "published" }, title: "Income ceiling fixture", level: "UG", state: "All India", eligibility: { familyIncome: { max: 450000 } }, sortDeadline: new Date("2031-01-01") });
		const incomeRanked = await repo.searchPublished({ query: "", level: "UG", state: "All India", incomeCeiling: 450000, limit: 1 });
		assert.equal(incomeRanked[0].title, "Income ceiling fixture");
		await db.collection("search_fixtures").insertMany([
			{ publication: { state: "published" }, title: "State postgraduate fixture", level: "PG", state: "Maharashtra" },
			{ publication: { state: "published" }, title: "National postgraduate fixture", level: "PG", state: "All India" },
			{ publication: { state: "published" }, title: "Unknown-level state fixture", level: null, state: "Maharashtra" },
		]);
		const exclusions = await repo.searchPublished({ query: "", levels: ["PG"], states: ["Maharashtra"], excludeLevels: ["UG"], excludeStates: ["All India"] });
		assert.deepEqual(exclusions.map(s => s.title), ["State postgraduate fixture"]);
		const knownNonNational = await repo.searchPublished({ query: "", excludeStates: ["All India"] });
		assert.ok(knownNonNational.every(s => s.state && s.state !== "All India"));
	} finally { await connection.close(); }
});

test('semantic discovery in real Mongo retains unknowns, ranks source topics and enforces normalized exclusions', async () => {
  const { db } = await setup();
  const connection = await mongoose.createConnection(uri, { dbName: db.databaseName, autoIndex: false }).asPromise();
  try {
    const model = connection.model('CoverageFixture', new mongoose.Schema({}, { strict: false, collection: 'coverage_fixtures' }));
    const base = { publication: { state: 'published' }, legacy: false };
    await model.insertMany([
      { ...base, title: 'Accommodation source with missing level', level: null, state: 'UP', fieldEvidence: [{ quote: 'Maintenance allowance for boarders.' }] },
      { ...base, title: 'Known relevant scheme', level: 'UG', state: 'Uttar Pradesh', description: 'Boarding maintenance allowance' },
      { ...base, title: 'Wrong level', level: 'PG', state: 'UP', description: 'Boarding maintenance allowance' },
      { ...base, title: 'Excluded scope', level: null, state: 'All India', description: 'Boarding maintenance allowance' },
      { ...base, title: 'Unknown scope', level: null, state: null, description: 'Boarding maintenance allowance' },
      ...Array.from({ length: 20 }, (_, i) => ({ ...base, title: `Unrelated ${i}`, state: 'UP', sortDeadline: new Date(0) })),
    ]);
    const source = { messageIndex: 0, quote: 'synthetic' };
    const compiled = compileResearchIntent({ objective: 'Funding', searchQuery: '', constraints: [
      { field: 'educationLevel', operator: 'include', value: 'UG', source },
      { field: 'state', operator: 'include', value: 'Uttar Pradesh', source },
      { field: 'state', operator: 'exclude', value: 'All India', source },
      { field: 'other', operator: 'include', value: 'boarding maintenance', source },
    ], questions: [], ambiguities: [] });
    const found = await createMongoResearchRepository({ ScholarshipModel: model }).searchPublished({ ...compiled.search, retrieval: compiled.retrieval });
    assert.ok(found.length <= 8);
    assert.ok(found.slice(0, 3).some(item => item.title === 'Accommodation source with missing level'));
    assert.ok(found.some(item => item.title === 'Unknown scope'));
    assert.ok(found.some(item => item.title === 'Known relevant scheme'));
    assert.ok(!found.some(item => ['Wrong level', 'Excluded scope'].includes(item.title)));
  } finally { await connection.close(); }
});

test('coverage, evidence queries and unknown conditions survive durable reconstruction and notes recovery', async () => {
  const { store } = await setup(), fixture = researchFixture({ linkedPdf: true }), ownerId = owner();
  let calls = 0;
  const goal = 'Boarding support, UG only, no national schemes.';
  fixture.scheme.level = null; fixture.scheme.state = 'Goa'; fixture.other.state = 'All India';
  const source = { messageIndex: 0, quote: goal };
  const provider = providerFor(async () => { calls++; return response([intentCall({ searchQuery: '', constraints: [
    { field: 'educationLevel', operator: 'include', value: 'UG', source }, { field: 'state', operator: 'exclude', value: 'All India', source },
    { field: 'other', operator: 'include', value: 'boarding maintenance', source },
  ] })]); });
  let run = await catalogueService(store, provider, { repository: fixture.repository }).start(ownerId, request(goal));
  for (let i = 0; i < 3; i++) run = await advance(catalogueService(store, provider, { repository: fixture.repository }), ownerId, run);
  assert.ok(run.collectedPassageCount > 0);
  run = await catalogueService(store, provider, { repository: fixture.repository }).prepareNotes(ownerId, { runId: run.runId, revision: run.revision });
  assert.equal(run.status, 'completed'); assert.equal(calls, 1);
  assert.equal(run.plan.entries.length, 1); assert.equal(run.plan.entries[0].retrieval.status, 'unknown');
  assert.equal(run.plan.coverage.excluded[0].schemeId, String(fixture.other._id));
  const condition = run.plan.entries[0].retrieval.conditions.find(item => item.id === 'c2');
  assert.equal(condition.status, 'unknown'); assert.ok(condition.evidenceIds.length);
  assert.equal(run.usage.modelCalls, 1);
});

test("official-source reservations are atomic, survive reconstruction and reject stale leases", async () => {
	const { db, store } = await setup(), run = await start(store), { lease } = await acquire(store, run);
	const attempts = await Promise.allSettled(Array.from({ length: 7 }, () => store.reserveSourceCheck(lease)));
	assert.equal(attempts.filter(item => item.status === "fulfilled").length, 2);
	assert.ok(attempts.filter(item => item.status === "rejected").every(item => item.reason.code === "SOURCE_CHECK_LIMIT"));
	const rebuilt = createMongoRunStore({ db }); await rebuilt.initialize();
	await assert.rejects(rebuilt.reserveSourceCheck(lease), code("SOURCE_CHECK_LIMIT"));
	assert.equal((await store.readLease(lease)).sourceCheckAttempts, 2);
	await store.cancel(run.ownerId, run._id);
	await assert.rejects(rebuilt.reserveSourceCheck(lease), code("LEASE_LOST"));
});

test("durable tool execution retains source receipts and reuses cached checks after every service restart", async () => {
	const { store } = await setup(), ownerId = owner(), fixture = researchFixture();
	const original = JSON.stringify(fixture.state); let models = 0, checks = 0, evidenceId;
	const provider = providerFor(async ({ messages }) => {
		models++;
		const passages = messages.filter(message => message.role === "tool").map(message => JSON.parse(message.content)).find(item => item.kind === "passages");
		if (passages) evidenceId = passages.passages[0].id;
		return response([models === 1 ? toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" })
			: models <= 3 ? toolCall("checkOfficialSource", { schemeId: SCHEME_ID, evidenceId })
			: models === 4 ? toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] })
			: toolCall("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: [evidenceId] }] })]);
	});
	const options = { repository: fixture.repository, sourceChecker: { async check({ snapshot, reserve }) {
		await reserve(); checks++;
		return { snapshotId: String(snapshot._id), url: snapshot.url, checkedAt: new Date().toISOString(), status: "changed", reason: "different_bytes" };
	} } };
	let agent = service(store, provider, options), run = await agent.start(ownerId, request("Check current income guideline freshness"));
	for (let i = 0; i < 6; i++) { agent = service(store, provider, options); run = await advance(agent, ownerId, run); }
	assert.equal(run.status, "completed"); assert.equal(models, 5); assert.equal(checks, 1);
	assert.equal(run.plan.entries[0].sourceChecks[0].status, "changed"); assert.equal(run.plan.entries[0].status, "unknown");
	assert.equal((await store.getOwned(ownerId, run.runId)).sourceCheckAttempts, 1);
	assert.ok(run.events.some(event => event.tool === "checkOfficialSource" && event.type === "tool_completed"));
	assert.equal(JSON.stringify(fixture.state), original);
});

test("cancelling an official-source tool fences its late receipt and clears private execution state", async () => {
	const { store } = await setup(), ownerId = owner(); let models = 0, ready, finish;
	const started = new Promise(resolve => { ready = resolve; });
	const provider = providerFor(async ({ messages }) => {
		models++;
		const last = messages.filter(message => message.role === "tool").at(-1);
		return response([models === 1 ? toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" }) : toolCall("checkOfficialSource", { schemeId: SCHEME_ID, evidenceId: JSON.parse(last.content).passages[0].id })]);
	});
	const agent = service(store, provider, { sourceChecker: { async check({ snapshot, signal, reserve }) {
		await reserve(); ready(signal); await new Promise(resolve => { finish = resolve; });
		return { snapshotId: String(snapshot._id), url: snapshot.url, checkedAt: new Date().toISOString(), status: "unchanged", reason: "same_bytes" };
	} } });
	let run = await agent.start(ownerId, request()); run = await advance(agent, ownerId, run); run = await advance(agent, ownerId, run);
	const pending = advance(agent, ownerId, run), signal = await started;
	await agent.cancel(ownerId, run.runId); const stopped = await pending;
	assert.equal(stopped.status, "cancelled"); assert.equal(signal.aborted, true);
	finish(); await new Promise(resolve => setTimeout(resolve, 30));
	const raw = await store.getOwned(ownerId, run.runId);
	assert.equal(raw.status, "cancelled"); assert.equal(raw.plan, null); assert.deepEqual(raw.checkpoints, []); assert.deepEqual(raw.privateProfile, {}); assert.equal(raw.sourceCheckAttempts, 1);
});

test("invalid model tool calls persist a safe partial state and require an explicit retry", async () => {
	const { store } = await setup(), ownerId = owner(); let calls = 0;
	const provider = createGroqProvider({ apiKey: "synthetic-only", model: "synthetic-model", fetchImpl: async () => {
		calls++; return new Response(JSON.stringify({ error: { code: "tool_use_failed", failed_generation: "private failed generation" } }), { status: 400 });
	} });
	const agent = service(store, provider);
	let run = await advance(agent, ownerId, await agent.start(ownerId, request()));
	assert.equal(run.status, "partial"); assert.equal(run.error.code, "MODEL_PROTOCOL"); assert.equal(run.usage.modelCalls, 1); assert.equal(calls, 1);
	assert.ok(!JSON.stringify(run).includes("private failed generation"));
	run = await agent.get(ownerId, run.runId); assert.equal(calls, 1);
	run = await advance(agent, ownerId, run); assert.equal(run.usage.modelCalls, 2); assert.equal(calls, 2); assert.equal(run.status, "partial");
});

test("authenticated HTTP runs enforce ownership, validate bodies, recover notes and delete without private-state leaks", async () => {
	const { store } = await setup(), ownerId = owner(), stranger = owner(); let calls = 0;
	const agent = service(store, providerFor(async () => { calls++; return response([toolCall("finishInvestigation", { selections: [] })]); }));
	const originalFind = User.findById, originalSecret = process.env.JWT_SECRET;
	process.env.JWT_SECRET = "synthetic-http-auth-test-only";
	User.findById = id => ({ select: async () => [ownerId, stranger].includes(id) ? { _id: id } : null });
	const token = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "5m" });
	const app = express(); app.use("/api/navigator", createNavigatorRouter({ getRuntime: () => ({ service: agent, store, ready: () => true }) }));
	const server = await new Promise(resolve => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
	const send = (path, method = "GET", body, id = ownerId) => fetch(`http://127.0.0.1:${server.address().port}/api/navigator${path}`, {
		method, headers: { ...(id ? { authorization: `Bearer ${token(id)}` } : {}), "content-type": "application/json" }, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
	});
	try {
		assert.equal((await send("/runs", "GET", undefined, null)).status, 401);
		assert.equal((await send("/runs", "GET", undefined, owner())).status, 401);
		assert.equal((await send("/runs", "POST", { ...request(), ownerId: stranger })).status, 400);
		const invalid = await send("/runs", "POST", '{"private input"'); assert.equal(invalid.status, 400); assert.ok(!(await invalid.text()).includes("private input"));
		assert.equal((await send("/runs", "POST", "x".repeat(13 * 1024))).status, 413);
		const input = request(), started = await send("/runs", "POST", { ...input, profile: { familyIncome: 112233 } });
		assert.equal(started.status, 201); let { run } = await started.json();
		assert.equal(run.goal, input.goal); assert.equal(run.privateProfile, undefined); assert.equal(run.checkpoints, undefined);
		const repeated = await send("/runs", "POST", { ...input, profile: { familyIncome: 112233 } }); assert.equal((await repeated.json()).run.runId, run.runId);
		for (const [method, suffix, body] of [["GET", "", undefined], ["POST", "/advance", { revision: 0 }], ["POST", "/cancel", {}], ["DELETE", "", undefined]]) assert.equal((await send(`/runs/${run.runId}${suffix}`, method, body, stranger)).status, 404);
		assert.equal((await send(`/runs/${run.runId}/advance`, "POST", { runId: run.runId, revision: 0 })).status, 400);
		assert.equal((await send(`/runs/${run.runId}/advance`, "POST", { revision: 99 })).status, 409);
		for (let i = 0; i < 2; i++) { const result = await send(`/runs/${run.runId}/advance`, "POST", { revision: run.revision }); assert.equal(result.status, 200); run = (await result.json()).run; }
		assert.equal(run.status, "completed"); assert.equal(run.plan.outcome, "insufficient_evidence"); assert.equal(calls, 1);
		const notes = await (await send("/runs")).json(); assert.equal(notes.runs.length, 1); assert.ok(!JSON.stringify(notes).includes("112233")); assert.ok(!JSON.stringify(notes).includes("checkpoint"));
		assert.deepEqual((await (await send("/runs", "GET", undefined, stranger)).json()).runs, []);
		assert.equal((await send(`/runs/${run.runId}`, "DELETE")).status, 204); assert.equal((await send(`/runs/${run.runId}`)).status, 404);
	} finally {
		await new Promise(resolve => server.close(resolve)); User.findById = originalFind;
		if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
	}
});

test("deleting active research fences late model results and preserves charged quotas", { timeout: 10000 }, async () => {
	const { db, store } = await setup(), ownerId = owner(); let started, complete;
	const entered = new Promise(resolve => { started = resolve; });
	const agent = service(store, providerFor(async () => { started(); return new Promise(resolve => { complete = resolve; }); }));
	const run = await agent.start(ownerId, request());
	const advancing = advance(agent, ownerId, run);
	await entered; await agent.forget(ownerId, run.runId);
	await assert.rejects(advancing, code("RUN_NOT_FOUND"));
	complete(response([toolCall("finishInvestigation", { selections: [] })]));
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(await db.collection("navigator_runs").findOne({ _id: run.runId }), null);
	assert.equal((await db.collection("navigator_quotas").findOne({ _id: "fixture" })).used, 1);
});

test("provider cooldown is shared across instances and refuses inference before charging a blocked run", async () => {
	const { db, store } = await setup(); let calls = 0;
	const provider = providerFor(async () => { calls++; throw new NavigatorError("PROVIDER_QUOTA", "Resume later.", { retryAfterSeconds: 42 }); });
	const first = service(store, provider), id = owner();
	const blocked = await advance(first, id, await first.start(id, request()));
	assert.equal(blocked.status, "quota_exhausted"); assert.ok(Date.parse(blocked.error.retryAt) > Date.now());
	const secondStore = createMongoRunStore({ db }); await secondStore.initialize();
	const second = service(secondStore, provider), secondOwner = owner();
	const next = await advance(second, secondOwner, await second.start(secondOwner, request()));
	assert.equal(next.status, "quota_exhausted"); assert.equal(next.usage.modelCalls, 0); assert.equal(calls, 1);
});

test("persistent request limits are owner-scoped, share replicas and fail closed", async () => {
	const { db, store } = await setup(), ownerId = owner();
	const other = createMongoRunStore({ db }); await other.initialize();
	const attempts = await Promise.allSettled(Array.from({ length: 9 }, (_, i) => (i % 2 ? store : other).consumeRequest(ownerId, "start")));
	assert.equal(attempts.filter(result => result.status === "fulfilled").length, 5);
	assert.ok(attempts.filter(result => result.status === "rejected").every(result => code("REQUEST_LIMIT")(result.reason)));
	for (const { reason } of attempts.filter(result => result.status === "rejected")) {
		assert.match(reason.message, /5 new-investigation attempts per hour/); assert.match(reason.message, /separate from Groq/); assert.match(reason.message, /Try again after/);
		assert.ok(reason.retryAfterSeconds >= 1 && reason.retryAfterSeconds <= 3600);
	}
	await other.consumeRequest(owner(), "start");
	assert.ok(await db.collection("navigator_http_limits").findOne({ expiresAt: { $type: "date" } }));
});

test("request-limit retry times use the remaining fixed window, not another full hour", async () => {
	const { db, store } = await setup(), ownerId = owner();
	const { localTime: serverNow } = await db.command({ hello: 1 });
	for (let i = 0; i < 5; i++) await store.consumeRequest(ownerId, "start");
	await assert.rejects(store.consumeRequest(ownerId, "start"), error => {
		assert.equal(error.code, "REQUEST_LIMIT");
		const resetAt = new Date(serverNow); resetAt.setUTCHours(resetAt.getUTCHours() + 1, 0, 0, 0);
		const resetLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata", timeZoneName: "short" }).format(resetAt);
		assert.ok(error.message.includes(resetLabel)); assert.ok(error.retryAfterSeconds <= Math.ceil((resetAt - serverNow) / 1000)); return true;
	});
	// Rejected starts never consume model quota.
	assert.equal(await db.collection("navigator_quotas").countDocuments({}), 0);
});

test("storage requires indexes and rejects invalid or different owners", async () => {
	const { db, store } = await setup();
	await assert.rejects(start(createMongoRunStore({ db })), code("STORE_NOT_INITIALIZED"));
	const run = await start(store);
	await assert.rejects(store.getOwned(owner(), run._id), code("RUN_NOT_FOUND"));
	await assert.rejects(store.getOwned({ $ne: null }, run._id), code("INVALID_RUN_INPUT"));
	await assert.rejects(store.getOwned(run.ownerId, { $ne: null }), code("INVALID_RUN_INPUT"));
});

test("concurrent starts are idempotent and each owner has one active investigation", async () => {
	const { store } = await setup(), ownerId = owner(), input = request();
	const runs = await Promise.all(Array.from({ length: 10 }, () => start(store, ownerId, input)));
	assert.equal(new Set(runs.map(run => run._id)).size, 1);
	await assert.rejects(start(store, ownerId, { ...input, goal: "Different goal" }), code("IDEMPOTENCY_CONFLICT"));
	await assert.rejects(start(store, ownerId), code("ACTIVE_RUN_EXISTS"));
	await store.cancel(ownerId, runs[0]._id);
	assert.notEqual((await start(store, ownerId))._id, runs[0]._id);
});

test("one concurrent advancement wins; revisions, cancellation and stale leases fence every checkpoint", async () => {
	const { db, store } = await setup(), run = await start(store);
	const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => acquire(store, run)));
	assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
	const old = attempts.find(result => result.status === "fulfilled").value;
	const saver = new NavigatorMongoCheckpointer({ store, lease: old.lease });
	const graphConfig = { configurable: { thread_id: run._id } };
	await saver.put(graphConfig, { v: 4, id: "checkpoint-a", ts: new Date().toISOString(), channel_values: {}, channel_versions: {}, versions_seen: {} }, { source: "input", step: -1, parents: {} });
	await db.collection("navigator_runs").updateOne({ _id: run._id }, { $set: { "lease.until": new Date(0) } });
	const replacement = await acquire(store, await store.getOwned(run.ownerId, run._id));
	await assert.rejects(saver.putWrites(saver.config("checkpoint-a"), [["session", { overwritten: true }]], "late-task"), code("LEASE_LOST"));
	await assert.rejects(store.release(old.lease, { status: "ready" }), code("LEASE_LOST"));
	await store.cancel(run.ownerId, run._id);
	await assert.rejects(store.reserveTool(replacement.lease), code("LEASE_LOST"));
	const cancelled = await store.getOwned(run.ownerId, run._id);
	assert.deepEqual(cancelled.checkpoints, []); assert.deepEqual(cancelled.privateProfile, {});
});

test("atomic daily quota refuses excess concurrent calls across owners and store instances", async () => {
	const { db, store } = await setup();
	const second = createMongoRunStore({ db }); await second.initialize();
	const leases = await Promise.all(Array.from({ length: 10 }, async () => (await acquire(store, await start(store))).lease));
	const results = await Promise.allSettled(leases.map((lease, i) => (i % 2 ? second : store).reserveModel(lease, { globalDailyLimit: 4, userDailyLimit: 2 })));
	assert.equal(results.filter(result => result.status === "fulfilled").length, 4);
	assert.ok(results.filter(result => result.status === "rejected").every(result => code("QUOTA_EXHAUSTED")(result.reason)));
	assert.equal((await db.collection("navigator_quotas").findOne({ _id: "fixture" })).used, 4);
});

test("user quota survives new runs; UTC daily reset does not reset a run's lifetime budget", async () => {
	const { db, store } = await setup(), ownerId = owner();
	let run = await start(store, ownerId), { lease } = await acquire(store, run);
	const allowance = { globalDailyLimit: 20, userDailyLimit: 2 };
	await store.reserveModel(lease, allowance); await store.reserveModel(lease, allowance);
	await assert.rejects(store.reserveModel(lease, allowance), code("QUOTA_EXHAUSTED"));
	await store.cancel(ownerId, run._id);
	run = await start(store, ownerId); ({ lease } = await acquire(store, run));
	await assert.rejects(store.reserveModel(lease, allowance), code("QUOTA_EXHAUSTED"));
	await db.collection("navigator_quotas").updateOne({ _id: "fixture" }, { $set: { day: "2000-01-01" } });
	await store.reserveModel(lease, allowance);
	assert.equal((await store.readLease(lease)).usage.modelCalls, 1);
	for (let index = 1; index < 6; index++) await store.reserveModel(lease, { globalDailyLimit: 100, userDailyLimit: 20 });
	await db.collection("navigator_quotas").updateOne({ _id: "fixture" }, { $set: { day: "2000-01-01" } });
	await assert.rejects(store.reserveModel(lease, allowance), code("MODEL_LIMIT"));
});

test("ambiguous attempts stay charged and token usage remains explicitly incomplete", async () => {
	const { store } = await setup(), { lease } = await acquire(store, await start(store));
	await store.reserveModel(lease, config);
	await store.recordUsage(lease, null);
	await store.reserveModel(lease, config);
	await store.recordUsage(lease, { inputTokens: 100, outputTokens: 20 });
	const { usage } = await store.readLease(lease);
	assert.equal(usage.modelCalls, 2); assert.equal(usage.reportedModelCalls, 1); assert.equal(usage.tokenUsageIncomplete, true);
	assert.equal(usage.inputTokens, 100);
});

test("expired runs cannot be read and do not hold the owner's active slot", async () => {
	const { db, store } = await setup(), ownerId = owner(), run = await start(store, ownerId);
	await db.collection("navigator_runs").updateOne({ _id: run._id }, { $set: { expiresAt: new Date(0) } });
	await assert.rejects(store.getOwned(ownerId, run._id), code("RUN_NOT_FOUND"));
	assert.notEqual((await start(store, ownerId))._id, run._id);
});

test("LangGraph resumes from Mongo across fresh service and connection instances to a checked plan", async () => {
	const { db, store } = await setup(), ownerId = owner();
	let calls = 0;
	const provider = providerFor(async ({ messages }) => {
		calls++;
		const last = messages.at(-1);
		if (last.role === "user") return response([toolCall("searchScholarships", {}, "search")]);
		const output = JSON.parse(last.content);
		if (output.kind === "search") return response([toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" }, "read"), toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }, "match")]);
		const passages = JSON.parse(messages.find(message => message.role === "tool" && JSON.parse(message.content).kind === "passages").content);
		return response([toolCall("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: passages.passages.map(passage => passage.id) }] }, "finish")]);
	});
	let run = await service(store, provider).start(ownerId, { ...request(), profile: { familyIncome: 218765 } });
	run = await advance(service(store, provider), ownerId, run);
	assert.equal(run.status, "ready", JSON.stringify(run.error)); assert.equal(calls, 1);
	const otherClient = new mongoose.mongo.MongoClient(uri); await otherClient.connect();
	try {
		const restarted = createMongoRunStore({ db: otherClient.db(db.databaseName) }); await restarted.initialize();
		run = await advance(service(restarted, provider), ownerId, run);
		assert.equal(run.status, "ready"); assert.equal(calls, 2);
		const saved = await restarted.getOwned(ownerId, run.runId);
		assert.ok(saved.checkpoints.length <= 3);
		assert.ok(!JSON.stringify(run).includes("218765"));
		for (const checkpoint of saved.checkpoints) assert.ok(!Buffer.from(checkpoint.checkpoint.data, "base64").toString().includes("218765"));
		run = await advance(service(restarted, provider), ownerId, run);
		assert.equal(run.status, "ready"); assert.equal(calls, 3);
		run = await advance(service(restarted, provider), ownerId, run);
		assert.equal(run.status, "completed"); assert.equal(calls, 3);
		assert.equal(run.plan.entries[0].matching.status, "passed");
		assert.equal(run.plan.entries[0].citations.length, 1);
		assert.equal(run.usage.modelCalls, 3); assert.equal(run.usage.toolCalls, 4);
		const finished = await restarted.getOwned(ownerId, run.runId);
		assert.deepEqual(finished.privateProfile, {}); assert.deepEqual(finished.checkpoints, []);
	} finally { await otherClient.close(); }
});

test("clarification answers remain private, refresh matching and survive a crash after acceptance", async () => {
	const { db, store } = await setup(), ownerId = owner();
	let calls = 0;
	const provider = providerFor(async ({ messages }) => {
		calls++;
		assert.ok(!JSON.stringify(messages).includes("218765"));
		const last = messages.at(-1);
		if (last.role === "user") return response([toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" }, "read"), toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }, `match-${calls}`)]);
		const output = JSON.parse(last.content);
		if (output.kind === "matches" && output.matches[0].status === "unknown") return response([toolCall("requestClarification", { fields: ["familyIncome"] }, "ask")]);
		if (output.kind === "clarification_result") return response([toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }, "rematch")]);
		const passages = JSON.parse(messages.find(message => message.role === "tool" && JSON.parse(message.content).kind === "passages").content);
		return response([toolCall("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: passages.passages.map(passage => passage.id) }] }, "finish")]);
	});
	let agent = service(store, provider), run = await agent.start(ownerId, request());
	for (let step = 0; step < 3; step++) run = await advance(agent, ownerId, run);
	assert.equal(run.status, "awaiting_input", JSON.stringify(run)); assert.deepEqual(run.clarification.fields, ["familyIncome"]);
	await assert.rejects(advance(agent, ownerId, run), code("CLARIFICATION_REQUIRED"));
	await assert.rejects(advance(agent, ownerId, run, { clarification: { skip: false, answers: { percentage: 80 } } }), code("INVALID_CLARIFICATION"));
	// Simulate death after the atomic answer/lease write, before graph invocation.
	await store.acquire({ ownerId, runId: run.runId, revision: run.revision, resume: { skip: false, answers: { familyIncome: 218765 } } });
	await db.collection("navigator_runs").updateOne({ _id: run.runId }, { $set: { "lease.until": new Date(0) } });
	agent = service(store, provider); run = await agent.get(ownerId, run.runId);
	assert.equal(run.status, "interrupted");
	run = await advance(agent, ownerId, run);
	assert.equal(run.status, "ready");
	for (let step = 0; step < 3 && run.status !== "completed"; step++) run = await advance(service(store, provider), ownerId, run);
	assert.equal(run.status, "completed"); assert.equal(run.plan.entries[0].matching.status, "passed");
	assert.ok(!JSON.stringify(run).includes("218765")); assert.equal(calls, 4);
});

test("quota or unavailable storage prevents inference", async () => {
	const { db, store } = await setup(); let calls = 0;
	const provider = providerFor(async () => { calls++; return response([toolCall("searchScholarships", {})]); });
	const agent = service(store, provider, { config: { ...config, globalDailyLimit: 1, userDailyLimit: 1 } });
	const firstOwner = owner(); let first = await agent.start(firstOwner, request()); first = await advance(agent, firstOwner, first);
	const otherOwner = owner(), run = await agent.start(otherOwner, request());
	const exhausted = await advance(agent, otherOwner, run);
	assert.equal(exhausted.status, "quota_exhausted", JSON.stringify(exhausted.error)); assert.equal(calls, 1);
	const disconnected = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 100 }); await disconnected.connect();
	const brokenStore = createMongoRunStore({ db: disconnected.db(db.databaseName) }); await brokenStore.initialize(); await disconnected.close();
	await assert.rejects(service(brokenStore, provider).get(firstOwner, first.runId), code("PERSISTENCE_UNAVAILABLE"));
	await assert.rejects(advance(service(brokenStore, provider), firstOwner, first), code("PERSISTENCE_UNAVAILABLE")); assert.equal(calls, 1);
});

test("deadline and cancellation block late provider results from rewriting saved state", { timeout: 15000 }, async () => {
	for (const cancel of [false, true]) {
		const { db, store } = await setup(), ownerId = owner();
		let resolveModel, started; const pending = new Promise(resolve => { resolveModel = resolve; }), startSignal = new Promise(resolve => { started = resolve; });
		const agent = service(store, providerFor(async () => { started(); return pending; }), { maxAdvanceMs: cancel ? 4000 : 1000 });
		const run = await agent.start(ownerId, request());
		const advancing = advance(agent, ownerId, run);
		await Promise.race([startSignal, advancing.then(stopped => { throw new Error(`Stopped before provider: ${JSON.stringify(stopped.error)}`); })]);
		if (cancel) await agent.cancel(ownerId, run.runId);
		const stopped = await advancing;
		assert.equal(stopped.status, cancel ? "cancelled" : "interrupted");
		const saved = await db.collection("navigator_runs").findOne({ _id: run.runId });
		resolveModel(response([toolCall("searchScholarships", {})]));
		await new Promise(resolve => setTimeout(resolve, 50));
		const later = await db.collection("navigator_runs").findOne({ _id: run.runId });
		assert.equal(later.revision, saved.revision); assert.equal(later._version, saved._version);
		assert.equal(later.usage.modelCalls, 1); assert.equal(later.usage.tokenUsageIncomplete, true);
	}
});

test("pinned model changes and ambient tracing are rejected", async () => {
	const { store } = await setup(), ownerId = owner(), provider = providerFor(async () => response([toolCall("searchScholarships", {})]));
	const agent = service(store, provider), run = await agent.start(ownerId, request());
	await assert.rejects(advance(service(store, { ...provider, model: "different" }), ownerId, run), code("MODEL_CHANGED"));
	assert.throws(() => service(store, provider, { env: { LANGSMITH_TRACING: "true" } }), code("TRACING_NOT_ALLOWED"));
});

test("run creation preserves literal input and uses server time for bounded retention", async () => {
	const { store } = await setup(), run = await start(store, owner(), { ...request("$lease.token"), profile: { state: "$$NOW" } });
	assert.equal(run.goal, "$lease.token"); assert.equal(run.privateProfile.state, "$$NOW");
	assert.equal(run.expiresAt - run.createdAt, 7 * 86400000);
	assert.ok(Math.abs(Date.now() - run.createdAt.getTime()) < 10000);
});

test("checkpointer buffers task writes before put, preserves first regular writes and rejects wrong scope", async () => {
	const { store } = await setup(), { lease } = await acquire(store, await start(store));
	const saver = new NavigatorMongoCheckpointer({ store, lease }), cpConfig = saver.config("checkpoint-a");
	await saver.putWrites(cpConfig, [["session", { first: true }]], "task-a");
	await saver.putWrites(cpConfig, [["session", { first: false }]], "task-a");
	await saver.put(saver.config(), { v: 4, id: "checkpoint-a", ts: new Date().toISOString(), channel_values: {}, channel_versions: {}, versions_seen: {} }, { source: "input", step: -1, parents: {} });
	assert.deepEqual((await saver.getTuple(cpConfig)).pendingWrites, [["task-a", "session", { first: true }]]);
	assert.deepEqual((await store.readLease(lease)).pendingCheckpointWrites, []);
	await assert.rejects(saver.getTuple({ configurable: { thread_id: randomUUID() } }), code("CHECKPOINT_SCOPE"));
	await assert.rejects(saver.getTuple({ configurable: { thread_id: lease.runId, checkpoint_ns: "subgraph" } }), code("CHECKPOINT_SCOPE"));
});

test("concurrent reservations cannot exceed lifetime model or tool budgets", async () => {
	const { store } = await setup(), { lease } = await acquire(store, await start(store));
	const models = await Promise.allSettled(Array.from({ length: 16 }, () => store.reserveModel(lease, config)));
	assert.equal(models.filter(result => result.status === "fulfilled").length, 6);
	assert.ok(models.filter(result => result.status === "rejected").every(result => code("MODEL_LIMIT")(result.reason)));
	const tools = await Promise.allSettled(Array.from({ length: 20 }, () => store.reserveTool(lease)));
	assert.equal(tools.filter(result => result.status === "fulfilled").length, 12);
	assert.ok(tools.filter(result => result.status === "rejected").every(result => code("TOOL_LIMIT")(result.reason)));
	const saved = await store.readLease(lease); assert.equal(saved.usage.modelCalls, 6); assert.equal(saved.usage.toolCalls, 12);
});

test("a checkpointed model result is not repeated when the control update fails", async () => {
	const { store } = await setup(), ownerId = owner(); let calls = 0, fail = true;
	const provider = providerFor(async () => { calls++; return response([toolCall("finishInvestigation", { selections: [] })]); });
	const faulty = { ...store, async release(...args) { if (fail) { fail = false; throw new Error("secret internal failure"); } return store.release(...args); } };
	let run = await service(faulty, provider).start(ownerId, request());
	run = await advance(service(faulty, provider), ownerId, run);
	assert.equal(run.status, "partial"); assert.equal(run.error.code, "ADVANCE_UNAVAILABLE");
	assert.ok(!JSON.stringify(run).includes("secret internal"));
	run = await advance(service(store, provider), ownerId, run);
	assert.equal(run.status, "completed"); assert.equal(run.plan.outcome, "insufficient_evidence");
	assert.equal(calls, 1); assert.equal(run.usage.modelCalls, 1); assert.equal(run.usage.toolCalls, 1);
});

test("a quota-blocked graph resumes after daily reset without refunding earlier calls", async () => {
	const { db, store } = await setup(), ownerId = owner(); let calls = 0;
	const provider = providerFor(async ({ messages }) => {
		calls++; return response([messages.at(-1).role === "user" ? toolCall("searchScholarships", {}) : toolCall("finishInvestigation", { selections: [] })]);
	});
	const agent = service(store, provider, { config: { ...config, globalDailyLimit: 1, userDailyLimit: 1 } });
	let run = await agent.start(ownerId, request());
	run = await advance(agent, ownerId, run); run = await advance(agent, ownerId, run);
	assert.equal(run.status, "quota_exhausted"); assert.equal(calls, 1);
	await db.collection("navigator_quotas").updateOne({ _id: "fixture" }, { $set: { day: "2000-01-01" } });
	run = await advance(agent, ownerId, run); run = await advance(agent, ownerId, run);
	assert.equal(run.status, "completed"); assert.equal(calls, 2); assert.equal(run.usage.modelCalls, 2);
	assert.equal(run.usage.toolCalls, 2);
});

test("explicit clarification skip retains unknown matching instead of inventing an answer", async () => {
	const { store } = await setup(), ownerId = owner();
	const provider = providerFor(async ({ messages }) => {
		const last = messages.at(-1), resolved = messages.some(message => message.role === "tool" && JSON.parse(message.content).kind === "clarification_result");
		if (last.role === "user") return response([toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" }, "read"), toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }, "match")]);
		const output = JSON.parse(last.content);
		if (output.kind === "matches" && !resolved) return response([toolCall("requestClarification", { fields: ["familyIncome"] }, "ask")]);
		if (output.kind === "clarification_result") { assert.equal(output.skip, true); return response([toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }, "rematch")]); }
		const passages = JSON.parse(messages.find(message => message.role === "tool" && JSON.parse(message.content).kind === "passages").content);
		return response([toolCall("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: passages.passages.map(passage => passage.id) }] })]);
	});
	const agent = service(store, provider); let run = await agent.start(ownerId, request());
	for (let step = 0; step < 3; step++) run = await advance(agent, ownerId, run);
	assert.equal(run.status, "awaiting_input");
	run = await advance(agent, ownerId, run, { clarification: { skip: true, answers: {} } });
	for (let step = 0; step < 3 && run.status !== "completed"; step++) run = await advance(agent, ownerId, run);
	assert.equal(run.status, "completed"); assert.equal(run.plan.entries[0].matching.status, "unknown");
	assert.deepEqual(run.plan.entries[0].matching.missingFields, ["familyIncome"]);
});

test("caller abort stops promptly and a pre-aborted request consumes no quota", { timeout: 10000 }, async () => {
	const { store } = await setup(), ownerId = owner(); let started;
	const startedSignal = new Promise(resolve => { started = resolve; });
	const agent = service(store, providerFor(async () => { started(); return new Promise(() => {}); }));
	const run = await agent.start(ownerId, request());
	await assert.rejects(agent.advance(ownerId, { runId: run.runId, revision: run.revision }, { signal: AbortSignal.abort() }), code("CANCELLED"));
	assert.equal((await agent.get(ownerId, run.runId)).usage.modelCalls, 0);
	const controller = new AbortController(), pending = agent.advance(ownerId, { runId: run.runId, revision: run.revision }, { signal: controller.signal });
	await startedSignal; controller.abort();
	assert.equal((await pending).status, "interrupted");
	assert.equal((await agent.get(ownerId, run.runId)).usage.modelCalls, 1);
});


test('qualified candidates survive reconstruction, excluded schemes consume no excerpt slots, and bounded deferrals stay visible', async () => {
  const { store } = await setup(), fixture = researchFixture(), ownerId = owner();
  const goal = 'Funding for OBC applicants'; const source = { messageIndex: 0, quote: goal };
  fixture.scheme.rules = [{ id: 'category', field: 'casteCategory', operator: 'IN', targetValue: ['SC'] }];
  const candidates = Array.from({ length: 6 }, (_, i) => ({ ...structuredClone(fixture.other), _id: (i + 32).toString(16).padStart(24, '0'),
    title: `Synthetic eligible audience ${i}`, rules: [{ id: 'category', field: 'casteCategory', operator: 'IN', targetValue: ['OBC'] }] }));
  fixture.state.schemes = [fixture.scheme, ...candidates];
  let calls = 0; const inspected = [];
  const repository = { ...fixture.repository, getSnapshots: async ids => { inspected.push(ids); return fixture.repository.getSnapshots(ids); } };
  const provider = providerFor(async () => { calls++; return response([intentCall({ searchQuery: '', constraints: [{ field: 'category', value: 'OBC', operator: 'include', role: 'funding', source }] })]); });
  const rebuild = () => catalogueService(store, provider, { repository, now: () => new Date(FIXTURE_NOW) });
  let run = await rebuild().start(ownerId, { ...request(goal), profile: { casteCategory: 'OBC' } });
  for (let i = 0; i < 14 && ['ready', 'awaiting_input'].includes(run.status); i++) run = await advance(rebuild(), ownerId, run, run.status === 'awaiting_input' ? { clarification: { skip: true, answers: {} } } : {});
  assert.equal(run.status, 'completed'); assert.equal(calls, 1); assert.ok(run.usage.toolCalls <= 8);
  assert.equal(run.plan.entries.length, 5);
  assert.ok(run.plan.entries.every(entry => entry.qualification.status === 'supported'));
  assert.equal(run.plan.coverage.excluded[0].schemeId, SCHEME_ID);
  assert.equal(run.plan.coverage.excluded[0].qualification.status, 'excluded');
  assert.equal(run.plan.coverage.deferred.length, 1);
  assert.equal(run.events.filter(event => event.type === 'tool_started' && event.tool === 'findGuidelinePassages').length, 5);
  assert.ok(inspected.length > 0);
});


test('Mongo qualification window stays bounded and prioritizes independent funding needs over repeated words', async () => {
  const { db } = await setup();
  const connection = await mongoose.createConnection(uri, { dbName: db.databaseName, autoIndex: false }).asPromise();
  try {
    const model = connection.model('QualificationWindow', new mongoose.Schema({}, { strict: false, collection: 'qualification_window' }));
    const base = { publication: { state: 'published' }, legacy: false };
    await model.insertMany([
      ...Array.from({ length: 28 }, (_, i) => ({ ...base, title: `Transport transport transport ${i}`, fieldEvidence: [{ quote: 'transport assistance' }] })),
      { ...base, title: 'Two needs covered', fieldEvidence: [{ quote: 'Transport and equipment assistance' }] },
    ]);
    const source = { messageIndex: 0, quote: 'synthetic' };
    const compiled = compileResearchIntent({ objective: 'Funding', searchQuery: '', constraints: [
      { field: 'other', value: 'transport', operator: 'include', role: 'funding', source },
      { field: 'other', value: 'equipment', operator: 'include', role: 'funding', source },
    ], questions: [], ambiguities: [] });
    const found = await createMongoResearchRepository({ ScholarshipModel: model }).searchPublished({ ...compiled.search, retrieval: compiled.retrieval, limit: 100 });
    assert.equal(found.length, 24); assert.equal(found[0].title, 'Two needs covered');
  } finally { await connection.close(); }
});


test('Mongo diversified discovery admits a low-lexical candidate beyond 24 incompatible high-overlap records', async () => {
 const {db}=await setup(), fixture=researchFixture({linkedPdf:true});
 const connection=await mongoose.createConnection(uri,{dbName:db.databaseName,autoIndex:false}).asPromise();
 try {
  const model=connection.model('DiversePool',new mongoose.Schema({},{strict:false,collection:'diverse_pool'}));
  const base={publication:{state:'published'},legacy:false};
  await model.insertMany([...Array.from({length:30},(_,i)=>({...base,title:`Engineering scholarship ${i}`,rules:[{id:'category',field:'casteCategory',operator:'IN',targetValue:['SC']}]})),
   {...fixture.scheme,_id:new mongoose.Types.ObjectId(fixture.scheme._id),title:'Technical pathway grant',eligibility:{gender:'Female'},level:null}]);
  const intent=compileResearchIntent({objective:'Find engineering funding',searchQuery:'engineering',constraints:[{field:'category',role:'applicant_current',operator:'include',value:'OBC',source:{messageIndex:0,quote:'OBC'}},{field:'gender',role:'applicant_current',operator:'include',value:'Female',source:{messageIndex:0,quote:'girl'}}],questions:[],ambiguities:[]});
  const repository=createMongoResearchRepository({ScholarshipModel:model});
  const pool=await repository.searchPublished({...intent.search,retrieval:intent.retrieval,limit:48});
  assert.ok(pool.length<=48); assert.ok(pool.some(s=>String(s._id)===SCHEME_ID));
  const {createResearchTools}=await import('../../src/agents/navigator/researchTools.js');
  const result=await createResearchTools({repository:{...repository,getSnapshots:fixture.repository.getSnapshots},retrieval:intent.retrieval}).execute('searchScholarships',{});
  assert.deepEqual(result.schemes.map(s=>s.schemeId),[SCHEME_ID]);
  assert.equal(result.schemes[0].qualification.status,'needs_verification');
 }finally{await connection.close();}
});

test('saved public investigation replays through durable execution and HTTP with useful exact findings and two synthetic calls', async t => {
 const {store}=await setup(), fixture=savedReplayFixture(),ownerId=owner(); let calls=0,answerCharacters=0;
 const provider=providerFor(async ({mode,messages})=>{calls++;if(mode==='research_intent')return response([intentCall(fixture.intent)]);
  answerCharacters=JSON.stringify(messages).length;return reviewedReplayAnswer(messages);});
 const create=()=>catalogueService(store,provider,{repository:fixture.repository,now:()=>new Date(fixture.now),config:{...config,maxModelCalls:2,maxToolCalls:8}});
 const started=performance.now(); const run=await finishCatalogue(create(),ownerId,await create().start(ownerId,request(fixture.question)));
 assert.equal(calls,2); assert.ok(run.usage.toolCalls<=8);assert.equal(run.plan.answer.acceptedAssessments,4,JSON.stringify(run.plan.answer.diagnostics));
 assert.equal(run.plan.answer.status,'partial'); assert.ok(run.plan.entries.some(e=>e.schemeId===UP_ID));assert.ok(run.plan.entries.some(e=>e.schemeId===PRAGATI_ID));
 assert.ok(run.plan.entries.every(e=>e.matching.failedCount===0));
 const up=run.plan.entries.find(e=>e.schemeId===UP_ID);assert.equal(up.answer.conditions[0].status,'supported');assert.equal(up.qualification.status,'needs_verification');
 assert.ok(!JSON.stringify(run.plan.entries).includes('User will click on profile'));
 const app=express();app.use('/api/navigator',createNavigatorRouter({getRuntime:()=>({service:create(),store,ready:()=>true}),authenticate:(req,res,next)=>{req.user={_id:ownerId};next();}}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try {const res=await fetch(`http://127.0.0.1:${server.address().port}/api/navigator/runs/${run.runId}`);assert.equal(res.status,200);const body=await res.json();
  assert.equal(body.run.plan.entries.find(e=>e.schemeId===UP_ID).answer.conditions[0].evidence[0].quote,'Students from Other Backwards Classes study in all government-aided and recognized state educational institutes (subject to budget availability). ');assert.equal(calls,2);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 t.diagnostic(`Saved-source durable replay: ${Math.round(performance.now()-started)}ms local execution, ${run.usage.toolCalls} tools, 2 synthetic model calls, ${answerCharacters} answer-prompt characters; 4 independently reviewed assessments (2 supported, 2 specific unknowns), zero false eligibility confirmations. Synthetic token counts are not live inference measurements.`);
});

test('default workflow allocates one bounded freshness check instead of consuming every slot on more candidates', async () => {
 const {store}=await setup(),fixture=researchFixture({linkedPdf:true}),ownerId=owner();let calls=0,checks=0;
 fixture.scheme.freshness.lastVerifiedAt=new Date('2020-01-01');fixture.state.schemes=[fixture.scheme];
 const sourceChecker={async check({snapshot,reserve}){await reserve();checks++;return {snapshotId:String(snapshot._id),url:snapshot.url,checkedAt:new Date().toISOString(),status:'changed',reason:'different_bytes'};}};
 const create=()=>catalogueService(store,providerFor(async()=>{calls++;return response([intentCall()]);}),{repository:fixture.repository,sourceChecker});
 const run=await finishCatalogue(create(),ownerId,await create().start(ownerId,request()));
 assert.equal(checks,1);assert.equal(calls,1);assert.ok(run.usage.toolCalls<=8);
 assert.equal(run.plan.entries[0].sourceChecks[0].status,'changed');assert.equal(run.plan.entries[0].status,'unknown');
 assert.equal(run.events.filter(e=>e.tool==='checkOfficialSource'&&e.type==='tool_started').length,1);
});

test('freshness scheduling never spends a second tool action on the same shared source snapshot', async () => {
 const {store}=await setup(),fixture=researchFixture({linkedPdf:true}),ownerId=owner();let checks=0;
 for(const scheme of fixture.state.schemes)scheme.freshness.lastVerifiedAt=new Date('2020-01-01');
 const sourceChecker={async check({snapshot,reserve}){await reserve();checks++;return {snapshotId:String(snapshot._id),url:snapshot.url,checkedAt:new Date().toISOString(),status:'unchanged',reason:'same_bytes'};}};
 const agent=catalogueService(store,providerFor(async()=>response([intentCall()])),{repository:fixture.repository,sourceChecker});
 const run=await finishCatalogue(agent,ownerId,await agent.start(ownerId,request()));
 assert.equal(checks,1);
 assert.equal(run.events.filter(e=>e.tool==='checkOfficialSource'&&e.type==='tool_started').length,1);
 assert.ok(run.plan.entries.every(entry=>entry.sourceChecks.length===1));
});

test('strict JSON provider failures stop before retrieval and require an explicit catalogue choice', async () => {
 const {store}=await setup(),fixture=researchFixture(),ownerId=owner();let calls=0,searches=0;
 const provider=createGroqProvider({apiKey:'synthetic-only',model:'openai/gpt-oss-120b',fetchImpl:async(_,request)=>{
  calls++;assert.equal(JSON.parse(request.body).response_format.type,'json_schema');
  return new Response(JSON.stringify({error:{code:'tool_use_failed',failed_generation:'PRIVATE'}}),{status:400,headers:{'content-type':'application/json'}});
 }});
 const agent=catalogueService(store,provider,{repository:{...fixture.repository,searchPublished:async args=>{searches++;return fixture.repository.searchPublished(args);}}});
 let run=await agent.start(ownerId,request('OBC students, exclude loans'));
 run=await advance(agent,ownerId,run);
 assert.equal(run.status,'partial');assert.equal(run.error.code,'MODEL_PROTOCOL');assert.equal(run.plan,null);assert.equal(searches,0);assert.equal(calls,1);
 assert.equal(run.usage.modelCalls,1);assert.equal(run.usage.toolCalls,0);assert.ok(!JSON.stringify(run).includes('PRIVATE'));
 run=await agent.researchCatalogue(ownerId,{runId:run.runId,revision:run.revision});run=await finishCatalogue(agent,ownerId,run);
 assert.ok(searches>0);assert.equal(calls,1);assert.equal(run.plan.intent.status,'unavailable');
});

test('default answer workflow uses two bounded calls across restarts, preserves source reasoning, and cached reads cost zero calls', async t => {
  const { store, db } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0, answerChars = 0;
  const provider = providerFor(async ({ mode, messages }) => {
    calls++;
    if (mode === 'research_intent') return response([intentCall()]);
    assert.equal(mode, 'evidence_answer');
    const context = JSON.parse(messages[1].content); answerChars = JSON.stringify(messages).length;
    assert.ok(!JSON.stringify(context).includes('218765'));
    const candidate = context.candidates[0], passage = candidate.passages[0];
    return { message: { content: JSON.stringify({ assessments: [{ schemeId: candidate.schemeId, requirementId: candidate.requirements[0].id, status: 'supported',
      explanation: 'The cited clause sets an income ceiling; this alone does not establish complete eligibility.', evidence: [{ evidenceId: passage.id, quote: passage.quote, relation: 'supports' }] }] }) }, usage: { inputTokens: 400, outputTokens: 100 } };
  });
  const create = () => createDurableNavigator({ store, repository: fixture.repository, provider, config, env: {} });
  let agent = create(), run = await agent.start(ownerId, { ...request(), profile: { familyIncome: 218765 } });
  assert.equal(run.limits.maxModelCalls, 2);
  for (let i = 0; i < 14 && run.status !== 'completed'; i++) { agent = create(); run = await advance(agent, ownerId, run); }
  assert.equal(run.status, 'completed', JSON.stringify(run.error)); assert.equal(calls, 2);
  assert.equal(run.plan.answer.status, 'partial'); assert.equal(run.plan.answer.acceptedAssessments, 1); assert.equal(run.plan.entries[0].answer.conditions[0].basis, 'source_interpretation');
  assert.ok(run.plan.entries[0].answer.conditions[0].evidence.length); assert.equal(run.plan.entries[1].answer.conditions[0].status, 'unknown');
  assert.equal(run.usage.inputTokens, 500); assert.equal(run.usage.outputTokens, 120); assert.equal(run.usage.reportedModelCalls, 2);
  assert.ok(answerChars <= 16000); assert.ok(run.events.some(e => e.action === 'answer_evidence' && e.type === 'model_completed'));
  for (let i = 0; i < 3; i++) assert.deepEqual((await create().get(ownerId, run.runId)).plan.answer, run.plan.answer);
  assert.equal(calls, 2); assert.ok(!JSON.stringify(run).includes('218765'));
  const repeated = await finishCatalogue(create(), ownerId, await create().start(ownerId, { ...request(), profile: { familyIncome: 218765 } }));
  assert.equal(calls, 3); assert.equal(repeated.usage.modelCalls, 1); assert.equal(repeated.plan.answer.cacheHit, true);
  assert.deepEqual(repeated.plan.entries[0].answer, run.plan.entries[0].answer);
  const otherOwner = owner();
  const isolated = await finishCatalogue(create(), otherOwner, await create().start(otherOwner, { ...request(), profile: { familyIncome: 218765 } }));
  assert.equal(calls, 5); assert.equal(isolated.plan.answer.cacheHit, undefined);
  await db.collection('navigator_runs').updateMany({ ownerId, status: 'completed' }, { $set: { expiresAt: new Date(0) } });
  const expired = await finishCatalogue(create(), ownerId, await create().start(ownerId, { ...request(), profile: { familyIncome: 218765 } }));
  assert.equal(calls, 7); assert.equal(expired.plan.answer.cacheHit, undefined);
  fixture.scheme.rules[0].targetValue = 300001;
  const changed = await finishCatalogue(create(), ownerId, await create().start(ownerId, { ...request(), profile: { familyIncome: 218765 } }));
  assert.equal(calls, 9); assert.equal(changed.plan.answer.cacheHit, undefined);
  t.diagnostic(`Synthetic transport: first investigation 2 calls; repeated question 1; completed read 0; answer input ${answerChars} characters. Token totals are fixture-reported, not measured model usage.`);
});

test('answer protocol errors, provider timeouts and quota failures retain sources and stop without retries', async () => {
  for (const failure of ['INVALID_ASSESSMENT_SCHEMA', 'PROVIDER_TIMEOUT', 'PROVIDER_QUOTA']) {
    const { store } = await setup(), ownerId = owner(); let calls = 0;
    const provider = providerFor(async ({ mode }) => {
      calls++; if (mode === 'research_intent') return response([intentCall()]);
      if (failure === 'INVALID_ASSESSMENT_SCHEMA') return { message: { content: '{"assessments":[{"fabricated":"answer"}]}' }, usage: { inputTokens: 30, outputTokens: 20 } };
      throw new NavigatorError(failure, 'Synthetic failure', { retryAfterSeconds: 60 });
    });
    const agent = catalogueService(store, provider, { config });
    const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, { ...request(), profile: { familyIncome: 0 } }));
    assert.equal(calls, 2); assert.equal(run.usage.modelCalls, 2); assert.equal(run.plan.answer.status, 'partial');
    assert.equal(run.plan.answer.reason, failure); assert.equal(run.plan.entries.length, 2);
    assert.ok(run.plan.entries.every(e => e.citations.length && e.matching.status === 'passed'));
    assert.ok(run.plan.entries.every(e => e.answer.conditions.every(c => c.status === 'unknown')));
    await agent.get(ownerId, run.runId); assert.equal(calls, 2);
  }
});

test('no policy evidence skips the answer request even with a two-call allowance', async () => {
  const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0;
  for (const scheme of fixture.state.schemes) for (const ref of scheme.fieldEvidence) ref.field = 'title';
  const agent = catalogueService(store, providerFor(async () => { calls++; return response([intentCall()]); }), { config, repository: fixture.repository });
  const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, { ...request(), profile: { familyIncome: 0 } }));
  assert.equal(calls, 1); assert.equal(run.plan.answer.reason, 'INSUFFICIENT_EVIDENCE');
  assert.ok(run.plan.entries.every(e => e.qualification.status === 'needs_verification'));
});

test('conditions already covered by recorded checks do not spend an evidence-answer call', async () => {
  const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0;
  for (const scheme of fixture.state.schemes) scheme.level = 'UG';
  const provider = providerFor(async () => {
    calls++;
    return response([intentCall({ searchQuery: '', constraints: [{ field: 'educationLevel', value: 'UG', role: 'funding', operator: 'include', source: { messageIndex: 0, quote: 'undergraduate' } }] })]);
  });
  const agent = catalogueService(store, provider, { config, repository: fixture.repository, now: () => new Date(FIXTURE_NOW) });
  const run = await finishCatalogue(agent, ownerId, await agent.start(ownerId, { ...request('Find undergraduate scholarships'), profile: { familyIncome: 0 } }));
  assert.equal(calls, 1); assert.equal(run.plan.answer.status, 'answered'); assert.equal(run.plan.answer.reason, null);
  assert.match(run.plan.answer.message, /No additional AI explanation was needed/);
  assert.ok(run.plan.entries.every(e => e.answer.conditions.every(c => c.status === 'supported' && c.basis === 'recorded_check')));
});

test('source mutation during answer inference rejects the explanation rather than reusing stale proof', async () => {
  const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0;
  const provider = providerFor(async ({ mode }) => {
    calls++; if (mode === 'research_intent') return response([intentCall()]);
    fixture.snapshot.text += ' Changed while answering.';
    return { message: { content: '{"assessments":[]}' }, usage: { inputTokens: 30, outputTokens: 20 } };
  });
  const agent = catalogueService(store, provider, { config, repository: fixture.repository });
  let run = await agent.start(ownerId, { ...request(), profile: { familyIncome: 0 } });
  for (let i = 0; i < 14 && run.status === 'ready'; i++) run = await advance(agent, ownerId, run);
  assert.equal(run.status, 'partial'); assert.equal(run.error.code, 'SOURCE_CHANGED'); assert.equal(run.plan, null); assert.equal(calls, 2);
});

test('partial source findings survive a release crash and API reads without leaking rejected claims or repeating inference', async () => {
 const { store } = await setup(), fixture = researchFixture(), ownerId = owner(); let calls = 0, crash = true;
 const income = 'Annual family income must not exceed ₹3,00,000', category = 'Only SC/ST applicants may apply';
 fixture.snapshot.text = `${income}\r\n${category}\r\nRenewal conditions require confirmation`;
 fixture.snapshot.textHash = createHash('sha256').update(fixture.snapshot.text).digest('hex'); fixture.snapshot.pages = [];
 fixture.scheme.fieldEvidence = [makeEvidence(fixture.snapshot, fixture.snapshot.text, { field: 'eligibility' })]; fixture.state.schemes = [fixture.scheme];
 const release = store.release;
 store.release = async (lease, result) => { if (crash && result.status === 'completed' && result.plan?.answer) { crash = false; throw new NavigatorError('PERSISTENCE_UNAVAILABLE', 'Synthetic interruption'); } return release(lease, result); };
 const provider = providerFor(async ({ mode, messages }) => {
  calls++;
  if (mode === 'research_intent') return response([intentCall({ searchQuery: '', questions: ['income', 'category', 'renewal'].map(text => ({ text, source: { messageIndex: 0, quote: text } })) })]);
  const candidate = JSON.parse(messages[1].content).candidates[0], evidenceId = candidate.passages[0].id;
  return { message: { content: JSON.stringify({ assessments: [income, category, 'PRIVATE_UNSUPPORTED_RENEWAL_GUARANTEE'].map((quote, i) => ({ schemeId: candidate.schemeId, requirementId: `q${i}`, status: 'supported', explanation: i === 2 ? 'PRIVATE_UNSUPPORTED_RENEWAL_GUARANTEE' : 'The cited policy states this condition.', evidence: [{ evidenceId, quote, relation: 'supports' }], dependsOn: [] })) }) }, usage: { inputTokens: 500, outputTokens: 200 } };
 });
 const create = () => catalogueService(store, provider, { config, repository: fixture.repository, now: () => new Date(FIXTURE_NOW) });
 let run = await create().start(ownerId, { ...request('Check income, category and renewal'), profile: { familyIncome: 0 } });
 for (let i = 0; i < 14 && run.status === 'ready'; i++) run = await advance(create(), ownerId, run);
 assert.equal(run.status, 'partial'); assert.equal(run.error.code, 'PERSISTENCE_UNAVAILABLE'); assert.equal(calls, 2);
 run = await advance(create(), ownerId, run);
 assert.equal(run.status, 'completed'); assert.equal(run.plan.answer.status, 'partial'); assert.equal(calls, 2);
 assert.equal(run.plan.answer.acceptedAssessments, 2); assert.equal(run.plan.answer.rejectedAssessments, 1);
 assert.deepEqual(run.plan.entries[0].answer.conditions.map(c => c.status), ['supported', 'supported', 'unknown']);
 assert.equal(run.plan.answer.diagnostics[0].code, 'QUOTE_NOT_FOUND'); assert.ok(!JSON.stringify(await store.getOwned(ownerId, run.runId)).includes('PRIVATE_UNSUPPORTED'));
 const app = express(); app.use('/api/navigator', createNavigatorRouter({ getRuntime: () => ({ service: create(), store, ready: () => true }), authenticate: (req, res, next) => { req.user = { _id: ownerId }; next(); } }));
 const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
 try {
  for (let i = 0; i < 2; i++) {
   const result = await fetch(`http://127.0.0.1:${server.address().port}/api/navigator/runs/${run.runId}`); assert.equal(result.status, 200);
   const body = await result.json(); assert.equal(body.run.plan.answer.acceptedAssessments, 2); assert.equal(body.run.plan.entries[0].answer.conditions[2].evidence.length, 0);
  }
  assert.equal(calls, 2);
 } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
