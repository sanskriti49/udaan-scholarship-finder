/** Document requirements need item-specific source excerpts. Other items are preparation suggestions. */
export function isCitedDocument(doc) {
	const evidence = doc?.evidence;
	return doc?.verificationStatus === "source_cited" && evidence?.field === `requiredDocuments.${doc.code}` && Boolean(evidence?.quote?.trim()) &&
		Boolean(evidence?.snapshotId) && /^https?:\/\//.test(evidence?.url || "");
}

export function buildRequiredDocuments(facts = {}, candidate = {}, guideline = {}, state = null) {
	const explicit = candidate.fields?.requiredDocuments || guideline?.facts?.requiredDocuments || [];
	if (Array.isArray(explicit) && explicit.length) {
		return explicit.map((item) => {
			const doc = typeof item === "string" ? { name: item } : item;
			const code = String(doc.code || "DOC").toUpperCase();
			const evidence = doc.evidence || [...(candidate.evidence || []), ...(guideline?.evidence || [])]
				.find((e) => e.field === `requiredDocuments.${code}`);
			const cited = isCitedDocument({ code, verificationStatus: "source_cited", evidence });
			return { code, name: String(doc.name || code), mandatory: cited && doc.mandatory === true,
				verificationStatus: cited ? "source_cited" : "suggested", evidence: cited ? evidence : null };
		});
	}

	const docs = [];
	const add = (code, name) => docs.push({ code, name, mandatory: false, verificationStatus: "suggested", evidence: null });
	add("AADHAAR", "Government identity proof");
	add("MARKSHEET", "Academic marksheet");
	add("BONAFIDE_CERT", "Bonafide student certificate");
	add("ADMISSION_PROOF", "Admission proof or fee receipt");
	add("BANK_PASSBOOK", "Bank account details");
	const title = String(candidate.fields?.title || candidate.title || "");
	const tags = Array.isArray(candidate.fields?.tags) ? candidate.fields.tags : [];
	if (facts.familyIncome || /means|income|welfare|pms\b|post[\s-]matric|pre[\s-]matric/i.test(title) || tags.some((t) => /means|need/i.test(t))) {
		add("INCOME_CERT", "Family income certificate");
	}
	const casteGroups = facts.casteGroups || candidate.fields?.casteGroups || [];
	if (casteGroups.length || /\b(SC|ST|OBC|EWS|DNT)\b/i.test(title) || tags.some((t) => /\b(sc|st|obc|ews)\b/i.test(t))) {
		add("CASTE_CERT", "Community or category certificate");
	}
	if (facts.disabilityRequired || facts.minDisabilityPercent || /disabilit|specially\s+abled|divyang/i.test(title)) {
		add("DISABILITY_CERT", "Disability certificate");
	}
	const resolvedState = state || candidate.fields?.state || candidate.state;
	if (resolvedState && resolvedState !== "All India") add("DOMICILE_CERT", "Domicile or residence certificate");
	if (facts.gender === "Female" || /\b(girl|girls|women|female)\b/i.test(title)) add("AFFIDAVIT_FEMALE", "Declaration, if requested by the provider");
	return docs;
}

export default buildRequiredDocuments;
