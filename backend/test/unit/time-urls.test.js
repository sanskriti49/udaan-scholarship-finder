import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseOfficialDate,
	normalizeAcademicYear,
	findStatedAcademicYear,
	isWithinAcademicYearWindow,
	formatIstDate,
} from "../../src/pipeline/core/time.js";
import { validateOfficialUrl, canonicalizeUrl } from "../../src/pipeline/core/urls.js";

test("official dates parse as IST, closing dates run to end of day", () => {
	assert.equal(parseOfficialDate("31-10-2026", { endOfDay: true }).toISOString(), "2026-10-31T18:29:59.999Z");
	assert.equal(parseOfficialDate("01-06-2026").toISOString(), "2026-05-31T18:30:00.000Z");
	assert.equal(parseOfficialDate("30/11/2026", { endOfDay: true }).toISOString(), "2026-11-30T18:29:59.999Z");
	assert.equal(formatIstDate(parseOfficialDate("31-10-2026", { endOfDay: true })), "31-10-2026");
});

test("invalid or ambiguous dates are unknown, never guessed", () => {
	for (const bad of ["31-02-2026", "2026-10-31", "Oct 31 2026", "", null, "31-13-2026", "TBA", "1-6-2026"]) {
		assert.equal(parseOfficialDate(bad), null, String(bad));
	}
});

test("academic year only comes from explicit statements", () => {
	assert.equal(normalizeAcademicYear("2026-27"), "2026-27");
	assert.equal(normalizeAcademicYear("2026–2027"), "2026-27");
	assert.equal(normalizeAcademicYear("2026-28"), null);
	assert.equal(findStatedAcademicYear("###### **Academic Year 2026-27**"), "2026-27");
	assert.equal(findStatedAcademicYear("from AY 2026–27, students may"), "2026-27");
	assert.equal(findStatedAcademicYear("Scheme Open from : 01-06-2026"), null);
});

test("academic-year plausibility window", () => {
	assert.ok(isWithinAcademicYearWindow(parseOfficialDate("31-10-2026"), "2026-27"));
	assert.ok(isWithinAcademicYearWindow(parseOfficialDate("31-03-2027"), "2026-27"));
	assert.ok(!isWithinAcademicYearWindow(parseOfficialDate("31-10-2025"), "2026-27"));
	assert.ok(!isWithinAcademicYearWindow(parseOfficialDate("01-01-2028"), "2026-27"));
});

test("official URL validation rejects placeholders and foreign domains", () => {
	const domains = ["scholarships.gov.in"];
	assert.equal(validateOfficialUrl("https://scholarships.gov.in/null", domains).reason, "placeholder_url");
	assert.equal(
		validateOfficialUrl("https://scholarships.gov.in/public/schemeGuidelines/not_available.pdf", domains).reason,
		"placeholder_url",
	);
	assert.equal(validateOfficialUrl("https://scholarships.gov.in.evil.com/a.pdf", domains).reason, "domain_not_allowed");
	assert.equal(validateOfficialUrl("javascript:alert(1)", domains).reason, "unparseable_url");
	const spaced = validateOfficialUrl("https://scholarships.gov.in/public/schemeGuidelines/Guidelines_ISHAN UDAY_2324.pdf", domains);
	assert.ok(spaced.ok);
	assert.equal(spaced.url, "https://scholarships.gov.in/public/schemeGuidelines/Guidelines_ISHAN%20UDAY_2324.pdf");
	assert.ok(validateOfficialUrl("https://www.scholarships.gov.in/x.pdf", domains).ok);
	assert.equal(canonicalizeUrl("#"), null);
});
