// Explicit real-service suite. No production database, source crawls or student files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGazetteClient } from "../../src/pipeline/core/gazetteClient.js";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { guidelinePdfAdapter } from "../../src/pipeline/adapters/guidelinePdf.js";
import { makeEvidence, verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { sha256 } from "../../src/pipeline/core/http.js";

const client = createGazetteClient({ baseUrl: process.env.GAZETTE_TEST_URL || "http://127.0.0.1:8000", timeoutMs: 30000 });
const fixture = name => readFileSync(new URL(`../../../services/gazette/tests/fixtures/${name}.pdf`, import.meta.url));

for (const name of ["layout", "scanned", "mixed"]) test(`real Python HTTP contract: ${name} PDF enters the Node pipeline with source geometry`, async () => {
	const store = new MemoryStore();
	const pipeline = new Pipeline({ store, gazetteClient: client, logger: { warn() {} } });
	const url = `https://example.gov.in/synthetic-${name}.pdf`, body = fixture(name);
	const fetched = await pipeline.fetchDocument({ id: "gazette-contract", strategy: "static", gazette: { ocrLanguages: "eng" } }, { url, role: "guidelines", adapter: "guidelinePdf" },
		{ fetch: async () => ({ url, finalUrl: url, status: 200, contentType: "application/pdf", body, sha256: sha256(body), byteLength: body.length, fetchedAt: new Date() }) }, { runId: "fixture-only", pages: [] });
	const result = fetched.doc.documentIntelligence;
	assert.ok(result, "a running service is required; fallback alone does not pass this contract test");
	assert.equal(fetched.doc.extractionMethod, "gazette");
	assert.equal(result.status, "complete");
	assert.ok(result.tables.some(table => table.rows.some(row => row.some(value => value?.includes("75%")))));
	if (name !== "layout") assert.ok(result.pages.some(page => page.method === "ocr"));
	const quote = result.metadata.deadline_dates.find(hit => hit.iso_date === "2026-10-31");
	assert.ok(quote);
	const evidence = makeEvidence(fetched.snapshot, quote.quote, { fromIndex: quote.start });
	assert.ok(verifyEvidence(evidence, fetched.snapshot).ok);
	assert.deepEqual(guidelinePdfAdapter.extract(fetched.doc, fetched.snapshot, { linkedSchemeKeys: ["synthetic"] }).facts, {}, "unreviewed table/OCR thresholds never become eligibility facts");
	assert.equal(store.documentExtractions.size, 1);
	assert.equal((await store.getLatestDocumentExtraction(url, fetched.doc.textHash)).data.source_sha256, result.source_sha256);
});
