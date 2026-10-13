import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility, normalizeProfile } from "../../src/engine/ruleEvaluator.js";
import { buildRequiredDocuments, isCitedDocument } from "../../src/pipeline/core/requiredDocuments.js";

const scheme = (field, operator, targetValue) => ({ rules: [{ id: field, field, operator, targetValue }], requiredDocuments: [] });

test("missing domicile, category and disability remain unknown", () => {
	for (const [field, target] of [["state", "Maharashtra"], ["casteCategory", "General"], ["hasDisability", true], ["gender", "Female"]]) {
		const result = evaluateEligibility({}, scheme(field, field === "hasDisability" ? "BOOLEAN_MATCH" : "EQ", target));
		assert.equal(result.isEligible, false);
		assert.equal(result.unknownRules[0].field, field);
		assert.equal(result.passedRules.length, 0);
		assert.equal(result.failedRules.length, 0);
	}
});

test("national catalogue selection cannot pass a state domicile requirement", () => {
	assert.equal(normalizeProfile({ state: "All India" }).state, null);
	const result = evaluateEligibility({ state: "All India" }, scheme("state", "EQ", "Maharashtra"));
	assert.equal(result.isEligible, false);
	assert.equal(result.unknownRules.length, 1);
	assert.equal(evaluateEligibility({ state: "Maharashtra" }, scheme("state", "EQ", "Maharashtra")).isEligible, true);
	assert.equal(evaluateEligibility({ state: "Delhi" }, scheme("state", "EQ", "Maharashtra")).failedRules.length, 1);
});

test("a scholarship's national scope imposes no domicile constraint", () => {
	assert.equal(evaluateEligibility({}, scheme("state", "EQ", "All India")).isEligible, true);
	assert.equal(evaluateEligibility({}, scheme("state", "IN", ["All India", "Maharashtra"])).unknownRules.length, 0);
});

test("blank and invalid numbers stay unknown while explicit zero stays zero", () => {
	for (const field of ["familyIncome", "cgpa", "percentage"]) {
		for (const value of [undefined, null, "", "   ", NaN, Infinity, "invalid", false, []]) {
			const result = evaluateEligibility({ [field]: value }, scheme(field, "LTE", 300000));
			assert.equal(result.unknownRules.length, 1, `${field}: ${String(value)}`);
			assert.equal(result.isEligible, false);
		}
		assert.equal(normalizeProfile({ [field]: 0 })[field], 0);
	}
});

test("income boundary respects exclusive LT and inclusive LTE", () => {
	for (const income of [299999, 300000, 300001]) {
		assert.equal(evaluateEligibility({ familyIncome: income }, scheme("familyIncome", "LT", 300000)).isEligible, income < 300000);
		assert.equal(evaluateEligibility({ familyIncome: income }, scheme("familyIncome", "LTE", 300000)).isEligible, income <= 300000);
	}
	assert.equal(evaluateEligibility({ familyIncome: 300000 }, { eligibility: { familyIncome: { max: 300000, operator: "LT" } } }).isEligible, false);
});

test("a scheme without recorded eligibility conditions stays unverified", () => {
	const result = evaluateEligibility({}, { rules: [], requiredDocuments: [] });
	assert.equal(result.isEligible, false);
	assert.equal(result.unknownRules[0].ruleId, "criteria_not_recorded");
});

test("explicit false and string false are preserved; arbitrary truthy disability values are unknown", () => {
	for (const value of [false, "false"]) {
		const result = evaluateEligibility({ hasDisability: value }, scheme("hasDisability", "BOOLEAN_MATCH", true));
		assert.equal(result.failedRules.length, 1);
		assert.equal(result.unknownRules.length, 0);
	}
	assert.equal(evaluateEligibility({ hasDisability: "yes" }, scheme("hasDisability", "BOOLEAN_MATCH", true)).unknownRules.length, 1);
});

test("legacy and inferred document lists never establish official requirements or readiness", () => {
	const requiredDocuments = [...buildRequiredDocuments(), { code: "INCOME_CERT", name: "Income certificate", mandatory: true }];
	const result = evaluateEligibility({}, { rules: [], requiredDocuments });
	assert.equal(result.documentAudit.total, 0);
	assert.equal(result.documentReadiness, null);
	assert.equal(result.documentAudit.requirementsVerified, false);
	assert.equal(result.documentAudit.suggestions.length, requiredDocuments.length);
});

test("explicit document requirements need an item-specific excerpt; optional cited items are not mandatory", () => {
	const evidence = { field: "requiredDocuments.INCOME_CERT", quote: "Income certificate is required", snapshotId: "a".repeat(24), url: "https://example.gov.in/guidelines" };
	const docs = buildRequiredDocuments({}, { fields: { requiredDocuments: [
		{ code: "INCOME_CERT", name: "Income certificate", mandatory: true, evidence },
		{ code: "AADHAAR", name: "Identity proof", mandatory: true },
		{ code: "BANK_PASSBOOK", name: "Bank details", mandatory: false, evidence: { ...evidence, field: "requiredDocuments.BANK_PASSBOOK", quote: "Bank details may be supplied" } },
	] } });
	assert.equal(isCitedDocument(docs[0]), true);
	assert.equal(docs[0].mandatory, true);
	assert.equal(isCitedDocument(docs[1]), false);
	assert.equal(docs[1].mandatory, false);
	assert.equal(docs[2].mandatory, false);
	const result = evaluateEligibility({ documentsHeld: ["INCOME_CERT"] }, { rules: [], requiredDocuments: docs });
	assert.equal(result.documentAudit.total, 1);
	assert.equal(result.documentAudit.heldCount, 1);
});
