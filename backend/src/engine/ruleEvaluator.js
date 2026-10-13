/**
 * Deterministic Rule Evaluator for Udaan
 * Evaluates a flat list of recorded scholarship conditions.
 * Returns explicit pass/fail breakdowns, ineligibility reasons, document audit, and source citations.
 */
import { isCitedDocument } from "../pipeline/core/requiredDocuments.js";

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
			return `Annual family income ${operator === "LT" ? "below" : "≤"} ₹${Number(target).toLocaleString("en-IN")}`;
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

	const STATE_ALIASES = {
		up: "uttar pradesh",
		mh: "maharashtra",
		ka: "karnataka",
		wb: "west bengal",
		br: "bihar",
		tn: "tamil nadu",
		dl: "delhi",
	};
	const normActual = STATE_ALIASES[actualStr] || actualStr;
	const normTarget = STATE_ALIASES[targetStr] || targetStr;

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
					const normT = STATE_ALIASES[s] || s;
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

export function evaluateEligibility(rawProfile, scholarship) {
	const profile = normalizeProfile(rawProfile);
	const provenanceMap = new Map();

	if (Array.isArray(scholarship.provenanceQuotes)) {
		for (const quote of scholarship.provenanceQuotes) {
			if (quote.ruleId) provenanceMap.set(quote.ruleId, quote);
		}
	}

	let rules = eligibilityRules(scholarship);
	const hasRecordedConditions = rules.length > 0;

	// Filter out bogus unconstrained rules (e.g. targetValue: "Any" or "All")
	rules = rules.filter((r) => {
		const t = String(r.targetValue).trim().toLowerCase();
		return t !== "any" && t !== "all" && t !== "*" && !(r.field === "state" && (t === "all india" || (Array.isArray(r.targetValue) && r.targetValue.some((v) => String(v).toLowerCase() === "all india"))));
	});

	const passedRules = [];
	const failedRules = [];
	const unknownRules = [];
	if (!hasRecordedConditions) {
		unknownRules.push({ ruleId: "criteria_not_recorded", field: "eligibility", description: "Eligibility criteria have not been recorded", required: "Check the provider's current instructions", actual: "Not verified", citation: null });
	}

	for (const rule of rules) {
		const actualValue = profile[rule.field];
		const isValueMissing =
			actualValue === undefined ||
			actualValue === null ||
			actualValue === "" ||
			Number.isNaN(actualValue);

		// Only a citation recorded for this exact rule is shown. No guessing by keyword
		// and no generated placeholder text: an uncited rule has citation = null.
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
			rule.field,
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

	if (scholarship.dataQuality?.unknownFields?.includes("eligibility")) {
		unknownRules.push({ ruleId: "official_manual_review", field: "eligibility", description: "Review additional official course, merit and application conditions", required: "Check the official eligibility text", actual: "Not verified", citation: null });
	}

	const isEligible = failedRules.length === 0 && unknownRules.length === 0;
	const totalKnownRules = passedRules.length + failedRules.length;
	const matchConfidence =
		totalKnownRules > 0
			? Math.round((passedRules.length / (totalKnownRules + unknownRules.length)) * 100)
			: (unknownRules.length ? 0 : 100);

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
	return Array.isArray(scholarship.rules) && scholarship.rules.length > 0 ? scholarship.rules : buildFallbackRules(scholarship);
}

function buildFallbackRules(scholarship) {
	const rules = [];
	const elig = scholarship.eligibility || {};

	if (elig.familyIncome && elig.familyIncome.max) {
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
