import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { SafeFetcher, createRecordedTransport, resetHostState } from "../../src/pipeline/core/http.js";
import { loadRecordings } from "../../src/pipeline/recordings.js";
import { enabledSources } from "../../src/pipeline/sources.js";
import { Pipeline } from "../../src/pipeline/pipeline.js";

test("integration: multi-source expansion crawls central, state, statutory, and foundation portals", async () => {
	resetHostState();
	const store = new MemoryStore();
	const recordings = loadRecordings();
	const transport = createRecordedTransport(recordings.records);
	const pipeline = new Pipeline({
		store,
		now: () => new Date("2026-09-17T08:00:00.000Z"),
		fetcherFactory: (source) =>
			new SafeFetcher({
				allowedDomains: source.allowedDomains,
				transport,
				minIntervalMs: 0,
				retries: 1,
				backoffBaseMs: 1,
				sleep: async () => {},
			}),
	});

	const sources = enabledSources();
	assert.ok(sources.length >= 9, "Must have at least 9 registered official sources");

	const reports = await pipeline.runAll(sources);
	assert.equal(reports.length, sources.length);
	for (const report of reports) {
		assert.ok(report.status === "success" || report.status === "partial", "Source run failed: " + report.sourceId);
	}

	const allSchemes = await store.listScholarships();
	assert.ok(allSchemes.length >= 50, "Expected at least 50 schemes across India, got " + allSchemes.length);

	// Verify State coverage
	const upSchemes = allSchemes.filter((s) => s.state === "UP");
	assert.ok(upSchemes.length >= 4, "Expected at least 4 UP schemes, got " + upSchemes.length);

	const mhSchemes = allSchemes.filter((s) => s.state === "Maharashtra");
	assert.ok(mhSchemes.length >= 4, "Expected at least 4 Maharashtra schemes, got " + mhSchemes.length);

	const kaSchemes = allSchemes.filter((s) => s.state === "Karnataka");
	assert.ok(kaSchemes.length >= 3, "Expected at least 3 Karnataka schemes, got " + kaSchemes.length);

	const wbSchemes = allSchemes.filter((s) => s.state === "West Bengal");
	assert.ok(wbSchemes.length >= 3, "Expected at least 3 West Bengal schemes, got " + wbSchemes.length);

	const brSchemes = allSchemes.filter((s) => s.state === "Bihar");
	assert.ok(brSchemes.length >= 3, "Expected at least 3 Bihar schemes, got " + brSchemes.length);

	// Verify DST INSPIRE
	const inspire = allSchemes.find((s) => s.title.includes("INSPIRE"));
	assert.ok(inspire, "INSPIRE scholarship must exist");
	assert.equal(inspire.amount.value, 80000);
	assert.equal(inspire.state, "All India");
	assert.ok(inspire.tags.includes("STEM"));

	// Verify AICTE PG
	const aictePg = allSchemes.find((s) => s.title.includes("AICTE Post Graduate"));
	assert.ok(aictePg, "AICTE PG scholarship must exist");
	assert.equal(aictePg.amount.value, 148800);
	assert.equal(aictePg.level, "PG");

	// Verify Reliance Foundation
	const reliance = allSchemes.find((s) => s.title.includes("Reliance Foundation Undergraduate"));
	assert.ok(reliance, "Reliance Foundation scholarship must exist");
	assert.equal(reliance.amount.value, 50000);
	assert.equal(reliance.sourceType, "Corporate CSR");

	// Verify Evidence Integrity
	for (const scheme of allSchemes) {
		assert.ok(scheme.sourceUrl, "Scheme " + scheme.title + " must have an official sourceUrl");
		assert.ok(scheme.sourceUrl.startsWith("http"), "Scheme " + scheme.title + " sourceUrl must be http(s)");
		assert.ok(!scheme.sourceUrl.includes("/null"), "Scheme " + scheme.title + " must not point to /null");
		assert.ok(scheme.fieldEvidence.length > 0, "Scheme " + scheme.title + " must have field evidence");
	}
});
