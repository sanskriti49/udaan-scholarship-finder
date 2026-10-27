import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonCases, prepareComparisonCase } from '../../evaluations/navigatorCases.js';
import { comparePreparedCases, scoreComparisonAnswer, scoreComparisonIntent } from '../../src/agents/navigator/comparison.js';
import { comparisonOptions, main } from '../../src/scripts/compareNavigatorProviders.js';
import { NavigatorError } from '../../src/agents/navigator/contracts.js';

function response(prepared, { wrong = false, fabricated = false, empty = false } = {}) {
  const candidate = prepared.packet.context.candidates[0];
  return { message: { content: JSON.stringify({ assessments: empty ? [] : prepared.session.retrieval.requirements.map((requirement, index) => {
    const quote = prepared.item.clauses[prepared.item.proofs?.[index] ?? 0];
    const passage = candidate.passages.find(p => p.quote.includes(quote));
    const status = wrong ? 'supported' : prepared.item.expected[index];
    return { schemeId: prepared.schemeId, requirementId: requirement.id, status, dependsOn: [],
      explanation: status === 'unknown' ? 'The available guidance does not establish this condition; confirm the missing details.' : status === 'contradicted' ? 'The quoted restriction conflicts with the supplied category.' : 'The quoted clause supports this condition; other requirements still need checking.',
      evidence: passage ? [{ evidenceId: passage.id, quote: fabricated ? 'PRIVATE_INVENTED_RENEWAL_GUARANTEE' : quote, relation: status === 'contradicted' ? 'contradicts' : 'supports' }] : [] };
  }) }) }, intentFormat: 'json_schema', usage: { inputTokens: 100, outputTokens: 40 } };
}

test('all comparison cases use real retrieval, independent expectations and no fabricated source coverage', async () => {
  for (const item of comparisonCases) {
    const prepared = await prepareComparisonCase(item);
    assert.equal(prepared.session.retrieval.requirements.length, item.expected.length);
    const intent = scoreComparisonIntent(prepared, { intentFormat: 'json_schema', message: { content: JSON.stringify(prepared.intent) } });
    assert.equal(intent.matchedConstraints, intent.expectedConstraints); assert.equal(intent.unexpectedConstraints, 0);
    if (item.excluded) { assert.equal(prepared.recordedExclusion, true); assert.equal(prepared.packet.context.candidates.length, 0); continue; }
    if (item.id === 'missing-policy') { assert.equal(prepared.packet.context.candidates.length, 0); continue; }
    const score = scoreComparisonAnswer(prepared, response(prepared));
    assert.equal(score.correctConditions, item.expected.length, `${item.id}: ${JSON.stringify(score)}`);
    assert.equal(score.unsupportedClaims, 0); assert.equal(score.unsupportedProposals, 0);
    assert.equal(score.acceptedAssessments, item.expected.length);
  }
});

test('an unsupported eligibility proposal cannot score as correct merely because validation safely downgraded it', async () => {
  const prepared = await prepareComparisonCase(comparisonCases.find(item => item.id === 'category-exclusion'));
  const wrong = scoreComparisonAnswer(prepared, response(prepared, { wrong: true }));
  assert.equal(wrong.correctConditions, 0); assert.equal(wrong.unsupportedProposals, 1);
  const fabricated = scoreComparisonAnswer(prepared, response(prepared, { fabricated: true }));
  assert.equal(fabricated.correctConditions, 0); assert.ok(fabricated.rejectedAssessments > 0);
  assert.doesNotMatch(JSON.stringify(fabricated.findings), /PRIVATE_INVENTED_RENEWAL_GUARANTEE/);
  const empty = scoreComparisonAnswer(prepared, response(prepared, { empty: true }));
  assert.equal(empty.correctConditions, 0); assert.equal(empty.acceptedAssessments, 0);
});

test('both providers receive identical questions/evidence, spend one reservation per request and expose measured usage', async () => {
  const prepared = await prepareComparisonCase(comparisonCases[0]), inputs = [], reservations = [];
  const providers = ['groq', 'gemini'].map(name => ({ name, model: 'synthetic', async complete(request) {
    inputs.push({ name, mode: request.mode, messages: request.messages }); await request.reserveCall({ provider: name });
    return request.mode === 'research_intent' ? { intentFormat: 'json_schema', message: { content: JSON.stringify(prepared.intent) }, usage: { inputTokens: 100, outputTokens: 40 } } : response(prepared);
  } }));
  const report = await comparePreparedCases({ cases: [prepared], providers, reserveCall: async p => reservations.push(p.name) });
  assert.equal(report.calls, 4); assert.equal(report.stopped, null); assert.deepEqual(reservations, ['groq', 'gemini', 'groq', 'gemini']);
  assert.deepEqual(inputs[0].messages, inputs[1].messages); assert.deepEqual(inputs[2].messages, inputs[3].messages);
  assert.equal(report.results[0].inputFingerprint, report.results[1].inputFingerprint);
  assert.equal(report.results[2].inputFingerprint, report.results[3].inputFingerprint);
  assert.ok(report.summaries.every(s => s.correctConditions === 1 && s.reservedCalls === 2 && s.outputTokens === 80));
  assert.ok(report.summaries.every(s => s.estimatedCostUsd === null));
});

test('call caps, unavailable evidence, cancellation and provider quotas cannot initiate hidden extra requests', async () => {
  const prepared = await prepareComparisonCase(comparisonCases[0]); let invoked = 0;
  const provider = { name: 'gemini', model: 'synthetic', complete: async request => { await request.reserveCall({}); invoked++; return { intentFormat: 'json_schema', message: { content: JSON.stringify(prepared.intent) } }; } };
  const limited = await comparePreparedCases({ cases: [prepared], providers: [provider], maxCalls: 1, reserveCall: async () => {} });
  assert.equal(limited.calls, 1); assert.equal(limited.stopped, 'COMPARISON_LIMIT'); assert.equal(invoked, 1);
  const missing = await prepareComparisonCase(comparisonCases.find(c => c.id === 'missing-policy'));
  const result = await comparePreparedCases({ cases: [missing], providers: [{ ...provider, complete: async request => {
    assert.equal(request.mode, 'research_intent'); await request.reserveCall({}); return { intentFormat: 'json_schema', message: { content: JSON.stringify(missing.intent) } };
  } }], reserveCall: async () => {} });
  assert.equal(result.calls, 1); assert.equal(result.coverage[0].answerPacketAvailable, false);
  const cancelled = await comparePreparedCases({ cases: [prepared], providers: [provider], signal: AbortSignal.abort(), reserveCall: async () => assert.fail() });
  assert.equal(cancelled.calls, 0); assert.equal(cancelled.stopped, 'CANCELLED');
  let requests = 0;
  const quota = await comparePreparedCases({ cases: [prepared, prepared], providers: [{ ...provider, complete: async request => {
    await request.reserveCall({}); requests++; throw new NavigatorError('PROVIDER_QUOTA', 'SYNTHETIC_PRIVATE_ERROR');
  } }], reserveCall: async () => {} });
  assert.equal(requests, 1); assert.equal(quota.calls, 1); assert.equal(quota.stopped, 'PROVIDER_QUOTA');
  assert.doesNotMatch(JSON.stringify(quota), /SYNTHETIC_PRIVATE_ERROR/);
});

test('comparison CLI is offline by default and validates its finite, explicit scope before loading credentials', async () => {
  assert.equal(comparisonOptions([]).live, false);
  for (const args of [['--cases=no-such-case'], ['--max-calls=13'], ['--providers=auto'], ['--providers=gemini,gemini'], ['--unknown-flag']]) assert.throws(() => comparisonOptions(args));
  await assert.rejects(main(['--live-free']), /EXPLICIT_MODELS_REQUIRED/);
  assert.equal(comparisonOptions(['--live-free', '--gemini-model=gemini-3.8-flash', '--groq-model=openai/gpt-oss-120b']).maxCalls, 4);
});

test('persistence failure stops comparison before another provider can consume inference', async () => {
  const prepared = await prepareComparisonCase(comparisonCases[0]); let transports = 0;
  const provider = { name: 'groq', model: 'synthetic', complete: async request => { await request.reserveCall({}); transports++; return response(prepared); } };
  const report = await comparePreparedCases({ cases: [prepared], providers: [provider, { ...provider, name: 'gemini' }],
    reserveCall: async () => { throw new NavigatorError('PERSISTENCE_UNAVAILABLE', 'PRIVATE_DATABASE_ERROR'); } });
  assert.equal(transports, 0); assert.equal(report.calls, 0); assert.equal(report.stopped, 'PERSISTENCE_UNAVAILABLE');
  assert.equal(report.results.length, 1); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_DATABASE_ERROR/);
});
