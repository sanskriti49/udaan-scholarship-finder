import { evaluateEligibility, normalizeProfile } from "./ruleEvaluator.js";
import { RULE_FIELDS } from "./ruleSchema.js";
import { computeStatus } from "../pipeline/core/status.js";

const tiers = { passed: 0, unknown: 1, failed: 2 };
const labels = { passed: "Potentially eligible", unknown: "Needs verification", failed: "Known mismatch" };
const fields = {
	state: "domicile", educationLevel: "education level", stream: "course",
	casteCategory: "category", familyIncome: "income", cgpa: "CGPA",
	percentage: "marks", gender: "gender", hasDisability: "disability status",
};
const time = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).getTime() : Infinity;
const compareText = (a, b) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
const concise = text => text.length > 160 ? `${text.slice(0, 157)}…` : text;

export function hasDiscoveryProfile(rawProfile = {}) {
	const profile = normalizeProfile(rawProfile);
	return RULE_FIELDS.some(field => profile[field] != null && profile[field] !== "");
}

// Used when Mongo's text index is unavailable. No semantic services or LLM calls.
export function lexicalRelevance(scholarship, search = "") {
	const tokens = [...new Set(search.toLowerCase().split(/[\s-]+/).filter(Boolean))];
	return tokens.reduce((score, token) => score + [
		[scholarship.title, 10], [scholarship.organization, 6], [scholarship.tags?.join(" "), 5],
		[scholarship.category, 3], [scholarship.description, 1],
	].reduce((sum, [text, weight]) => sum + (String(text || "").toLowerCase().includes(token) ? weight : 0), 0), 0);
}

function describe(evaluation, cycle, personalized) {
	const reasons = [];
	if (evaluation.status === "failed") {
		for (const rule of evaluation.failedRules.slice(0, 2)) {
			reasons.push(fields[rule.field]
				? `Your recorded ${fields[rule.field]} does not meet this requirement: ${concise(rule.required)}.`
				: "Your profile does not satisfy a recorded eligibility route. Review the policy details.");
		}
	} else {
		const matched = [...new Set(evaluation.passedRules.filter(rule => rule.actual !== "Not specified" && fields[rule.field]).map(rule => fields[rule.field]))];
		if (personalized && matched.length) reasons.push(`Matches your recorded ${matched.slice(0, 3).join(", ")}.`);
		const missing = [...new Set(evaluation.unknownRules.filter(rule => fields[rule.field]).map(rule => fields[rule.field]))];
		if (missing.length) reasons.push(`${missing.slice(0, 3).join(", ").replace(/^./, c => c.toUpperCase())} information is missing.`);
		else if (evaluation.status === "unknown") reasons.push("Recorded eligibility rules are incomplete or need review.");
	}
	if (!personalized && !reasons.length) reasons.push("Add profile information to compare the recorded requirements.");
	if (cycle.status === "closed") reasons.push("The recorded application cycle has closed.");
	else if (!cycle.verified) reasons.push("Application dates need verification.");
	else if (cycle.status === "upcoming") reasons.push("The verified application window opens in the future.");
	return reasons.slice(0, 3);
}

/** Rank the complete filtered candidate set, then paginate. Policy status is the
 * evaluator's root result, never a count of failed leaves (OR/NOT matter).
 * Metadata scope and marketing categories never create eligibility conditions.
 */
export function rankDiscovery(candidates, { profile = {}, search = "", sort = "relevance", status = "active", page = 1, limit = 12, now = new Date() } = {}) {
	const personalized = hasDiscoveryProfile(profile);
	const wanted = new Set(String(status).split(","));
	const items = candidates.map(scholarship => {
		const live = scholarship.legacy
			? { status: scholarship.status || "unknown", reason: scholarship.statusReason, stale: scholarship.stale ?? true }
			: computeStatus(scholarship, now);
		const cycle = { ...live, verified: scholarship.verified === true && !scholarship.legacy && !live.stale && ["open", "closing_soon", "upcoming"].includes(live.status) };
		const evaluation = evaluateEligibility(profile, scholarship);
		const matched = new Set(evaluation.passedRules.filter(rule => rule.actual !== "Not specified").map(rule => rule.field));
		return { scholarship: { ...scholarship, status: live.status, statusReason: live.reason, stale: live.stale,
			discovery: { status: evaluation.status === "passed" ? "potentially_eligible" : evaluation.status === "failed" ? "known_mismatch" : "needs_verification",
				label: labels[evaluation.status], personalized, reasons: describe(evaluation, cycle, personalized),
				caveat: "Profile compatibility with recorded rules, not official confirmation of eligibility." } },
			tier: personalized ? tiers[evaluation.status] : 0,
			query: Number.isFinite(scholarship.score) ? scholarship.score : lexicalRelevance(scholarship, search),
			academic: Number(matched.has("educationLevel")) + Number(matched.has("stream")),
			domicile: Number(matched.has("state")), category: Number(matched.has("casteCategory")),
			cycle: live.status === "closed" ? 3 : cycle.verified ? live.status === "upcoming" ? 1 : 0 : 2,
			deadline: cycle.verified ? time(scholarship.currentCycle?.closesAt) : Infinity };
	}).filter(({ scholarship }) => {
		if (status === "all") return true;
		if (!status || status === "active") return scholarship.status !== "closed";
		return wanted.has(scholarship.status);
	});
	items.sort((a, b) => {
		let order = a.tier - b.tier;
		if (order) return order;
		const sa = a.scholarship, sb = b.scholarship;
		if (sort === "amount_high") order = (sb.amount?.value ?? -Infinity) - (sa.amount?.value ?? -Infinity);
		else if (sort === "amount_low") order = (sa.amount?.value ?? Infinity) - (sb.amount?.value ?? Infinity);
		else if (sort === "newest") order = (sa.freshness?.firstSeenAt ? -time(sa.freshness.firstSeenAt) : Infinity) - (sb.freshness?.firstSeenAt ? -time(sb.freshness.firstSeenAt) : Infinity);
		else if (sort === "trust") order = Number(sb.verified === true && !sb.stale) - Number(sa.verified === true && !sa.stale);
		else if (sort === "deadline") order = a.deadline - b.deadline;
		else if (sort === "relevance") order = b.query - a.query || (personalized ? b.academic - a.academic || b.domicile - a.domicile || b.category - a.category : 0);
		return order || a.cycle - b.cycle || a.deadline - b.deadline || compareText(sa.title, sb.title) || compareText(sa._id ?? sa.slug, sb._id ?? sb.slug);
	});
	const total = items.length;
	return { data: items.slice((page - 1) * limit, page * limit).map(item => {
		const { score, _isClosed, _noDeadline, _noAmount, ...scholarship } = item.scholarship;
		return scholarship;
	}), total, totalPages: Math.ceil(total / limit), currentPage: page, personalized };
}
