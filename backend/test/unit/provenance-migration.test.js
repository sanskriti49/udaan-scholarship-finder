import { test } from "node:test";
import assert from "node:assert/strict";
import { up as stopSeeding, UNVERIFIED_UPDATE_SUMMARIES } from "../../src/migrations/003-seed-recent-updates.js";
import { up as quarantine } from "../../src/migrations/004-quarantine-unverified-samples.js";

test("provenance migration: fresh installs do not seed notices, and cleanup leaves live captures alone", async () => {
	await stopSeeding({ db: { collection() { throw new Error("Must not touch the catalogue"); } }, log() {} });
	let changedRecords = 0;
	const db = { collection(name) {
		if (name === "scholarships") return {
			updateMany: async (filter) => { assert.deepEqual(filter, { latestChangeSummary: { $in: UNVERIFIED_UPDATE_SUMMARIES } }); return { modifiedCount: 2 }; },
			updateOne: async () => { changedRecords++; },
		};
		assert.equal(name, "sourcesnapshots");
		return { find(filter) {
			assert.equal(filter.capturedSourceType, "application/json");
			assert.ok(filter.contentType.test("text/x-captured-text"));
			assert.equal(filter.contentType.test("application/json"), false, "Live JSON API responses are excluded");
			assert.ok(filter.url.$in.includes("https://mahadbt.maharashtra.gov.in/"));
			assert.ok(filter.url.$in.includes("https://mahadbt.maharashtra.gov.in/api/schemes"));
			assert.ok(!filter.url.$in.includes("https://scholarships.gov.in/All-Scholarships"));
			return { toArray: async () => [] };
		} };
	} };
	assert.deepEqual(await quarantine({ db, log() {} }), { clearedCannedNotices: 2, quarantinedSamples: 0 });
	assert.equal(changedRecords, 0);
});

test("provenance migration: sample data is archived under the same record ID and its cycles are excluded", async () => {
	const sample = { _id: "bookmark-record", schemeKey: "sample-scheme", amount: { value: 99999 }, fieldEvidence: [{ snapshotId: "sample-snapshot" }] };
	let update;
	const flagged = [];
	const db = { collection(name) {
		if (name === "sourcesnapshots") return { find: () => ({ toArray: async () => [{ _id: "sample-snapshot" }] }) };
		if (name === "scholarships") return {
			updateMany: async () => ({ modifiedCount: 0 }),
			find(filter) { assert.ok(filter["fieldEvidence.snapshotId"].$in.includes("sample-snapshot")); return [sample]; },
			updateOne: async (filter, value) => { assert.deepEqual(filter, { _id: "bookmark-record" }); update = value.$set; },
		};
		return { updateMany: async (filter, value) => { flagged.push(name); assert.deepEqual(filter, { schemeKey: { $in: ["sample-scheme"] } }); assert.equal(value.$set.legacyUnverified, true); } };
	} };
	const result = await quarantine({ db, log() {} });
	assert.equal(result.quarantinedSamples, 1);
	assert.equal(update.publication.state, "needs_review");
	assert.deepEqual(update.legacySnapshot.amount, sample.amount);
	assert.equal(update.legacy, true);
	assert.equal(update.amount, null);
	assert.equal(update.deadline, null);
	assert.deepEqual(flagged, ["scholarshipcycles", "scholarshipversions"]);
});
