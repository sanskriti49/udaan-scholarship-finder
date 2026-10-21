import test from "node:test";
import assert from "node:assert/strict";
import { formatPolicyValue, policyChangeRows, policyDate, policyFieldLabel, policyUpdateSummary } from "../src/utils/policyDiff.js";
import { policyHistoryEntries, policyVersionPresentation, formatPolicyRowValue, policyEvidence } from "../src/utils/policyDiff.js";

const amounts = [
	{ value: 80000, currency: "INR", period: "yearly", displayString: "₹80,000 per year" },
	{ value: 48000, currency: "INR", period: "yearly", displayString: "₹48,000 per year" },
	{ value: null, currency: "INR", period: "monthly", displayString: "₹1,000–₹8,000 per month depending on course (see official rates)" },
];
const amountDelta = amount => ({ field: "amount", oldValue: { ...amount, months: null, options: [] }, newValue: amount });

test("policy diffs format money only for financial fields and preserve exclusive limits", () => {
	assert.equal(formatPolicyValue(2026, "count"), "2026");
	assert.equal(formatPolicyValue({ max: 250000, operator: "LT" }, "eligibility.familyIncome"), "Below ₹2,50,000 / year");
	assert.equal(formatPolicyValue({ max: 300000, operator: "LTE" }, "eligibility.familyIncome"), "Up to ₹3,00,000 / year");
	assert.equal(formatPolicyValue(75, "percentage"), "75%");
	assert.equal(formatPolicyValue(8, "cgpa"), "8 CGPA");
	assert.equal(formatPolicyValue(null, "amount"), "Not recorded");
	assert.equal(formatPolicyValue(false, "eligibility.disabilityRequired"), "No");
});

test("policy dates use India time and malformed dates remain unverified", () => {
	assert.match(policyDate("2026-10-19T20:00:00.000Z"), /20 Oct 2026/);
	assert.equal(policyDate("not a date"), null);
	assert.equal(formatPolicyValue("bad", "closesAt"), "Date needs review");
});

test("rule-array diffs expose only changed thresholds, additions and removals", () => {
	const income = targetValue => ({ id: "income", field: "familyIncome", operator: "LTE", targetValue });
	const marks = { id: "merit", field: "percentage", operator: "GTE", targetValue: 75 };
	const removed = { id: "state", field: "state", operator: "EQ", targetValue: "Delhi" };
	const added = { id: "gender", field: "gender", operator: "EQ", targetValue: "Female" };
	const rows = policyChangeRows([{ field: "rules", oldValue: [income(250000), marks, removed], newValue: [income(300000), { ...marks }, added] }]);
	assert.deepEqual(rows.map(row => row.field), ["familyIncome", "state", "gender"]);
	assert.match(formatPolicyValue(rows[0].oldValue, rows[0].field), /2,50,000/);
	assert.equal(rows[1].newValue, undefined); assert.equal(rows[2].oldValue, undefined);
});

test("category-set reordering and descriptive changes do not invent policy changes", () => {
	const before = { id: "cat", field: "casteCategory", operator: "IN", targetValue: ["SC", "ST"], description: "Old words" };
	const after = { ...before, targetValue: ["ST", "SC"], description: "New words" };
	assert.deepEqual(policyChangeRows([{ field: "rules", oldValue: [before], newValue: [after] }]), []);
});

test("a threshold saved as both a normalized field and a rule is shown once", () => {
	const rule = ceiling => ({ id: "income", field: "familyIncome", operator: "LTE", targetValue: ceiling });
	const rows = policyChangeRows([
		{ field: "eligibility.familyIncome", oldValue: { max: 250000, operator: "LTE" }, newValue: { max: 300000, operator: "LTE" } },
		{ field: "rules", oldValue: [rule(250000)], newValue: [rule(300000)] },
	]);
	assert.equal(rows.length, 1);
});

test("structural diffs explain alternative routes instead of rendering AST JSON", () => {
	const child = { type: "CONDITION", id: "marks", field: "percentage", operator: "GTE", targetValue: 75 };
	const tree = { type: "OR", children: [child, { ...child, id: "other", targetValue: 65 }] };
	assert.match(formatPolicyValue(tree, "ruleTree"), / OR /);
	assert.doesNotMatch(formatPolicyValue(tree, "ruleTree"), /targetValue|CONDITION/);
	assert.equal(policyFieldLabel("eligibility.familyIncome"), "Annual family income");
});

test("generated history summaries describe changes without exposing database field paths", () => {
	assert.equal(policyUpdateSummary({ summary: "Official values changed: eligibility.familyIncome, rules" }, [{ field: "eligibility.familyIncome" }, { field: "rules" }]), "Annual family income, Eligibility criteria updated.");
	assert.equal(policyUpdateSummary({ changeType: "FIRST_OBSERVED", summary: "First observed" }), "First recorded from the provider's source.");
	assert.equal(policyUpdateSummary({ summary: "Income ceiling raised to ₹3 lakh." }), "Income ceiling raised to ₹3 lakh.");
});

test("all three reported award shapes are recognized as unchanged, with no before/after rows", () => {
	for (const amount of amounts) {
		const version = { changeType: "AWARD_UPDATE", deltas: [amountDelta(amount)] };
		assert.deepEqual(policyChangeRows(version.deltas), []);
		const entries = policyHistoryEntries([version]);
		assert.equal(entries.changes.length, 0); assert.equal(entries.routine.length, 1);
	}
});

test("only the genuine link change and an accurate summary survive a noisy mixed record", () => {
	const version = { summary: "Award amount updated.", deltas: [amountDelta(amounts[2]), { field: "applicationLink", oldValue: "https://old.gov.in", newValue: "https://new.gov.in" }] };
	const rows = policyChangeRows(version.deltas);
	assert.deepEqual(rows.map(row => row.field), ["applicationLink"]);
	assert.equal(policyUpdateSummary(version, rows), "Application website updated.");
});

test("amount values, currencies, payment periods, months, qualifiers and all rate options stay visible", () => {
	const before = { ...amounts[0], months: 10, options: [{ value: 1000, period: "monthly" }] };
	for (const change of [{ value: 90000 }, { currency: "USD" }, { period: "total" }, { months: 12 }, { options: [{ value: 1500, period: "monthly" }] }, { displayString: "Up to ₹80,000 per year" }]) {
		const after = { ...before, ...change }, rows = policyChangeRows([{ field: "amount", oldValue: before, newValue: after }]);
		assert.equal(rows.length, 1);
		assert.notEqual(formatPolicyRowValue(rows[0], "oldValue"), formatPolicyRowValue(rows[0], "newValue"));
	}
});

test("time changes on the same Indian calendar date are displayed with their actual times", () => {
	const row = { field: "closesAt", oldValue: "2026-10-31T11:30:00.000Z", newValue: "2026-10-31T18:29:59.999Z" };
	assert.equal(policyDate(row.oldValue), policyDate(row.newValue));
	assert.equal(policyChangeRows([row]).length, 1);
	assert.notEqual(formatPolicyRowValue(row, "oldValue"), formatPolicyRowValue(row, "newValue"));
});

test("date-only and award updates never inherit misleading eligibility labels", () => {
	const dates = [{ field: "closesAt", oldValue: "2026-10-31", newValue: "2026-11-15" }];
	assert.equal(policyVersionPresentation({ semanticCategory: "RELAXATION" }, dates).label, "Deadline extended");
	assert.equal(policyVersionPresentation({ semanticCategory: "RESTRICTION" }, [{ ...dates[0], oldValue: dates[0].newValue, newValue: dates[0].oldValue }]).label, "Deadline moved earlier");
	assert.equal(policyVersionPresentation({ semanticCategory: "RELAXATION" }, [{ field: "amount" }]).criteriaChanged, false);
	assert.equal(policyVersionPresentation({ semanticCategory: "RELAXATION" }, [{ field: "amount" }]).label, "Award terms updated");
});

test("baseline, new cycles, genuine policy changes and missing comparisons survive history grouping", () => {
	const history = [
		{ changeType: "FIRST_OBSERVED", deltas: [] }, { changeType: "NEW_CYCLE", deltas: [] },
		{ changeType: "CRITERIA_MODIFIED", summary: "Older update", deltas: [] },
		{ changeType: "CRITERIA_MODIFIED", deltas: [{ field: "eligibility.percentage", oldValue: 60, newValue: 75 }] },
		{ changeType: "AWARD_UPDATE", routineRefresh: true, deltas: [] },
	];
	const grouped = policyHistoryEntries(history);
	assert.equal(grouped.changes.length, 4); assert.equal(grouped.routine.length, 1);
});

test("duplicate source excerpts are reduced without modifying quotations or losing page context", () => {
	const quote = { quote: "Exact source\nquotation.", url: "https://example.gov.in", page: 2 };
	const result = policyEvidence([quote, { ...quote }, { ...quote, page: 3 }]);
	assert.equal(result.length, 2); assert.equal(result[0].quote, quote.quote);
	assert.deepEqual(policyEvidence([{ ...quote, field: "amount" }], ["applicationLink"]), []);
});

test("missing URLs changing from null to empty text are not shown as a policy update", () => {
	const deltas = ["applicationLink", "officialLinks.guidelinesUrl", "officialLinks.faqUrl"].map(field => ({ field, oldValue: null, newValue: "" }));
	assert.deepEqual(policyChangeRows(deltas), []);
	assert.equal(policyHistoryEntries([{ changeType: "LINK_UPDATED", deltas }]).routine.length, 1);
});

test("missing comparison fields remain unknown rather than becoming unchanged records", () => {
	for (const deltas of [[{}], [null], [{ field: "amount" }], [{ field: "amount", oldValue: 80000 }]]) {
		const grouped = policyHistoryEntries([{ changeType: "AWARD_UPDATE", deltas }]);
		assert.equal(grouped.routine.length, 0); assert.equal(grouped.changes.length, 1);
		assert.deepEqual(grouped.changes[0].rows, []);
	}
});
