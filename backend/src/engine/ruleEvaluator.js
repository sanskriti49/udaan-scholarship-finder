/**
 * Deterministic Rule Evaluator for Udaan
 * Evaluates student profiles against scholarship rule trees with zero hallucination.
 * Returns explicit pass/fail breakdowns, ineligibility reasons, document audit, and source citations.
 */

export function normalizeProfile(rawProfile = {}) {
	return {
		fullName: rawProfile.fullName || "",
		educationLevel: rawProfile.educationLevel || rawProfile.level || "",
		stream:
			rawProfile.stream ||
			rawProfile.courseStream ||
			rawProfile.eligibleStreams ||
			"",
		familyIncome: Number(
			rawProfile.familyIncome !== undefined
				? rawProfile.familyIncome
				: rawProfile.income !== undefined
					? rawProfile.income
					: NaN,
		),
		gender: rawProfile.gender || "Any",
		casteCategory:
			rawProfile.casteCategory ||
			rawProfile.caste_category ||
			rawProfile.category ||
			"General",
		state: rawProfile.state || "All India",
		cgpa: Number(rawProfile.cgpa !== undefined ? rawProfile.cgpa : NaN),
		percentage: Number(
			rawProfile.percentage !== undefined ? rawProfile.percentage : NaN,
		),
		hasDisability: Boolean(
			rawProfile.hasDisability || rawProfile.disabilityRequired,
		),
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
			return `Annual family income ≤ ₹${Number(target).toLocaleString("en-IN")}`;
		case "cgpa":
			return `Minimum ${target} CGPA`;
		case "percentage":
			return `Minimum ${target}% marks`;
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
			return "Documented PwD status required";
		case "stream": {
			const streams = Array.isArray(target) ? target.join(", ") : target;
			return `Enrolled in ${streams}`;
		}
		default:
			return `${operator} ${Array.isArray(target) ? target.join(", ") : target}`;
	}
}

export function formatActualValue(field, actual) {
	if (actual === undefined || actual === null || actual === "") return "Not specified";
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

function evaluateCondition(actual, operator, target) {
	if (actual === undefined || actual === null || Number.isNaN(actual)) {
		return { result: false, missingActual: true };
	}

	const targetStr = String(target).trim().toLowerCase();
	const actualStr = String(actual).trim().toLowerCase();

	// Universal wildcard rule: "Any", "All", or "*" imposes NO restriction
	if (targetStr === "any" || targetStr === "all" || targetStr === "*") {
		return { result: true };
	}

	// State / Domicile wildcard: "All India" matches any resident
	if (targetStr === "all india" || actualStr === "all india") {
		return { result: true };
	}

	switch (operator) {
		case "LTE":
			return { result: Number(actual) <= Number(target) };
		case "GTE":
			return { result: Number(actual) >= Number(target) };
		case "EQ":
			return { result: actualStr === targetStr };
		case "IN": {
			const targetArr = Array.isArray(target) ? target : [target];
			const hasWildcard = targetArr.some((t) => {
				const s = String(t).trim().toLowerCase();
				return s === "any" || s === "all" || s === "*" || s === "all india";
			});
			if (hasWildcard) return { result: true };
			return {
				result: targetArr.some(
					(t) => String(t).trim().toLowerCase() === actualStr,
				),
			};
		}
		case "BOOLEAN_MATCH":
			return { result: Boolean(actual) === Boolean(target) };
		default:
			return { result: false };
	}
}

export function evaluateEligibility(rawProfile, scholarship) {
	const profile = normalizeProfile(rawProfile);
	const provenanceMap = new Map();

	if (Array.isArray(scholarship.provenanceQuotes)) {
		for (const quote of scholarship.provenanceQuotes) {
			if (quote.ruleId) provenanceMap.set(quote.ruleId, quote);
		}
	}

	let rules = Array.isArray(scholarship.rules) && scholarship.rules.length > 0
		? scholarship.rules
		: buildFallbackRules(scholarship);

	// Filter out bogus unconstrained rules (e.g. targetValue: "Any" or "All")
	rules = rules.filter((r) => {
		const t = String(r.targetValue).trim().toLowerCase();
		return t !== "any" && t !== "all" && t !== "*";
	});

	const passedRules = [];
	const failedRules = [];
	const unknownRules = [];

	for (const rule of rules) {
		const actualValue = profile[rule.field];
		const isValueMissing =
			actualValue === undefined ||
			actualValue === null ||
			actualValue === "" ||
			Number.isNaN(actualValue);

		const citation = provenanceMap.get(rule.id) || null;
		const reqText = formatRequirement(rule.field, rule.operator, rule.targetValue);
		const actualText = formatActualValue(rule.field, actualValue);

		if (isValueMissing) {
			unknownRules.push({
				ruleId: rule.id,
				field: rule.field,
				description: rule.description || reqText,
				required: reqText,
				actual: actualText,
				citation,
			});
			continue;
		}

		const evalResult = evaluateCondition(
			actualValue,
			rule.operator,
			rule.targetValue,
		);

		if (evalResult.result) {
			passedRules.push({
				ruleId: rule.id,
				field: rule.field,
				description: rule.description || reqText,
				actual: actualText,
				condition: reqText,
				citation,
			});
		} else {
			failedRules.push({
				ruleId: rule.id,
				field: rule.field,
				description: rule.description || reqText,
				actual: actualText,
				required: reqText,
				failMessage:
					rule.failMessage ||
					`Your ${rule.field} (${actualText}) does not meet the requirement: ${reqText}`,
				citation,
			});
		}
	}

	const isEligible = failedRules.length === 0;
	const totalKnownRules = passedRules.length + failedRules.length;
	const matchConfidence =
		totalKnownRules > 0
			? Math.round((passedRules.length / (totalKnownRules + unknownRules.length)) * 100)
			: 100;

	// Document Readiness Audit
	const requiredDocs = Array.isArray(scholarship.requiredDocuments)
		? scholarship.requiredDocuments
		: [];
	const studentDocs = new Set(
		profile.documentsHeld.map((d) => String(d).toUpperCase()),
	);

	const documentAudit = {
		total: requiredDocs.length,
		heldCount: 0,
		missingCount: 0,
		held: [],
		missing: [],
		percentage: 100,
	};

	for (const doc of requiredDocs) {
		const isHeld = studentDocs.has(doc.code.toUpperCase());
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
	const compositeReadiness = Math.round(
		matchConfidence * 0.6 + documentAudit.percentage * 0.4,
	);

	return {
		isEligible,
		matchConfidence,
		documentReadiness: documentAudit.percentage,
		readinessScore: compositeReadiness,
		passedRules,
		failedRules,
		unknownRules,
		documentAudit,
	};
}

function buildFallbackRules(scholarship) {
	const rules = [];
	const elig = scholarship.eligibility || {};

	if (elig.familyIncome && elig.familyIncome.max) {
		rules.push({
			id: "rule_income",
			field: "familyIncome",
			operator: "LTE",
			targetValue: elig.familyIncome.max,
			isMandatory: true,
			description: `Annual family income must not exceed ₹${elig.familyIncome.max.toLocaleString("en-IN")}`,
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

	if (scholarship.state && scholarship.state !== "All India") {
		rules.push({
			id: "rule_state",
			field: "state",
			operator: "EQ",
			targetValue: scholarship.state,
			isMandatory: true,
			description: `Domicile required: ${scholarship.state}`,
			failMessage: `Candidate domicile does not match required state of ${scholarship.state}`,
		});
	}

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
