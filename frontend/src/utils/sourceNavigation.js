import { cleanOfficialUrl, isGenuinePdf } from "./formatEvidence.js";

// An explicit URL contract, not a title/translation dictionary. Unknown API
// paths retain their identity rather than being changed to a homepage.
export function publicScholarshipUrl(raw) {
	const clean = cleanOfficialUrl(raw);
	if (!clean) return null;
	const url = new URL(clean);
	if (/^(?:www\.)?myscheme\.gov\.in$/i.test(url.hostname) && url.pathname === "/api/apisetu/schemes" && /^[a-z0-9-]+$/i.test(url.searchParams.get("slug") || "")) {
		url.pathname = `/schemes/${url.searchParams.get("slug")}`;
		url.search = "";
	}
	return url.toString();
}

const fragmentText = value => encodeURIComponent(Array.from(String(value || "").replace(/\s+/gu, " ").trim()).slice(0, 300).join("")).replace(/-/g, "%2D");

export function citationLink(evidence, { title } = {}) {
	const original = cleanOfficialUrl(evidence?.url || evidence?.sourceUrl);
	if (!original) return { href: null, label: "Source unavailable", rawUrl: null };
	const publicUrl = publicScholarshipUrl(original);
	if (publicUrl !== original) return { href: publicUrl, label: "Scholarship page", rawUrl: original };
	const url = new URL(original);
	if (isGenuinePdf(original)) {
		if (Number.isInteger(evidence.page) && evidence.page > 0) {
			const hash = new URLSearchParams(url.hash.slice(1));
			hash.set("page", evidence.page);
			url.hash = hash.toString();
		}
		return { href: url.toString(), label: Number.isInteger(evidence.page) && evidence.page > 0 ? `Open PDF · page ${evidence.page}` : "Open source PDF", rawUrl: null };
	}
	// Unsupported browsers still open the actual official document. SPA routes
	// and raw APIs are left intact; text fragments are a navigation aid only.
	if (!url.hash.startsWith("#/") && !/^\/api\//i.test(url.pathname) && !/\.json$/i.test(url.pathname)) {
		const selections = [...new Set([fragmentText(title), fragmentText(evidence.quote)].filter(Boolean))];
		if (selections.length) url.hash = `${url.hash.slice(1).split(":~:")[0]}:~:${selections.map(text => `text=${text}`).join("&")}`;
	}
	return { href: url.toString(), label: "Open cited passage", rawUrl: null };
}

export function scholarshipSourceLinks(scholarship, response) {
	const official = { ...scholarship?.officialLinks, ...response?.officialLinks };
	const title = scholarship?.officialTitle || scholarship?.title;
	const excerpts = Array.isArray(response?.data) ? response.data : scholarship?.provenanceQuotes || [];
	const cataloguePage = excerpts.map(q => cleanOfficialUrl(q.url || q.sourceUrl)).filter(Boolean).map(raw => ({ raw, publicUrl: publicScholarshipUrl(raw) })).find(link => link.raw !== link.publicUrl)?.publicUrl;
	const source = [official.detailUrl && !official.detailUrl.includes(":~:text=") ? official.detailUrl : null, cataloguePage, isGenuinePdf(official.guidelinesUrl) ? official.guidelinesUrl : null, official.detailUrl, response?.sourceUrl, scholarship?.sourceUrl, official.listingUrl, scholarship?.officialPortal].map(publicScholarshipUrl).find(Boolean);
	const sourceUrl = source ? citationLink({ url: source }, { title }).href : null;
	const guidelinesUrl = publicScholarshipUrl(official.guidelinesUrl);
	const isPortal = guidelinesUrl && new URL(guidelinesUrl).pathname === "/" && !new URL(guidelinesUrl).hash;
	return { sourceUrl, sourceLabel: isGenuinePdf(sourceUrl) ? "Scholarship guidelines" : "Find this scholarship", guidelinesUrl, guidelinesLabel: isPortal ? "Provider portal" : "Read guidelines" };
}
