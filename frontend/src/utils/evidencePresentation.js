import { cleanOfficialUrl } from "./formatEvidence.js";

// A successful evidence response is authoritative even when its list is empty.
export function evidenceQuotes(scholarship, response) {
	const live = Array.isArray(response?.data);
	const quotes = live ? response.data : scholarship?.provenanceQuotes || [];
	return quotes.filter((q) => typeof q.quote === "string" && q.quote.trim() && cleanOfficialUrl(q.url || q.sourceUrl))
		.map((q) => ({
			quote: q.quote, url: cleanOfficialUrl(q.url || q.sourceUrl),
			clause: q.locator || q.clause || "Source excerpt", field: q.field || null,
			page: Number.isInteger(q.page) && q.page > 0 ? q.page : null,
			verified: live && q.verified === true, fetchedAt: q.fetchedAt || q.verifiedAt,
			verificationError: q.verificationError || null,
		}));
}

export function documentItems(scholarship, response) {
	return (scholarship?.requiredDocuments || []).map((item) => {
		const doc = typeof item === "string" ? { name: item } : item;
		const evidence = doc.evidence;
		const cited = doc.verificationStatus === "source_cited" && evidence?.field === `requiredDocuments.${doc.code}` && evidence?.snapshotId &&
			evidence?.quote?.trim() && cleanOfficialUrl(evidence.url);
		const failedCheck = Array.isArray(response?.data) && !response.data.some((q) =>
			q.quote === evidence?.quote && q.url === evidence?.url && q.verified === true);
		return { ...doc, sourceCited: Boolean(cited && !failedCheck), mandatory: Boolean(cited && !failedCheck && doc.mandatory === true) };
	});
}
