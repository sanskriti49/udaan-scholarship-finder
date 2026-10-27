// Covers the server's maximum 70-second advancement plus response overhead.
// A contract test checks this against backend executionBudgets.js. No retries.
export const ADVANCE_REQUEST_TIMEOUT_MS = 80000;
