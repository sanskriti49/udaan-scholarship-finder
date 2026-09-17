/**
 * URL helpers. A URL is only stored on a scholarship if it parses, uses http(s),
 * points to an allow-listed host, and is not a known placeholder that portals
 * emit when a document is missing (e.g. NSP renders "https://scholarships.gov.in/null").
 */

const PLACEHOLDER_PATHS = [
	/^\/null\/?$/i,
	/^\/undefined\/?$/i,
	/\/not_available\.pdf$/i,
	/\/api\/schemes\/?$/i,
	/^\/?$/,
];

export function cleanPortalUrl(raw) {
	if (!raw || typeof raw !== "string") return "";
	try {
		const parsed = new URL(raw);
		if (parsed.pathname.toLowerCase().startsWith("/api/schemes")) {
			parsed.pathname = "/";
			parsed.search = "";
			return parsed.toString();
		}
		return parsed.toString();
	} catch {
		return raw;
	}
}

export function hostMatches(hostname, allowedDomains = []) {
	const host = String(hostname || "").toLowerCase();
	return allowedDomains.some((domain) => {
		const d = domain.toLowerCase();
		return host === d || host.endsWith(`.${d}`);
	});
}

/**
 * Resolve and encode a URL (portals often publish links containing raw spaces).
 * Returns null when the input cannot be a real URL.
 */
export function canonicalizeUrl(raw, base) {
	if (!raw || typeof raw !== "string") return null;
	const trimmed = raw.trim();
	if (!trimmed || /^(javascript|mailto|tel|data):/i.test(trimmed) || trimmed === "#") return null;
	try {
		const url = new URL(trimmed.replace(/ /g, "%20"), base);
		if (url.protocol !== "https:" && url.protocol !== "http:") return null;
		url.hash = "";
		return url.toString();
	} catch {
		return null;
	}
}

/**
 * Validate a URL that will be shown to students. Returns
 * { ok: true, url } or { ok: false, reason }.
 */
export function validateOfficialUrl(raw, allowedDomains, { base, allowRoot = false } = {}) {
	const url = canonicalizeUrl(raw, base);
	if (!url) return { ok: false, reason: "unparseable_url" };
	const parsed = new URL(url);
	if (!hostMatches(parsed.hostname, allowedDomains)) {
		return { ok: false, reason: "domain_not_allowed", url };
	}
	// When allowRoot is true, permit root '/' while still blocking /null, /undefined, /not_available.pdf, and /api/schemes
	const placeholders = allowRoot ? PLACEHOLDER_PATHS.slice(0, 4) : PLACEHOLDER_PATHS;
	if (placeholders.some((re) => re.test(parsed.pathname))) {
		return { ok: false, reason: "placeholder_url", url };
	}
	return { ok: true, url };
}
