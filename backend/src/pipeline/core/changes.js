import { sha256 } from "./http.js";
import { formatIstDate } from "./time.js";
import { ruleTreeSchema } from "../../engine/ruleSchema.js";
import { eligibilityRules } from "../../engine/ruleEvaluator.js";
import { canonicalPolicyValue, samePolicyValue, meaningfulPolicyDeltas, isEligibilityField, POLICY_DATE_FIELDS, relevantPolicyEvidence, isComparablePolicyDelta } from "./policyValues.js";

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
	"eligibility.minCGPA",
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
const isEmpty = (v) => v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

export function recordDataHash(record) {
	const picked = {};
	for (const f of TRACKED_FIELDS) picked[f] = canonicalPolicyValue(f, get(record, f));
	picked.rules = canonicalPolicyValue("rules", record.rules || []);
	if (record.ruleTree != null) picked.ruleTree = canonicalPolicyValue("ruleTree", ruleTreeSchema.parse(record.ruleTree));
	return sha256(JSON.stringify(stable(picked)));
}

function semanticRules(rules = []) {
	return rules.map(({ id, field, operator, targetValue }) => ({ id, field, operator,
		targetValue: operator === "IN" && Array.isArray(targetValue) ? [...targetValue].sort() : targetValue })).sort((a, b) => a.id.localeCompare(b.id));
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
	// JSON preserves ObjectId references as strings; structuredClone loses their prototype.
	const merged = JSON.parse(JSON.stringify(stored));
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
		if (!samePolicyValue(field, oldValue, newValue)) {
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
	if (incoming.ruleTree != null) {
		const tree = ruleTreeSchema.parse(incoming.ruleTree);
		if (!samePolicyValue("ruleTree", stored.ruleTree || null, tree)) {
			deltas.push({ field: "ruleTree", oldValue: stored.ruleTree || null, newValue: tree });
		}
		merged.ruleTree = tree;
	}
	const incomingRuleIds = new Set(incoming.rules.map((r) => r.id));
	if (stored.ruleTree && incoming.ruleTree == null) {
		const oldRules = new Map(eligibilityRules(stored).map(rule => [rule.id, rule]));
		if (incoming.rules.some(rule => !oldRules.has(rule.id) || !same(semanticRules([oldRules.get(rule.id)]), semanticRules([rule])))) {
			issues.push({ code: "rule_tree_requires_review", severity: "blocking",
				message: "Fresh flat criteria differ from the recorded policy tree. Review the complete policy expression before republishing." });
		}
	}
	const keptRules = (stored.rules || []).filter((r) => !incomingRuleIds.has(r.id));
	merged.rules = [...keptRules, ...incoming.rules];
	if (merged.ruleTree) merged.rules = eligibilityRules(merged).map(({ type, ...rule }) => rule);
	if (!samePolicyValue("rules", stored.rules || [], merged.rules)) {
		deltas.push({ field: "rules", oldValue: semanticRules(stored.rules), newValue: semanticRules(merged.rules) });
	}
	const quoteIds = new Set(incoming.provenanceQuotes.map(q => q.ruleId));
	const keptQuotes = (stored.provenanceQuotes || []).filter((q) => !quoteIds.has(q.ruleId));
	merged.provenanceQuotes = [...keptQuotes, ...incoming.provenanceQuotes];

	// A partial extraction must not erase an earlier cited link through a later
	// whole-object assignment, after the tracked-field merge retained it.
	merged.officialLinks = { ...(stored.officialLinks || {}) };
	for (const [key, value] of Object.entries(incoming.officialLinks || {})) {
		if (!isEmpty(value)) merged.officialLinks[key] = value;
	}
	for (const k of ["officialTitle", "summary", "description", "tags", "sourceUrl", "sourceSite", "primarySourceId", "authorityTier", "sourceType", "applicationLink", "requiredDocuments"]) {
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
	const semanticCategory = classifySemanticChange(deltas, changeType);
	return { deltas, changeType, semanticCategory };
}

export function classifyFieldDeltas(deltas) {
	if (deltas.some((d) => d.field === "eligibility.familyIncome")) return "INCOME_CEILING_CHANGE";
	if (deltas.some((d) => d.field === "amount")) return "AWARD_UPDATE";
	if (deltas.some((d) => d.field === "rules" || d.field === "ruleTree" || d.field === "state" || d.field === "level" || d.field.startsWith("eligibility."))) return "CRITERIA_MODIFIED";
	if (deltas.some((d) => /link|Url/i.test(d.field))) return "LINK_UPDATED";
	return "FIELD_UPDATED";
}

/**
 * Classifies changes into standardized semantic categories:
 *   RELAXATION: Criteria broadened (income limit raised, minimum marks/CGPA lowered, eligible courses/categories expanded)
 *   RESTRICTION: Criteria narrowed (income limit lowered, minimum marks/CGPA increased, disability requirement tightened)
 *   DATE_EXTENSION: Cycle closing date extended without a criteria change
 *   MIXED_CHANGE: Known criteria expanded in some ways and narrowed in others
 *   PROCEDURAL_UPDATE: Application links, guidelines, official title/summary, or documents updated without eligibility restriction
 */
export function classifySemanticChange(deltas = [], changeType = "") {
	const changes = meaningfulPolicyDeltas(deltas);
	const criteria = changes.filter(delta => isEligibilityField(delta.field));
	const directions = new Set();
	let unknownDirection = false;
	for (const delta of criteria) {
		const { field, oldValue, newValue } = delta;
		if (["eligibility.familyIncome", "familyIncome"].includes(field)) {
			const before = typeof oldValue === "number" ? oldValue : oldValue?.max;
			const after = typeof newValue === "number" ? newValue : newValue?.max;
			if (Number.isFinite(before) && Number.isFinite(after) && before !== after) directions.add(after > before ? 1 : -1);
			else if (before === after && oldValue?.operator === "LT" && newValue?.operator === "LTE") directions.add(1);
			else if (before === after && oldValue?.operator === "LTE" && newValue?.operator === "LT") directions.add(-1);
			else unknownDirection = true;
		} else if (["eligibility.minCGPA", "minCGPA", "cgpa", "eligibility.percentage", "minPercentage", "percentage"].includes(field)) {
			if (Number.isFinite(oldValue) && Number.isFinite(newValue) && oldValue !== newValue) directions.add(newValue < oldValue ? 1 : -1);
			else unknownDirection = true;
		} else if (["eligibility.casteCategories", "casteCategories"].includes(field) && Array.isArray(oldValue) && Array.isArray(newValue) && oldValue.length && newValue.length) {
			if (newValue.some(value => !oldValue.includes(value))) directions.add(1);
			if (oldValue.some(value => !newValue.includes(value))) directions.add(-1);
		} else if (["eligibility.disabilityRequired", "disabilityRequired"].includes(field) && typeof oldValue === "boolean" && typeof newValue === "boolean") {
			directions.add(newValue ? -1 : 1);
		} else unknownDirection = true;
	}
	if (directions.size > 1) return "MIXED_CHANGE";
	// Unknown structural changes must never be described as a global expansion.
	if (criteria.length) return unknownDirection ? "PROCEDURAL_UPDATE" : directions.has(1) ? "RELAXATION" : directions.has(-1) ? "RESTRICTION" : "PROCEDURAL_UPDATE";
	const close = changes.find(delta => delta.field === "closesAt");
	if (close?.oldValue && close?.newValue) {
		if (new Date(close.newValue) > new Date(close.oldValue)) return "DATE_EXTENSION";
		if (new Date(close.newValue) < new Date(close.oldValue)) return "RESTRICTION";
	}
	// Award changes do not imply broader or narrower eligibility.
	return "PROCEDURAL_UPDATE";
}

/** A read projection: immutable stored history is kept intact for audit. */
export function publicPolicyVersion(version) {
	const original = Array.isArray(version.deltas) ? version.deltas : [];
	const deltas = meaningfulPolicyDeltas(original);
	const unchangedFields = [...new Set([...(version.unchangedFields || []), ...original.filter(delta => isComparablePolicyDelta(delta) && !deltas.includes(delta)).map(delta => delta.field)])];
	const comparisonIncomplete = Boolean(version.comparisonIncomplete || original.some(delta => !isComparablePolicyDelta(delta)));
	const routineRefresh = !comparisonIncomplete && Boolean(version.routineRefresh || (version.changeType !== "FIRST_OBSERVED" && version.changeType !== "NEW_CYCLE" && original.length > 0 && deltas.length === 0));
	let changeType = version.changeType;
	if (deltas.length) {
		const close = deltas.find(delta => delta.field === "closesAt");
		changeType = close && close.oldValue && close.newValue && !deltas.some(delta => isEligibilityField(delta.field))
			? new Date(close.newValue) > new Date(close.oldValue) ? "DEADLINE_EXTENSION" : "DEADLINE_SHORTENED"
			: classifyFieldDeltas(deltas);
	}
	const names = { amount: "Award terms", applicationLink: "Application website", "officialLinks.guidelinesUrl": "Guidelines document", "officialLinks.faqUrl": "FAQ document", "eligibility.familyIncome": "Annual family income", rules: "Eligibility criteria", ruleTree: "Eligibility routes", level: "Course level", state: "Domicile", closesAt: "Application deadline", opensAt: "Application opening date" };
	const datesOnly = deltas.length > 0 && deltas.every(delta => POLICY_DATE_FIELDS.has(delta.field));
	const summary = datesOnly ? changeType === "DEADLINE_EXTENSION" ? "Application deadline extended." : changeType === "DEADLINE_SHORTENED" ? "Application deadline moved earlier." : "Application and verification dates updated."
		: `${[...new Set(deltas.map(delta => names[delta.field] || delta.field.split(".").at(-1).replace(/([A-Z])/g, " $1")))].join(", ")} updated.`;
	return { ...version, deltas, unchangedFields, routineRefresh, comparisonIncomplete,
		...(Array.isArray(version.evidence) ? { relatedEvidence: relevantPolicyEvidence(version.evidence, deltas.flatMap(delta => delta.field === "rules" ? [...(Array.isArray(delta.oldValue) ? delta.oldValue : []), ...(Array.isArray(delta.newValue) ? delta.newValue : [])].map(rule => rule?.field).filter(field => typeof field === "string") : [delta.field])) } : {}),
		...(deltas.length ? { changeType, semanticCategory: classifySemanticChange(deltas, changeType) } : {}),
		...(deltas.length && (datesOnly || unchangedFields.length || /^Official values changed:/i.test(version.summary || "")) ? { summary } : {}),
	};
}
