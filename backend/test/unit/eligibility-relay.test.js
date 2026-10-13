import test from "node:test";
import assert from "node:assert/strict";
import { relayEligibilityAlerts } from "../../src/services/eligibilityAlertRelay.js";
import { enqueueEligibilityJob } from "../../src/jobs/enqueueEligibilityChange.js";

function relayHarness({ available = true, committed = true } = {}) {
	const writes = [], jobs = [], version = { _id: "new", scholarship: "scheme", previousVersion: "old" };
	return { writes, jobs, dependencies: {
		Version: { find: () => ({ sort: () => ({ lean: () => ({ cursor: async function* () { yield version; } }) }) }), updateOne: async (...args) => writes.push(args) },
		Scheme: { findOne: () => ({ lean: async () => committed ? { _id: "scheme", eligibilityVersion: "new", publication: { state: "published" } } : null }) },
		enqueue: async data => { if (!available) return null; jobs.push(data); return { id: "job" }; },
	} };
}

test("relay leaves pending events durable while Redis is down or the record save is uncommitted", async () => {
	for (const options of [{ available: false }, { committed: false }]) {
		const h = relayHarness(options);
		assert.equal((await relayEligibilityAlerts(h.dependencies)).queued, 0);
		assert.equal(h.writes.length, 0);
	}
	const h = relayHarness();
	assert.equal((await relayEligibilityAlerts(h.dependencies)).queued, 1);
	assert.deepEqual(h.jobs[0], { scholarshipId: "scheme", previousVersionId: "old", currentVersionId: "new" });
	assert.equal(h.writes[0][1].$set["alert.status"], "queued");
});

test("relay suppresses a published ancestor superseded by a later committed version", async () => {
	const h = relayHarness();
	h.dependencies.Scheme.findOne = () => ({ lean: async () => ({ eligibilityVersion: "newer" }) });
	h.dependencies.Version.findById = () => ({ lean: async () => ({ previousVersion: "new" }) });
	assert.equal((await relayEligibilityAlerts(h.dependencies)).queued, 0);
	assert.equal(h.writes[0][1].$set["alert.status"], "suppressed");
});

test("queue retries use stable version IDs and recover exhausted failed jobs", async () => {
	let saved, retries = 0, adds = 0;
	const queue = { getJob: async () => saved, add: async (name, data, options) => {
		adds++; assert.equal(name, "handleEligibilityChangeAlert"); assert.equal(options.jobId, "eligibility_scheme_new");
		assert.equal(options.attempts, 5); assert.equal(options.backoff.type, "exponential");
		return saved = { getState: async () => "failed", retry: async (state, opts) => { assert.equal(state, "failed"); assert.equal(opts.resetAttemptsMade, true); retries++; } };
	} };
	const data = { scholarshipId: "scheme", previousVersionId: "old", currentVersionId: "new" };
	assert.equal(await enqueueEligibilityJob(data, { queue, available: () => false }), null);
	await enqueueEligibilityJob(data, { queue, available: () => true });
	await enqueueEligibilityJob(data, { queue, available: () => true });
	assert.equal(adds, 1); assert.equal(retries, 1);
});
