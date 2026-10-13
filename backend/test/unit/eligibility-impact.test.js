import test from "node:test";
import assert from "node:assert/strict";
import { explainEligibilityImpact, eligibilityImpactMessage } from "../../src/engine/eligibilityImpact.js";
import { eligibilityEmailContent } from "../../src/services/eligibilityEmail.js";

const income = ceiling => ({ id: "income", field: "familyIncome", operator: "LTE", targetValue: ceiling });
const version = (id, rules) => ({ id, snapshot: { rules, provenanceQuotes: [], dataQuality: { unknownFields: ["eligibility"] } },
	evidence: rules.map(r => ({ ruleId: r.id, url: "https://example.gov.in/guide.pdf", quote: `Synthetic ${r.id} ${r.targetValue}` })) });

test("illustrative ceiling change explains failed to passed without promising eligibility", () => {
	const impact = explainEligibilityImpact({ familyIncome: 280000 }, version("old", [income(250000)]), version("new", [income(300000)]));
	assert.equal(impact.changes[0].previousStatus, "failed");
	assert.equal(impact.changes[0].currentStatus, "passed");
	assert.equal(impact.changes[0].profileValue, "₹2,80,000");
	assert.match(impact.changes[0].oldRequirement, /2,50,000/);
	assert.match(impact.changes[0].newRequirement, /3,00,000/);
	assert.equal(impact.remainingUnknown[0].ruleId, "official_manual_review");
	assert.match(eligibilityImpactMessage(impact), /this criterion now passes/);
	assert.match(impact.caveat, /does not confirm an award/);
});

test("unchanged personal results and income unknown in both versions suppress alerts", () => {
	for (const profile of [{ familyIncome: 200000 }, { familyIncome: 400000 }, {}, { familyIncome: "" }])
		assert.equal(explainEligibilityImpact(profile, version("a", [income(250000)]), version("b", [income(300000)])), null);
});

test("new criteria request missing information; no category or disability defaults", () => {
	const before = version("a", [income(300000)]);
	const after = version("b", [income(300000), { id: "state", field: "state", operator: "EQ", targetValue: "Maharashtra" },
		{ id: "category", field: "casteCategory", operator: "IN", targetValue: ["SC"] },
		{ id: "disability", field: "hasDisability", operator: "BOOLEAN_MATCH", targetValue: true }]);
	const impact = explainEligibilityImpact({ familyIncome: 280000 }, before, after);
	assert.equal(impact.changes.length, 3);
	assert.ok(impact.changes.every(c => c.currentStatus === "unknown" && c.profileValue === "Not specified"));
});

test("tightened rules and exact LT/LTE boundaries are meaningful", () => {
	const impact = explainEligibilityImpact({ familyIncome: 300000 }, version("a", [income(300000)]),
		version("b", [{ ...income(300000), operator: "LT" }]));
	assert.equal(impact.changes[0].currentStatus, "failed");
	assert.match(impact.changes[0].newRequirement, /below/);
});

test("evidence-only edits and reordered category sets do not produce alerts", () => {
	const a = version("a", [{ id: "cat", field: "casteCategory", operator: "IN", targetValue: ["SC", "ST"] }]);
	const b = version("b", [{ id: "cat", field: "casteCategory", operator: "IN", targetValue: ["ST", "SC"] }]);
	assert.equal(explainEligibilityImpact({ casteCategory: "SC" }, a, b), null);
});

test("eligibility email includes both sources and escapes profile/source content", () => {
	const impact = explainEligibilityImpact({ familyIncome: 280000 }, version("a", [income(250000)]), version("b", [income(300000)]));
	impact.changes[0].newEvidence.quote = "<img onerror='bad'>";
	const html = eligibilityEmailContent({ title: "Example <scheme>", message: "Synthetic", data: impact });
	assert.match(html, /Previous source/); assert.match(html, /Updated source/);
	assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img/);
	impact.changes[0].newEvidence.url = "javascript:bad()";
	assert.doesNotMatch(eligibilityEmailContent({ data: impact }), /javascript:/);
});
