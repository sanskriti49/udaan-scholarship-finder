import { test } from "node:test";
import assert from "node:assert/strict";
import {
	extractAmounts,
	extractIncomeLimits,
	extractMinDisabilityPercent,
	consolidate,
	levelFromTitle,
	genderFromTitle,
	schemeTypeFromTitle,
	casteGroupsFromTitle,
	cleanTitle,
} from "../../src/pipeline/core/extract.js";
import { assessTextQuality, detectDocumentDateLabel } from "../../src/pipeline/core/documents.js";
import { recordings } from "../helpers.js";

const text = (fragment) => recordings.records.find((r) => r.url.includes(fragment)).text;

test("CSSS: two distinct official rates, historical 'Note:' rate ignored", () => {
	const found = consolidate(extractAmounts(text("CSSS_GUIDLINES")), (c) => `${c.value}|${c.period}`);
	assert.deepEqual(
		found.distinct.map((c) => [c.value, c.period]),
		[
			[12000, "yearly"],
			[20000, "yearly"],
		],
	);
	assert.ok(!found.distinct.some((c) => c.value === 10000), "AY 2021-22 rate from the Note must not be used");
	for (const c of found.distinct) assert.ok(text("CSSS_GUIDLINES").includes(c.quote));
});

test("income ceilings: 'upto', 'not more than', 'below' with lakh conversion", () => {
	const csss = extractIncomeLimits(text("CSSS_GUIDLINES"));
	assert.deepEqual(csss.map((c) => [c.value, c.operator]), [[450000, "LTE"]]);
	const pragati = extractIncomeLimits(text("AICTE_2010_G"));
	assert.deepEqual(pragati.map((c) => [c.value, c.operator]), [[800000, "LTE"]]);
	const ishan = extractIncomeLimits(text("ISHAN"));
	assert.deepEqual(ishan.map((c) => [c.value, c.operator]), [[450000, "LT"]]);
	assert.deepEqual(extractIncomeLimits(text("POSTGRADUATE")), [], "NSPG states no income limit");
});

test("income sentences are not mistaken for award amounts", () => {
	const pragati = extractAmounts(text("AICTE_2010_G"));
	assert.deepEqual(pragati.map((c) => [c.value, c.period]), [[50000, "yearly"]]);
	assert.deepEqual(
		extractAmounts("Family income should not be more than Rs. 2,50,000/- per annum.").length,
		0,
	);
});

test("monthly amounts keep their month count", () => {
	const [ishan] = extractAmounts(text("ISHAN"));
	assert.deepEqual([ishan.value, ishan.period, ishan.months], [8000, "monthly", 10]);
	const [nspg] = extractAmounts(text("POSTGRADUATE"));
	assert.deepEqual([nspg.value, nspg.period, nspg.months], [15000, "monthly", 10]);
});

test("disability threshold", () => {
	assert.deepEqual(extractMinDisabilityPercent(text("AICTE_2012_G")).map((c) => c.value), [40]);
});

test("OCR-garbled NMMSS text is detected; clean guideline text is not", () => {
	assert.equal(assessTextQuality(text("NMMSS")).ocrSuspect, true);
	for (const f of ["CSSS_GUIDLINES", "AICTE_2010_G", "AICTE_2012_G", "AICTE_3039_G", "ISHAN", "POSTGRADUATE"]) {
		assert.equal(assessTextQuality(text(f)).ocrSuspect, false, f);
	}
});

test("document date labels", () => {
	assert.deepEqual(detectDocumentDateLabel(text("AICTE_2010_G")), { label: "July 2020", year: 2020 });
	assert.equal(detectDocumentDateLabel(text("AICTE_3039_G")).label, "May 2025");
	assert.equal(detectDocumentDateLabel(text("ISHAN")).label, "2021");
	assert.equal(detectDocumentDateLabel(text("CSSS_GUIDLINES")).openEnded, true);
});

test("title-derived facts are conservative", () => {
	const t = "AICTE - Pragati Scholarship Scheme For Girl Students ( Technical Diploma) (Merit Based Scheme)";
	assert.equal(levelFromTitle(t), "Diploma");
	assert.equal(genderFromTitle(t), "Female");
	assert.equal(schemeTypeFromTitle(t), "Merit based");
	assert.equal(cleanTitle(t), "AICTE - Pragati Scholarship Scheme For Girl Students (Technical Diploma)");
	assert.equal(levelFromTitle("Stipend Scheme For Under Graduate And Post Graduate Studies"), null);
	assert.equal(levelFromTitle("PM YASASVI ... In College For OBC, EBC And DNT Students"), null);
	assert.deepEqual(casteGroupsFromTitle("Central Sector Scholarship Of Top Class Education For SC Students"), ["SC"]);
	assert.equal(casteGroupsFromTitle("PM YASASVI ... For OBC, EBC And DNT Students"), null);
	assert.equal(genderFromTitle("Scholarship For Top Class Education For Students With Disabilities"), null);
});
