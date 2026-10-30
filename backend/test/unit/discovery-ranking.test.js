import { test } from "node:test";
import assert from "node:assert/strict";
import { rankDiscovery } from "../../src/engine/discoveryRanking.js";
import { evaluateEligibility } from "../../src/engine/ruleEvaluator.js";
import { now, student, scholarships, condition } from "../fixtures/discovery.js";

const rank = (items = scholarships, profile = student, options = {}) => rankDiscovery(items, { profile, search: "Engineering Merit", status: "all", now, ...options });
const ids = result => result.data.map(item => item._id);

test("compatibility outranks stronger keywords; mismatches remain visible and explainable", () => {
	assert.deepEqual(ids(rank()), ["up", "national", "incomplete", "mh", "school", "national-sc"]);
	const mh = rank().data.find(item => item._id === "mh");
	assert.equal(mh.discovery.status, "known_mismatch");
	assert.match(mh.discovery.reasons[0], /domicile.*Maharashtra/);
	assert.match(rank().data[0].discovery.reasons[0], /education level/);
	assert.ok(!("matchConfidence" in mh.discovery));
});

test("national scope and display categories do not bypass or create eligibility requirements", () => {
	const national = scholarships.find(item => item._id === "national-sc");
	assert.equal(rank([national]).data[0].discovery.status, "known_mismatch");
	const regional = { _id: "regional", state: "Maharashtra", category: "SC / ST / OBC" };
	assert.equal(rank([regional]).data[0].discovery.status, "needs_verification");
	assert.doesNotMatch(rank([regional]).data[0].discovery.reasons.join(" "), /domicile.*requirement/);
});

test("missing income and category stay unknown; explicit excess income fails", () => {
	for (const [field, targetValue, operator] of [["familyIncome", 300000, "LTE"], ["casteCategory", ["SC", "OBC"], "IN"]]) {
		const item = { rules: [condition(field, targetValue, operator)] };
		const missing = rank([item], {}).data[0];
		assert.equal(missing.discovery.status, "needs_verification");
		assert.match(missing.discovery.reasons.join(" "), /information is missing/);
	}
	assert.equal(rank([{ rules: [condition("familyIncome", 300000, "LTE")] }], { familyIncome: 400000 }).data[0].discovery.status, "known_mismatch");
});

test("OR uses root status, including unknown siblings; NOT and conditional routes keep engine semantics", () => {
	const route = { ruleTree: { type: "OR", children: [condition("state", "MH"), condition("stream", "Engineering")] } };
	assert.equal(rank([route]).data[0].discovery.status, "potentially_eligible");
	assert.doesNotMatch(rank([route]).data[0].discovery.reasons.join(" "), /domicile.*does not/);
	assert.equal(rank([route], { state: "UP" }).data[0].discovery.status, "needs_verification");
	const not = { ruleTree: { type: "NOT", child: condition("state", "MH") } };
	assert.equal(rank([not]).data[0].discovery.status, "potentially_eligible");
	const branch = { ruleTree: { type: "CONDITIONAL_BRANCH", condition: condition("state", "UP"), then: condition("percentage", 75, "GTE"), else: condition("percentage", 90, "GTE", "other_marks") } };
	assert.equal(rank([branch]).data[0].discovery.status, "potentially_eligible");
});

test("spelling aliases normalize both rule targets and profile without collapsing sensitive subcategories", () => {
	for (const category of ["SC", "Scheduled Caste", "scheduled castes"]) {
		assert.equal(evaluateEligibility({ casteCategory: category }, { rules: [condition("casteCategory", ["Scheduled Castes"], "IN")] }).status, "passed");
	}
	assert.equal(evaluateEligibility({ casteCategory: "OBC" }, { rules: [condition("casteCategory", "OBC-NCL")] }).status, "failed");
	assert.equal(evaluateEligibility({ educationLevel: "Undergraduate" }, { rules: [condition("educationLevel", "UG")] }).status, "passed");
	assert.equal(rank(scholarships, { fullName: "Example Maharashtra SC" }).personalized, false);
});

test("fallback metadata respects recorded streams and alternative levels without overriding authoritative trees", () => {
	const item = { level: "Class 10", eligibility: { eligibleLevels: ["UG", "PG"], eligibleStreams: ["Medical"], disabilityRequired: true } };
	const evaluation = evaluateEligibility(student, item);
	assert.equal(evaluation.status, "failed");
	assert.ok(evaluation.failedRules.some(rule => rule.field === "stream"));
	assert.ok(evaluation.unknownRules.some(rule => rule.field === "hasDisability"));
	assert.ok(evaluation.passedRules.some(rule => rule.field === "educationLevel"));
	assert.equal(evaluateEligibility(student, { ...item, ruleTree: condition("stream", "Engineering") }).status, "passed");
	assert.equal(evaluateEligibility(student, { level: "UG", eligibility: { age: { max: 25 } } }).status, "unknown");
});

test("anonymous discovery keeps query ordering and never treats a missing profile as a mismatch", () => {
	const result = rank(scholarships, {});
	assert.deepEqual(ids(result), ["mh", "school", "national-sc", "incomplete", "up", "national"]);
	assert.equal(result.personalized, false);
	assert.ok(result.data.every(item => item.discovery.status === "needs_verification"));
	assert.ok(rank(scholarships, {}, { search: "" }).total > 0);
});

test("verified fresh cycles win ties; unknown, stale and historical cycles are honest", () => {
	const base = scholarships[3];
	const items = [
		{ ...base, _id: "unknown", currentCycle: null },
		{ ...base, _id: "closed", currentCycle: { opensAt: "2025-01-01", closesAt: "2025-12-01" } },
		{ ...base, _id: "stale", freshness: { lastVerifiedAt: "2025-01-01" } },
		{ ...base, _id: "fresh" },
	];
	assert.equal(ids(rank(items))[0], "fresh");
	assert.equal(ids(rank(items)).at(-1), "closed");
	for (const id of ["unknown", "stale"]) assert.ok(rank(items).data.find(item => item._id === id).discovery.reasons.includes("Application dates need verification."));
	const active = rank(items, student, { status: "active", limit: 2 });
	assert.equal(active.total, 3); assert.equal(active.totalPages, 2); assert.equal(active.data.length, 2);
	assert.equal(rank(items, student, { status: "closed" }).total, 1);
});

test("equivalent inputs have deterministic ties and pagination across the full ranked set", () => {
	const tied = ["z", "a", "b"].map(_id => ({ ...scholarships[3], _id }));
	assert.deepEqual(ids(rank(tied)), ["a", "b", "z"]);
	assert.deepEqual(ids(rank(tied.toReversed())), ids(rank(tied)));
	const before = JSON.stringify(scholarships);
	assert.deepEqual([1, 2, 3].flatMap(page => ids(rank(scholarships, student, { page, limit: 2 }))), ids(rank()));
	assert.equal(JSON.stringify(scholarships), before);
});

test("explicit amount, newest and deadline sorts remain deterministic inside compatibility tiers", () => {
	const items = [{ ...scholarships[3], _id: "old", amount: { value: 10 }, freshness: { lastVerifiedAt: now, firstSeenAt: "2025-01-01" } },
		{ ...scholarships[3], _id: "new", amount: { value: 100 } }];
	assert.equal(ids(rank(items, student, { sort: "amount_high" }))[0], "new");
	assert.equal(ids(rank(items, student, { sort: "amount_low" }))[0], "old");
	assert.equal(ids(rank(items, student, { sort: "newest" }))[0], "new");
	assert.equal(rank(items, student, { sort: "deadline" }).total, 2);
	assert.equal(ids(rank([{ ...items[0], verified: undefined }, items[1]], student, { sort: "trust" }))[0], "new");
});

test("deadline sort orders verified dates before cycle type while preserving compatibility tiers", () => {
	const base = scholarships[3];
	const items = [{ ...base, _id: "open", currentCycle: { opensAt: "2026-10-01", closesAt: "2026-12-30" } },
		{ ...base, _id: "upcoming", currentCycle: { opensAt: "2026-11-01", closesAt: "2026-11-10" } },
		{ ...scholarships[0], _id: "mismatch", currentCycle: { opensAt: "2026-10-01", closesAt: "2026-11-01" } }];
	assert.deepEqual(ids(rank(items, student, { sort: "deadline" })), ["upcoming", "open", "mismatch"]);
});

test("legacy status remains consistent with the existing public status helper", () => {
	const legacy = { _id: "old", title: "Historical", legacy: true, status: "closed", statusReason: "Archived" };
	assert.equal(rank([legacy], {}, { status: "active" }).total, 0);
	const result = rank([legacy], {}, { status: "closed" });
	assert.equal(result.total, 1);
	assert.equal(result.data[0].statusReason, "Archived");
});
