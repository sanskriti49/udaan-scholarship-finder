import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { enrichSourceLinks, preferredSourceUrl } from "../../src/pipeline/core/sourceLinks.js";
import { cleanPortalUrl } from "../../src/pipeline/core/urls.js";
import { toDocument } from "../../src/pipeline/core/documents.js";
import { nspSchemeListAdapter } from "../../src/pipeline/adapters/nspSchemeList.js";
import { ADAPTERS, SOURCE_REGISTRY } from "../../src/pipeline/sources.js";
import { verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { assembleRecord } from "../../src/pipeline/core/assemble.js";

const source = { id: "test", allowedDomains: ["example.gov.in"], sourceType: "Government", authorityTier: 1 };
const item = title => ({ fields: { title, officialTitle: title }, links: { listingUrl: "https://example.gov.in/All-Scholarships" }, followUps: [] });

test("API navigation keeps identity; only the known myScheme slug maps to a public page", () => {
	assert.equal(cleanPortalUrl("https://example.gov.in/api/schemes?id=42"), "https://example.gov.in/api/schemes?id=42");
	assert.equal(cleanPortalUrl("https://www.myscheme.gov.in/api/apisetu/schemes?slug=svmcms&lang=en"), "https://www.myscheme.gov.in/schemes/svmcms");
	assert.equal(cleanPortalUrl("https://myscheme.gov.in.evil.com/api/apisetu/schemes?slug=svmcms"), "https://myscheme.gov.in.evil.com/api/apisetu/schemes?slug=svmcms");
});

test("discovery is title-scoped, allowlisted, and cannot borrow documents from a neighboring card", () => {
	const records = [item("Alpha Degree"), item("Alpha Diploma"), item("తెలుగు విద్యా పథకం")];
	const html = '<main><article><h3><a href="/schemes/degree?id=1">Alpha Degree</a></h3><a href="/docs/degree.pdf">Guidelines</a><a href="https://evil.com/phish.pdf">FAQ</a></article><article><h3>Alpha Diploma</h3><a href="/docs/diploma.pdf">Specifications</a></article><article><h3>తెలుగు విద్యా పథకం</h3></article></main>';
	enrichSourceLinks(records, { html, url: records[0].links.listingUrl }, source);
	assert.equal(records[0].links.detailUrl, "https://example.gov.in/schemes/degree?id=1");
	assert.equal(records[0].links.guidelinesUrl, "https://example.gov.in/docs/degree.pdf");
	assert.equal(records[1].links.guidelinesUrl, "https://example.gov.in/docs/diploma.pdf");
	assert.equal(records[2].links.guidelinesUrl, undefined);
	assert.match(decodeURIComponent(records[2].links.detailUrl), /తెలుగు విద్యా పథకం/);
	assert.equal(records[0].links.faqUrl, undefined);
	assert.equal(records[0].followUps.length, 1);
	enrichSourceLinks(records, { html, url: records[0].links.listingUrl }, source);
	assert.equal(records[0].followUps.length, 1);
});

test("a specific catalogue page wins over a general provider homepage", () => {
	assert.equal(preferredSourceUrl({ listingUrl: "https://www.myscheme.gov.in/schemes/svmcms", guidelinesUrl: "https://svmcm.wb.gov.in/" }), "https://www.myscheme.gov.in/schemes/svmcms");
	assert.equal(preferredSourceUrl({ detailUrl: "https://example.gov.in/All-Scholarships#:~:text=Alpha", guidelinesUrl: "https://example.gov.in/alpha.pdf" }), "https://example.gov.in/alpha.pdf");
});

test("duplicate titles in different department cards do not acquire the first card's PDF", () => {
	const record = item("Post Matric Scholarship");
	enrichSourceLinks([record], { url: record.links.listingUrl, html: '<main><article><h3>Post Matric Scholarship</h3><a href="/a.pdf">Guidelines</a></article><article><h3>Post Matric Scholarship</h3><a href="/b.pdf">Guidelines</a></article></main>' }, source);
	assert.equal(record.links.guidelinesUrl, undefined);
	assert.equal(record.followUps.length, 0);
});

test("NSP retains specifications and FAQ when they occur on separate lines", async () => {
	const body = Buffer.from('<h5>Academic Year 2026-27</h5><h5>Schemes On NSP</h5><h6><a href="/scheme/degree">Alpha Degree</a></h6><p>Scheme Open from : 01-06-2026 Student Application Open till : 31-10-2026</p><p><a href="/docs/degree.pdf">Specifications</a></p><p><a href="/docs/degree-faq.pdf">FAQ</a></p>');
	const doc = await toDocument({ url: "https://example.gov.in/All-Scholarships", body, contentType: "text/html" });
	const snapshot = { ...doc, id: "nsp-link-fixture", sourceId: "test" };
	const { records } = nspSchemeListAdapter.extract(doc, snapshot, { source });
	assert.equal(records[0].fields.officialTitle, "Alpha Degree");
	assert.equal(records[0].links.guidelinesUrl, "https://example.gov.in/docs/degree.pdf");
	assert.equal(records[0].links.faqUrl, "https://example.gov.in/docs/degree-faq.pdf");
	enrichSourceLinks(records, doc, source);
	assert.equal(records[0].links.detailUrl, "https://example.gov.in/scheme/degree");
	for (const ev of records[0].evidence) assert.equal(verifyEvidence(ev, snapshot).ok, true);
});

test("recorded public portal fixtures retain scheme navigation without rewriting evidence URLs", async () => {
	for (const [id, file] of [["wb_svmcm_scholarship", "wb.json"], ["aicte_ugc_national", "aicte.html"], ["karnataka_ssp_scholarship", "karnataka.html"]]) {
		const portal = SOURCE_REGISTRY.find(s => s.id === id), entry = portal.entries[0];
		const doc = await toDocument({ url: entry.url, body: fs.readFileSync(new URL(`../fixtures/official-portals/${file}`, import.meta.url)), contentType: file.endsWith("json") ? "application/json" : "text/html" });
		const snapshot = { ...doc, id: "fixture", sourceId: id };
		const { records } = ADAPTERS[entry.adapter].extract(doc, snapshot, { source: portal, entry });
		enrichSourceLinks(records, doc, portal);
		for (const candidate of records) {
			const { record } = assembleRecord(candidate, { source: portal });
			assert.ok(record.officialLinks.detailUrl);
			assert.notEqual(record.sourceUrl, "https://www.myscheme.gov.in/");
			for (const ev of candidate.evidence) assert.equal(verifyEvidence(ev, snapshot).ok, true);
		}
		if (file === "wb.json") assert.equal(records[0].links.detailUrl, "https://www.myscheme.gov.in/schemes/svmcms");
	}
});
