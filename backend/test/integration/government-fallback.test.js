import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { getSource } from "../../src/pipeline/sources.js";
import { verifyEvidence } from "../../src/pipeline/core/evidence.js";

const silent = { child() { return this; }, info() {}, warn() {}, error() {} };
const fixture = (name) => fs.readFileSync(new URL(`../fixtures/official-portals/${name}`, import.meta.url));
function response(url, body, contentType = "application/json", extra = {}) {
	return { url, finalUrl: url, status: 200, body, contentType, fetchedAt: new Date(), ...extra };
}
const fail = (code = "HTTP_STATUS") => { throw Object.assign(new Error(code === "HTTP_STATUS" ? "HTTP 403" : "fetch failed"), { code }); };

for (const [id, expected] of [["up_state_scholarship", 5], ["karnataka_ssp_scholarship", 2], ["aicte_ugc_national", 1]]) {
	test(`${id}: failed primary uses cited government records with honest partial health`, async () => {
		const source = getSource(id), store = new MemoryStore();
		const pipeline = new Pipeline({ store, logger: silent, renderer: async () => fail("TIMEOUT"),
			fetcherFactory: () => ({ allowRendering: true, fetch: async (url) => {
				if (!url.includes("myscheme.gov.in")) return fail();
				const slug = new URL(url).searchParams.get("slug");
				return response(url, fixture(`myscheme-${slug}.json`));
			} }) });
		const report = await pipeline.runSource(source);
		assert.equal(report.status, "partial");
		assert.equal(report.fallbackUsed, true);
		assert.equal(report.counts.published, expected);
		assert.ok(report.primaryErrors.length);
		const state = await store.getSourceState(id);
		assert.equal(state.fallbackUsed, true);
		assert.equal(state.lastStatus, "partial");
		assert.ok(state.lastError);
		for (const record of await store.listScholarships()) {
			assert.match(record.sourceSite, /Government myScheme fallback/);
			assert.equal(record.authorityTier, 2);
			assert.equal(record.deadline, null);
			assert.equal(record.currentCycle, null);
			assert.match(record.description, /Eligibility:/);
			assert.match(record.description, /How to apply:/);
			for (const ev of record.fieldEvidence) assert.equal(verifyEvidence(ev, await store.getSnapshot(ev.snapshotId)).ok, true);
		}
		if (id === "up_state_scholarship") {
			const record = (await store.listScholarships()).find((r) => /General Pre/.test(r.title));
			assert.match(record.applicationLink, /RegistrationNew.aspx$/);
			assert.match(record.officialLinks.guidelinesUrl, /\.pdf$/);
		}
		if (id === "aicte_ugc_national") assert.equal((await store.listScholarships())[0].applicationLink, "https://pgscholarship.aicte-india.org/");
	});
}

test("empty fallback is rejected and leaves existing catalogue intact", async () => {
	const source = getSource("aicte_ugc_national"), store = new MemoryStore();
	await store.saveScholarship({ schemeKey: "existing", primarySourceId: source.id, title: "Existing official record", freshness: { missingRunCount: 0 } });
	const before = await store.listScholarships();
	const pipeline = new Pipeline({ store, logger: silent, fetcherFactory: () => ({ fetch: async () => fail() }) });
	const report = await pipeline.runSource(source);
	assert.equal(report.status, "rejected");
	assert.equal(report.fallbackUsed, false);
	assert.equal(report.errors.at(-1).code, "EMPTY_CATALOGUE");
	assert.deepEqual(await store.listScholarships(), before);
});

test("a fallback whose writes all fail never reports a successful catalogue", async () => {
	const source = getSource("aicte_ugc_national"), store = new MemoryStore();
	await store.saveSourceState({ sourceId: source.id, lastSuccessAt: new Date("2026-10-01T00:00Z") });
	store.saveScholarship = async () => { throw new Error("Simulated storage failure"); };
	const pipeline = new Pipeline({ store, logger: silent, fetcherFactory: () => ({ fetch: async (url) => {
		if (!url.includes("myscheme.gov.in")) return fail();
		return response(url, fixture("myscheme-pgssgategpatqsaicte.json"));
	} }) });
	const report = await pipeline.runSource(source);
	assert.equal(report.status, "rejected");
	assert.equal(report.fallbackUsed, false);
	assert.equal(report.counts.published, 0);
	assert.ok(report.errors.some((e) => e.code === "UPSERT_FAILED"));
	assert.equal((await store.getSourceState(source.id)).lastSuccessAt.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("partial fallback does not age absent primary records; portal recovery clears fallback health", async () => {
	const source = getSource("aicte_ugc_national"), store = new MemoryStore();
	let recovered = false, fallbackCalls = 0;
	const pipeline = new Pipeline({ store, logger: silent, fetcherFactory: () => ({ fetch: async (url) => {
		if (url.includes("myscheme.gov.in")) { fallbackCalls++; return response(url, fixture("myscheme-pgssgategpatqsaicte.json")); }
		return recovered ? response(url, fixture("aicte.html"), "text/html") : fail();
	} }) });
	await store.saveScholarship({ schemeKey: "existing", primarySourceId: source.id, title: "Previously cited portal record", freshness: { missingRunCount: 0 } });
	await pipeline.runSource(source);
	assert.equal((await store.getScholarship("existing")).freshness.missingRunCount, 0);
	recovered = true;
	const report = await pipeline.runSource({ ...source, followUps: { maxPerRun: 0 } });
	assert.equal(report.status, "success");
	assert.equal(fallbackCalls, 1);
	assert.equal((await store.getSourceState(source.id)).fallbackUsed, false);
	assert.equal((await store.getSourceState(source.id)).lastError, null);
	const fallback = (await store.listScholarships()).find((r) => /Government myScheme fallback/.test(r.sourceSite || ""));
	assert.equal(fallback.freshness.missingRunCount, 0);
});

test("one unavailable alternative does not discard the other cited schemes", async () => {
	const source = getSource("up_state_scholarship"), store = new MemoryStore();
	const pipeline = new Pipeline({ store, logger: silent, renderer: async () => fail("TIMEOUT"), fetcherFactory: () => ({ fetch: async (url) => {
		const slug = new URL(url).searchParams.get("slug");
		if (slug === "gpmsup") return fail("NETWORK");
		return response(url, fixture(`myscheme-${slug}.json`));
	} }) });
	const report = await pipeline.runSource(source);
	assert.equal(report.status, "partial");
	assert.equal(report.counts.published, 4);
	assert.ok(report.errors.some((e) => e.optional && e.code === "NETWORK"));
});

test("Karnataka transport failure can use native rendering, while HTTP refusal cannot", async () => {
	for (const code of ["NETWORK", "HTTP_STATUS", "ROBOTS_DISALLOWED"]) {
		const source = { ...getSource("karnataka_ssp_scholarship"), fallbackEntries: null };
		let rendered = 0;
		const pipeline = new Pipeline({ store: new MemoryStore(), logger: silent, fetcherFactory: () => ({ fetch: async () => fail(code) }),
			renderer: async (url) => { rendered++; return response(url, fixture("karnataka.html"), "text/html", { fetchMethod: "dynamic" }); } });
		const report = await pipeline.runSource(source);
		assert.equal(rendered, code === "NETWORK" ? 1 : 0);
		if (code === "NETWORK") {
			assert.equal(report.status, "success");
			assert.equal(report.counts.published, 54);
			assert.equal(report.pages[0].fallbackReason, "network_transport_failed");
		} else assert.equal(report.status, "failed");
	}
});
