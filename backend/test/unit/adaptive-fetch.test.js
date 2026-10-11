import { test } from "node:test";
import assert from "node:assert/strict";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { SafeFetcher, createRecordedTransport, resetHostState } from "../../src/pipeline/core/http.js";
import { loadRecordings } from "../../src/pipeline/recordings.js";
import { SOURCE_REGISTRY, enabledSources } from "../../src/pipeline/sources.js";
import { jsonFeedAdapter } from "../../src/pipeline/adapters/jsonFeed.js";
import { listingText, NSP } from "../helpers.js";

const url = NSP.entries[0].url;
const source = { ...NSP, strategy: "auto", entries: [NSP.entries[0]], followUps: { maxPerRun: 0 } };
const result = (body, extra = {}) => ({ url, finalUrl: url, status: 200, body: Buffer.from(body), contentType: "text/html", fetchedAt: new Date(), ...extra });
const captured = () => result(listingText, { contentType: "text/x-captured-text", capturedSourceType: "text/html" });
const shell = `<html><body><nav>${"Navigation links and information. ".repeat(30)}</nav><div id="app"></div><script src="app.js"></script></body></html>`;
const silent = { child() { return this; }, info() {}, warn() {}, error() {} };
function harness(fetch, renderer = async () => { throw new Error("render should not run"); }, allowRendering = true) {
	const store = new MemoryStore();
	const pipeline = new Pipeline({ store, renderer, logger: silent, fetcherFactory: () => ({ fetch, allowRendering }) });
	return { store, pipeline, run: () => pipeline.runSource(source) };
}

test("auto: sufficient static content is parsed without launching a browser", async () => {
	const h = harness(async () => captured());
	const report = await h.run();
	assert.equal(report.status, "success");
	assert.equal(report.counts.discovered, 31);
	assert.equal(report.pages[0].fetchMethod, "static");
});

test("auto: a large navigation shell triggers rendering when the parser finds no schemes", async () => {
	let calls = 0;
	const h = harness(async () => result(shell), async () => { calls++; return { ...captured(), fetchMethod: "dynamic" }; });
	const report = await h.run();
	assert.equal(report.status, "success");
	assert.equal(report.counts.discovered, 31);
	assert.equal(calls, 1);
	assert.equal(report.pages[0].fetchMethod, "dynamic");
	assert.ok(report.pages[0].fallbackReason);
});

test("auto: thin HTML triggers rendering", async () => {
	const h = harness(async () => result('<html><div id="app"></div></html>'), async () => ({ ...captured(), fetchMethod: "dynamic" }));
	assert.equal((await h.run()).pages[0].fallbackReason, "thin_content");
});

test("render failure preserves scholarships and records an actionable error", async () => {
	let broken = false;
	const h = harness(async () => broken ? result(shell) : captured(), async () => { throw Object.assign(new Error("Install Chromium"), { code: "DYNAMIC_UNAVAILABLE" }); });
	await h.run();
	const before = await h.store.listScholarships();
	broken = true;
	const report = await h.run();
	assert.equal(report.status, "failed");
	assert.equal(report.errors[0].code, "DYNAMIC_UNAVAILABLE");
	assert.deepEqual(await h.store.listScholarships(), before);
});

test("304 from a static shell cannot freeze previously rendered data", async () => {
	let conditional;
	const h = harness(async (_, options) => { conditional = options; return result(shell); }, async () => ({ ...captured(), fetchMethod: "dynamic" }));
	await h.run();
	await h.run();
	assert.equal(conditional.etag, undefined);
	assert.equal(conditional.lastModified, undefined);
});

test("static 304 reuses citations and skips rendering", async () => {
	let first = true;
	const h = harness(async () => { if (first) { first = false; return captured(); } return { status: 304, notModified: true, fetchedAt: new Date() }; });
	await h.run();
	const report = await h.run();
	assert.equal(report.status, "success");
	assert.equal(report.pages[0].notModified, true);
	assert.equal(report.counts.unchanged, 31);
});

test("HTTP failures are not bypassed with browser rendering", async () => {
	const h = harness(async () => { throw Object.assign(new Error("Forbidden"), { code: "HTTP_STATUS", status: 403 }); });
	assert.equal((await h.run()).errors[0].code, "HTTP_STATUS");
});

test("recorded transports cannot invoke a live browser on layout errors", async () => {
	resetHostState();
	const transport = createRecordedTransport([{ url, text: shell, sourceContentType: "text/html" }]);
	const fetcher = new SafeFetcher({ transport, allowedDomains: NSP.allowedDomains, minIntervalMs: 0 });
	assert.equal(fetcher.allowRendering, false);
	const h = harness((...args) => fetcher.fetch(...args), undefined, fetcher.allowRendering);
	assert.equal((await h.run()).status, "rejected");
});

test("HTML cannot be mistaken for a mapped JSON feed", () => {
	const out = jsonFeedAdapter.extract({ kind: "html", json: null }, {}, { source: SOURCE_REGISTRY[1] });
	assert.equal(out.issues[0].code, "source_format_mismatch");
	assert.equal(out.records.length, 0);
});

test("production replay excludes unverified normalized feed samples", () => {
	assert.ok(loadRecordings().records.every((r) => r.sourceContentType !== "application/json"));
	assert.equal(loadRecordings(undefined, { includeUnverified: true }).records.filter((r) => r.sourceContentType === "application/json").length, 8);
	assert.ok(enabledSources().every((s) => s.ingestionStatus === "ready"));
});

test("unsupported sources fail explicitly instead of reporting a healthy crawl", async () => {
	const h = harness(async () => { throw new Error("must not fetch an unconfigured feed"); });
	const report = await h.pipeline.runSource({ ...SOURCE_REGISTRY[1], ingestionStatus: "needs_adapter" });
	assert.equal(report.status, "rejected");
	assert.equal(report.errors[0].code, "SOURCE_NOT_READY");
});
