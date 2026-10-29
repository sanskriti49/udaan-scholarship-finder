import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVANCE_REQUEST_TIMEOUT_MS } from '../src/services/navigatorTiming.js';
import { researchExecutionBudgets } from '../../backend/src/agents/navigator/executionBudgets.js';

test('browser advancement deadline outlasts every allowed server/provider execution window', () => {
  for (const timeoutMs of [20000, 30000, 45000, 60000]) {
    assert.ok(ADVANCE_REQUEST_TIMEOUT_MS >= researchExecutionBudgets({ timeoutMs }).maxAdvanceMs + 10000);
  }
  assert.ok(ADVANCE_REQUEST_TIMEOUT_MS <= 80000);
});
