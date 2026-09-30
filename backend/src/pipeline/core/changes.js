import { sha256 } from "./http.js";
import { formatIstDate } from "./time.js";

/**
 * Change detection distinguishes:
 *   pageChanged  – the fetched document text differs from the last snapshot
 *                  (layout tweaks, unrelated announcements, etc.)
 *   dataChanged  – a scholarship's *normalised, cited* values differ
 * Only dataChanged creates version history and user notifications.
 */

export const TRACKED_FIELDS = [
	"title",
	"organization",
	"applicationLink",
	"officialLinks.guidelinesUrl",
	"officialLinks.faqUrl",
	"category",
	"level",
	"state",
	"amount",
	"eligibility.gender",
	"eligibility.disabilityRequired",
	"eligibility.minDisabilityPercent",
	"eligibility.familyIncome",
	"eligibility.casteCategories",
];

const CYCLE_FIELDS = [
	"opensAt",
	"closesAt",
	"latestPossibleClosesAt",
	"defectiveVerificationUntil",
	"instituteVerificationUntil",
	"officerVerificationUntil",
];

const get = (obj, path) => path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

function set(obj, path, value) {
	const keys = path.split(".");
	let cur = obj;
	for (const k of keys.slice(0, -1)) {
		if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
		cur = cur[k];
	}
	cur[keys[keys.length - 1]] = value;
}

function stable(value) {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(stable);
	if (value && typeof value === "object") {
		const out = {};
		for (const k of Object.keys(value).sort()) {
			if (k === "_id" || k === "id") continue;
			out[k] = stable(value[k]);
		}
		return out;
	}
	return value ?? null;
}

const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const isEmpty = (v) => v === null || v === undefined || (Array.isArray(v) && v.length === 0);

export function recordDataHash(record) {
	const picked = {};
	for (const f of TRACKED_FIELDS) picked[f] = get(record, f) ?? null;
	return sha256(JSON.stringify(stable(picked)));
}

export function cycleKey(cycle) {
	return `${cycle.academicYear}|${cycle.applicationType}`;
}

export function cycleDataHash(cycle) {
	const picked = {};
	for (const f of CYCLE_FIELDS) picked[f] = cycle[f] ?? null;
	picked.academicYear = cycle.academicYear;
	picked.applicationType = cycle.applicationType;
	return sha256(JSON.stringify(stable(picked)));
}

/**
 * Merge incoming (freshly extracted) values into the stored record.
 *
 * - Incoming non-empty value with evidence → replaces stored value (change logged).
 * - Incoming empty value while stored value exists → stored value is KEPT with its
 *   existing evidence. A failed or partial fetch never erases verified data.
 *   If the source document was fetched successfully and simply no longer states
 *   the value, a review issue is raised (see `reconfirmedFields`).
 */
export function mergeRecordFields(stored, incoming, { reconfirmedFields = new Set() } = {}) {
	const merged = structuredClone(stored);
	const deltas = [];
	const issues = [];
	const evidenceByField = new Map();
	for (const e of incoming.fieldEvidence) {
		if (!evidenceByField.has(e.field)) evidenceByField.set(e.field, []);
		evidenceByField.get(e.field).push(e);
	}

	for (const field of TRACKED_FIELDS) {
		const oldValue = get(stored, field);
		const newValue = get(incoming, field);
		if (isEmpty(newValue)) {
			if (!isEmpty(oldValue) && reconfirmedFields.has(field)) {
				issues.push({
					code: "field_not_reconfirmed",
					severity: "warning",
					message: `The official document was fetched but no longer states ${field}; the previously verified value is kept pending review.`,
				});
			}
			continue;
		}
		if (!same(oldValue, newValue)) {
			set(merged, field, newValue);
			deltas.push({ field, oldValue: oldValue ?? null, newValue });
		}
	}

	// Evidence: replace evidence for fields that were re-observed; keep the rest.
	const refreshedFields = new Set(incoming.fieldEvidence.map((e) => e.field));
	merged.fieldEvidence = [
		...(stored.fieldEvidence || []).filter((e) => !refreshedFields.has(e.field)),
		...incoming.fieldEvidence,
	];

	// Rules/quotes follow the same "only replace when re-observed" rule.
	const incomingRuleIds = new Set(incoming.rules.map((r) => r.id));
	const keptRules = (stored.rules || []).filter((r) => !incomingRuleIds.has(r.id));
	merged.rules = [...keptRules, ...incoming.rules];
	const keptQuotes = (stored.provenanceQuotes || []).filter((q) => !incomingRuleIds.has(q.ruleId));
	merged.provenanceQuotes = [...keptQuotes, ...incoming.provenanceQuotes];

	for (const k of ["officialTitle", "summary", "description", "tags", "sourceUrl", "sourceSite", "primarySourceId", "authorityTier", "sourceType", "officialLinks", "applicationLink", "requiredDocuments"]) {
		if (!isEmpty(incoming[k])) merged[k] = incoming[k];
	}
	return { merged, deltas, issues };
}

function describeDateDelta(field, oldValue, newValue) {
	return `${field}: ${formatIstDate(oldValue) ?? "not published"} → ${formatIstDate(newValue) ?? "not published"}`;
}

/**
 * Compare an incoming cycle with the stored cycle for the SAME academic year and
 * application type. Different academic years are never compared: a new year is
 * a new cycle and the previous one is left untouched.
 */
export function diffCycle(stored, incoming) {
	const deltas = [];
	for (const field of CYCLE_FIELDS) {
		const a = stored?.[field] ? new Date(stored[field]) : null;
		const b = incoming[field] ? new Date(incoming[field]) : null;
		if ((a?.getTime() ?? null) === (b?.getTime() ?? null)) continue;
		if (b === null && a !== null) continue; // missing now → keep old
		deltas.push({ field, oldValue: a, newValue: b, humanReadable: describeDateDelta(field, a, b) });
	}
	let changeType = "CYCLE_DATES_CHANGED";
	const close = deltas.find((d) => d.field === "closesAt");
	if (close && close.oldValue && close.newValue) {
		changeType = close.newValue > close.oldValue ? "DEADLINE_EXTENSION" : "DEADLINE_SHORTENED";
	}
	return { deltas, changeType };
}

export function classifyFieldDeltas(deltas) {
	if (deltas.some((d) => d.field === "eligibility.familyIncome")) return "INCOME_CEILING_CHANGE";
	if (deltas.some((d) => d.field === "amount")) return "AWARD_UPDATE";
	if (deltas.some((d) => d.field.startsWith("eligibility."))) return "CRITERIA_MODIFIED";
	if (deltas.some((d) => /link|Url/i.test(d.field))) return "LINK_UPDATED";
	return "FIELD_UPDATED";
}
