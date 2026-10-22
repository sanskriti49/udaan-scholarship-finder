import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createGazetteClient } from "../../src/pipeline/core/gazetteClient.js";
import { gazetteExtractionSchema } from "../../src/pipeline/core/gazetteContract.js";
import { toDocument } from "../../src/pipeline/core/documents.js";
import { guidelinePdfAdapter } from "../../src/pipeline/adapters/guidelinePdf.js";
import { extraction } from "../gazetteHelpers.js";

const pdf = readFileSync(new URL("../fixtures/synthetic/two-page-guideline.pdf", import.meta.url));
const response = value => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });

test("Gazette delegates only PDF bytes, binds the response digest and retains UTF-16 evidence", async () => {
	let request;
	const payload = extraction(pdf);
	const client = createGazetteClient({ baseUrl: "http://gazette:8000", apiKey: "synthetic-secret", fetchImpl: async (url, options) => { request = { url, options }; return response(payload); } });
	const doc = await toDocument({ url: "https://example.gov.in/guidelines.pdf", contentType: "application/pdf", body: pdf }, { gazetteClient: client, ocrLanguages: "eng+tel" });
	assert.equal(request.url.pathname, "/v1/extract");
	assert.equal(request.url.searchParams.get("ocr_languages"), "eng+tel");
	assert.equal(request.options.body, pdf);
	assert.equal(request.options.headers["x-gazette-key"], "synthetic-secret");
	assert.equal(doc.extractionMethod, "gazette");
	assert.deepEqual(doc.documentIntelligence, payload);
	assert.equal(doc.text.slice(payload.sections[0].start, payload.sections[0].end), payload.sections[0].text);
	assert.equal(doc.text.length, [...doc.text].length + 1, "astral character uses two UTF-16 units");
	let called = false;
	await toDocument({ contentType: "text/html", body: Buffer.from("<p>ordinary page</p>") }, { gazetteClient: { enabled: true, extract: async () => { called = true; } } });
	assert.equal(called, false);
	await toDocument({ contentType: "text/x-captured-text", capturedSourceType: "application/pdf", body: Buffer.from("Already captured PDF text") }, { gazetteClient: { enabled: true, extract: async () => { called = true; } } });
	assert.equal(called, false, "recorded text is not uploaded as fake PDF bytes");
});

test("invalid schema, hash, offsets, parent hierarchy and geometry fail closed", async () => {
	const mutations = [
		p => { p.contract_version = "2"; }, p => { p.source_sha256 = "0".repeat(64); }, p => { p.pages[0].words[0].bbox[2] = 99999; },
		p => { p.sections[0].end--; }, p => { p.sections[0].parent_id = "missing"; }, p => { p.pages[0].lines[0].start++; }, p => { p.byte_length++; },
	];
	for (const mutate of mutations) {
		const payload = extraction(pdf); mutate(payload);
		const client = createGazetteClient({ baseUrl: "http://gazette", fetchImpl: async () => response(payload) });
		await assert.rejects(client.extract(pdf), error => error.code === "GAZETTE_CONTRACT_INVALID");
	}
});

test("offline, corrupt, non-JSON and oversized responses fall back to the real baseline PDF parser", async () => {
	const factories = [async () => { throw new Error("ECONNREFUSED"); }, async () => new Response("broken", { headers: { "content-type": "application/json" } }),
		async () => new Response("proxy error", { status: 503 }), async () => new Response("html"), async () => response({ text: "bad" }), async () => response({ padding: "x".repeat(1200) })];
	for (const fetchImpl of factories) {
		const issues = [];
		const doc = await toDocument({ contentType: "application/pdf", body: pdf }, { gazetteClient: createGazetteClient({ baseUrl: "http://gazette", fetchImpl, maxResponseBytes: 1000 }), onIssue: async issue => issues.push(issue) });
		assert.equal(doc.extractionMethod, "baseline");
		assert.ok(doc.text.length > 200);
		assert.equal(doc.documentIntelligence, null);
		assert.equal(issues[0].code, "gazette_service_fallback");
	}
});

test("timeouts include a stalled response body; the circuit opens and later recovers", async () => {
	const server = createServer((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.write("{"); });
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	try {
		const client = createGazetteClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, timeoutMs: 40 });
		const start = Date.now();
		await assert.rejects(client.extract(pdf), error => ["GAZETTE_TIMEOUT", "GAZETTE_UNAVAILABLE"].includes(error.code));
		assert.ok(Date.now() - start < 1000);
	} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
	let time = 1, calls = 0, healthy = false;
	const client = createGazetteClient({ baseUrl: "http://gazette", now: () => time, cooldownMs: 50, fetchImpl: async () => { calls++; if (!healthy) throw new Error(); return response(extraction(pdf)); } });
	await assert.rejects(client.extract(pdf)); await assert.rejects(client.extract(pdf));
	await assert.rejects(client.extract(pdf), error => error.code === "GAZETTE_CIRCUIT_OPEN"); assert.equal(calls, 2);
	time += 51; healthy = true;
	assert.equal((await client.extract(pdf)).contract_version, "1.0"); assert.equal(calls, 3);
});

test("partial/OCR results preserve evidence but cannot auto-apply numerical policy fields", async () => {
	const payload = extraction(pdf, "The annual family income must not exceed Rs. 300000. The scholarship is Rs. 24000 per year. This is only a synthetic OCR extraction used to test that plausible numbers cannot bypass the manual-review boundary.", "ocr");
	const issues = [];
	const doc = await toDocument({ body: pdf, contentType: "application/pdf" }, { gazetteClient: createGazetteClient({ baseUrl: "http://gazette", fetchImpl: async () => response(payload) }), onIssue: async issue => issues.push(issue) });
	assert.equal(doc.quality.requiresManualReview, true);
	assert.deepEqual(guidelinePdfAdapter.extract(doc, { text: doc.text }, { linkedSchemeKeys: ["one"] }).facts, {});
	assert.ok(issues.some(issue => issue.code === "gazette_review_required"));
	payload.status = "partial";
	const partial = await toDocument({ body: pdf, contentType: "application/pdf" }, { gazetteClient: createGazetteClient({ baseUrl: "http://gazette", fetchImpl: async () => response(payload) }), onIssue: async issue => issues.push(issue) });
	assert.equal(partial.extractionMethod, "baseline");
	assert.equal(partial.documentIntelligence.status, "partial");
	assert.equal(partial.quality.requiresManualReview, true);
	assert.ok(issues.some(issue => issue.code === "gazette_partial_extraction"));
});

test("a disabled client does no network work; schema validates a healthy fixture", async () => {
	const client = createGazetteClient({ baseUrl: "", fetchImpl: async () => { throw new Error("should not call"); } });
	assert.equal(await client.extract(pdf), null);
	assert.ok(gazetteExtractionSchema.safeParse(extraction(pdf)).success);
});

test("table row/column geometry, covered slots and source references are validated", () => {
	const payload = extraction(pdf, "Category Marks\nGeneral 75%\nSC 65%");
	for (const [index, word] of payload.pages[0].words.entries()) if (index % 2) { word.bbox[0] = 55; word.bbox[2] = 85; }
	for (const line of payload.pages[0].lines) line.bbox[2] = 110;
	payload.requires_review = true;
	const rows = [["Category", "Marks"], ["General", "75%"], ["SC", "65%"]];
	const cells = rows.flatMap((values, row) => values.map((text, column) => ({ row, column, row_span: 1, column_span: 1, text,
		bbox: [column ? 48 : 0, row ? row * 20 + 10 : 0, column ? 110 : 48, row * 20 + 30], word_indices: [row * 2 + column] })));
	payload.tables = [{ id: "table-1", page: 1, method: "pdfplumber_lines", bbox: [0, 0, 110, 70], row_count: 3, column_count: 2, rows, cells, requires_review: true }];
	assert.ok(gazetteExtractionSchema.safeParse(payload).success);
	for (const mutate of [p => { p.tables[0].cells[0].row_span = 1000000000; }, p => { p.tables[0].cells[0].word_indices = [999]; }, p => { p.tables[0].cells.push(p.tables[0].cells[0]); }, p => { p.tables[0].rows[0][0] = "Invented value"; }]) {
		const changed = structuredClone(payload); mutate(changed);
		assert.equal(gazetteExtractionSchema.safeParse(changed).success, false);
	}
});
