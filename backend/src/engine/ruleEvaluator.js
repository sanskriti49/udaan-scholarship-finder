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

function evaluateCondition(actual, operator, target) {
	if (actual === undefined || actual === null || Number.isNaN(actual)) {
		return { result: false, missingActual: true };
	}

	switch (operator) {
		case "LTE":
			return { result: Number(actual) <= Number(target) };
		case "GTE":
			return { result: Number(actual) >= Number(target) };
		case "EQ":
			return {
				result: String(actual).trim().toLowerCase() ===
					String(target).trim().toLowerCase(),
			};
		case "IN": {
			const targetArr = Array.isArray(target) ? target : [target];
			const actualStr = String(actual).trim().toLowerCase();
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

		if (isValueMissing) {
			unknownRules.push({
				ruleId: rule.id,
				field: rule.field,
				description: rule.description,
				required: `${rule.operator} ${rule.targetValue}`,
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
				description: rule.description,
				actual: actualValue,
				condition: `${rule.operator} ${rule.targetValue}`,
				citation,
			});
		} else {
			failedRules.push({
				ruleId: rule.id,
				field: rule.field,
				description: rule.description,
				actual: actualValue,
				required: `${rule.operator} ${rule.targetValue}`,
				failMessage:
					rule.failMessage ||
					`Profile value '${actualValue}' does not meet ${rule.description} (${rule.operator} ${rule.targetValue})`,
				citation,
			});
		}
	}

	const isEligible = failedRules.length === 0;
	const totalKnownRules = passedRules.length + failedRules.length;
	const matchConfidence =
		totalKnownRules > 0
			? Math.round((passedRules.length / (totalKnownRules + unknownRules.length)) * 100)
			: 50;

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
