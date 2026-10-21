import { test } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { mergeRecordFields, recordDataHash, publicPolicyVersion, diffCycle, classifySemanticChange } from "../../src/pipeline/core/changes.js";
import { canonicalPolicyValue, samePolicyValue } from "../../src/pipeline/core/policyValues.js";
import { canonicalPolicyValue as browserCanonical } from "../../../frontend/src/utils/policyValues.js";

// Shapes verified against the running API for the three user-reported schemes.
const awards = [
	{ value: 80000, currency: "INR", period: "yearly", displayString: "₹80,000 per year" },
	{ value: 48000, currency: "INR", period: "yearly", displayString: "₹48,000 per year" },
	{ value: null, currency: "INR", period: "monthly", displayString: "₹1,000–₹8,000 per month depending on course (see official rates)" },
];
const record = amount => ({ amount, rules: [], fieldEvidence: [], provenanceQuotes: [] });
const delta = (oldValue, newValue, field = "amount") => ({ field, oldValue, newValue });

test("actual MongoDB amount defaults do not create history or change semantic hashes", () => {
	for (const incomingAmount of awards) {
		const persisted = new Scholarship({ amount: incomingAmount }).toObject().amount;
		assert.equal(persisted.months, null); assert.deepEqual(persisted.options, []);
		const before = record(persisted), incoming = record(incomingAmount);
		assert.deepEqual(mergeRecordFields(before, incoming).deltas, []);
		assert.equal(recordDataHash(before), recordDataHash(incoming));
		assert.deepEqual(publicPolicyVersion({ changeType: "AWARD_UPDATE", deltas: [delta(persisted, incomingAmount)] }).deltas, []);
	}
});

test("same displayed amount is not enough to discard changed currency, duration, period or rates", () => {
	const before = { ...awards[0], months: 10, options: [{ value: 1000, period: "monthly", months: 10 }] };
	for (const change of [{ value: 90000 }, { currency: "USD" }, { period: "total" }, { months: 12 }, { options: [{ value: 1500, period: "monthly", months: 10 }] }, { displayString: "Up to ₹80,000 per year" }]) {
		const after = { ...before, ...change };
		assert.equal(samePolicyValue("amount", before, after), false);
		assert.equal(mergeRecordFields(record(before), record(after)).deltas.length, 1);
		assert.notEqual(recordDataHash(record(before)), recordDataHash(record(after)));
	}
});

test("optional defaults inside amount options and rate-table reordering are not changes", () => {
	const before = { ...awards[0], options: [{ value: 1000, period: "monthly", months: null }, { value: 20000, period: "yearly", months: 10 }] };
	const after = { ...awards[0], options: [{ value: 20000, period: "yearly", months: 10 }, { value: 1000, period: "monthly" }] };
	assert.equal(samePolicyValue("amount", before, after), true);
	assert.equal(samePolicyValue("amount", { ...before, displayString: "Aid  for\u00a0students" }, { ...before, displayString: "Aid for students" }), true);
});

test("field comparison preserves missing values, numeric zero and changes to unknown terms", () => {
	assert.equal(samePolicyValue("amount", null, { value: 0 }), false);
	assert.equal(samePolicyValue("amount", { ...awards[0], qualification: "Undergraduate only" }, { ...awards[0], qualification: "All courses" }), false);
	assert.equal(samePolicyValue("amount", { ...awards[0], currency: null }, awards[0]), false);
});

test("both deployable apps agree on the semantic comparison contract", () => {
	const cases = awards.map(value => ["amount", new Scholarship({ amount: value }).toObject().amount]);
	cases.push(["amount", { ...awards[0], options: [{ value: 1000, period: "monthly" }] }], ["closesAt", new Date("2026-10-31T18:29:59.999Z")],
		["rules", [{ id: "r1", field: "percentage", operator: "GTE", targetValue: 75 }]],
		["ruleTree", { type: "OR", children: [{ type: "CONDITION", id: "x", field: "state", operator: "IN", targetValue: ["Goa", "Delhi"] }] }]);
	for (const [field, value] of cases) assert.deepEqual(canonicalPolicyValue(field, value), browserCanonical(field, value));
});

test("legacy history projection groups no-ops without changing immutable raw entries", () => {
	const version = { changeType: "AWARD_UPDATE", summary: "Official values changed: amount", deltas: [delta({ ...awards[0], months: null, options: [] }, awards[0])], evidence: [{ quote: "Exact stored wording" }] };
	const original = structuredClone(version), projected = publicPolicyVersion(version);
	assert.equal(projected.routineRefresh, true); assert.deepEqual(projected.unchangedFields, ["amount"]);
	assert.deepEqual(publicPolicyVersion(projected), projected);
	assert.deepEqual(version, original); assert.deepEqual(projected.evidence, original.evidence);
});

test("a real application-link change survives a mixed entry with a false award delta", () => {
	const projected = publicPolicyVersion({ changeType: "AWARD_UPDATE", summary: "Award amount updated.", evidence: [{ field: "amount", quote: "Unchanged award quote" }], deltas: [
		delta({ ...awards[2], months: null, options: [] }, awards[2]),
		delta("https://example.gov.in/", "https://example.gov.in/apply", "applicationLink"),
	] });
	assert.equal(projected.changeType, "LINK_UPDATED"); assert.equal(projected.routineRefresh, false);
	assert.deepEqual(projected.deltas.map(item => item.field), ["applicationLink"]);
	assert.equal(projected.summary, "Application website updated.");
	assert.deepEqual(projected.relatedEvidence, []);
	assert.equal(projected.evidence[0].quote, "Unchanged award quote");
});

test("new application cycles and history without structured comparisons are never dismissed as no-ops", () => {
	for (const changeType of ["NEW_CYCLE", "FIRST_OBSERVED", "CRITERIA_MODIFIED"]) assert.equal(publicPolicyVersion({ changeType, deltas: [] }).routineRefresh, false);
});

test("malformed or missing before/after data is unknown, never proof of unchanged terms", () => {
	for (const deltas of [[{}], [null], [{ field: "amount" }], [{ field: "amount", oldValue: null }], [{ field: "amount", oldValue: 80000 }]]) {
		const view = publicPolicyVersion({ changeType: "AWARD_UPDATE", deltas });
		assert.equal(view.routineRefresh, false); assert.equal(view.comparisonIncomplete, true);
		assert.deepEqual(view.unchangedFields, []);
		assert.deepEqual(view.deltas, []);
	}
});

test("null and empty optional URLs are both absent and cannot generate an update", () => {
	for (const field of ["applicationLink", "officialLinks.guidelinesUrl", "officialLinks.faqUrl"]) {
		assert.equal(samePolicyValue(field, null, ""), true);
		assert.equal(samePolicyValue(field, undefined, "  "), true);
		assert.deepEqual(publicPolicyVersion({ changeType: "LINK_UPDATED", deltas: [delta(null, "", field)] }).deltas, []);
	}
});

test("partial link extraction preserves earlier cited URLs and does not silently replace the whole link object", () => {
	const before = { ...record(null), applicationLink: "https://example.gov.in/apply", officialLinks: { guidelinesUrl: "https://example.gov.in/guidelines.pdf", faqUrl: "https://example.gov.in/faq.pdf" } };
	const incoming = { ...record(null), applicationLink: " ", officialLinks: { guidelinesUrl: null, faqUrl: "", listingUrl: "https://example.gov.in/list" } };
	const result = mergeRecordFields(before, incoming);
	assert.equal(result.merged.applicationLink, before.applicationLink);
	assert.equal(result.merged.officialLinks.guidelinesUrl, before.officialLinks.guidelinesUrl);
	assert.equal(result.merged.officialLinks.faqUrl, before.officialLinks.faqUrl);
	assert.equal(result.merged.officialLinks.listingUrl, incoming.officialLinks.listingUrl);
	assert.deepEqual(result.deltas, []);
});

test("deadline extensions compare actual dates and remain separate from eligibility restrictions", () => {
	const before = { closesAt: new Date("2026-10-31T18:29:59.999Z") };
	const after = { closesAt: new Date("2026-11-15T18:29:59.999Z") };
	const dates = diffCycle(before, after);
	assert.equal(dates.changeType, "DEADLINE_EXTENSION"); assert.equal(dates.semanticCategory, "DATE_EXTENSION");
	assert.equal(classifySemanticChange([...dates.deltas, delta(60, 75, "eligibility.percentage")], "DEADLINE_EXTENSION"), "RESTRICTION");
	assert.equal(classifySemanticChange([delta(null, 75, "eligibility.percentage")]), "PROCEDURAL_UPDATE");
});

test("mixed criteria, same-size category substitutions and strictness changes are classified conservatively", () => {
	assert.equal(classifySemanticChange([delta({ max: 250000 }, { max: 300000 }, "eligibility.familyIncome"), delta(65, 75, "eligibility.percentage")]), "MIXED_CHANGE");
	assert.equal(classifySemanticChange([delta(["SC", "ST"], ["SC", "OBC"], "eligibility.casteCategories")]), "MIXED_CHANGE");
	assert.equal(classifySemanticChange([delta({ max: 250000, operator: "LT" }, { max: 250000, operator: "LTE" }, "eligibility.familyIncome")]), "RELAXATION");
	assert.equal(classifySemanticChange([delta(awards[0], { ...awards[0], value: 90000 })]), "PROCEDURAL_UPDATE");
});
