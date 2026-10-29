import { STATE_ALIASES } from "./stateVocabulary.js";
/**
 * Deterministic Rule Evaluator for Udaan
 * Evaluates recursive policy trees using Kleene three-state logic.
 * Legacy flat rules are an implicit AND; absent criteria stay unknown.
 * Returns explicit pass/fail breakdowns, ineligibility reasons, document audit, and source citations.
 */
import { isCitedDocument } from "../pipeline/core/requiredDocuments.js";
import { conditionSchema, ruleTreeSchema, ruleTreeLeaves } from "./ruleSchema.js";

export function optionalNumber(value) {
	if (value == null || (typeof value === "string" && !value.trim())) return null;
	if (typeof value !== "string" && typeof value !== "number") return null;
	const number = Number(value);
	return Number.isFinite(number) && number >= 0 ? number : null;
}

function optionalBoolean(value) {
	if (value === true || value === "true") return true;
	if (value === false || value === "false") return false;
	return null;
}

function optionalText(value) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeProfile(rawProfile = {}) {
	const state = optionalText(rawProfile.state);
	return {
		fullName: rawProfile.fullName || "",
		educationLevel: rawProfile.educationLevel || rawProfile.level || "",
		stream:
			rawProfile.stream ||
			rawProfile.courseStream ||
			rawProfile.eligibleStreams ||
			"",
		familyIncome: optionalNumber(rawProfile.familyIncome !== undefined ? rawProfile.familyIncome : rawProfile.income),
		gender: rawProfile.gender === "Any" ? null : optionalText(rawProfile.gender),
		casteCategory: optionalText(
			rawProfile.casteCategory ||
			rawProfile.caste_category ||
			rawProfile.category ||
			null),
		// "All India" is a national-catalogue selection, not a student's domicile.
		state: state?.toLowerCase() === "all india" ? null : state,
		cgpa: optionalNumber(rawProfile.cgpa),
		percentage: optionalNumber(rawProfile.percentage),
		hasDisability: optionalBoolean(rawProfile.hasDisability !== undefined ? rawProfile.hasDisability : rawProfile.disabilityRequired),
		documentsHeld: Array.isArray(rawProfile.documentsHeld)
			? rawProfile.documentsHeld
			: [],
	};
}

export function formatRequirement(field, operator, target) {
	if (String(target).toLowerCase() === "any" || String(target).toLowerCase() === "all") {
		return "Open to all applicants";
	}

	switch (field) {
		case "familyIncome":
			return `Annual family income ${{ LT: "below", LTE: "≤", GTE: "≥", EQ: "=" }[operator] || operator} ₹${Number(target).toLocaleString("en-IN")}`;
		case "cgpa":
			return `CGPA ${{ LT: "<", LTE: "≤", GTE: "≥", EQ: "=" }[operator] || operator} ${target}`;
		case "percentage":
			return `Marks ${{ LT: "<", LTE: "≤", GTE: "≥", EQ: "=" }[operator] || operator} ${target}%`;
		case "educationLevel": {
			const levels = Array.isArray(target) ? target.join(" or ") : target;
			return `${levels} degree required`;
		}
		case "gender":
			return `Restricted to ${target} candidates only`;
		case "casteCategory": {
			const cats = Array.isArray(target) ? target.join(", ") : target;
			return `Quota categories: ${cats}`;
		}
		case "state":
			return `${target} permanent domicile required`;
		case "hasDisability":
			return target ? "Documented PwD status required" : "Applicants without PwD status";
		case "stream": {
			const streams = Array.isArray(target) ? target.join(", ") : target;
			return `Enrolled in ${streams}`;
		}
		default:
			return `${operator} ${Array.isArray(target) ? target.join(", ") : target}`;
	}
}

export function formatActualValue(field, actual) {
	if (actual === undefined || actual === null || actual === "" || Number.isNaN(actual)) return "Not specified";
	switch (field) {
		case "familyIncome":
			return `₹${Number(actual).toLocaleString("en-IN")}`;
		case "cgpa":
			return `${actual} CGPA`;
		case "percentage":
			return `${actual}%`;
		case "hasDisability":
			return actual ? "Yes (PwD)" : "No";
		default:
			return String(actual);
	}
}

function evaluateCondition(actual, operator, target, field) {
	if (actual === undefined || actual === null || Number.isNaN(actual)) {
		return { result: false, missingActual: true };
	}

	if (target === undefined || target === null || target === "" || (typeof target === "number" && Number.isNaN(target))) {
		return { result: false, invalidTarget: true };
	}

	const targetStr = String(target).trim().toLowerCase();
	const actualStr = String(actual).trim().toLowerCase();

	// Universal wildcard rule: "Any", "All", or "*" imposes NO restriction
	if (targetStr === "any" || targetStr === "all" || targetStr === "*") {
		return { result: true };
	}

	// State / Domicile wildcard: "All India" matches any resident
	if (field === "state" && targetStr === "all india") {
		return { result: true };
	}

	const normActual = field === "state" ? STATE_ALIASES[actualStr] || actualStr : actualStr;
	const normTarget = field === "state" ? STATE_ALIASES[targetStr] || targetStr : targetStr;

	switch (operator) {
		case "LT": {
			const numA = Number(actual);
			const numT = Number(target);
			if (Number.isNaN(numA) || Number.isNaN(numT)) return { result: false };
			return { result: numA < numT };
		}
		case "LTE": {
			const numA = Number(actual);
			const numT = Number(target);
			if (Number.isNaN(numA) || Number.isNaN(numT)) return { result: false };
			return { result: numA <= numT };
		}
		case "GTE": {
			const numA = Number(actual);
			const numT = Number(target);
			if (Number.isNaN(numA) || Number.isNaN(numT)) return { result: false };
			return { result: numA >= numT };
		}
		case "EQ":
			return { result: normActual === normTarget };
		case "IN": {
			const targetArr = Array.isArray(target) ? target : [target];
			const hasWildcard = targetArr.some((t) => {
				const s = String(t).trim().toLowerCase();
				return s === "any" || s === "all" || s === "*" || (field === "state" && s === "all india");
			});
			if (hasWildcard) return { result: true };
			return {
				result: targetArr.some((t) => {
					const s = String(t).trim().toLowerCase();
					const normT = field === "state" ? STATE_ALIASES[s] || s : s;
					return normT === normActual;
				}),
			};
		}
		case "BOOLEAN_MATCH":
			return { result: actual === target };
		default:
			return { result: false };
	}
}

export function describeRuleTree(node) {
	if (node.type === "CONDITION") return formatRequirement(node.field, node.operator, node.targetValue);
	if (node.type === "NOT") return `Must not satisfy (${describeRuleTree(node.child)})`;
	if (node.type === "CONDITIONAL_BRANCH") return `If (${describeRuleTree(node.condition)}), then (${describeRuleTree(node.then)}); otherwise (${describeRuleTree(node.else)})`;
	return `(${node.children.map(describeRuleTree).join(node.type === "AND" ? " AND " : " OR ")})`;
}

const unknownCheck = (ruleId, description, reason) => ({ ruleId, field: "eligibility", description,
	required: "Check the provider's current instructions", actual: "Not verified", citation: null, status: "unknown", reason });
const combineAnd = states => states.includes("failed") ? "failed" : states.includes("unknown") ? "unknown" : "passed";
const combineOr = states => states.includes("passed") ? "passed" : states.includes("unknown") ? "unknown" : "failed";

function leafResult(rawRule, profile, provenanceMap) {
	// Mongoose legacy subdocuments contain storage metadata. Only policy fields
	// cross into the condition schema; explicit trees are validated strictly whole.
	const input = { type: "CONDITION" };
	for (const key of ["id", "field", "operator", "targetValue", "description", "failMessage", "isMandatory"]) {
		if (rawRule?.[key] !== undefined) input[key] = rawRule[key];
	}
	const parsed = conditionSchema.safeParse(input);
	if (!parsed.success) {
		const check = unknownCheck(rawRule?.id || "invalid_rule", "This recorded criterion needs review", "invalid_rule");
		return { status: "unknown", checks: [check], allChecks: [check], score: 0,
			trace: { type: "CONDITION", id: check.ruleId, status: "unknown", check } };
	}
	const rule = parsed.data;
	const actualValue = profile[rule.field];
	const targets = Array.isArray(rule.targetValue) ? rule.targetValue : [rule.targetValue];
	const unrestricted = targets.some(v => typeof v === "string" &&
		(["any", "all", "*"].includes(v.toLowerCase()) || (rule.field === "state" && v.toLowerCase() === "all india")));
	const missing = actualValue == null || actualValue === "" || Number.isNaN(actualValue);
	const status = unrestricted ? "passed" : missing ? "unknown" :
		evaluateCondition(actualValue, rule.operator, rule.targetValue, rule.field).result ? "passed" : "failed";
	const requirement = unrestricted ? "Open to all applicants" : formatRequirement(rule.field, rule.operator, rule.targetValue);
	const check = { ruleId: rule.id, field: rule.field, description: rule.description || requirement,
		required: requirement, condition: requirement, actual: formatActualValue(rule.field, actualValue),
		citation: provenanceMap.get(rule.id) || null, status,
		...(status === "failed" ? { failMessage: rule.failMessage || `Your ${rule.field} (${formatActualValue(rule.field, actualValue)}) does not meet the requirement: ${requirement}` } : {}),
	};
	return { status, checks: [check], allChecks: [check], score: status === "passed" ? 1 : 0,
		trace: { type: "CONDITION", id: rule.id, status, check } };
}

function evaluateNode(node, profile, provenanceMap, path = "root") {
	if (node.type === "CONDITION") return leafResult(node, profile, provenanceMap);
	const evaluate = (child, suffix) => evaluateNode(child, profile, provenanceMap, `${path}.${suffix}`);
	const syntheticCheck = status => ({ ruleId: node.id || `logic:${path}`, field: "eligibility", status,
		description: node.description || describeRuleTree(node), required: describeRuleTree(node), condition: describeRuleTree(node),
		actual: "Compared with your profile", citation: null,
		...(status === "failed" ? { failMessage: `Your profile does not satisfy: ${describeRuleTree(node)}` } : {}),
	});
	let status, checks, score, allChecks, trace;
	if (node.type === "NOT") {
		const child = evaluate(node.child, "child");
		status = child.status === "unknown" ? "unknown" : child.status === "passed" ? "failed" : "passed";
		checks = [syntheticCheck(status)]; allChecks = child.allChecks;
		score = status === "passed" ? 1 : 0;
		trace = { child: child.trace };
	} else if (node.type === "CONDITIONAL_BRANCH") {
		const condition = evaluate(node.condition, "condition"), yes = evaluate(node.then, "then"), no = evaluate(node.else, "else");
		const selected = condition.status === "passed" ? yes : condition.status === "failed" ? no : null;
		status = selected ? selected.status : yes.status === no.status ? yes.status : "unknown";
		checks = selected ? selected.checks : yes.status === no.status ? [...yes.checks, ...no.checks] : [syntheticCheck("unknown")];
		score = selected ? selected.score : Math.min(yes.score, no.score);
		allChecks = [condition, yes, no].flatMap(r => r.allChecks);
		trace = { condition: condition.trace, then: yes.trace, else: no.trace,
			selectedBranch: selected === yes ? "then" : selected === no ? "else" : null };
	} else {
		const children = node.children.map((child, i) => evaluate(child, i));
		status = (node.type === "AND" ? combineAnd : combineOr)(children.map(c => c.status));
		// A passing OR needs one proof. For an unknown OR, failed alternatives
		// cannot be presented as disqualifiers. All branches remain in the trace.
		const relevant = node.type === "AND" || status === "failed" ? children : status === "passed"
			? [children.find(c => c.status === "passed")] : children.filter(c => c.status === "unknown");
		checks = relevant.flatMap(c => c.checks); allChecks = children.flatMap(c => c.allChecks);
		score = node.type === "AND" ? children.reduce((sum, c) => sum + c.score, 0) / children.length : Math.max(...children.map(c => c.score));
		trace = { children: children.map(c => c.trace) };
	}
	return { status, checks, allChecks, score, trace: { type: node.type, id: node.id || `logic:${path}`, description: node.description, status, ...trace } };
}

export function evaluateEligibility(rawProfile, scholarship) {
	const profile = normalizeProfile(rawProfile);
	const provenanceMap = new Map();

	if (Array.isArray(scholarship.provenanceQuotes)) {
		for (const quote of scholarship.provenanceQuotes) {
			if (quote.ruleId) provenanceMap.set(quote.ruleId, quote);
		}
	}

	let result;
	if (scholarship.ruleTree != null) {
		const parsed = ruleTreeSchema.safeParse(scholarship.ruleTree);
		if (parsed.success) result = evaluateNode(parsed.data, profile, provenanceMap);
		else {
			const check = unknownCheck("invalid_rule_tree", "The recorded policy tree needs review", "invalid_rule_tree");
			result = { status: "unknown", checks: [check], allChecks: [check], score: 0,
				trace: { type: "INVALID", status: "unknown", check } };
		}
	} else {
		const rules = eligibilityRules(scholarship);
		if (rules.length) result = evaluateNode({ type: "AND", children: rules.map(r => ({ ...r, type: "CONDITION" })) }, profile, provenanceMap);
		else {
			const check = unknownCheck("criteria_not_recorded", "Eligibility criteria have not been recorded", "criteria_not_recorded");
			result = { status: "unknown", checks: [check], allChecks: [check], score: 0,
				trace: { type: "UNRECORDED", status: "unknown", check } };
		}
	}
	if (scholarship.dataQuality?.unknownFields?.includes("eligibility")) {
		const check = unknownCheck("official_manual_review", "Review additional official course, merit and application conditions", "manual_review");
		result.status = combineAnd([result.status, "unknown"]);
		result.checks.push(check); result.allChecks.push(check);
		result.score *= result.checks.length > 1 ? (result.checks.length - 1) / result.checks.length : 0;
		result.trace = { type: "AND", id: "policy_with_manual_review", status: result.status,
			children: [result.trace, { type: "MANUAL_REVIEW", status: "unknown", check }] };
	}
	const passedRules = result.checks.filter(r => r.status === "passed");
	const failedRules = result.checks.filter(r => r.status === "failed");
	const unknownRules = result.checks.filter(r => r.status === "unknown");
	const isEligible = result.status === "passed";
	const matchConfidence = isEligible ? 100 : Math.min(99, Math.round(result.score * 100));

	// Document Readiness Audit
	const DOC_CODE_ALIASES = {
		ADMISSION_PROOF: ["COLLEGE_ID", "ADMISSION_PROOF", "BONAFIDE_CERT", "FEE_RECEIPT"],
		BONAFIDE_CERT: ["COLLEGE_ID", "BONAFIDE_CERT", "ADMISSION_PROOF"],
		COLLEGE_ID: ["COLLEGE_ID", "ADMISSION_PROOF", "BONAFIDE_CERT"],
		AADHAAR: ["AADHAAR", "AADHAAR_CARD", "ID_PROOF"],
		INCOME_CERT: ["INCOME_CERT", "INCOME_CERTIFICATE"],
		MARKSHEET: ["MARKSHEET", "PREV_MARKSHEET", "10TH_MARKSHEET", "12TH_MARKSHEET"],
		BANK_PASSBOOK: ["BANK_PASSBOOK", "BANK_ACCOUNT", "BANK_STATEMENT"],
		CASTE_CERT: ["CASTE_CERT", "CASTE_CERTIFICATE", "COMMUNITY_CERT"],
		DOMICILE_CERT: ["DOMICILE_CERT", "DOMICILE_CERTIFICATE", "RESIDENCE_CERT"],
		DISABILITY_CERT: ["DISABILITY_CERT", "DISABILITY_CERTIFICATE", "UDID_CARD"],
	};

	const listedDocs = Array.isArray(scholarship.requiredDocuments)
		? scholarship.requiredDocuments
		: [];
	const requiredDocs = listedDocs.filter((doc) => isCitedDocument(doc) && doc.mandatory === true);
	const studentDocs = new Set(
		profile.documentsHeld.map((d) => String(d).toUpperCase()),
	);

	const documentAudit = {
		total: requiredDocs.length,
		heldCount: 0,
		missingCount: 0,
		held: [],
		missing: [],
		percentage: null,
		requirementsVerified: requiredDocs.length > 0,
		suggestions: listedDocs.filter((doc) => !isCitedDocument(doc)),
	};

	for (const doc of requiredDocs) {
		const targetCode = doc.code ? doc.code.toUpperCase() : "";
		const aliases = DOC_CODE_ALIASES[targetCode] || [targetCode];
		const isHeld = aliases.some((c) => studentDocs.has(c));
		if (isHeld) {
			documentAudit.heldCount++;
			documentAudit.held.push(doc);
		} else {
			documentAudit.missingCount++;
			documentAudit.missing.push(doc);
		}
	}

	if (requiredDocs.length > 0) {
		documentAudit.percentage = Math.round(
			(documentAudit.heldCount / requiredDocs.length) * 100,
		);
	}

	// Composite readiness: 60% match confidence + 40% document readiness
	const compositeReadiness = documentAudit.percentage === null ? matchConfidence : Math.round(
		matchConfidence * 0.6 + documentAudit.percentage * 0.4,
	);

	return {
		isEligible,
		status: result.status,
		evaluationTree: result.trace,
		ruleResults: result.allChecks,
		matchConfidence,
		documentReadiness: documentAudit.percentage,
		readinessScore: compositeReadiness,
		passedRules,
		failedRules,
		unknownRules,
		documentAudit,
	};
}

export function eligibilityRules(scholarship) {
	if (scholarship.ruleTree != null) {
		const parsed = ruleTreeSchema.safeParse(scholarship.ruleTree);
		return parsed.success ? ruleTreeLeaves(parsed.data) : [];
	}
	return Array.isArray(scholarship.rules) && scholarship.rules.length > 0 ? scholarship.rules : buildFallbackRules(scholarship);
}

function buildFallbackRules(scholarship) {
	const rules = [];
	const elig = scholarship.eligibility || {};

	if (elig.familyIncome && elig.familyIncome.max != null) {
		rules.push({
			id: "rule_income",
			field: "familyIncome",
			operator: elig.familyIncome.operator === "LT" ? "LT" : "LTE",
			targetValue: elig.familyIncome.max,
			isMandatory: true,
			description: `Annual family income must ${elig.familyIncome.operator === "LT" ? "be below" : "not exceed"} ₹${elig.familyIncome.max.toLocaleString("en-IN")}`,
			failMessage: `Family income exceeds allowed ceiling of ₹${elig.familyIncome.max.toLocaleString("en-IN")}`,
		});
	}

	if (elig.gender && elig.gender !== "Any") {
		rules.push({
			id: "rule_gender",
			field: "gender",
			operator: "EQ",
			targetValue: elig.gender,
			isMandatory: true,
			description: `Open to ${elig.gender} candidates only`,
			failMessage: `Scheme is restricted to ${elig.gender} students only`,
		});
	}

	if (elig.minCGPA) {
		rules.push({
			id: "rule_cgpa",
			field: "cgpa",
			operator: "GTE",
			targetValue: elig.minCGPA,
			isMandatory: true,
			description: `Minimum CGPA of ${elig.minCGPA}`,
			failMessage: `CGPA is below the minimum requirement of ${elig.minCGPA}`,
		});
	}

	if (elig.casteCategories && elig.casteCategories.length > 0) {
		rules.push({
			id: "rule_caste",
			field: "casteCategory",
			operator: "IN",
			targetValue: elig.casteCategories,
			isMandatory: true,
			description: `Quota categories: ${elig.casteCategories.join(", ")}`,
			failMessage: `Candidate category not within eligible groups (${elig.casteCategories.join(", ")})`,
		});
	}

	// Catalogue jurisdiction is not a domicile eligibility condition. Residence
	// restrictions must be recorded in explicit rules or a policy tree.

	if (scholarship.level) {
		rules.push({
			id: "rule_level",
			field: "educationLevel",
			operator: "EQ",
			targetValue: scholarship.level,
			isMandatory: true,
			description: `Degree level required: ${scholarship.level}`,
			failMessage: `Education level must be ${scholarship.level}`,
		});
	}

	return rules;
}
