import { NavigatorError } from './contracts.js';

export const MAX_ADVANCE_MS = 70000;

/** One model call runs per checkpointed advancement. Leave bounded time for
 * persistence and stop well before its lease expires; never renew a call. */
export function researchExecutionBudgets({ timeoutMs }) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new NavigatorError('INVALID_CONFIGURATION', 'Configure a bounded provider response window.');
  const maxAdvanceMs = Math.max(40000, timeoutMs + 10000);
  return { maxAdvanceMs, leaseMs: Math.max(60000, Math.ceil(maxAdvanceMs / .75)) };
}
