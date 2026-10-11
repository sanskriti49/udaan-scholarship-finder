import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { SafeFetcher, resetHostState } from "../../src/pipeline/core/http.js";
import { fetchRendered } from "../../src/pipeline/core/dynamic.js";

let server, base;
let privateRequests = 0;
const scheme = `<h5>Schemes On NSP</h5><button>Example Education Department</button><img src="/logo.png">
<h6 class="scheme">Example Undergraduate Scholarship</h6>
<p>Scheme Open from : 01-06-2026 Student Application Open till : 31-10-2026 Defective Application Verification Open till:15-11-2026 Institute Verification Open till:15-11-2026 DNO/SNO/MNO Verification Open till:30-11-2026</p>`;
const document = `<html><body><h6>Academic Year 2026-27</h6>${scheme}<p>${"Official portal guidance. ".repeat(20)}</p></body></html>`;
const shell = `<html><body><nav>${"Public navigation and portal guidance. ".repeat(25)}</nav><div id="app"></div>
<script>fetch('/data').then(r=>r.json()).then(data=>{ document.getElementById('app').innerHTML=data.html; });</script></body></html>`;

before(async () => {
	server = http.createServer((req, res) => {
		if (req.url === "/robots.txt") { res.end("User-agent: *\nDisallow: /private"); return; }
		if (req.url === "/data") { res.setHeader("Content-Type", "application/json"); setTimeout(() => res.end(JSON.stringify({ html: document })), 150); return; }
		if (req.url === "/redirect") { res.writeHead(302, { location: "/private" }); res.end(); return; }
		if (req.url === "/foreign") { res.writeHead(302, { location: base.replace("127.0.0.1", "localhost") + "/private" }); res.end(); return; }
		if (req.url === "/private") { privateRequests++; res.end(document); return; }
		if (req.url === "/forbidden") { res.writeHead(403); res.end("Forbidden"); return; }
		if (req.url === "/embedded") { res.setHeader("Content-Type", "text/html"); res.end(document + `<iframe src="${base.replace("127.0.0.1", "localhost")}/private"></iframe>`); return; }
		res.setHeader("Content-Type", "text/html");
		res.end(req.url === "/static" ? document : shell);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => { resetHostState(); privateRequests = 0; });
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
const fetcher = () => new SafeFetcher({ allowedDomains: ["127.0.0.1"], minIntervalMs: 0, retries: 0, timeoutMs: 5000 });
const options = () => ({ allowedDomains: ["127.0.0.1"], fetcher: fetcher(), waitForSelector: "h6.scheme", timeoutMs: 5000 });

test("real browser: asynchronous API content is rendered, cited, and ingested", async () => {
	const store = new MemoryStore();
	const source = {
		id: "synthetic_js_portal", name: "Test public portal", strategy: "auto", allowedDomains: ["127.0.0.1"],
		sourceType: "Government", authorityTier: 1, minExpectedSchemes: 1,
		entries: [{ url: base + "/js", adapter: "nspSchemeList", role: "listing", waitForSelector: "h6.scheme" }],
		followUps: { maxPerRun: 0 },
	};
	const pipeline = new Pipeline({ store, fetcherFactory: fetcher });
	const report = await pipeline.runSource(source);
	assert.equal(report.status, "success", JSON.stringify(report.errors));
	assert.equal(report.pages[0].fetchMethod, "dynamic");
	assert.ok(report.pages[0].fallbackReason);
	const [record] = await store.listScholarships();
	assert.equal(record.title, "Example Undergraduate Scholarship");
	assert.equal(record.organization, "Example Education Department");
	assert.equal(record.publication.state, "published");
	for (const ev of record.fieldEvidence) {
		const snapshot = await store.getSnapshot(ev.snapshotId);
		assert.equal(snapshot.text.slice(ev.charStart, ev.charEnd), ev.quote);
	}
});

test("real browser: redirect to a robots-disallowed page is blocked before requesting it", async () => {
	await assert.rejects(fetchRendered(base + "/redirect", options()), { code: "ROBOTS_DISALLOWED" });
	assert.equal(privateRequests, 0);
});

test("real browser: redirect outside the allowlist is blocked before requesting it", async () => {
	await assert.rejects(fetchRendered(base + "/foreign", options()), { code: "DOMAIN_NOT_ALLOWED" });
	assert.equal(privateRequests, 0);
});

test("real browser: blocked external media frame does not abort the main scholarship page", async () => {
	const result=await fetchRendered(base+"/embedded",options());
	assert.match(result.body.toString(),/Example Undergraduate Scholarship/);
	assert.equal(privateRequests,0);
});

test("real browser: missing readiness selector produces a bounded timeout", async () => {
	await assert.rejects(fetchRendered(base + "/static", { ...options(), waitForSelector: "#never", timeoutMs: 250 }), { code: "TIMEOUT" });
});

test("real browser: HTTP access errors and oversized documents are not extracted", async () => {
	await assert.rejects(fetchRendered(base + "/forbidden", options()), { code: "HTTP_STATUS", status: 403 });
	const limited = fetcher(); limited.maxBytes = 100;
	await assert.rejects(fetchRendered(base + "/static", { ...options(), fetcher: limited }), { code: "TOO_LARGE" });
});
