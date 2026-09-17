import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHarness, KEYS, LISTING_URL, textResponse, failing, NSP, listingText } from "../helpers.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { computeStatus } from "../../src/pipeline/core/status.js";

test("integration: initial crawl ingests all 31 schemes with valid cycles and evidence", async () => {
	const harness = makeHarness();
	const run = await harness.run();
	assert.equal(run.status, "success");
	assert.equal(run.counts.discovered, 31);
	assert.equal(run.counts.published, 31);
	assert.equal(run.counts.needsReview, 0);

	const schemes = await harness.store.listScholarships();
	assert.equal(schemes.length, 31);

	// Pragati Degree check
	const pragati = await harness.store.getScholarship(KEYS.pragatiDegree);
	assert.ok(pragati);
	assert.equal(pragati.publication.state, "published");
	assert.equal(pragati.verified, true);
	assert.equal(pragati.level, "UG");
	assert.ok(pragati.tags.includes("STEM"));
	assert.ok(pragati.tags.includes("Women"));
	assert.equal(pragati.amount.value, 50000);
	assert.equal(pragati.amount.period, "yearly");
	assert.equal(pragati.currentCycle.academicYear, "2026-27");
	assert.ok(pragati.currentCycle.closesAt);
});

test("integration: failure policy - crawl failure aborts without corrupting stored data", async () => {
	const harness = makeHarness();
	await harness.run();

	const before = await harness.store.getScholarship(KEYS.csss);
	assert.ok(before);

	// Simulate sudden upstream network failure on listing
	harness.setOverrides({ [LISTING_URL]: failing("ECONNRESET") });
	const failedRun = await harness.run();
	assert.equal(failedRun.status, "failed");

	const after = await harness.store.getScholarship(KEYS.csss);
	assert.deepEqual(after.dataHash, before.dataHash);
	assert.equal(after.publication.state, "published");
	assert.equal(after.title, before.title);
});

test("integration: stale data & vanished scheme - missing schemes are retained and flagged for review", async () => {
	const harness = makeHarness();
	await harness.run();

	// Mutate listing to drop one scheme (e.g. Pragati Diploma)
	const reducedListing = listingText.replace(
		/######\s+AICTE - Pragati Scholarship Scheme For Girl Students\s*\(\s*Technical Diploma\s*\)[\s\S]*?\[FAQ\]\([^\)]+\)/i,
		"",
	);
	harness.setOverrides({ [LISTING_URL]: textResponse(reducedListing) });

	// Run 1: Scheme vanishes
	const run1 = await harness.run();
	assert.equal(run1.counts.missingFromSource, 1);
	const s1 = await harness.store.getScholarship(KEYS.pragatiDiploma);
	assert.ok(s1, "Scheme must not be deleted from database");
	assert.equal(s1.freshness.missingRunCount, 1);

	// Run 2: Still missing
	await harness.run();
	const s2 = await harness.store.getScholarship(KEYS.pragatiDiploma);
	assert.equal(s2.freshness.missingRunCount, 2);

	// Run 3: Reaches threshold (3 runs) -> Review issue is filed
	await harness.run();
	const s3 = await harness.store.getScholarship(KEYS.pragatiDiploma);
	assert.equal(s3.freshness.missingRunCount, 3);

	const issues = await harness.store.listIssues({ schemeKey: KEYS.pragatiDiploma, status: "open" });
	assert.ok(issues.some((i) => i.code === "disappeared_from_source"));
});

test("integration: academic-year rollover creates new cycle and preserves historical cycles", async () => {
	const harness = makeHarness();
	await harness.run();

	const initialCycles = await harness.store.listCycles(KEYS.pragatiDegree);
	assert.equal(initialCycles.length, 1);
	assert.equal(initialCycles[0].academicYear, "2026-27");

	// Simulate next academic year banner (2027-28) with plausible 2027 dates
	const nextYearListing = listingText
		.replace(/Academic\s+Year\s+2026-27/gi, "Academic Year 2027-28")
		.replace(/Scheme Open from\s*:\s*01-06-2026/gi, "Scheme Open from: 01-06-2027")
		.replace(/Student Application Open till\s*:\s*31-10-2026/gi, "Student Application Open till: 31-10-2027");

	harness.setNow(new Date("2027-06-01T00:00:00.000Z"));
	harness.setOverrides({ [LISTING_URL]: textResponse(nextYearListing) });

	const rolloverRun = await harness.run();
	assert.equal(rolloverRun.status, "success");

	const cycles = await harness.store.listCycles(KEYS.pragatiDegree);
	assert.equal(cycles.length, 2, "Both 2026-27 and 2027-28 cycles must be recorded");

	const updated = await harness.store.getScholarship(KEYS.pragatiDegree);
	assert.equal(updated.currentCycle.academicYear, "2027-28");
	assert.ok(updated.academicYears.includes("2026-27"));
	assert.ok(updated.academicYears.includes("2027-28"));
});

test("integration: legacy adoption adopts old record by slug and updates verified provenance", async () => {
	const store = new MemoryStore();
	// Simulate an old unverified record from pre-provenance database
	const legacyRecord = {
		id: "legacy_pragati_id_123",
		slug: "aicte-pragati-girls-ug",
		title: "AICTE Pragati (Old Hardcoded)",
		legacy: true,
		publication: { state: "retired", note: "legacy seed" },
	};
	await store.saveScholarship(legacyRecord);

	const harness = makeHarness({ store });
	await harness.run();

	const adopted = await store.getScholarship(KEYS.pragatiDegree);
	assert.ok(adopted);
	assert.equal(adopted.id, "legacy_pragati_id_123", "Preserves existing record _id for bookmarks");
	assert.equal(adopted.publication.state, "published", "Republishes under official provenance");
	assert.equal(adopted.legacy, false);
	assert.equal(adopted.title, "AICTE - Pragati Scholarship Scheme For Girl Students (Technical Degree)");
	assert.equal(adopted.amount.value, 50000);
});

test("integration: evidence verification detects quote match and tampering", async () => {
	const harness = makeHarness();
	await harness.run();

	const pragati = await harness.store.getScholarship(KEYS.pragatiDegree);
	const cycleEvidence = pragati.currentCycle.evidence[0];
	assert.ok(cycleEvidence);

	const snapshot = await harness.store.getSnapshot(cycleEvidence.snapshotId);
	assert.ok(snapshot);

	// Legitimate verification
	const validCheck = verifyEvidence(cycleEvidence, snapshot);
	assert.equal(validCheck.ok, true);

	// Tampered quote
	const tamperedCheck = verifyEvidence({ ...cycleEvidence, quote: "Fake Tampered Deadline 2099" }, snapshot);
	assert.equal(tamperedCheck.ok, false);
	assert.equal(tamperedCheck.reason, "quote_not_at_offset");
});

test("integration: live status computation transitions correctly by date", () => {
	const record = {
		currentCycle: {
			opensAt: new Date("2026-06-01T00:00:00.000Z"),
			closesAt: new Date("2026-10-31T18:29:59.999Z"),
		},
		freshness: {
			lastSuccessfulCrawlAt: new Date("2026-09-17T00:00:00.000Z"),
			staleAfterHours: 72,
		},
	};

	// When before opening
	const upcoming = computeStatus(record, new Date("2026-05-15T00:00:00.000Z"));
	assert.equal(upcoming.status, "upcoming");

	// When open
	const open = computeStatus(record, new Date("2026-09-17T00:00:00.000Z"));
	assert.equal(open.status, "open");

	// When closing soon (within 7 days of 2026-10-31)
	const closingSoon = computeStatus(record, new Date("2026-10-27T00:00:00.000Z"));
	assert.equal(closingSoon.status, "closing_soon");

	// When closed
	const closed = computeStatus(record, new Date("2026-11-05T00:00:00.000Z"));
	assert.equal(closed.status, "closed");
});
