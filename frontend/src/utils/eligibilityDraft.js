// Transient bridge. No history state, storage or API request carries scanner data.
let draft = null;
let expiry;
export function stageEligibilityDraft(prefill, sourceDocLabel) {
  clearEligibilityDraft();
  draft = {prefill:{...prefill},sourceDocLabel};
  expiry = setTimeout(clearEligibilityDraft, 60000);
}
export function readEligibilityDraft() { return draft; }
export function clearEligibilityDraft() { draft = null; clearTimeout(expiry); }

if (typeof window !== "undefined") window.addEventListener("pagehide", clearEligibilityDraft);
