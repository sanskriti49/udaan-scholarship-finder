import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStatus } from "../../src/pipeline/core/status.js";
import { parseOfficialDate } from "../../src/pipeline/core/time.js";
import { buildSchemeKey, dedupeCandidates, titleSimilarity } from "../../src/pipeline/core/dedupe.js";

const at = (s) => new Date(s);
const record = (cycle, lastVerifiedAt = "2026-09-17T06:00:00Z") => ({
	currentCycle: cycle && { academicYear: "2026-27", applicationType: "general", ...cycle },
	freshness: { lastVerifiedAt: at(lastVerifiedAt), staleAfterHours: 72 },
});
const window = { opensAt: parseOfficialDate("01-06-2026"), closesAt: parseOfficialDate("31-10-2026", { endOfDay: true }) };

test("status transitions follow official dates in IST", () => {
	assert.equal(computeStatus(record(window), at("2026-05-31T18:00:00Z")).status, "upcoming");
	assert.equal(computeStatus(record(window), at("2026-09-17T08:00:00Z")).status, "open");
	assert.equal(computeStatus(record(window), at("2026-10-28T08:00:00Z")).status, "closing_soon");
	// 31 Oct 23:30 IST is still open; 1 Nov 00:00:01 IST is closed.
	assert.equal(computeStatus(record(window), at("2026-10-31T18:00:00Z")).status, "closing_soon");
	assert.equal(computeStatus(record(window), at("2026-10-31T18:30:01Z")).status, "closed");
});

test("missing dates give unknown, never open", () => {
	assert.equal(computeStatus(record(null)).status, "unknown");
	assert.equal(computeStatus(record({ opensAt: window.opensAt, closesAt: null }), at("2026-09-17T08:00:00Z")).status, "unknown");
	assert.equal(computeStatus(record({ opensAt: null, closesAt: window.closesAt }), at("2026-09-17T08:00:00Z")).status, "unknown");
});

test("conflicting official closing dates → unknown between the two dates", () => {
	const c = {
		opensAt: window.opensAt,
		closesAt: parseOfficialDate("30-09-2026", { endOfDay: true }),
		latestPossibleClosesAt: window.closesAt,
		applicationType: "renewal",
	};
	assert.equal(computeStatus(record(c), at("2026-09-17T08:00:00Z")).status, "open");
	const between = computeStatus(record(c), at("2026-10-05T08:00:00Z"));
	assert.equal(between.status, "unknown");
	assert.match(between.reason, /disagree/);
	assert.equal(computeStatus(record(c), at("2026-11-05T08:00:00Z")).status, "closed");
});

test("staleness is flagged but does not change the date-derived status", () => {
	const s = computeStatus(record(window, "2026-09-10T06:00:00Z"), at("2026-09-17T08:00:00Z"));
	assert.equal(s.status, "open");
	assert.equal(s.stale, true);
	assert.equal(computeStatus(record(window), at("2026-09-19T05:00:00Z")).stale, false);
	assert.equal(computeStatus({ currentCycle: null, freshness: {} }).stale, true);
});

test("degree and diploma variants are never merged", () => {
	const a = { schemeKey: buildSchemeKey("nsp", "AICTE", "Pragati (Technical Degree)"), title: "AICTE Pragati Scholarship For Girl Students (Technical Degree)", cycles: [] };
	const b = { schemeKey: buildSchemeKey("nsp", "AICTE", "Pragati (Technical Diploma)"), title: "AICTE Pragati Scholarship For Girl Students (Technical Diploma)", cycles: [] };
	const { records, issues } = dedupeCandidates([a, b]);
	assert.equal(records.length, 2);
	assert.ok(titleSimilarity(a.title, b.title) < 0.85);
	assert.equal(issues.length, 0);
});

test("same key with different dates is blocked, identical duplicates collapse", () => {
	const base = { schemeKey: "nsp:x:y", title: "Some Scheme", sourceId: "s" };
	const same = dedupeCandidates([
		{ ...base, cycles: [{ closesAt: 1 }] },
		{ ...base, cycles: [{ closesAt: 1 }] },
	]);
	assert.equal(same.records.length, 1);
	assert.equal(same.issues.length, 0);
	const diff = dedupeCandidates([
		{ ...base, cycles: [{ closesAt: 1 }] },
		{ ...base, cycles: [{ closesAt: 2 }] },
	]);
	assert.equal(diff.records[0].blocked, true);
	assert.equal(diff.issues[0].code, "duplicate_key_conflict");
});

test("near-identical titles raise a review issue instead of merging", () => {
	const { records, issues } = dedupeCandidates([
		{ schemeKey: "nsp:a:x", title: "Post Matric Scholarship For Students With Disabilities", cycles: [] },
		{ schemeKey: "nsp:b:x", title: "Post-Matric Scholarship for Students with Disabilities", cycles: [] },
	]);
	assert.equal(records.length, 2);
	assert.equal(issues[0].code, "possible_duplicate");
});

test("scheme keys ignore the NSP merit/welfare suffix and punctuation variants", () => {
	assert.equal(
		buildSchemeKey("nsp", "UGC", "Ishan Uday Special Scholarship Scheme For NER (Merit Based Scheme)"),
		buildSchemeKey("nsp", "UGC", "Ishan  Uday Special Scholarship Scheme for NER"),
	);
});
