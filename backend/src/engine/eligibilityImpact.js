import { evaluateEligibility } from "./ruleEvaluator.js";

const semantic = rule => JSON.stringify([rule.field, rule.operator,
	rule.operator === "IN" && Array.isArray(rule.targetValue) ? [...rule.targetValue].sort() : rule.targetValue]);
const checks = result => new Map([
	...result.passedRules.map(r => [r.ruleId, { ...r, status: "passed", required: r.condition }]),
	...result.failedRules.map(r => [r.ruleId, { ...r, status: "failed" }]),
	...result.unknownRules.map(r => [r.ruleId, { ...r, status: "unknown" }]),
]);
const brief = r => ({ ruleId: r.ruleId, field: r.field, requirement: r.required, description: r.description });

// Evaluate the same saved profile twice; a profile edit alone is never a scheme change.
export function explainEligibilityImpact(profile, previous, current) {
	const before = evaluateEligibility(profile, previous.snapshot);
	const after = evaluateEligibility(profile, current.snapshot);
	const oldChecks = checks(before), newChecks = checks(after);
	const oldRules = new Map(previous.snapshot.rules.map(r => [r.id, r]));
	const changes = [];
	for (const rule of current.snapshot.rules) {
		const old = oldRules.get(rule.id);
		if (old && semantic(old) === semantic(rule)) continue;
		const a = oldChecks.get(rule.id), b = newChecks.get(rule.id);
		if (!b || a?.status === b.status || (!a && b.status === "passed")) continue;
		const oldEvidence = previous.evidence.find(e => e.ruleId === rule.id) || null;
		const newEvidence = current.evidence.find(e => e.ruleId === rule.id);
		changes.push({ ruleId: rule.id, field: rule.field, oldRequirement: a?.required || "No recorded requirement",
			newRequirement: b.required, previousStatus: a?.status || "not_recorded", currentStatus: b.status,
			profileValue: b.actual, oldEvidence, newEvidence });
	}
	if (!changes.length) return null;
	return { changes, remainingUnknown: after.unknownRules.map(brief), remainingFailed: after.failedRules.map(brief),
		previousVersionId: String(previous.id || previous._id), currentVersionId: String(current.id || current._id),
		profileUpdatedAt: profile.updatedAt || null,
		assessedAt: new Date().toISOString(),
		caveat: "This checks recorded criteria against your saved profile. Other provider conditions may apply; it does not confirm an award." };
}

export function eligibilityImpactMessage(impact) {
	const first = impact.changes[0];
	const outcome = first.currentStatus === "passed" ? "this criterion now passes" : first.currentStatus === "failed" ? "this criterion no longer passes" : "more profile information is needed to check this criterion";
	const unknown = impact.remainingUnknown.length;
	return `${first.oldRequirement} → ${first.newRequirement}. With your saved answer (${first.profileValue}), ${outcome}. ${impact.changes.length > 1 ? `${impact.changes.length - 1} other checks changed. ` : ""}${unknown} ${unknown === 1 ? "check still needs" : "checks still need"} review; ${impact.remainingFailed.length} recorded criteria do not pass. Confirm the provider's current instructions.`;
}
