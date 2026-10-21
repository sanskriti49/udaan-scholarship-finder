import assert from "node:assert/strict";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";

const condition = (id, field, operator, targetValue) => ({ type: "CONDITION", id, field, operator, targetValue });
const scholarship = { ruleTree: { type: "OR", children: [
	{ type: "AND", children: [condition("eng", "stream", "EQ", "Engineering"), condition("eng_marks", "percentage", "GTE", 75)] },
	{ type: "AND", children: [condition("arts", "stream", "EQ", "Humanities"), condition("arts_marks", "percentage", "GTE", 65)] },
] } };

console.log("Synthetic branching-policy demo. No database or official policies are modified.");
for (const [profile, expected] of [
	[{ stream: "Humanities", percentage: 70 }, "passed"],
	[{ stream: "Engineering", percentage: 70 }, "failed"],
	[{ stream: "Engineering", percentage: 80 }, "passed"],
	[{ percentage: 70 }, "unknown"],
]) {
	const result = evaluateEligibility(profile, scholarship);
	assert.equal(result.status, expected);
	console.log(JSON.stringify({ profile, status: result.status, primaryChecks: {
		passed: result.passedRules.map(r => r.ruleId), failed: result.failedRules.map(r => r.ruleId), unknown: result.unknownRules.map(r => r.ruleId),
	} }));
}
