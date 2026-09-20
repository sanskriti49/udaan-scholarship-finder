/**
 * Derives statutory required documents for Indian central, state, and foundation scholarships.
 * Combines statutory baseline requirements with criteria-derived documents
 * (Income, Caste, Disability, Domicile, Female affidavit) and adapter-extracted items.
 */

export function buildRequiredDocuments(facts = {}, candidate = {}, guideline = {}, state = "All India") {
	const explicitDocs = candidate.fields?.requiredDocuments || guideline?.facts?.requiredDocuments || [];
	if (Array.isArray(explicitDocs) && explicitDocs.length > 0) {
		return explicitDocs.map((d) => ({
			code: String(d.code || "DOC").toUpperCase(),
			name: String(d.name || d.code),
			mandatory: d.mandatory !== false,
		}));
	}

	const docs = [];
	const addedCodes = new Set();

	const addDoc = (code, name, mandatory = true) => {
		const upper = code.toUpperCase();
		if (!addedCodes.has(upper)) {
			addedCodes.add(upper);
			docs.push({ code: upper, name, mandatory });
		}
	};

	// 1. Universal Identity & Aadhaar Proof
	addDoc("AADHAAR", "Aadhaar Card / Government Identity Proof", true);

	// 2. Academic Qualification Marksheet
	const levelLabel = facts.level ? `${facts.level} / ` : "";
	addDoc(
		"MARKSHEET",
		`Previous Year / Semester Qualifying Marksheet (${levelLabel}Class 10th / 12th / Degree)`,
		true,
	);

	// 3. Institutional Bonafide Certificate
	addDoc(
		"BONAFIDE_CERT",
		"Bonafide Student Certificate (Issued on College / University Letterhead with AISHE Code)",
		true,
	);

	// 4. College Admission Proof / Fee Receipt
	addDoc(
		"ADMISSION_PROOF",
		"Current Academic Year Admission Proof / College Fee Receipt",
		true,
	);

	// 5. Active DBT Bank Account Passbook
	addDoc(
		"BANK_PASSBOOK",
		"Bank Account Passbook (Aadhaar Seeded & Active for Direct Benefit Transfer)",
		true,
	);

	// 6. Family Income Certificate (Statutory for means-tested / income ceiling schemes)
	const title = String(candidate.fields?.title || candidate.title || "");
	const tags = Array.isArray(candidate.fields?.tags) ? candidate.fields.tags : [];
	const isMeansTested =
		Boolean(facts.familyIncome) ||
		/means|income|welfare|pms\b|post[\s-]matric|pre[\s-]matric/i.test(title) ||
		tags.some((t) => /means|need/i.test(t));

	if (isMeansTested) {
		addDoc(
			"INCOME_CERT",
			"Family Income Certificate (Issued by Tehsildar / SDM for the Active Financial Year)",
			true,
		);
	}

	// 7. Caste / Category Certificate
	const casteGroups = facts.casteGroups || candidate.fields?.casteGroups || [];
	const hasCasteConstraint =
		(Array.isArray(casteGroups) && casteGroups.length > 0) ||
		/\b(SC|ST|OBC|EWS|DNT)\b/i.test(title) ||
		tags.some((t) => /sc|st|obc|ews/i.test(t));

	if (hasCasteConstraint) {
		const groupsStr =
			Array.isArray(casteGroups) && casteGroups.length > 0
				? casteGroups.join(" / ")
				: "SC / ST / OBC / EWS";
		addDoc(
			"CASTE_CERT",
			`Community / Category Certificate (${groupsStr}) in Official Central/State Format`,
			true,
		);
	}

	// 8. Disability Certificate
	const isDisability =
		Boolean(facts.disabilityRequired) ||
		Boolean(facts.minDisabilityPercent) ||
		/disabilit|specially\s+abled|divyang/i.test(title) ||
		tags.some((t) => /disabilit/i.test(t));

	if (isDisability) {
		const minPct = facts.minDisabilityPercent?.value ? ` (Minimum ${facts.minDisabilityPercent.value}%)` : " (Min 40%)";
		addDoc(
			"DISABILITY_CERT",
			`Disability Certificate${minPct} issued by Competent Medical Authority / UDID Card`,
			true,
		);
	}

	// 9. Domicile / Permanent Residence Certificate
	const resolvedState = state || candidate.fields?.state || candidate.state;
	if (resolvedState && resolvedState !== "All India" && !resolvedState.includes("All India")) {
		addDoc(
			"DOMICILE_CERT",
			`State Domicile / Permanent Residence Certificate (${resolvedState})`,
			true,
		);
	}

	// 10. Girl Student Undertaking / Parent Affidavit (Conditional)
	const isFemaleOnly =
		facts.gender === "Female" ||
		/\b(girl|girls|women|female)\b/i.test(title) ||
		tags.some((t) => /women|girl/i.test(t));

	if (isFemaleOnly) {
		addDoc(
			"AFFIDAVIT_FEMALE",
			"Parent Declaration / Girl Child Undertaking Affidavit (as per scheme guidelines)",
			false,
		);
	}

	return docs;
}

export default buildRequiredDocuments;
