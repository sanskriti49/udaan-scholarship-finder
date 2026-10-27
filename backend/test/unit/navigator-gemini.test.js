import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiProvider } from '../../src/agents/navigator/geminiProvider.js';
import { createResearchProvider } from '../../src/agents/navigator/provider.js';
import { readNavigatorConfig } from '../../src/agents/navigator/config.js';
import { createNavigatorReadiness } from '../../src/agents/navigator/readiness.js';
import { intentResponseFormat, intentMessages, parseResearchIntent, INTENT_PROMPT } from '../../src/agents/navigator/researchIntent.js';
import { adaptiveFixture, adaptiveProvider, memoryJourney } from '../adaptiveFixture.js';
import { jsonResponse } from '../navigatorHelpers.js';

const options = { apiKey: 'synthetic-private-key', model: 'gemini-3.8-flash' };
const f = adaptiveFixture();
const messages = [{ role: 'system', content: INTENT_PROMPT }, ...intentMessages(f.goal, [])];
const reply = (text = JSON.stringify(f.intent), extra = {}) => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
  usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, thoughtsTokenCount: 20, totalTokenCount: 160 }, ...extra });
const reserveCall = async () => {};
const matches = code => error => error.code === code;

test('Gemini configuration is explicit and never uses the Groq key as a fallback', () => {
  const env = { NAVIGATOR_ENABLED: 'true', NAVIGATOR_PROVIDER: 'gemini', NAVIGATOR_MODEL: options.model, GEMINI_API_KEY: options.apiKey };
  const config = readNavigatorConfig(env);
  assert.equal(config.provider, 'gemini'); assert.equal(config.apiKey, options.apiKey);
  assert.equal(createResearchProvider(config).name, 'gemini');
  for (const patch of [{ GEMINI_API_KEY: '' }, { NAVIGATOR_MODEL: 'https://bad.invalid/model' }, { NAVIGATOR_MODEL: 'openai/gpt-oss-120b' }, { NAVIGATOR_MODEL: 'gemini-test?key=secret' }]) {
    assert.throws(() => readNavigatorConfig({ ...env, ...patch, GROQ_API_KEY: 'must-not-be-used' }), matches('INVALID_CONFIGURATION'));
  }
  assert.throws(() => createResearchProvider({ provider: 'auto' }), matches('INVALID_CONFIGURATION'));
});

test('Gemini reserves before native inference, preserves conversation/source indices and uses the same bound schema', async () => {
  const order = [];
  const provider = createGeminiProvider({ ...options, fetchImpl: async (url, request) => {
    order.push('request'); assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`);
    assert.ok(!url.includes(options.apiKey)); assert.equal(request.headers['x-goog-api-key'], options.apiKey); assert.equal(request.redirect, 'error');
    const body = JSON.parse(request.body);
    assert.deepEqual(body.systemInstruction.parts, [{ text: INTENT_PROMPT }]);
    assert.deepEqual(body.contents.map(c => c.parts[0].text), messages.filter(m => m.role === 'user').map(m => m.content));
    assert.deepEqual(body.generationConfig.responseJsonSchema, intentResponseFormat(messages).json_schema.schema);
    assert.equal(body.generationConfig.maxOutputTokens, 1000);
    assert.equal(body.generationConfig.temperature, undefined); assert.equal(body.generationConfig.topP, undefined); assert.equal(body.generationConfig.topK, undefined);
    assert.deepEqual(body.generationConfig.thinkingConfig, { includeThoughts: false, thinkingLevel: 'LOW' });
    assert.equal(body.tools, undefined); assert.equal(body.toolConfig, undefined); assert.equal(body.safetySettings, undefined);
    return jsonResponse(reply());
  } });
  const result = await provider.complete({ mode: 'research_intent', messages, reserveCall: async reservation => {
    order.push('reserve'); assert.deepEqual(reservation, { provider: 'gemini', model: options.model, maxOutputTokens: 1000 });
  } });
  assert.deepEqual(order, ['reserve', 'request']); assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 60 });
  assert.deepEqual(parseResearchIntent(result, intentMessages(f.goal, [])), f.intent);
});

test('Gemini 2.5 never receives unsupported thinking levels and answers get their separate allowance', async () => {
  const provider = createGeminiProvider({ ...options, model: 'gemini-2.5-flash', fetchImpl: async (_, request) => {
    const config = JSON.parse(request.body).generationConfig;
    assert.equal(config.maxOutputTokens, 3000); assert.equal(config.thinkingConfig.thinkingLevel, undefined);
    return jsonResponse(reply('{"assessments":[]}'));
  } });
  await provider.complete({ mode: 'evidence_answer', messages: [{ role: 'user', content: '{}' }], reserveCall });
});

test('invalid modes, contexts, missing reservations and cancelled calls cannot consume inference', async () => {
  let requests = 0;
  const provider = createGeminiProvider({ ...options, fetchImpl: async () => { requests++; assert.fail(); } });
  for (const request of [{ mode: 'search_plan', messages, reserveCall }, { mode: 'research_intent', messages },
    { mode: 'research_intent', messages: [{ role: 'user', content: 'x'.repeat(33000) }], reserveCall },
    { mode: 'research_intent', messages, reserveCall, signal: AbortSignal.abort() }]) await assert.rejects(provider.complete(request));
  await assert.rejects(provider.complete({ mode: 'research_intent', messages, reserveCall: async () => { throw Object.assign(new Error(), { code: 'QUOTA_EXHAUSTED' }); } }), matches('QUOTA_EXHAUSTED'));
  assert.equal(requests, 0);
});

for (const [status, code] of [[400, 'PROVIDER_REQUEST_REJECTED'], [401, 'PROVIDER_AUTH'], [403, 'PROVIDER_AUTH'], [404, 'PROVIDER_REQUEST_REJECTED'], [422, 'PROVIDER_REQUEST_REJECTED'], [429, 'PROVIDER_QUOTA'], [503, 'PROVIDER_UNAVAILABLE']]) {
  test(`Gemini HTTP ${status} maps safely without retries or fallback`, async () => {
    let requests = 0, reservations = 0;
    const provider = createGeminiProvider({ ...options, fetchImpl: async () => {
      requests++; return jsonResponse({ error: { status: 'INVALID_ARGUMENT', message: 'PRIVATE_STUDENT_TEXT', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '95.1s' }] } }, { status, headers: { 'content-type': 'application/json', 'retry-after': '70' } });
    } });
    await assert.rejects(provider.complete({ mode: 'research_intent', messages, reserveCall: async () => { reservations++; } }), error => {
      assert.equal(error.code, code); assert.doesNotMatch(JSON.stringify(error), /PRIVATE_STUDENT|synthetic-private-key/);
      if (status === 503) { assert.match(error.message, /temporarily unavailable/); assert.equal(error.providerDiagnostics.httpStatus, 503); }
      if (status === 429) assert.equal(error.retryAfterSeconds, 96); return true;
    });
    assert.equal(requests, 1); assert.equal(reservations, 1);
    if (status === 429) for (const [retryDelay, expected] of [['2s', 2], ['9'.repeat(400) + 's', 60]]) {
      const quota = createGeminiProvider({ ...options, fetchImpl: async () => jsonResponse({ error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] } }, { status: 429 }) });
      await assert.rejects(quota.complete({ mode: 'research_intent', messages, reserveCall }), error => error.code === 'PROVIDER_QUOTA' && error.retryAfterSeconds === expected);
    }
  });
}

test('Gemini rejects blocked, truncated, executable and malformed output while retaining no hidden thoughts', async () => {
  const invalid = [reply(undefined, { promptFeedback: { blockReason: 'SAFETY' } }), reply(undefined, { candidates: [] }),
    reply(undefined, { candidates: [{ finishReason: 'MAX_TOKENS' }] }),
    reply(undefined, { candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'unsafeAction', args: {} } }] } }] }),
    reply(undefined, { usageMetadata: { promptTokenCount: 100, totalTokenCount: 50 } }),
    reply('x'.repeat(12001))];
  for (const value of invalid) {
    const provider = createGeminiProvider({ ...options, fetchImpl: async () => jsonResponse(value) });
    await assert.rejects(provider.complete({ mode: 'research_intent', messages, reserveCall }));
  }
  const provider = createGeminiProvider({ ...options, fetchImpl: async () => jsonResponse(reply(undefined, { candidates: [{ finishReason: 'STOP', content: {
    parts: [{ thought: true, text: 'PRIVATE_REASONING' }, { text: JSON.stringify(f.intent), thoughtSignature: 'OPAQUE_PRIVATE_SIGNATURE' }],
  } }] })) });
  const result = await provider.complete({ mode: 'research_intent', messages, reserveCall });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_REASONING|OPAQUE_PRIVATE_SIGNATURE/);
});

test('Gemini has a deadline across stalled transport/body reads and cancellation is not retried', async () => {
  for (const [reason, fetchImpl] of [['response_timeout', async () => new Promise(() => {})], ['body_timeout', async () => new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'application/json' } })]]) {
    const provider = createGeminiProvider({ ...options, timeoutMs: 8, fetchImpl });
    await assert.rejects(provider.complete({ mode: 'research_intent', messages, reserveCall }), error => {
      assert.equal(error.code, 'PROVIDER_TIMEOUT'); assert.equal(error.providerDiagnostics.reason, reason);
      assert.equal(error.providerDiagnostics.budgetMs, 8); assert.ok(error.providerDiagnostics.elapsedMs >= 0); return true;
    });
  }
  const controller = new AbortController(); let requests = 0;
  const provider = createGeminiProvider({ ...options, fetchImpl: async () => { requests++; controller.abort(); return new Promise(() => {}); } });
  await assert.rejects(provider.complete({ mode: 'research_intent', messages, reserveCall, signal: controller.signal }), matches('CANCELLED')); assert.equal(requests, 1);
  const network = createGeminiProvider({ ...options, fetchImpl: async () => { throw Object.assign(new Error(options.apiKey), { cause: { code: 'ECONNRESET', message: 'PRIVATE_RESPONSE' } }); } });
  await assert.rejects(network.complete({ mode: 'research_intent', messages, reserveCall }), error => {
    assert.deepEqual(error.providerDiagnostics, { reason: 'transport_unavailable', providerCode: 'ECONNRESET' });
    assert.doesNotMatch(JSON.stringify(error), /synthetic-private-key|PRIVATE_RESPONSE/); return true;
  });
});

test('Gemini rejects oversized bodies and unknown usage stays incomplete rather than zero', async () => {
  const provider = createGeminiProvider({ ...options, fetchImpl: async () => jsonResponse(reply(undefined, { huge: 'x'.repeat(140000) })) });
  await assert.rejects(provider.complete({ mode: 'research_intent', messages, reserveCall }), matches('PROVIDER_RESPONSE_INVALID'));
  const incomplete = createGeminiProvider({ ...options, fetchImpl: async () => jsonResponse(reply(undefined, { usageMetadata: { promptTokenCount: 100 } })) });
  assert.equal((await incomplete.complete({ mode: 'research_intent', messages, reserveCall })).usage, null);
});

test('Gemini transport reaches cited findings through the actual adaptive graph and restarted checkpoints', async () => {
  const fixture = adaptiveFixture({ missing: true, twoSources: true, investigativeGap: true }), scripted = adaptiveProvider(fixture), modes = [];
  const provider = createGeminiProvider({ ...options, fetchImpl: async (_, request) => {
    const body = JSON.parse(request.body), schema = body.generationConfig.responseJsonSchema;
    const mode = schema.properties.assessments ? 'evidence_answer' : schema.properties.actionId ? 'research_decision' : 'research_intent';
    modes.push(mode);
    const messages = [{ role: 'system', content: body.systemInstruction.parts.map(part => part.text).join('\n') }, ...body.contents.map(c => ({ role: 'user', content: c.parts[0].text }))];
    return jsonResponse(reply((await scripted.complete({ mode, messages })).message.content));
  } });
  const result = await memoryJourney(fixture, { provider });
  assert.equal(result.session.status, 'completed');
  assert.deepEqual(modes, ['research_intent', 'research_decision', 'evidence_answer']);
  assert.equal(result.run.usage.modelCalls, 3);
  const entry = result.session.plan.entries[0];
  assert.ok(entry.answer.conditions.some(c => c.requirementId === 'c1' && c.status === 'supported'));
  assert.equal(entry.answer.conditions.find(c => c.requirementId === 'q0').status, 'unknown');
  assert.ok(entry.citations.some(c => c.evidence.quote.includes(fixture.clause)));
});

test('readiness exposes only the configured provider name, never credentials', async () => {
  const ready = createNavigatorReadiness();
  await ready.initialize(async () => ({ provider: 'gemini', apiKey: options.apiKey, ready: () => true, service: {} }));
  assert.equal(ready.status().provider, 'gemini'); assert.doesNotMatch(JSON.stringify(ready.status()), /synthetic-private-key/);
});
