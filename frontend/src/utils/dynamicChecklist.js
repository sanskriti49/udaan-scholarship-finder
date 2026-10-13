// Preparation guidance never establishes a scheme's certificate validity rules.
export function buildDynamicChecklist(scholarship) {
	if (!scholarship) return [];
	const docs = scholarship.requiredDocuments || [];
	const has = pattern => docs.some(doc => pattern.test(typeof doc === "string" ? doc : doc.name || ""));
	const items = [];
	const add = (id, documentName, scannerType, criteria, rejectionTrap) => items.push({ id, documentName, scannerType, criteria, rejectionTrap, tag: "Preparation suggestion" });
	if (has(/income/i) || scholarship.rules?.some(rule => rule.field === "familyIncome")) {
		add("income", "Family Income Certificate", "income", "Review the income criterion recorded for this scheme.", "Confirm the required issuing authority and certificate period in the provider's current instructions. No universal financial-year cutoff is assumed.");
	}
	if (has(/caste|category|community/i) || scholarship.rules?.some(rule => rule.field === "casteCategory")) {
		add("caste", "Caste / Category Certificate", "caste", "Review the categories recorded for this scheme.", "Check which category certificate and format the provider accepts. Central and state requirements can differ.");
	}
	if (has(/bonafide|enrollment|college|student/i)) {
		add("bonafide", "College Bonafide Certificate", "bonafide", "Check whether proof of current enrolment is requested.", "Ask the provider or institute which details, signatures and identifiers are needed; an AISHE code is not assumed to be mandatory.");
	}
	add("marksheet", "Academic Marksheet", null, "Review any recorded academic-performance criterion.", "Use the provider's instructions to identify the exam, year and documents needed. Keep extracted details editable.");
	add("bank", "Bank Account Details", null, "Check the provider's payment instructions.", "Confirm account and DBT requirements with the provider and your bank. This checklist does not verify account eligibility or bank seeding.");
	return items;
}