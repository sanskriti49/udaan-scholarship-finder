import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySemanticChange } from "../../src/pipeline/core/changes.js";

test("classifySemanticChange: income ceiling expansion classifies as RELAXATION", () => {
	const deltas = [
		{ field: "eligibility.familyIncome", oldValue: { max: 250000 }, newValue: { max: 300000 } },
	];
	assert.equal(classifySemanticChange(deltas, "INCOME_CEILING_CHANGE"), "RELAXATION");
});

test("classifySemanticChange: income ceiling lowering classifies as RESTRICTION", () => {
	const deltas = [
		{ field: "eligibility.familyIncome", oldValue: { max: 500000 }, newValue: { max: 400000 } },
	];
	assert.equal(classifySemanticChange(deltas, "INCOME_CEILING_CHANGE"), "RESTRICTION");
});

test("classifySemanticChange: minimum percentage reduction classifies as RELAXATION", () => {
	const deltas = [
		{ field: "eligibility.percentage", oldValue: 75, newValue: 65 },
	];
	assert.equal(classifySemanticChange(deltas, "CRITERIA_MODIFIED"), "RELAXATION");
});

test("classifySemanticChange: minimum marks increase classifies as RESTRICTION", () => {
	const deltas = [
		{ field: "eligibility.percentage", oldValue: 60, newValue: 70 },
	];
	assert.equal(classifySemanticChange(deltas, "CRITERIA_MODIFIED"), "RESTRICTION");
});

test("classifySemanticChange: minimum CGPA increase classifies as RESTRICTION", () => {
	const deltas = [
		{ field: "eligibility.minCGPA", oldValue: 7.0, newValue: 8.0 },
	];
	assert.equal(classifySemanticChange(deltas, "CRITERIA_MODIFIED"), "RESTRICTION");
});

test("classifySemanticChange: cycle closing date extended classifies as DATE_EXTENSION", () => {
	const deltas = [
		{ field: "closesAt", oldValue: "2026-10-31T00:00:00.000Z", newValue: "2026-11-30T00:00:00.000Z" },
	];
	assert.equal(classifySemanticChange(deltas, "DEADLINE_EXTENSION"), "DATE_EXTENSION");
});

test("classifySemanticChange: cycle deadline shortened classifies as RESTRICTION", () => {
	const deltas = [
		{ field: "closesAt", oldValue: "2026-11-30T00:00:00.000Z", newValue: "2026-10-31T00:00:00.000Z" },
	];
	assert.equal(classifySemanticChange(deltas, "DEADLINE_SHORTENED"), "RESTRICTION");
});

test("classifySemanticChange: link or URL updates classify as PROCEDURAL_UPDATE", () => {
	const deltas = [
		{ field: "officialLinks.guidelinesUrl", oldValue: "http://old.gov/doc.pdf", newValue: "http://new.gov/doc.pdf" },
	];
	assert.equal(classifySemanticChange(deltas, "LINK_UPDATED"), "PROCEDURAL_UPDATE");
});
