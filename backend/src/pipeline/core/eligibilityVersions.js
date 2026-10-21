import { sha256 } from "./http.js";
import { verifyEvidence } from "./evidence.js";
import { eligibilityRules } from "../../engine/ruleEvaluator.js";
import { ruleTreeSchema, semanticRuleTree } from "../../engine/ruleSchema.js";

const serialize = (value) => JSON.parse(JSON.stringify(value));
const canonical = (value) => {
	if (Array.isArray(value)) return value.map(canonical);
	if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
	return value ?? null;
};

export function eligibilitySnapshot(record) {
	return serialize({ rules: eligibilityRules(record), ...(record.ruleTree != null ? { ruleTree: ruleTreeSchema.parse(record.ruleTree) } : {}), provenanceQuotes: record.provenanceQuotes || [],
		eligibility: record.eligibility || {}, state: record.state, level: record.level,
		dataQuality: { unknownFields: record.dataQuality?.unknownFields || [] } });
}

export function ruleContentHash(snapshot) {
	const rules = snapshot.rules.map(({ id, field, operator, targetValue }) => ({ id, field, operator,
		targetValue: operator === "IN" && Array.isArray(targetValue) ? [...targetValue].sort() : targetValue })).sort((a, b) => a.id.localeCompare(b.id));
	return sha256(JSON.stringify(canonical({ rules, ...(snapshot.ruleTree != null ? { ruleTree: semanticRuleTree(snapshot.ruleTree) } : {}), manualReview: snapshot.dataQuality?.unknownFields?.includes("eligibility") === true })));
}

export async function checkedRuleEvidence(snapshot, store) {
	const evidence = [];
	// Leaf excerpts alone cannot establish how alternatives/negations are joined.
	// Tree versions also need an excerpt covering the overall policy expression.
	if (snapshot.ruleTree != null) {
		const quote = snapshot.provenanceQuotes.find(q => q.ruleId === "policy_tree");
		if (!quote?.quote?.trim() || !quote.snapshotId || !/^https?:\/\//i.test(quote.sourceUrl || "")) return null;
		const source = await store.getSnapshot(String(quote.snapshotId));
		const fullPolicy = snapshot._fieldEvidence?.find(e => e.field === "eligibility" &&
			String(e.snapshotId) === String(quote.snapshotId) && e.quote === quote.quote && e.url === quote.sourceUrl);
		if (!source || !fullPolicy || !verifyEvidence(fullPolicy, source).ok) return null;
		evidence.push({ ...fullPolicy, ruleId: "policy_tree" });
	}
	for (const rule of snapshot.rules) {
		const quote = snapshot.provenanceQuotes.find(q => q.ruleId === rule.id);
		if (!quote?.quote?.trim() || !quote.snapshotId || !/^https?:\/\//i.test(quote.sourceUrl || "")) return null;
		const source = await store.getSnapshot(String(quote.snapshotId));
		const fields = { educationLevel: ["level", "educationLevel"], hasDisability: ["disabilityRequired", "minDisabilityPercent", "hasDisability"],
			casteCategory: ["casteGroups", "casteCategories", "casteCategory"], cgpa: ["minCGPA", "cgpa"], percentage: ["minPercentage", "percentage"] };
		const fieldEvidence = snapshot._fieldEvidence?.find(e => (fields[rule.field] || [rule.field]).includes(e.field) &&
			String(e.snapshotId) === String(quote.snapshotId) && e.quote === quote.quote && e.url === quote.sourceUrl);
		if (!source || !fieldEvidence || !verifyEvidence(fieldEvidence, source).ok) return null;
		evidence.push({ ...fieldEvidence, ruleId: rule.id });
	}
	return snapshot.rules.length ? evidence : null;
}

async function insertVersion(record, previous, store, at, allowAlerts) {
	const snapshot = eligibilitySnapshot(record);
	const evidence = await checkedRuleEvidence({ ...snapshot, _fieldEvidence: serialize(record.fieldEvidence || []) }, store);
	const contentHash = ruleContentHash(snapshot);
	return store.addEligibilityVersion({ scholarship: record.id, schemeKey: record.schemeKey,
		versionKey: sha256(`${record.schemeKey}|${previous?.id || "initial"}|${contentHash}`), contentHash,
		previousVersion: previous?.id || null, snapshot, evidence: evidence || [], verified: Boolean(evidence), observedAt: at,
		alert: { status: allowAlerts && evidence && previous?.verified ? "pending" : "none" } });
}

// Insert the durable event before publishing the record pointer. A failed save can
// be retried with the same versionKey; the relay only handles committed pointers.
export async function prepareEligibilityVersion(record, existing, store, at, allowAlerts) {
	let previous = existing?.eligibilityVersion ? await store.getEligibilityVersion(String(existing.eligibilityVersion)) : null;
	if (!previous && existing && !existing.legacy && !existing.adoptedFromLegacy) {
		previous = await insertVersion(existing, null, store, at, false);
	}
	if (previous && previous.contentHash === ruleContentHash(eligibilitySnapshot(record))) {
		if (previous.verified || !(await checkedRuleEvidence({ ...eligibilitySnapshot(record), _fieldEvidence: serialize(record.fieldEvidence || []) }, store))) return previous;
	}
	return insertVersion(record, previous, store, at, allowAlerts);
}
