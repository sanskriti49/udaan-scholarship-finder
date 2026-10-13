import test from "node:test";
import assert from "node:assert/strict";
import { processEligibilityChange } from "../../src/workers/processEligibilityChange.js";
import { makeEvidence } from "../../src/pipeline/core/evidence.js";

const job = { data: { scholarshipId: "scheme", previousVersionId: "old", currentVersionId: "new" } };
function harness(options = {}) {
	const snapshots = {}, versions = {}, notifications = new Map(), writes = [], attempts = [];
	for (const [id, limit] of [["old", 250000], ["new", 300000]]) {
		const text = `Synthetic income ceiling ${limit}.`;
		const snapshot = { id, url: "https://example.gov.in/rules", text, textHash: text };
		snapshots[id] = snapshot;
		const evidence = { ...makeEvidence(snapshot, text, { field: "familyIncome" }), ruleId: "income" };
		versions[id] = { _id: id, scholarship: "scheme", previousVersion: id === "new" ? "old" : null, verified: true,
			snapshot: { rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: limit }], dataQuality: { unknownFields: ["eligibility"] } }, evidence: [evidence] };
	}
	const profile = options.profile === null ? null : { familyIncome: 280000, ...options.profile };
	const scheme = options.scheme === null ? null : { _id: "scheme", title: "Example scholarship", publication: { state: "published" }, eligibilityVersion: "new", ...options.scheme };
	const prefs = { eligibilityChanges: true, channels: { inApp: true, email: false }, ...options.prefs };
	let failOnce = options.failOnce;
	return { versions, snapshots, notifications, attempts, writes, dependencies: {
		Scholarship: { findById: () => ({ lean: async () => scheme }) },
		EligibilityRuleVersion: { findById: id => ({ lean: async () => versions[id] }), updateOne: async (...args) => writes.push(args) },
		SourceSnapshot: { findById: id => ({ lean: async () => snapshots[id] }) },
		Bookmark: { find: () => ({ lean: () => ({ cursor: async function* () { yield { user: "student" }; } }) }), exists: async () => options.bookmarked !== false },
		UserProfile: { findOne: () => ({ lean: async () => profile }) },
		notificationService: { getPreferences: async () => prefs, createNotification: async (user, payload) => {
			attempts.push(payload);
			if (failOnce) { failOnce = false; throw new Error("Transient delivery failure"); }
			if (notifications.has(payload.dedupKey)) return null;
			notifications.set(payload.dedupKey, payload); return { _id: "notice" };
		} },
	} };
}

test("actual change processor explains the personal impact and deduplicates repeated events", async () => {
	const h = harness();
	assert.equal((await processEligibilityChange(job, h.dependencies)).dispatched, 1);
	assert.equal((await processEligibilityChange(job, h.dependencies)).dispatched, 0);
	assert.equal(h.notifications.size, 1);
	assert.equal(h.attempts[0].dedupKey, "eligibility_change:student:scheme:new");
	assert.equal(h.attempts[0].data.remainingUnknown[0].ruleId, "official_manual_review");
	assert.equal(h.writes[0][1].$set["alert.status"], "completed");
});

test("disabled preferences, removed bookmarks, missing profiles and unchanged outcomes suppress delivery", async () => {
	for (const options of [{ prefs: { eligibilityChanges: false } }, { prefs: { eligibilityChanges: undefined } },
		{ prefs: { channels: { inApp: false, email: false } } }, { bookmarked: false }, { profile: null },
		{ profile: { familyIncome: null } }, { profile: { familyIncome: 200000 } }]) {
		const h = harness(options);
		assert.equal((await processEligibilityChange(job, h.dependencies)).dispatched, 0);
		assert.equal(h.attempts.length, 0);
	}
});

test("forged evidence, mismatched versions, unpublished and superseded schemes are suppressed", async () => {
	for (const mode of ["forged", "missingEvidence", "mismatch", "unverified", "superseded", "unpublished", "gone"]) {
		const h = harness({ scheme: mode === "gone" ? null : mode === "superseded" ? { eligibilityVersion: "newer" } : mode === "unpublished" ? { publication: { state: "needs_review" } } : {} });
		if (mode === "forged") h.snapshots.new.text = "No such requirement";
		if (mode === "missingEvidence") h.versions.new.evidence = [];
		if (mode === "mismatch") h.versions.new.previousVersion = "other";
		if (mode === "unverified") h.versions.new.verified = false;
		assert.equal((await processEligibilityChange(job, h.dependencies)).status, "SKIPPED");
		assert.equal(h.attempts.length, 0);
	}
});

test("delivery failures propagate to BullMQ and a subsequent attempt completes", async () => {
	const h = harness({ failOnce: true });
	await assert.rejects(processEligibilityChange(job, h.dependencies), /retry required/);
	assert.equal(h.writes.length, 0);
	assert.equal((await processEligibilityChange(job, h.dependencies)).dispatched, 1);
	assert.equal(h.notifications.size, 1);
});
