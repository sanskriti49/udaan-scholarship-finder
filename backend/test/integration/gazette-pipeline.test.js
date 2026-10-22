import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeHarness, KEYS, recordings } from "../helpers.js";
import { digest, extraction } from "../gazetteHelpers.js";
import { createGazetteClient } from "../../src/pipeline/core/gazetteClient.js";
import { toDocument } from "../../src/pipeline/core/documents.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { Pipeline } from "../../src/pipeline/pipeline.js";

const pdf = readFileSync(new URL("../fixtures/synthetic/two-page-guideline.pdf", import.meta.url));
const url = recordings.records.find(record => record.url.endsWith("/AICTE_2010_G.pdf"))?.url;
const pdfResponse = body => async () => ({ status: 200, headers: { get: key => key.toLowerCase() === "content-type" ? "application/pdf" : null }, body });

test("an offline document service falls back during a complete crawl and persists an open issue", async () => {
	assert.ok(url, "recorded Pragati guideline exists");
	const harness = makeHarness();
	harness.pipeline.gazetteClient = createGazetteClient({ baseUrl: "http://gazette", fetchImpl: async () => { throw new Error("offline"); } });
	harness.setOverrides({ [url]: pdfResponse(pdf) });
	const run = await harness.run();
	assert.equal(run.status, "success"); assert.equal(run.counts.published, 31);
	const issues = await harness.store.listIssues({ status: "open" });
	const issue = issues.find(issue => issue.code === "gazette_service_fallback" && issue.details.url === url);
	assert.ok(issue); assert.equal(issue.occurrences, 1);
	assert.ok(run.pages.some(page => page.url === url && page.extractionMethod === "baseline"));
});

test("unreadable PDFs keep the crawl running and preserve verified scholarship values and snapshots", async () => {
	const harness = makeHarness();
	await harness.run();
	const before = await harness.store.getScholarship(KEYS.pragatiDegree);
	const snapshot = await harness.store.getLatestSnapshot(url);
	harness.pipeline.gazetteClient = createGazetteClient({ baseUrl: "http://gazette", fetchImpl: async () => { throw new Error("offline"); } });
	harness.setOverrides({ [url]: pdfResponse(Buffer.from("%PDF-unreadable synthetic input")) });
	const run = await harness.run();
	assert.equal(run.status, "success"); assert.equal(run.counts.published, 31);
	const after = await harness.store.getScholarship(KEYS.pragatiDegree);
	assert.equal(after.amount.value, before.amount.value);
	assert.equal(after.eligibility.familyIncome.max, before.eligibility.familyIncome.max);
	assert.deepEqual(await harness.store.getLatestSnapshot(url), snapshot);
	assert.ok((await harness.store.listIssues({ status: "open" })).some(issue => issue.code === "gazette_pdf_unreadable"));
});

test("OCR values stay review-only, rich artifacts survive snapshot reuse and 304 replay", async () => {
	const harness = makeHarness();
	await harness.run();
	const before = await harness.store.getScholarship(KEYS.pragatiDegree);
	const payload = extraction(pdf, "The scholarship amount is Rs. 12345 per year. Annual family income must not exceed Rs. 900000. This synthetic OCR paragraph deliberately contains different numbers and must not replace verified scholarship values from an earlier cited guideline.", "ocr");
	harness.pipeline.gazetteClient = createGazetteClient({ baseUrl: "http://gazette", fetchImpl: async () => new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } }) });
	harness.setOverrides({ [url]: pdfResponse(pdf) });
	assert.equal((await harness.run()).status, "success");
	const after = await harness.store.getScholarship(KEYS.pragatiDegree);
	assert.equal(after.amount.value, before.amount.value);
	assert.equal(after.eligibility.familyIncome.max, before.eligibility.familyIncome.max);
	const snapshot = await harness.store.getLatestSnapshot(url);
	const artifact = await harness.store.getLatestDocumentExtraction(url, snapshot.textHash);
	assert.equal(artifact.data.source_sha256, payload.source_sha256);
	const savedText = snapshot.text;
	await harness.run();
	assert.equal((await harness.store.getLatestSnapshot(url)).text, savedText);
	assert.equal(harness.store.documentExtractions.size, 1);
	payload.profile_sha256 = digest("fixture-profile-v2");
	await harness.run();
	assert.equal(harness.store.documentExtractions.size, 2, "new extraction profiles are archived even when canonical text is unchanged");
	assert.equal((await harness.store.getLatestSnapshot(url)).id, snapshot.id, "old text offsets and snapshot identity stay valid");
	const latestArtifact = await harness.store.getLatestDocumentExtraction(url, snapshot.textHash);
	assert.equal(latestArtifact.data.profile_sha256, payload.profile_sha256);
	const run = { runId: "304-test", pages: [] };
	const replay = await harness.pipeline.fetchDocument({ id: "synthetic", strategy: "static" }, { url, role: "guidelines", adapter: "guidelinePdf" }, { fetch: async () => ({ status: 304, notModified: true, fetchedAt: new Date() }) }, run);
	assert.deepEqual(replay.doc.documentIntelligence, latestArtifact.data);
	assert.equal(replay.doc.quality.requiresManualReview, true);
});

test("fallback retains an archived layout safeguard even when text deduplication kept an older snapshot", async () => {
	const store = new MemoryStore();
	const baseline = await toDocument({ contentType: "application/pdf", body: pdf });
	const at = new Date();
	await store.saveSnapshot({ url, kind: "pdf", text: baseline.text, textHash: baseline.textHash, pages: baseline.pages, quality: baseline.quality, fetchedAt: at });
	const data = extraction(pdf, baseline.text, "ocr");
	await store.saveDocumentExtraction({ key: "known-reviewed-layout", url, data, canonicalTextHash: baseline.textHash, extractionMethod: "gazette", seenAt: at });
	const pipeline = new Pipeline({ store, gazetteClient: createGazetteClient({ baseUrl: "" }) });
	const result = await pipeline.fetchDocument({ id: "synthetic", strategy: "static" }, { url, adapter: "guidelinePdf", role: "guidelines" },
		{ fetch: async () => ({ body: pdf, contentType: "application/pdf", fetchedAt: at, status: 200 }) }, { runId: "fallback", pages: [] });
	assert.equal(result.doc.extractionMethod, "baseline");
	assert.equal(result.doc.quality.requiresManualReview, true);
});
