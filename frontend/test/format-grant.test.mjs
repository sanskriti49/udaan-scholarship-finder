import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGrant } from "../src/utils/formatGrant.js";

test("course-specific annual rates use a compact range and preserve every tier", () => {
	const options = [50000, 40000, 20000, 15000].map((value) => ({ value, period: "yearly", months: null }));
	const grant = formatGrant({ value: null, options, displayString: "Full course-specific rates from the official PDF" });
	assert.equal(grant.main, "₹15,000 – ₹50,000");
	assert.equal(grant.period, "/year");
	assert.deepEqual(grant.options, options);
	assert.match(grant.details, /Varies by course\/year/);
});

test("different payment periods are not presented as a comparable range", () => {
	const grant = formatGrant({ options: [{ value: 1000, period: "monthly" }, { value: 20000, period: "yearly" }], displayString: "₹1,000 monthly or ₹20,000 yearly depending on course" });
	assert.equal(grant.main, "See award details");
	assert.equal(grant.period, null);
	assert.match(grant.details, /monthly or/);
});

test("monthly range text keeps its actual period and course qualification", () => {
	const grant = formatGrant({ displayString: "₹1,000–₹8,000 per month depending on course (see official rates)" });
	assert.equal(grant.main, "₹1,000 – ₹8,000");
	assert.equal(grant.period, "/month");
	assert.equal(grant.details, "depending on course (see official rates)");
});

test("monthly award duration stays visible and a total award is not annualized", () => {
	const grant = formatGrant({ displayString: "₹15,000 per month for 10 months a year" });
	assert.equal(grant.main, "₹15,000");
	assert.equal(grant.period, "/month");
	assert.equal(grant.details, "Paid for 10 months a year.");
	assert.equal(formatGrant({ value: 200000, period: "total" }).period, "total");
});

test("long explanations remain available without becoming oversized headings", () => {
	const text = "Tuition reimbursement and maintenance support vary by course, residence and applicant circumstances. Check the official guidelines.";
	const grant = formatGrant({ displayString: text });
	assert.equal(grant.main, "See award details");
	assert.equal(grant.details, text);
	assert.equal(grant.isNarrative, true);
	assert.equal(formatGrant({ displayString: "Up to ₹2,00,000 over the degree" }).main, "Up to ₹2,00,000 over the degree");
});

test("missing or invalid numeric amounts do not invent a figure", () => {
	assert.equal(formatGrant(null).isUnpublished, true);
	assert.equal(formatGrant({ value: Infinity }).isUnpublished, true);
	assert.equal(formatGrant({ value: NaN }).isUnpublished, true);
});
