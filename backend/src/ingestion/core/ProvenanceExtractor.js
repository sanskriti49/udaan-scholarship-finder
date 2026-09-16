import * as cheerio from "cheerio";

/**
 * Strict Provenance Capture Schema
 * 
 * {
 *   "clause": "string",
 *   "quote": "string",
 *   "sourceUrl": "string (direct PDF/document URL)",
 *   "page": "number | null",
 *   "textFragment": "string | null",
 *   "confidenceScore": "number"
 * }
 */

// Polyfill minimal browser DOM globals required by pdfjs-dist in Node 20+ environments
if (typeof globalThis.DOMMatrix === "undefined") {
	globalThis.DOMMatrix = class DOMMatrix {
		constructor() {
			this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
		}
	};
}
if (typeof globalThis.Path2D === "undefined") {
	globalThis.Path2D = class Path2D {};
}
if (typeof globalThis.ImageData === "undefined") {
	globalThis.ImageData = class ImageData {};
}

// Regex patterns to identify regulatory directives, clauses, and eligibility terms
const CLAUSE_PATTERNS = [
	/(?:Clause|Section|Regulation|Directive|Article|Rule|Para(?:graph)?|Directive)\s*([§0-9A-Z_.-]+[:.\s-]*[^\n.;]+)/i,
	/(?:Gazette\s+Notification|Circular\s+No\.?|Ref\s+No\.?)\s*([0-9A-Z_./-]+)/i,
	/(Eligibility\s+Criteria|Eligibility\s+Conditions|General\s+Instructions|Mandatory\s+Norms)/i,
];

const KEYWORD_WEIGHTS = {
	income: 0.25,
	family: 0.15,
	lakh: 0.2,
	cgpa: 0.3,
	percentage: 0.25,
	marks: 0.2,
	domicile: 0.25,
	resident: 0.2,
	caste: 0.25,
	category: 0.15,
	gender: 0.2,
	girl: 0.25,
	female: 0.2,
	disability: 0.3,
	degree: 0.15,
	postgraduate: 0.2,
	undergraduate: 0.2,
};

export class ProvenanceExtractor {
	/**
	 * Validates a single provenance quote against the strict schema.
	 * @param {Object} raw 
	 * @returns {{ isValid: boolean, errors: string[], quote: Object|null }}
	 */
	static validateProvenanceQuote(raw) {
		const errors = [];
		if (!raw || typeof raw !== "object") {
			return { isValid: false, errors: ["Quote item must be an object"], quote: null };
		}

		const clause = typeof raw.clause === "string" ? raw.clause.trim() : "";
		if (!clause) {
			errors.push("Missing or invalid 'clause' (must be a non-empty string)");
		}

		const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
		if (!quote || quote.length < 5) {
			errors.push("Missing or invalid 'quote' (must be at least 5 characters)");
		}

		const sourceUrl = typeof raw.sourceUrl === "string" ? raw.sourceUrl.trim() : "";
		if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
			errors.push("Missing or invalid 'sourceUrl' (must be an absolute HTTP/HTTPS URL)");
		}

		let page = null;
		if (raw.page !== undefined && raw.page !== null) {
			const parsedPage = Number(raw.page);
			if (isNaN(parsedPage) || parsedPage <= 0 || !Number.isInteger(parsedPage)) {
				errors.push("'page' must be a positive integer or null");
			} else {
				page = parsedPage;
			}
		}

		let textFragment = null;
		if (raw.textFragment !== undefined && raw.textFragment !== null) {
			if (typeof raw.textFragment === "string" && raw.textFragment.trim().length > 0) {
				textFragment = raw.textFragment.trim();
			}
		}

		let confidenceScore = 0.9;
		if (raw.confidenceScore !== undefined && raw.confidenceScore !== null) {
			const score = Number(raw.confidenceScore);
			if (isNaN(score) || score < 0 || score > 1) {
				errors.push("'confidenceScore' must be a number between 0 and 1");
			} else {
				confidenceScore = Math.round(score * 100) / 100;
			}
		}

		if (errors.length > 0) {
			return { isValid: false, errors, quote: null };
		}

		return {
			isValid: true,
			errors: [],
			quote: {
				ruleId: raw.ruleId ? String(raw.ruleId).trim() : undefined,
				clause,
				quote,
				sourceUrl,
				page,
				textFragment: textFragment || this.generateTextFragment(quote),
				confidenceScore,
			},
		};
	}

	/**
	 * Sanitizes a list of provenance quotes, ensuring every returned quote complies with the schema.
	 * Discards invalid entries and never fabricates false document anchors.
	 * @param {Array} rawQuotes 
	 * @returns {Array}
	 */
	static sanitizeProvenanceQuotes(rawQuotes) {
		if (!Array.isArray(rawQuotes)) return [];
		const sanitized = [];

		for (const raw of rawQuotes) {
			const validation = this.validateProvenanceQuote(raw);
			if (validation.isValid && validation.quote) {
				sanitized.push(validation.quote);
			} else {
				console.warn(`[ProvenanceExtractor] Rejected malformed quote item:`, validation.errors);
			}
		}

		return sanitized;
	}

	/**
	 * Generates a clean Chrome Text Fragment search string for highlighting in browsers.
	 * Syntax: #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
	 * @param {string} quote 
	 * @returns {string|null}
	 */
	static generateTextFragment(quote) {
		if (!quote || typeof quote !== "string") return null;

		// Clean quote into pure words without problematic punctuation
		const words = quote
			.trim()
			.replace(/[^\w\s-]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length > 1);

		if (words.length === 0) return null;

		// Select a concise, distinct 4 to 7 word phrase
		const sampleLength = Math.min(words.length, 6);
		const phrase = words.slice(0, sampleLength).join(" ");
		return phrase.length >= 8 ? phrase : null;
	}

	/**
	 * Computes an automated confidence score based on keywords and clause structure.
	 * @param {string} text 
	 * @param {string} clause 
	 * @returns {number} Value between 0.70 and 0.99
	 */
	static calculateConfidence(text, clause = "") {
		let score = 0.75;
		const lower = `${clause} ${text}`.toLowerCase();

		// Boost score if explicit clause/section marker is found
		if (/(§|clause|section|regulation|directive|rule)/i.test(clause)) {
			score += 0.12;
		}

		// Boost based on matched domain keywords
		let keywordBoost = 0;
		for (const [kw, weight] of Object.entries(KEYWORD_WEIGHTS)) {
			if (lower.includes(kw)) {
				keywordBoost += weight * 0.2;
			}
		}
		score += Math.min(keywordBoost, 0.12);

		return Math.min(Math.round(score * 100) / 100, 0.99);
	}

	/**
	 * Production extraction of provenance quotes from a PDF Buffer with exact page number tracking.
	 * @param {Buffer|Uint8Array} pdfBuffer 
	 * @param {Object} options
	 * @param {string} options.sourceUrl The direct PDF URL
	 * @param {Array<string>} [options.targetKeywords] Focus terms e.g. ["income", "cgpa", "caste"]
	 * @returns {Promise<Array>} Array of strict provenanceQuote items
	 */
	static async extractFromPdfBuffer(pdfBuffer, options = {}) {
		const { sourceUrl, targetKeywords = [] } = options;
		if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
			throw new Error("extractFromPdfBuffer requires a valid absolute HTTP/HTTPS sourceUrl");
		}

		const quotes = [];

		try {
			// Dynamically import pdf-parse
			const pdfModule = await import("pdf-parse");
			const PDFParse = pdfModule.PDFParse || pdfModule.default;

			if (!PDFParse) {
				throw new Error("Could not resolve PDFParse constructor from pdf-parse module");
			}

			const parser = new PDFParse({ data: pdfBuffer });
			const result = await parser.getText();
			await parser.destroy().catch(() => {});

			// Process per-page text
			const pages = Array.isArray(result?.pages) ? result.pages : [];

			if (pages.length > 0) {
				pages.forEach((pageObj, pIdx) => {
					const pageNumber = pageObj.pageNumber || pIdx + 1;
					const pageText = pageObj.text || "";

					this.extractClausesFromText(pageText, {
						sourceUrl,
						page: pageNumber,
						targetKeywords,
						quotesSink: quotes,
					});
				});
			} else if (result?.text) {
				// Single block fallback
				this.extractClausesFromText(result.text, {
					sourceUrl,
					page: 1,
					targetKeywords,
					quotesSink: quotes,
				});
			}
		} catch (err) {
			console.warn(`[ProvenanceExtractor] PDF extraction warning (${options.sourceUrl}):`, err.message);
		}

		return quotes;
	}

	/**
	 * Extracts regulatory clauses from raw document text.
	 * @private
	 */
	static extractClausesFromText(text, { sourceUrl, page, targetKeywords, quotesSink }) {
		if (!text || text.length < 20) return;

		// Split text into paragraphs or numbered lines
		const paragraphs = text
			.split(/\n\s*\n|\r\n\s*\r\n/)
			.map((p) => p.replace(/\s+/g, " ").trim())
			.filter((p) => p.length > 25);

		for (const para of paragraphs) {
			let detectedClause = null;

			// Check for clause markers
			for (const pattern of CLAUSE_PATTERNS) {
				const match = para.match(pattern);
				if (match) {
					detectedClause = match[0].trim();
					break;
				}
			}

			// Check keyword relevance
			const lowerPara = para.toLowerCase();
			const hasTargetKeywords =
				targetKeywords.length === 0 ||
				targetKeywords.some((kw) => lowerPara.includes(kw.toLowerCase()));

			const hasDomainKeywords = Object.keys(KEYWORD_WEIGHTS).some((kw) =>
				lowerPara.includes(kw)
			);

			if ((detectedClause || hasTargetKeywords) && hasDomainKeywords) {
				const clauseTitle = detectedClause || `Statutory Directive § Page ${page}`;
				const quoteText = para.length > 350 ? para.slice(0, 347) + "..." : para;
				const confidenceScore = this.calculateConfidence(quoteText, clauseTitle);
				const textFragment = this.generateTextFragment(quoteText);

				const validation = this.validateProvenanceQuote({
					clause: clauseTitle,
					quote: quoteText,
					sourceUrl,
					page,
					textFragment,
					confidenceScore,
				});

				if (validation.isValid && validation.quote) {
					// Prevent duplicate quotes
					if (!quotesSink.some((q) => q.quote === validation.quote.quote)) {
						quotesSink.push(validation.quote);
					}
				}
			}

			if (quotesSink.length >= 8) break; // Keep most authoritative quotes
		}
	}

	/**
	 * Extracts provenance quotes and direct PDF circular attachments from an HTML page.
	 * @param {string} html 
	 * @param {Object} options
	 * @param {string} options.pageUrl Current HTML page URL
	 * @param {string} [options.baseUrl] Origin host
	 * @returns {Array} Array of strict provenanceQuote items
	 */
	static extractFromHtml(html, options = {}) {
		const { pageUrl, baseUrl = "" } = options;
		if (!html || typeof html !== "string") return [];

		const quotes = [];
		const $ = cheerio.load(html);

		// Find direct PDF circular download links on the page if present
		let directDocUrl = null;
		$("a[href*='.pdf'], a[href*='circular'], a[href*='notification'], a[href*='guidelines']").each((_, el) => {
			const href = $(el).attr("href");
			if (href && !directDocUrl) {
				try {
					directDocUrl = new URL(href, baseUrl || pageUrl).href;
				} catch (_) {}
			}
		});

		const effectiveUrl = directDocUrl || pageUrl;

		// Extract clauses from table rows, lists, and quote blocks
		$("table tr, .guidelines-content p, .scheme-details li, blockquote, .circular-text p").each((idx, el) => {
			const text = $(el).text().replace(/\s+/g, " ").trim();
			if (text.length > 30 && text.length < 400) {
				const lower = text.toLowerCase();
				const hasKeywords = Object.keys(KEYWORD_WEIGHTS).some((k) => lower.includes(k));

				if (hasKeywords) {
					let clauseTitle = $(el).closest("section, div").find("h2, h3, h4, th").first().text().trim();
					if (!clauseTitle || clauseTitle.length > 50) {
						clauseTitle = `Statutory Guideline §${idx + 1}`;
					}

					const quoteItem = {
						clause: clauseTitle,
						quote: text,
						sourceUrl: effectiveUrl,
						page: directDocUrl ? 1 : null,
						textFragment: this.generateTextFragment(text),
						confidenceScore: this.calculateConfidence(text, clauseTitle),
					};

					const validation = this.validateProvenanceQuote(quoteItem);
					if (validation.isValid && validation.quote) {
						if (!quotes.some((q) => q.quote === validation.quote.quote)) {
							quotes.push(validation.quote);
						}
					}
				}
			}
			if (quotes.length >= 6) return false;
		});

		return quotes;
	}

	/**
	 * Maps eligibility AST rules to the most pertinent provenance quote with confidence rating.
	 * @param {Array} rules 
	 * @param {Array} provenanceQuotes 
	 * @returns {Array} Updated rules with verified citations or null if citation unavailable
	 */
	static mapRulesToProvenance(rules, provenanceQuotes) {
		if (!Array.isArray(rules)) return [];
		if (!Array.isArray(provenanceQuotes) || provenanceQuotes.length === 0) {
			return rules.map((r) => ({ ...r, citation: null }));
		}

		return rules.map((rule) => {
			const field = String(rule.field || "").toLowerCase();
			let bestQuote = null;
			let highestScore = 0;

			for (const quote of provenanceQuotes) {
				const text = `${quote.clause} ${quote.quote}`.toLowerCase();
				let matchScore = 0;

				if (field === "familyincome" && (text.includes("income") || text.includes("lakh"))) {
					matchScore += 0.8;
				} else if (field === "cgpa" && (text.includes("cgpa") || text.includes("grade") || text.includes("marks"))) {
					matchScore += 0.8;
				} else if (field === "percentage" && (text.includes("%") || text.includes("percentage") || text.includes("marks"))) {
					matchScore += 0.8;
				} else if (field === "castecategory" && (text.includes("sc") || text.includes("st") || text.includes("obc") || text.includes("caste"))) {
					matchScore += 0.8;
				} else if (field === "gender" && (text.includes("girl") || text.includes("female") || text.includes("women"))) {
					matchScore += 0.8;
				} else if (field === "hasdisability" && (text.includes("disability") || text.includes("specially-abled") || text.includes("pwd"))) {
					matchScore += 0.8;
				} else if (field === "educationlevel" && (text.includes("degree") || text.includes("postgraduate") || text.includes("ug") || text.includes("pg"))) {
					matchScore += 0.7;
				}

				if (matchScore > highestScore) {
					highestScore = matchScore;
					bestQuote = quote;
				}
			}

			if (bestQuote && highestScore >= 0.5) {
				return {
					...rule,
					citation: {
						...bestQuote,
						ruleId: rule.id,
					},
				};
			}

			return {
				...rule,
				citation: null,
			};
		});
	}
}

export default ProvenanceExtractor;
