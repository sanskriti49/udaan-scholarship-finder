// Persistence defaults are not policy changes. Keep this dependency-free module
// local to each deployable app; cross-runtime parity is tested.
export const POLICY_DATE_FIELDS = new Set(["opensAt", "closesAt", "latestPossibleClosesAt", "defectiveVerificationUntil", "instituteVerificationUntil", "officerVerificationUntil", "deadline", "applicationOpenDate"]);

function stable(value) {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid date" : value.toISOString();
	if (Array.isArray(value)) return value.map(stable);
	if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter(key => !["_id", "id"].includes(key)).map(key => [key, stable(value[key])]));
	return value ?? null;
}
const sorted = values => values.map(stable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const wording = value => typeof value === "string" ? value.normalize("NFC").replace(/\s+/g, " ").trim() : value ?? "";

function amount(value, option = false) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return value ?? null;
	const normalized = { ...value, value: value.value ?? null, period: value.period ?? null, months: value.months ?? null };
	if (!option) {
		normalized.currency = value.currency === undefined ? "INR" : value.currency;
		normalized.displayString = wording(value.displayString);
		normalized.options = value.options == null ? [] : Array.isArray(value.options) ? sorted(value.options.map(item => amount(item, true))) : value.options;
	}
	return stable(normalized);
}

function rule(value) {
	if (!value || typeof value !== "object") return value ?? null;
	return { field: value.field, operator: value.operator, targetValue: value.operator === "IN" && Array.isArray(value.targetValue) ? sorted([...new Set(value.targetValue)]) : value.targetValue };
}
function tree(value, depth = 0) {
	if (!value || typeof value !== "object" || depth > 16) return value ?? null;
	if (value.type === "CONDITION") return { type: value.type, ...rule(value) };
	if (value.type === "NOT") return { type: value.type, child: tree(value.child, depth + 1) };
	if (value.type === "CONDITIONAL_BRANCH") return { type: value.type, condition: tree(value.condition, depth + 1), then: tree(value.then, depth + 1), else: tree(value.else, depth + 1) };
	if (["AND", "OR"].includes(value.type) && Array.isArray(value.children)) return { type: value.type, children: sorted(value.children.map(child => tree(child, depth + 1))) };
	return stable(value);
}

export function canonicalPolicyValue(field, value) {
	if (value == null) return null;
	if ((field === "applicationLink" || field.startsWith("officialLinks.")) && typeof value === "string") return value.trim() || null;
	if (field === "amount") return amount(value);
	if (POLICY_DATE_FIELDS.has(field)) {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? stable(value) : date.toISOString();
	}
	if (field === "rules" && Array.isArray(value)) return sorted([...new Map(value.map(item => { const normalized = stable(rule(item)); return [JSON.stringify(normalized), normalized]; })).values()]);
	if (field === "ruleTree") return stable(tree(value));
	if (Array.isArray(value) && /(?:casteCategories|eligibleStreams|eligibleLevels)$/.test(field)) return sorted([...new Set(value)]);
	return stable(value);
}
export const samePolicyValue = (field, before, after) => JSON.stringify(canonicalPolicyValue(field, before)) === JSON.stringify(canonicalPolicyValue(field, after));
export const isComparablePolicyDelta = delta => Boolean(delta && typeof delta.field === "string" && delta.field && Object.hasOwn(delta, "oldValue") && Object.hasOwn(delta, "newValue") && delta.oldValue !== undefined && delta.newValue !== undefined);
export const meaningfulPolicyDeltas = (deltas = []) => deltas.filter(delta => isComparablePolicyDelta(delta) && !samePolicyValue(delta.field, delta.oldValue, delta.newValue));
export const relevantPolicyEvidence = (evidence, fields) => evidence.filter(item => !item?.field || fields.some(field =>
	typeof field === "string" && (field === item.field || field.endsWith(`.${item.field}`) || (item.field === "cycle" && POLICY_DATE_FIELDS.has(field)) || (item.field === "policy_tree" && field === "ruleTree"))));
export const isEligibilityField = field => /^(?:eligibility\.|rules$|ruleTree$|state$|level$|category$|familyIncome$|minCGPA$|cgpa$|percentage$|minPercentage$|casteCategories$|disabilityRequired$)/.test(field || "");

