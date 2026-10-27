import test from 'node:test';
import assert from 'node:assert/strict';
import { researchExecutionBudgets, MAX_ADVANCE_MS } from '../../src/agents/navigator/executionBudgets.js';
import { readNavigatorConfig } from '../../src/agents/navigator/config.js';
import { createDurableNavigator } from '../../src/agents/navigator/durableNavigator.js';
import { researchFixture } from '../navigatorHelpers.js';

test('Gemini response windows are provider-specific and existing Groq bounds remain unchanged', () => {
  const env = { NAVIGATOR_ENABLED: 'true', NAVIGATOR_PROVIDER: 'gemini', NAVIGATOR_MODEL: 'gemini-3.8-flash', GEMINI_API_KEY: 'synthetic' };
  assert.equal(readNavigatorConfig(env).timeoutMs, 45000);
  assert.equal(readNavigatorConfig({ ...env, NAVIGATOR_TIMEOUT_MS: '60000' }).timeoutMs, 60000);
  for (const timeout of ['0', '60001', 'Infinity']) assert.throws(() => readNavigatorConfig({ ...env, NAVIGATOR_TIMEOUT_MS: timeout }));
  const groq = { ...env, NAVIGATOR_PROVIDER: 'groq', NAVIGATOR_MODEL: 'openai/gpt-oss-120b', GROQ_API_KEY: 'synthetic' };
  assert.equal(readNavigatorConfig(groq).timeoutMs, 20000);
  assert.throws(() => readNavigatorConfig({ ...groq, NAVIGATOR_TIMEOUT_MS: '45000' }));
});

test('execution and lease windows include persistence margin at every permitted provider deadline', () => {
  for (const timeoutMs of [1000, 20000, 30000, 45000, 60000]) {
    const budget = researchExecutionBudgets({ timeoutMs });
    assert.ok(budget.maxAdvanceMs >= timeoutMs + 10000);
    assert.ok(budget.maxAdvanceMs <= MAX_ADVANCE_MS);
    assert.ok(budget.maxAdvanceMs < budget.leaseMs * .8);
    assert.ok(budget.leaseMs <= 120000);
  }
  assert.deepEqual(researchExecutionBudgets({ timeoutMs: 20000 }), { maxAdvanceMs: 40000, leaseMs: 60000 });
  for (const timeoutMs of [0, 60001, NaN]) assert.throws(() => researchExecutionBudgets({ timeoutMs }));
});

test('a longer advancement requires the matching lease and cannot bypass the absolute execution cap', () => {
  const budget = researchExecutionBudgets({ timeoutMs: 45000 });
  const options = { store: { leaseMs: budget.leaseMs, readLease: async () => {} }, repository: researchFixture().repository,
    provider: { name: 'gemini', model: 'gemini-3.8-flash', complete: async () => assert.fail('no inference') }, env: {},
    config: { enabled: true, maxModelCalls: 3, maxToolCalls: 8, globalDailyLimit: 20, userDailyLimit: 8 }, maxAdvanceMs: budget.maxAdvanceMs };
  assert.doesNotThrow(() => createDurableNavigator(options));
  assert.throws(() => createDurableNavigator({ ...options, store: { ...options.store, leaseMs: 60000 } }));
  assert.throws(() => createDurableNavigator({ ...options, maxAdvanceMs: MAX_ADVANCE_MS + 1 }));
  assert.throws(() => createDurableNavigator({ ...options, maxAdvanceMs: 40000, config: { ...options.config, timeoutMs: 45000 } }));
});
