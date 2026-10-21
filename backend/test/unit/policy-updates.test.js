import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicUpdateIndex, withPublicUpdateState } from "../../src/services/policyUpdates.js";

const amount = { value: 80000, currency: "INR", period: "yearly", displayString: "₹80,000 per year" };
const noop = { changeType: "AWARD_UPDATE", summary: "Official values changed: amount", observedAt: "2026-10-21", deltas: [{ field: "amount", oldValue: { ...amount, months: null, options: [] }, newValue: amount }] };
const link = { changeType: "LINK_UPDATED", summary: "Official values changed: applicationLink", observedAt: "2026-10-19", deltas: [{ field: "applicationLink", oldValue: "https://old.gov.in", newValue: "https://new.gov.in" }] };

test("badge, recent-updates count and query IDs agree after ignoring old no-op entries", async () => {
	const index = await createPublicUpdateIndex({ loadFlagged: async () => [{ _id: "noop" }, { _id: "real" }, { _id: "unknown", latestChangeSummary: "Older update" }],
		loadVersions: async () => [{ ...noop, scholarship: "noop" }, { ...noop, scholarship: "real" }, { ...link, scholarship: "real" }] })();
	assert.deepEqual(index.ids, ["real", "unknown"]); assert.equal(index.count, 2);
	assert.deepEqual(withPublicUpdateState({ _id: "noop", hasChanges: true, latestChangeSummary: "Award updated" }, index), { _id: "noop", hasChanges: false, latestChangeSummary: null });
	assert.equal(withPublicUpdateState({ _id: "real" }, index).latestChangeSummary, "Application website updated.");
	assert.equal(withPublicUpdateState({ _id: "unknown" }, index).hasChanges, true);
});

test("one batched history query is shared and cached for concurrent catalogue readers", async () => {
	let now = 0, calls = 0;
	const read = createPublicUpdateIndex({ ttlMs: 10, now: () => now, loadFlagged: async () => { calls++; return [{ _id: "x" }]; },
		loadVersions: async ids => { assert.deepEqual(ids, ["x"]); return [{ ...noop, scholarship: "x" }]; } });
	const [first, second] = await Promise.all([read(), read()]);
	assert.equal(first, second); await read(); assert.equal(calls, 1);
	now = 11; await read(); assert.equal(calls, 2);
});

test("empty update sets do not query history and failed reads can be retried", async () => {
	let count = 0;
	const read = createPublicUpdateIndex({ loadFlagged: async () => { if (++count === 1) throw new Error("database unavailable"); return []; }, loadVersions: () => { assert.fail("No history query expected"); } });
	await assert.rejects(read(), /database unavailable/);
	assert.equal((await read()).count, 0);
});
