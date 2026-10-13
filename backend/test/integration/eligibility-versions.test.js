import test from "node:test";
import assert from "node:assert/strict";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { makeEvidence } from "../../src/pipeline/core/evidence.js";
import { prepareEligibilityVersion } from "../../src/pipeline/core/eligibilityVersions.js";

async function fixture(store, ceiling, operator = "LTE") {
	const text = `Synthetic scheme: annual income ${operator} ${ceiling}.`;
	const snapshot = await store.saveSnapshot({ url: "https://example.gov.in/rules", textHash: text, text,
		fetchedAt: new Date("2026-10-13T00:00:00Z"), authorityTier: 1 });
	const evidence = makeEvidence(snapshot, text, { field: "familyIncome" });
	return { schemeKey: "synthetic", title: "Synthetic scholarship", organization: "Example provider", state: "All India",
		fieldEvidence: [evidence], rules: [{ id: "synthetic#income", field: "familyIncome", operator, targetValue: ceiling, evidenceSnapshotId: snapshot.id }],
		provenanceQuotes: [{ ruleId: "synthetic#income", quote: text, sourceUrl: snapshot.url, snapshotId: snapshot.id }],
		eligibility: { familyIncome: { max: ceiling, operator } }, dataQuality: { unknownFields: ["eligibility"] }, cycles: [],
		requiredDocuments: [], publication: { state: "published" } };
}

test("real pipeline stores cited rule versions, including operator-only changes, without alerts for first observation", async () => {
	const store = new MemoryStore(), events = [];
	const pipeline = new Pipeline({ store, onDataChange: async event => events.push(event) });
	const context = { blocking: false, at: new Date(), runId: "synthetic", guideline: { fetched: true } };
	await pipeline.upsert({ id: "source" }, await fixture(store, 250000), context);
	const first = await store.getScholarship("synthetic");
	const v1 = await store.getEligibilityVersion(first.eligibilityVersion);
	assert.equal(v1.verified, true); assert.equal(v1.alert.status, "none");
	assert.equal(events.length, 0);
	await pipeline.upsert({ id: "source" }, await fixture(store, 300000), context);
	const second = await store.getScholarship("synthetic"), v2 = await store.getEligibilityVersion(second.eligibilityVersion);
	assert.equal(v2.previousVersion, v1.id); assert.equal(v2.snapshot.rules[0].targetValue, 300000);
	assert.equal(v1.snapshot.rules[0].targetValue, 250000); assert.equal(v2.alert.status, "pending");
	assert.equal(events.filter(e => e.changeType === "ELIGIBILITY_RULES_CHANGED").length, 1);
	await pipeline.upsert({ id: "source" }, await fixture(store, 300000), context);
	assert.equal(store.eligibilityVersions.size, 2);
	await pipeline.upsert({ id: "source" }, await fixture(store, 300000, "LT"), context);
	assert.equal(store.eligibilityVersions.size, 3);
	assert.equal((await store.getEligibilityVersion((await store.getScholarship("synthetic")).eligibilityVersion)).snapshot.rules[0].operator, "LT");
});

test("forged evidence and legacy uncited rules never establish verified versions", async () => {
	const store = new MemoryStore();
	const record = { ...await fixture(store, 250000), id: "012345678901234567890123" };
	record.fieldEvidence[0].quote = "Invented text";
	const version = await prepareEligibilityVersion(record, null, store, new Date(), true);
	assert.equal(version.verified, false); assert.equal(version.alert.status, "none");
});

test("failed scholarship save leaves a recoverable version with stable identity on retry", async () => {
	const store = new MemoryStore(), pipeline = new Pipeline({ store, onDataChange: async () => { throw new Error("Redis offline"); }, logger: { warn() {} } });
	const context = { blocking: false, at: new Date(), runId: "synthetic" };
	await pipeline.upsert({ id: "source" }, await fixture(store, 250000), context);
	const save = store.saveScholarship.bind(store);
	store.saveScholarship = async () => { throw new Error("DB interrupted"); };
	await assert.rejects(pipeline.upsert({ id: "source" }, await fixture(store, 300000), context), /DB interrupted/);
	assert.equal(store.eligibilityVersions.size, 2);
	store.saveScholarship = save;
	await pipeline.upsert({ id: "source" }, await fixture(store, 300000), context);
	assert.equal(store.eligibilityVersions.size, 2);
	assert.equal((await store.getEligibilityVersion((await store.getScholarship("synthetic")).eligibilityVersion)).alert.status, "pending");
});
