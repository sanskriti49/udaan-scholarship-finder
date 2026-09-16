/**
 * Provenance & Citation Utilities
 * Provides protocol sanitization, deep anchor URL building, and citation link classification.
 */

// Known generic portal root hostnames that do not represent specific document sources
const GENERIC_ROOT_HOSTNAMES = new Set([
	"scholarships.gov.in",
	"www.scholarships.gov.in",
	"ugc.gov.in",
	"www.ugc.gov.in",
	"aicte-india.org",
	"www.aicte.gov.in",
	"scholarship.up.gov.in",
	"mahadbt.maharashtra.gov.in",
	"ssp.postmatric.karnataka.gov.in",
]);

/**
 * Sanitizes an arbitrary URL against XSS protocols (e.g. javascript:, data:, vbscript:).
 * Only http: and https: protocols are permitted.
 * @param {string} rawUrl 
 * @returns {string|null} Sanitized safe URL or null if invalid/unsafe
 */
export function sanitizeUrl(rawUrl) {
	if (!rawUrl || typeof rawUrl !== "string") return null;
	const trimmed = rawUrl.trim();

	// Reject explicit dangerous schemes before parsing
	if (/^(javascript|data|vbscript):/i.test(trimmed)) {
		return null;
	}

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol === "http:" || parsed.protocol === "https:") {
			return parsed.toString();
		}
		return null;
	} catch {
		// If it's a relative path starting with a single '/'
		if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
			return trimmed;
		}
		return null;
	}
}

/**
 * Checks if a given URL is a specific deep document/circular link rather than a generic root portal.
 * @param {string} rawUrl 
 * @returns {boolean}
 */
export function isDeepLink(rawUrl) {
	const safeUrl = sanitizeUrl(rawUrl);
	if (!safeUrl) return false;

	try {
		const parsed = new URL(safeUrl, "https://dummy.local");
		const pathname = parsed.pathname.replace(/\/+$/, "");

		// Check if URL points directly to a document extension
		const isDocumentFile = /\.(pdf|docx?|xlsx?|rtf|txt|csv)$/i.test(pathname);
		if (isDocumentFile) return true;

		// Empty or bare root path (e.g. "/", "")
		if (!pathname || pathname === "") {
			return false;
		}

		// Generic root paths on portal domains
		const isGenericHost = GENERIC_ROOT_HOSTNAMES.has(parsed.hostname.toLowerCase());
		if (isGenericHost) {
			const isRootLikePath =
				pathname === "" ||
				pathname === "/" ||
				pathname === "/index" ||
				pathname === "/index.html" ||
				pathname === "/index.php" ||
				pathname === "/home";
			if (isRootLikePath && !parsed.search && !parsed.hash) {
				return false;
			}
		}

		// Meaningful deep path segments (e.g. /pdfnews/..., /schemes/..., /circular/...)
		return pathname.length > 1;
	} catch {
		return false;
	}
}

/**
 * Constructs a deep URL with PDF page anchors (#page=X) or Chrome Text Fragments (#:~:text=...)
 * @param {Object} params
 * @param {string} params.sourceUrl Direct document or portal URL
 * @param {number|null} [params.page] Page number (for PDF circulars)
 * @param {string|null} [params.textFragment] Chrome Text Fragment parameter
 * @param {string|null} [params.quote] Fallback quote text to extract distinctive text fragment from
 * @returns {string|null} Anchored deep URL or sanitized base URL
 */
export function buildDeepAnchorUrl({ sourceUrl, page, textFragment, quote }) {
	const safeUrl = sanitizeUrl(sourceUrl);
	if (!safeUrl) return null;

	try {
		const url = new URL(safeUrl);
		const pathname = url.pathname.toLowerCase();
		const isPdf = pathname.endsWith(".pdf");

		// 1. PDF Documents: Standard PDF open parameters (#page=X)
		if (isPdf) {
			if (page && Number(page) > 0 && !url.hash.includes("page=")) {
				url.hash = `page=${Number(page)}`;
			}
			return url.toString();
		}

		// 2. HTML / Web Documents: Chrome Text Fragment (#:~:text=...)
		if (textFragment && typeof textFragment === "string") {
			const cleanFragment = textFragment.trim();
			const param = cleanFragment.startsWith("text=")
				? cleanFragment.slice(5)
				: cleanFragment;
			url.hash = `:~:text=${encodeURIComponent(param)}`;
			return url.toString();
		}

		// 3. Fallback to clean quote snippet for text fragment if quote is provided
		if (quote && typeof quote === "string") {
			// Extract a distinct 4-8 word snippet from the beginning of the quote
			const words = quote
				.trim()
				.replace(/[^\w\s-]/g, " ")
				.split(/\s+/)
				.filter((w) => w.length > 2);

			if (words.length >= 3) {
				const snippet = words.slice(0, Math.min(words.length, 6)).join(" ");
				if (snippet.length >= 8) {
					url.hash = `:~:text=${encodeURIComponent(snippet)}`;
					return url.toString();
				}
			}
		}

		return url.toString();
	} catch {
		return safeUrl;
	}
}

/**
 * Evaluates citation metadata to determine visual badge classification and link readiness.
 * @param {Object} quoteItem
 * @returns {{
 *   isSafe: boolean,
 *   isDeep: boolean,
 *   anchorUrl: string|null,
 *   badgeType: "deep_pdf" | "deep_html" | "root_only" | "unlinked",
 *   badgeLabel: string
 * }}
 */
export function evaluateCitationStatus(quoteItem = {}) {
	const safeUrl = sanitizeUrl(quoteItem.sourceUrl);
	if (!safeUrl) {
		return {
			isSafe: false,
			isDeep: false,
			anchorUrl: null,
			badgeType: "unlinked",
			badgeLabel: "Direct Deep Link Unavailable",
		};
	}

	const isDeep = isDeepLink(safeUrl);
	const anchorUrl = buildDeepAnchorUrl({
		sourceUrl: safeUrl,
		page: quoteItem.page,
		textFragment: quoteItem.textFragment,
		quote: quoteItem.quote,
	});

	const isPdf = safeUrl.toLowerCase().includes(".pdf");

	if (isDeep && isPdf) {
		return {
			isSafe: true,
			isDeep: true,
			anchorUrl,
			badgeType: "deep_pdf",
			badgeLabel: quoteItem.page ? `Official PDF § Page ${quoteItem.page}` : "Official PDF Circular",
		};
	}

	if (isDeep) {
		return {
			isSafe: true,
			isDeep: true,
			anchorUrl,
			badgeType: "deep_html",
			badgeLabel: "Verified Web Circular",
		};
	}

	return {
		isSafe: true,
		isDeep: false,
		anchorUrl: null, // Disable link redirection for root-only domains
		badgeType: "root_only",
		badgeLabel: "Root Portal Only — Deep Link Pending Audit",
	};
}
