import { test } from "node:test";
import assert from "node:assert/strict";
import { toDocument } from "../../src/pipeline/core/documents.js";
import { mahadbtListingAdapter } from "../../src/pipeline/adapters/mahadbtListing.js";
import { mahadbtGuidelineAdapter } from "../../src/pipeline/adapters/mahadbtGuideline.js";
import { SOURCE_REGISTRY } from "../../src/pipeline/sources.js";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";

const source = { ...SOURCE_REGISTRY.find((s) => s.id === "mahadbt_state_scholarship"), minExpectedSchemes: 2, followUps: { maxPerRun: 0 } };
// Synthetic fixture reproduces the publicly verified department-tab structure.
const html = `<html><body><div class="parentVerticalTab">
<ul class="resp-tabs-list hor_1"><li>Department One</li><li>Department Two</li></ul>
<div class="resp-tabs-container hor_1">
<div><a href="/SchemeData/SchemeData?str=one">Example Scholarship</a>
<a href="https://evil.example/SchemeData/SchemeData?str=bad">Fake Scholarship</a></div>
<div><a href="/SchemeData/SchemeData?str=two">Example Scholarship</a>
<a href="javascript:ShowDs('secret')">Unusable Scheme</a></div>
</div></div><p>${"Portal registration guidance. ".repeat(20)}</p></body></html>`;
const response = () => ({ url: source.entries[0].url, finalUrl: source.entries[0].url, contentType: "text/html", body: Buffer.from(html), fetchedAt: new Date(), status: 200 });

test("MahaDBT: department identity, official deep links, and exact citations survive extraction", async () => {
	const doc = await toDocument(response());
	const snapshot = { ...doc, id: "test", fetchedAt: new Date() };
	const out = mahadbtListingAdapter.extract(doc, snapshot, { source });
	assert.equal(out.records.length, 2);
	assert.equal(out.issues.length, 0);
	assert.notEqual(out.records[0].schemeKey, out.records[1].schemeKey);
	assert.equal(out.records[0].fields.organization, "Department One");
	assert.ok(out.records.every((r) => r.links.applyUrl.startsWith("https://mahadbt.maharashtra.gov.in/SchemeData/")));
	for (const record of out.records) {
		assert.deepEqual(record.cycles, [], "No dates inferred from the clock or unrelated portal notices");
		assert.equal(record.fields.amount, undefined);
		assert.equal(record.fields.familyIncome, undefined);
		for (const ev of record.evidence) assert.equal(snapshot.text.slice(ev.charStart, ev.charEnd), ev.quote);
	}
});

test("MahaDBT: changed layout is rejected rather than interpreted as an empty catalogue", async () => {
	const doc = await toDocument({ ...response(), body: Buffer.from('<html><body><h1>Maintenance</h1></body></html>') });
	assert.equal(mahadbtListingAdapter.extract(doc, doc, { source }).issues[0].severity, "blocking");
});

test("MahaDBT: scheme facts exclude unrelated portal help and retain full-snapshot citations", async () => {
	const body = `<html><body><aside>Other scheme: income upto Rs. 8 lakh. Rs. 50000 per year.</aside>
	<div class="col-md-8"><h3>Benefits</h3><p>Rs. 12000 per year.</p><h3>Eligibility</h3>
	<p>The parents/Guardian annual income shall be less than or equal to Rs. 2,50,000.</p></div></body></html>`;
	const doc = await toDocument({ ...response(), body: Buffer.from(body) });
	const snapshot = { ...doc, id: "scheme", fetchedAt: new Date() };
	const out = mahadbtGuidelineAdapter.extract(doc, snapshot, { source, linkedSchemeKeys: ["example"] });
	assert.equal(out.facts.familyIncome.max, 250000);
	assert.equal(out.facts.familyIncome.operator, "LTE");
	assert.equal(out.facts.amount.value, 12000);
	for (const ev of [...out.facts.familyIncome.evidence, ...out.facts.amount.evidence]) {
		assert.equal(snapshot.text.slice(ev.charStart, ev.charEnd), ev.quote);
	}
});

test("quarantined sample can be re-ingested without resurrecting its old income rules or deadlines", async () => {
	const store = new MemoryStore();
	const doc = await toDocument(response());
	const [candidate] = mahadbtListingAdapter.extract(doc, { ...doc, id: "x" }, { source }).records;
	await store.saveScholarship({ schemeKey: candidate.schemeKey, id: "original", slug: "saved-bookmark", legacy: true,
		legacySnapshot: { amount: 99999 }, publication: { state: "needs_review" },
		amount: { value: 99999 }, eligibility: { familyIncome: { max: 999999 } } });
	await store.saveCycle({ schemeKey: candidate.schemeKey, academicYear: "2026-27", applicationType: "general", closesAt: new Date("2026-12-31") });
	for (const cycle of store.cycles.values()) cycle.legacyUnverified = true;
	const pipeline = new Pipeline({ store, fetcherFactory: () => ({ allowRendering: false, fetch: async () => response() }) });
	await pipeline.runSource(source);
	const refreshed = await store.getScholarship(candidate.schemeKey);
	assert.equal(refreshed.id, "original");
	assert.equal(refreshed.slug, "saved-bookmark");
	assert.equal(refreshed.legacy, false);
	assert.equal(refreshed.amount, null);
	assert.equal(refreshed.eligibility.familyIncome, null);
	assert.equal(refreshed.deadline, null);
	assert.equal(refreshed.publication.state, "published");
});

test("MahaDBT: original public HTML survives conditional-request snapshot reuse", async () => {
	let first = true;
	const store = new MemoryStore();
	const pipeline = new Pipeline({ store, fetcherFactory: () => ({ allowRendering: false, fetch: async () => {
		if (first) { first = false; return response(); }
		return { status: 304, notModified: true, fetchedAt: new Date() };
	} }) });
	assert.equal((await pipeline.runSource(source)).counts.published, 2);
	const second = await pipeline.runSource(source);
	assert.equal(second.status, "success");
	assert.equal(second.counts.unchanged, 2);
	assert.equal(second.pages[0].notModified, true);
	const records = await store.listScholarships();
	assert.ok(records.every((r) => r.status === "unknown" && r.deadline === null));
});
