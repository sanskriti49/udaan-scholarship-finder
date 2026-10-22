import test from "node:test";
import assert from "node:assert/strict";
import { makeHarness, KEYS } from "../helpers.js";
import { verifyEvidence } from "../../src/pipeline/core/evidence.js";
import Scholarship from "../../src/models/Scholarship.js";

test("a recorded crawl persists separate scheme navigation while keeping source citations verifiable", async () => {
	const harness = makeHarness();
	const run = await harness.run();
	assert.equal(run.status, "success");
	assert.equal(run.counts.published, 31);
	const record = await harness.store.getScholarship(KEYS.pragatiDegree);
	assert.match(record.officialLinks.detailUrl, /All-Scholarships#:~:text=/);
	assert.equal(record.sourceUrl, record.officialLinks.guidelinesUrl);
	// Check the actual persistence schema too: these used to be silently dropped.
	const stored = new Scholarship(record);
	assert.equal(stored.officialLinks.detailUrl, record.officialLinks.detailUrl);
	assert.equal(stored.officialLinks.applyUrl, record.officialLinks.applyUrl);
	for (const evidence of record.fieldEvidence) assert.equal(verifyEvidence(evidence, await harness.store.getSnapshot(evidence.snapshotId)).ok, true);
});
