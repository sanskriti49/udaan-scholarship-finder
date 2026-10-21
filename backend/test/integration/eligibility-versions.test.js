import test from "node:test";
import assert from "node:assert/strict";
import { Pipeline } from "../../src/pipeline/pipeline.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";
import { makeEvidence } from "../../src/pipeline/core/evidence.js";
import { prepareEligibilityVersion } from "../../src/pipeline/core/eligibilityVersions.js";
import { explainEligibilityImpact } from "../../src/engine/eligibilityImpact.js";

async function treeFixture(store, type, { fullEvidence = true } = {}) {
	const record = await fixture(store, 250000);
	const merit = { type: "CONDITION", id: "merit", field: "percentage", operator: "GTE", targetValue: 75 };
	const income = { ...record.rules[0], type: "CONDITION" };
	delete income.evidenceSnapshotId;
	record.ruleTree = { type, children: [income, merit] };
	record.rules = record.ruleTree.children.map(({ type, ...rule }) => rule);
	const text = `Synthetic policy: income at most 250000 ${type} marks at least 75%.`;
	const source = await store.saveSnapshot({ url: "https://example.gov.in/policy", textHash: text, text, fetchedAt: new Date(), authorityTier: 1 });
	for (const [ruleId, field] of [["merit", "percentage"], ...(fullEvidence ? [["policy_tree", "eligibility"]] : [])]) {
		record.fieldEvidence.push(makeEvidence(source, text, { field }));
		record.provenanceQuotes.push({ ruleId, quote: text, sourceUrl: source.url, snapshotId: source.id });
	}
	record.dataQuality.unknownFields = [];
	return record;
}

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

test("pipeline versions preserve tree structure and detect AND-to-OR changes with identical leaves", async () => {
	const store = new MemoryStore(), events = [];
	const pipeline = new Pipeline({ store, onDataChange: async event => events.push(event) });
	const context = { blocking: false, at: new Date(), runId: "tree-fixture" };
	await pipeline.upsert({ id: "source" }, await treeFixture(store, "AND"), context);
	const v1 = await store.getEligibilityVersion((await store.getScholarship("synthetic")).eligibilityVersion);
	await pipeline.upsert({ id: "source" }, await treeFixture(store, "OR"), context);
	const v2 = await store.getEligibilityVersion((await store.getScholarship("synthetic")).eligibilityVersion);
	assert.notEqual(v1.contentHash, v2.contentHash); assert.equal(v2.snapshot.ruleTree.type, "OR");
	assert.equal(v1.snapshot.ruleTree.type, "AND"); assert.equal(v2.verified, true); assert.equal(v2.alert.status, "pending");
	assert.equal(events.filter(e => e.changeType === "ELIGIBILITY_RULES_CHANGED").length, 1);
	const impact = explainEligibilityImpact({ familyIncome: 280000, percentage: 80 }, v1, v2);
	assert.equal(impact.changes[0].previousStatus, "failed"); assert.equal(impact.changes[0].currentStatus, "passed");
	assert.match(impact.changes[0].newRequirement, / OR /);
	assert.equal(explainEligibilityImpact({ familyIncome: 200000, percentage: 80 }, v1, v2), null);
	assert.equal(explainEligibilityImpact({ familyIncome: 280000, percentage: 60 }, v1, v2), null);
	await pipeline.upsert({ id: "source" }, await treeFixture(store, "OR"), context);
	assert.equal(store.eligibilityVersions.size, 2);
});

test("leaf-only evidence does not verify a compound policy or schedule alerts", async () => {
	const store = new MemoryStore();
	const record = { ...await treeFixture(store, "OR", { fullEvidence: false }), id: "012345678901234567890123" };
	const version = await prepareEligibilityVersion(record, null, store, new Date(), true);
	assert.equal(version.verified, false); assert.equal(version.alert.status, "none");
});

test("incoming invalid trees leave stored scholarships and immutable versions untouched", async () => {
	const store = new MemoryStore(), pipeline = new Pipeline({ store });
	const context = { blocking: false, at: new Date(), runId: "tree-fixture" };
	await pipeline.upsert({ id: "source" }, await treeFixture(store, "OR"), context);
	const before = JSON.stringify(await store.getScholarship("synthetic"));
	const incoming = await treeFixture(store, "AND"); incoming.ruleTree.children = [];
	await assert.rejects(pipeline.upsert({ id: "source" }, incoming, context));
	assert.equal(JSON.stringify(await store.getScholarship("synthetic")), before); assert.equal(store.eligibilityVersions.size, 1);
});

test("flat refreshes cannot silently change a recorded tree; conflicting policies await review", async () => {
	const store = new MemoryStore(), pipeline = new Pipeline({ store });
	const context = { blocking: false, at: new Date(), runId: "tree-fixture" };
	await pipeline.upsert({ id: "source" }, await treeFixture(store, "OR"), context);
	const result = await pipeline.upsert({ id: "source" }, await fixture(store, 300000), context);
	assert.ok(result.extraIssues.some(issue => issue.code === "rule_tree_requires_review"));
	const stored = await store.getScholarship("synthetic");
	assert.equal(stored.publication.state, "needs_review"); assert.equal(stored.ruleTree.type, "OR");
	assert.equal(stored.ruleTree.children[0].targetValue, 250000);
});
