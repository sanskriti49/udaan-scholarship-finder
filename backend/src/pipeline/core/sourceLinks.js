import * as cheerio from "cheerio";
import { cleanPortalUrl, validateOfficialUrl } from "./urls.js";

const titleKey = value => String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase();
const headingSelector = "h1,h2,h3,h4,h5,h6,.headingText,mat-panel-title,.scheme-li,a";
const pdf = url => /\.pdf(?:$|[?#])/i.test(url || "");

export function isSpecificSource(raw) {
	try {
		const url = new URL(cleanPortalUrl(raw));
		if (/^\/api\//i.test(url.pathname)) return false;
		if (url.hash.startsWith("#:~:text=") || /^#\//.test(url.hash)) return true;
		return !/^\/(?:all-scholarships|schemes(?:\.aspx)?|scholarships|index(?:\.[a-z]+)?|default(?:\.[a-z]+)?)?\/?$/i.test(url.pathname);
	} catch { return false; }
}

// Browser navigation only: evidence.url remains the exact fetched snapshot URL.
export function passageUrl(raw, title) {
	const clean = cleanPortalUrl(raw);
	if (!clean || !title?.trim()) return clean;
	const url = new URL(clean);
	if (url.hash || pdf(clean) || /^\/api\//i.test(url.pathname)) return clean;
	url.hash = `:~:text=${encodeURIComponent(Array.from(title.trim()).slice(0, 300).join("")).replace(/-/g, "%2D")}`;
	return url.toString();
}

export function preferredSourceUrl(links) {
	const options = [links.detailUrl, links.guidelinesUrl, links.listingUrl, links.faqUrl, links.applyUrl].map(cleanPortalUrl).filter(Boolean);
	// Prefer a real detail page or document over a fragment fallback on a listing.
	return options.find(url => isSpecificSource(url) && !url.includes(":~:text=")) || options.find(isSpecificSource) || options[0] || "";
}

/** Bounded, title-scoped discovery. Never borrow another card's documents. */
export function enrichSourceLinks(records, doc, source) {
	const $ = doc.html ? cheerio.load(doc.html) : null;
	const titleNodes = new Map();
	if ($) $(headingSelector).each((_, node) => {
		const key = titleKey($(node).text());
		if (key) titleNodes.set(key, [...(titleNodes.get(key) || []), node]);
	});
	const titles = new Set(records.flatMap(c => [c.fields.officialTitle, c.fields.title]).filter(Boolean).map(titleKey));
	const checked = raw => {
		const value = validateOfficialUrl(raw, source.allowedDomains, { base: doc.finalUrl || doc.url, allowRoot: true, preserveHash: true });
		return value.ok ? value.url : null;
	};
	for (const candidate of records) {
		const links = candidate.links;
		if (!links) continue;
		const title = candidate.fields.officialTitle || candidate.fields.title;
		let detail = checked(links.detailUrl);
		const matches = [...new Set([...(titleNodes.get(titleKey(title)) || []), ...(titleNodes.get(titleKey(candidate.fields.title)) || [])])];
		const roots = matches.filter(node => !matches.some(other => other !== node && $(node).parents().toArray().includes(other)));
		// Identical titles in separate cards may belong to different departments.
		// Leave that association to the source adapter instead of choosing the first.
		const nodes = roots.length === 1 ? roots : [];
		for (const node of nodes) {
			const heading = $(node);
			const direct = heading.is("a") ? heading : heading.find("a[href]").first();
			const directUrl = checked(direct.attr("href"));
			if (directUrl && isSpecificSource(directUrl) && !pdf(directUrl)) detail ||= directUrl;
			let scope = heading;
			// At most four ancestors, excluding navigation and shared multi-scheme containers.
			for (let depth = 0; depth < 4; depth++) {
				const parent = scope.parent();
				if (!parent.length || parent.is("body,html,nav,header,footer")) break;
				const contained = new Set(parent.find(headingSelector).toArray().map(n => titleKey($(n).text())).filter(key => titles.has(key)));
				if (contained.size > 1) break;
				scope = parent;
			}
			for (const a of scope.find("a[href]").toArray()) {
				const target = checked($(a).attr("href")), label = titleKey($(a).text());
				if (!target) continue;
				if (/guideline|specification|read more|scheme details/.test(label)) {
					if (!links.guidelinesUrl && isSpecificSource(target)) links.guidelinesUrl = target;
					if (!pdf(target) && isSpecificSource(target)) detail ||= target;
				}
				if (!links.faqUrl && /\bfaq\b|frequently asked/.test(label)) links.faqUrl = target;
			}
		}
		// Catalogue records already supply an exact, public /schemes/<slug> URL.
		if (!detail && /\/schemes\/[^/?#]+/i.test(links.listingUrl || "")) detail = checked(links.listingUrl);
		links.detailUrl = detail || passageUrl(checked(links.listingUrl) || doc.finalUrl || doc.url, title);
		// Only follow a discovered guideline PDF; existing budgets/domain checks still apply.
		if (pdf(links.guidelinesUrl) && !(candidate.followUps || []).some(f => f.url === links.guidelinesUrl)) {
			(candidate.followUps ||= []).push({ url: links.guidelinesUrl, adapter: "guidelinePdf", role: "guidelines" });
		}
	}
	return records;
}
