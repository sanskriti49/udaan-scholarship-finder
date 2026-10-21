import test from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { evaluateEligibility } from "../../src/engine/ruleEvaluator.js";
import { ruleTreeSchema, MAX_RULE_DEPTH, MAX_RULE_NODES } from "../../src/engine/ruleSchema.js";

const leaf = (id, field, operator, targetValue) => ({ type: "CONDITION", id, field, operator, targetValue });
const run = (ruleTree, profile = {}, extra = {}) => evaluateEligibility(profile, { ruleTree, ...extra });
const stateNode = (state, id) => leaf(id, "gender", "EQ", state === "passed" ? "Female" : "Male");
const states = ["passed", "failed", "unknown"];

for (const type of ["AND", "OR"]) test(`${type}: complete Kleene truth table`, () => {
	for (const a of states) for (const b of states) {
		const children = [a, b].map((s, i) => s === "unknown" ? leaf(`u${i}`, "state", "EQ", "Delhi") : stateNode(s, `${i}`));
		const expected = type === "AND" ? a === "failed" || b === "failed" ? "failed" : a === "unknown" || b === "unknown" ? "unknown" : "passed"
			: a === "passed" || b === "passed" ? "passed" : a === "unknown" || b === "unknown" ? "unknown" : "failed";
		const result = run({ type, children }, { gender: "Female" });
		assert.equal(result.status, expected, `${a} ${type} ${b}`);
		assert.equal(result.isEligible, expected === "passed");
		if (expected === "passed") {
			assert.equal(result.failedRules.length, 0); assert.equal(result.unknownRules.length, 0); assert.equal(result.matchConfidence, 100);
		}
	}
});

test("NOT preserves unknown and reverses known results without misleading leaf diagnostics", () => {
	for (const state of states) {
		const child = state === "unknown" ? leaf("domicile", "state", "EQ", "Delhi") : stateNode(state, "gender");
		const result = run({ type: "NOT", child }, { gender: "Female" });
		assert.equal(result.status, state === "unknown" ? "unknown" : state === "passed" ? "failed" : "passed");
		assert.equal(result.evaluationTree.child.status, state);
		assert.match([...result.passedRules, ...result.failedRules, ...result.unknownRules][0].required, /Must not satisfy/);
	}
});

test("Engineering 75% OR Humanities 65% uses the correct branch and keeps exact citations", () => {
	const tree = { type: "OR", children: [
		{ type: "AND", children: [leaf("eng", "stream", "EQ", "Engineering"), leaf("eng_marks", "percentage", "GTE", 75)] },
		{ type: "AND", children: [leaf("arts", "stream", "EQ", "Humanities"), leaf("arts_marks", "percentage", "GTE", 65)] },
	] };
	const quote = { ruleId: "arts_marks", quote: "Synthetic example: Humanities 65%", sourceUrl: "https://example.gov.in/rules" };
	const result = run(tree, { stream: "Humanities", percentage: 70 }, { provenanceQuotes: [quote] });
	assert.equal(result.status, "passed"); assert.equal(result.failedRules.length, 0);
	assert.equal(result.evaluationTree.children[0].status, "failed");
	assert.deepEqual(result.passedRules.map(r => r.ruleId), ["arts", "arts_marks"]);
	assert.equal(result.passedRules[1].citation, quote);
	assert.equal(run(tree, { stream: "Engineering", percentage: 70 }).status, "failed");
	assert.equal(run(tree, { percentage: 70 }).status, "unknown");
});

test("an unknown alternative never blocks a passing branch or becomes a disqualifier", () => {
	const tree = { type: "OR", children: [leaf("income", "familyIncome", "LTE", 300000), leaf("merit", "percentage", "GTE", 80)] };
	assert.equal(run(tree, { familyIncome: 250000 }).status, "passed");
	const pending = run(tree, { familyIncome: 350000 });
	assert.equal(pending.status, "unknown"); assert.equal(pending.failedRules.length, 0);
	assert.deepEqual(pending.unknownRules.map(r => r.ruleId), ["merit"]);
});

test("conditional branches select then/else; unknown guards use consensus only", () => {
	const tree = { type: "CONDITIONAL_BRANCH", condition: leaf("engineering", "stream", "EQ", "Engineering"),
		then: leaf("high_marks", "percentage", "GTE", 75), else: leaf("lower_marks", "percentage", "GTE", 65) };
	assert.equal(run(tree, { stream: "Engineering", percentage: 70 }).status, "failed");
	const otherwise = run(tree, { stream: "Humanities", percentage: 70 });
	assert.equal(otherwise.status, "passed"); assert.equal(otherwise.evaluationTree.selectedBranch, "else");
	assert.equal(otherwise.failedRules.length, 0);
	for (const [percentage, expected] of [[80, "passed"], [60, "failed"], [70, "unknown"]]) {
		const result = run(tree, { percentage });
		assert.equal(result.status, expected); assert.equal(result.evaluationTree.selectedBranch, null);
	}
});

test("manual-review flags remain a global condition and flat rules remain implicit AND", () => {
	const rules = [leaf("income", "familyIncome", "LTE", 300000), leaf("marks", "percentage", "GTE", 75)];
	const legacy = evaluateEligibility({ familyIncome: 250000 }, { rules });
	assert.equal(legacy.status, "unknown"); assert.equal(legacy.passedRules.length, 1);
	const reviewed = run({ type: "OR", children: rules }, { familyIncome: 250000 }, { dataQuality: { unknownFields: ["eligibility"] } });
	assert.equal(reviewed.status, "unknown"); assert.equal(reviewed.unknownRules[0].ruleId, "official_manual_review");
	assert.equal(evaluateEligibility({}, {}).status, "unknown");
	assert.equal(run(leaf("national", "state", "EQ", "All India")).status, "passed");
});

test("invalid trees fail safely without falling back to legacy rules; invalid legacy targets stay unknown", () => {
	const fallback = { rules: [leaf("universal", "gender", "EQ", "Any")] };
	for (const tree of [{ type: "OR", children: [] }, { type: "MAYBE" }, leaf("bad", "familyIncome", "LTE", null)]) {
		const result = run(tree, {}, fallback);
		assert.equal(result.status, "unknown"); assert.equal(result.unknownRules[0].ruleId, "invalid_rule_tree");
	}
	assert.equal(evaluateEligibility({ familyIncome: 100000 }, { rules: [leaf("bad", "familyIncome", "LTE", null)] }).status, "unknown");
});

test("strict trees reject ambiguous IDs, incompatible types, unknown keys, excessive depth/size, and cycles", () => {
	const condition = leaf("g", "gender", "EQ", "Female");
	const invalid = [
		{ type: "AND", children: [condition, { ...condition }] },
		{ ...condition, surprise: true }, leaf("bad", "familyIncome", "LTE", "300000"),
		leaf("bad", "gender", "GTE", 10), leaf("bad", "hasDisability", "BOOLEAN_MATCH", "false"),
		leaf("bad", "state", "IN", []),
		{ type: "CONDITIONAL_BRANCH", condition, then: { ...condition, id: "t" } },
		{ type: "OR", children: Array.from({ length: MAX_RULE_NODES }, (_, i) => ({ ...condition, id: `${i}` })) },
	];
	let deep = condition;
	for (let i = 0; i < MAX_RULE_DEPTH; i++) deep = { type: "NOT", child: deep };
	const cycle = { type: "NOT" }; cycle.child = cycle;
	for (const tree of [...invalid, deep, cycle]) assert.equal(ruleTreeSchema.safeParse(tree).success, false);
	assert.equal(ruleTreeSchema.safeParse(condition).success, true);
});

test("Mongoose persists valid trees and rejects invalid policy documents without a database", async () => {
	const valid = new Scholarship({ title: "Synthetic", ruleTree: { type: "NOT", child: leaf("g", "gender", "EQ", "Female") } });
	await valid.validate(); assert.equal(valid.toObject().ruleTree.type, "NOT");
	await assert.rejects(new Scholarship({ title: "Invalid", ruleTree: { type: "OR", children: [] } }).validate(), /Invalid eligibility rule tree/);
});
