import { formatFieldLabel, formatRuleRequirement } from "./formatEvidence.js";
import { POLICY_DATE_FIELDS, meaningfulPolicyDeltas, isEligibilityField, relevantPolicyEvidence, isComparablePolicyDelta } from "./policyValues.js";

const dateFields = POLICY_DATE_FIELDS;
const labels = {
	"eligibility.familyIncome": "Annual family income", familyIncome: "Annual family income",
	"eligibility.minCGPA": "Minimum CGPA", cgpa: "CGPA", minCGPA: "Minimum CGPA",
	"eligibility.percentage": "Minimum marks", percentage: "Marks", minPercentage: "Minimum marks",
	"eligibility.casteCategories": "Eligible categories", casteCategories: "Eligible categories",
	"eligibility.gender": "Gender", "eligibility.disabilityRequired": "Disability requirement",
	rules: "Eligibility criteria", ruleTree: "Eligibility routes", level: "Course level", state: "Domicile",
	amount: "Award amount", closesAt: "Application deadline", opensAt: "Applications open",
	latestPossibleClosesAt: "Alternative recorded deadline", defectiveVerificationUntil: "Correction deadline",
	instituteVerificationUntil: "Institution verification deadline", officerVerificationUntil: "Officer verification deadline",
	applicationLink: "Application website", "officialLinks.guidelinesUrl": "Guidelines document",
};
const money = (value, currency = "INR") => `${currency === "INR" ? "₹" : `${currency || "Currency not recorded"} `}${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 20 })}`;
export const policyFieldLabel = field => labels[field] || formatFieldLabel(String(field || "Recorded details").split(".").at(-1));

export function policyDate(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function treeText(node, depth = 0) {
	if (!node || depth >= 16) return "Policy details need review";
	if (node.type === "CONDITION") return `${formatFieldLabel(node.field)}: ${formatRuleRequirement(node)}`;
	if (node.type === "NOT") return `Must not meet (${treeText(node.child, depth + 1)})`;
	if (node.type === "CONDITIONAL_BRANCH") return `If (${treeText(node.condition, depth + 1)}), meet (${treeText(node.then, depth + 1)}); otherwise (${treeText(node.else, depth + 1)})`;
	if (!Array.isArray(node.children)) return "Policy details need review";
	return `(${node.children.map(child => treeText(child, depth + 1)).join(node.type === "OR" ? " OR " : " AND ")})`;
}

function formatPolicyAmount(value) {
	const period = { yearly: "per year", monthly: "per month", "one-time": "one-time", total: "over the full duration" };
	const describe = item => [Number.isFinite(item.value) ? money(item.value, item.currency === undefined ? value.currency === undefined ? "INR" : value.currency : item.currency) : null,
		period[item.period] || item.period || "(payment period not recorded)", Number.isFinite(item.months) ? `for ${item.months} months` : null,
		...(item === value ? [] : Object.entries(item).filter(([key, detail]) => !["value", "currency", "period", "months", "id", "_id"].includes(key) && detail != null).map(([key, detail]) => `${policyFieldLabel(key)}: ${formatPolicyValue(detail, key)}`)),
	].filter(Boolean).join(" ");
	const parts = [];
	if (Number.isFinite(value.value)) parts.push(describe(value));
	else {
		if (value.period) parts.push(`Payment period: ${period[value.period] || value.period}`);
		if (value.currency !== undefined && value.currency !== "INR") parts.push(`Currency: ${value.currency || "Not recorded"}`);
		if (Number.isFinite(value.months)) parts.push(`Paid for ${value.months} months`);
	}
	if (Array.isArray(value.options) && value.options.length) parts.push(`Rates: ${value.options.map(item => describe(item)).join("; ")}`);
	const wording = typeof value.displayString === "string" ? value.displayString.trim() : "";
	if (wording && !parts.includes(wording)) parts.push(parts.length ? `Award description: ${wording}` : wording);
	const extra = Object.entries(value).filter(([key, item]) => !["value", "currency", "period", "months", "options", "displayString", "_id", "id"].includes(key) && item != null);
	for (const [key, item] of extra) parts.push(`${policyFieldLabel(key)}: ${formatPolicyValue(item, key)}`);
	return parts.join("\n") || "Award details need review";
}

export function formatPolicyValue(value, field = "") {
	if (value == null || value === "") return "Not recorded";
	if (field === "ruleTree" && typeof value === "object") return treeText(value);
	if (value?.field && value?.operator) return formatRuleRequirement(value) || "Criterion needs review";
	if (dateFields.has(field)) return policyDate(value) || "Date needs review";
	if (Array.isArray(value)) return value.map(item => formatPolicyValue(item, field)).join("; ") || "None listed";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "object") {
		if (field.includes("familyIncome") && Number.isFinite(value.max)) return `${value.operator === "LT" ? "Below" : "Up to"} ${money(value.max)} / year`;
		if (field === "amount") {
			return formatPolicyAmount(value);
		}
		return Object.entries(value).filter(([key]) => !["_id", "id"].includes(key))
			.map(([key, item]) => `${policyFieldLabel(key)}: ${formatPolicyValue(item, key)}`).join("; ");
	}
	if (typeof value === "number") {
		if (field.includes("familyIncome") || field === "amount") return money(value);
		if (/percentage|marks/i.test(field)) return `${value}%`;
		if (/cgpa/i.test(field)) return `${value} CGPA`;
	}
	return String(value);
}

const ruleSignature = rule => JSON.stringify([rule?.field, rule?.operator,
	rule?.operator === "IN" && Array.isArray(rule.targetValue) ? [...rule.targetValue].sort() : rule?.targetValue]);

// Render changed leaves rather than dumping entire rule arrays as JSON. Preserve
// a separate structure row when AND/OR/NOT relationships change.
export function policyChangeRows(deltas = []) {
	const rows = meaningfulPolicyDeltas(deltas).flatMap((delta, index) => {
		if (delta.field !== "rules" || !Array.isArray(delta.oldValue) || !Array.isArray(delta.newValue)) return [{ ...delta, key: `${delta.field}-${index}` }];
		const keyed = rules => new Map(rules.map((rule, i) => [rule.id || `${rule.field}-${i}`, rule]));
		const before = keyed(delta.oldValue), after = keyed(delta.newValue);
		return [...new Set([...before.keys(), ...after.keys()])].flatMap(id => {
			const oldValue = before.get(id), newValue = after.get(id);
			if (ruleSignature(oldValue) === ruleSignature(newValue)) return [];
			return [{ key: `rule-${index}-${id}`, field: newValue?.field || oldValue?.field || "rules", oldValue, newValue }];
		});
	});
	// A pipeline event can contain both a normalized income-field delta and
	// the identical rule-array delta. Show that requirement only once.
	const seen = new Set();
	return rows.filter(row => {
		const signature = JSON.stringify([policyFieldLabel(row.field), formatPolicyValue(row.oldValue, row.field), formatPolicyValue(row.newValue, row.field)]);
		if (seen.has(signature)) return false;
		seen.add(signature); return true;
	});
}

export function policyUpdateSummary(version, rows = []) {
	if (version.changeType === "FIRST_OBSERVED") return "First recorded from the provider's source.";
	if (version.routineRefresh) return "No change to the recorded terms.";
	if (version.changeType === "NEW_CYCLE") return version.summary || "New application cycle recorded.";
	if (rows.length && rows.every(row => dateFields.has(row.field))) {
		const presentation = policyVersionPresentation(version, rows);
		return rows.length === 1 ? `${presentation.label}.` : "Application and verification dates updated.";
	}
	const summary = typeof version.summary === "string" ? version.summary.trim() : "";
	const filtered = version.unchangedFields?.length || (Array.isArray(version.deltas) && meaningfulPolicyDeltas(version.deltas).length !== version.deltas.length);
	if (filtered || !summary || /^Official values changed:/i.test(summary) || /\b(?:ruleTree|fieldEvidence|provenanceQuotes|eligibility\.)\b/.test(summary)) {
		const fields = [...new Set(rows.map(row => policyFieldLabel(row.field)))];
		return fields.length ? `${fields.slice(0, 3).join(", ")}${fields.length > 3 ? " and other details" : ""} updated.` : "Recorded scholarship details were updated.";
	}
	return summary;
}

// Preserve real changes even when the compact date label is the same calendar day.
export function formatPolicyRowValue(row, side) {
	const value = row[side];
	if (dateFields.has(row.field) && value != null && !policyDate(value)) return `Date needs review: ${String(value)}`;
	if (dateFields.has(row.field) && row.oldValue && row.newValue && policyDate(row.oldValue) === policyDate(row.newValue)) {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3, timeZone: "Asia/Kolkata", timeZoneName: "short" });
	}
	return formatPolicyValue(value, row.field);
}

export function policyVersionPresentation(version, rows) {
	if (version.changeType === "FIRST_OBSERVED") return { label: "First recorded", tone: "", criteriaChanged: false };
	if (version.changeType === "NEW_CYCLE") return { label: "New application cycle", tone: "is-extended", criteriaChanged: false };
	if (rows.length && rows.every(row => row.oldValue == null && row.newValue != null)) return {
		label: rows.every(row => dateFields.has(row.field)) ? "Application dates newly recorded" : "Details newly recorded", tone: "", criteriaChanged: false,
		note: "This adds previously unrecorded details. It does not establish when the provider changed its policy.",
	};
	const criteriaChanged = rows.some(row => isEligibilityField(row.field));
	if (criteriaChanged) {
		const labels = { RELAXATION: ["Eligibility expanded", "is-expanded"], RESTRICTION: ["Eligibility narrowed", "is-restricted"], MIXED_CHANGE: ["Eligibility changed in both directions", ""] };
		const [label, tone] = labels[version.semanticCategory] || ["Eligibility criteria changed", ""];
		return { label, tone, criteriaChanged };
	}
	if (rows.length && rows.every(row => dateFields.has(row.field))) {
		const close = rows.find(row => ["closesAt", "deadline"].includes(row.field));
		const before = new Date(close?.oldValue).getTime(), after = new Date(close?.newValue).getTime();
		const compared = close?.oldValue && close?.newValue && Number.isFinite(before) && Number.isFinite(after);
		return { label: compared ? after > before ? "Deadline extended" : "Deadline moved earlier" : "Application dates updated", tone: compared && after < before ? "is-restricted" : "is-extended", criteriaChanged: false,
			note: "This record changes application or verification dates. It contains no eligibility changes." };
	}
	if (rows.length && rows.every(row => row.field === "amount")) return { label: "Award terms updated", tone: "", criteriaChanged: false };
	return { label: rows.length ? "Scholarship details updated" : "Recorded update", tone: "", criteriaChanged: false };
}

export function policyHistoryEntries(history = []) {
	const entries = history.filter(version => version && !version.legacyUnverified).slice()
		.sort((a, b) => (new Date(b.observedAt).getTime() || 0) - (new Date(a.observedAt).getTime() || 0))
		.map(version => {
			const rows = policyChangeRows(Array.isArray(version.deltas) ? version.deltas : []);
			const complete = !version.comparisonIncomplete && Array.isArray(version.deltas) && version.deltas.every(isComparablePolicyDelta);
			const routine = complete && (version.routineRefresh || (version.changeType !== "FIRST_OBSERVED" && version.changeType !== "NEW_CYCLE" && version.deltas?.length > 0 && rows.length === 0));
			return { version, rows, routine };
		});
	return { changes: entries.filter(entry => !entry.routine), routine: entries.filter(entry => entry.routine) };
}

export function policyEvidence(evidence = [], fields = null) {
	const seen = new Set();
	return (fields ? relevantPolicyEvidence(evidence, fields) : evidence).filter(item => {
		if (typeof item?.quote !== "string" || !item.quote.trim()) return false;
		const key = JSON.stringify([item.quote, item.url || item.sourceUrl, item.page ?? null, item.locator ?? null]);
		if (seen.has(key)) return false;
		seen.add(key); return true;
	});
}
