import * as cheerio from "cheerio";
import { sha256 } from "./http.js";

/**
 * Turns a fetch result into a normalised text document that adapters parse and
 * that citations point into. The same text is stored in the snapshot, so any
 * quote we show a student can be re-located byte-for-byte later.
 */

const BLOCK_TAGS = new Set([
	"p", "div", "section", "article", "header", "footer", "main", "aside", "nav", "table", "thead",
	"tbody", "tr", "ul", "ol", "dl", "dt", "dd", "form", "fieldset", "blockquote", "pre", "figure",
	"figcaption", "br", "hr", "td", "th", "button",
]);

export function normalizeWhitespace(text) {
	return String(text || "")
		.replace(/\u00a0/g, " ")
		.replace(/[ \t\f\v]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function resolveHref(href, baseUrl) {
	if (!href) return "";
	try {
		return new URL(href.trim().replace(/ /g, "%20"), baseUrl).toString().replace(/%20/g, " ");
	} catch {
		return href.trim();
	}
}

/**
 * HTML → text. Headings become "#"-prefixed lines, links become [text](href) and
 * images become ![alt](src), which is the same shape as a markdown capture of
 * the page. Adapters therefore parse one format regardless of how the page was
 * obtained.
 */
export function htmlToText(html, baseUrl) {
	const $ = cheerio.load(html);
	$("script, style, noscript, template, svg, iframe").remove();
	const out = [];

	const walk = (node) => {
		if (node.type === "text") {
			out.push(node.data.replace(/\s+/g, " "));
			return;
		}
		if (node.type !== "tag") return;
		const tag = node.name.toLowerCase();
		const el = $(node);

		const heading = tag.match(/^h([1-6])$/);
		if (heading) {
			const text = el.text().replace(/\s+/g, " ").trim();
			if (text) out.push(`\n\n${"#".repeat(Number(heading[1]))} ${text}\n\n`);
			return;
		}
		if (tag === "a") {
			const href = el.attr("href");
			const inner = el.text().replace(/\s+/g, " ").trim();
			if (href && !href.startsWith("#") && !/^javascript:/i.test(href)) {
				out.push(`[${inner}](${resolveHref(href, baseUrl)})`);
			} else {
				out.push(inner);
			}
			return;
		}
		if (tag === "img") {
			const src = el.attr("src");
			if (src) out.push(`![${el.attr("alt") || ""}](${resolveHref(src, baseUrl)})`);
			return;
		}
		if (tag === "li") out.push("\n- ");
		else if (BLOCK_TAGS.has(tag)) out.push("\n");

		for (const child of node.children || []) walk(child);

		if (BLOCK_TAGS.has(tag) || tag === "li") out.push("\n");
		if (tag === "td" || tag === "th") out.push(" ");
	};

	const root = $("body").get(0) || $.root().get(0);
	for (const child of root.children || []) walk(child);
	return normalizeWhitespace(out.join(""));
}

export async function pdfToText(buffer) {
	if (typeof globalThis.DOMMatrix === "undefined") {
		globalThis.DOMMatrix = class DOMMatrix {
			constructor(init) {
				this.a = 1;
				this.b = 0;
				this.c = 0;
				this.d = 1;
				this.e = 0;
				this.f = 0;
				if (Array.isArray(init)) {
					[this.a = 1, this.b = 0, this.c = 0, this.d = 1, this.e = 0, this.f = 0] = init;
				}
			}
			translate() { return this; }
			scale() { return this; }
			rotate() { return this; }
			multiply() { return this; }
			preMultiplySelf() { return this; }
			invertSelf() { return this; }
			multiplySelf() { return this; }
		};
	}
	const { PDFParse } = await import("pdf-parse");
	try {
		const workerUrl = new URL("./pdf.worker.mjs", import.meta.resolve("pdf-parse")).href;
		PDFParse.setWorker(workerUrl);
	} catch {}
	const parser = new PDFParse({ data: buffer });
	try {
		const result = await parser.getText();
		const pages = [];
		let text = "";
		for (const page of result.pages) {
			const pageText = normalizeWhitespace(page.text);
			if (text) text += "\n\n";
			pages.push({ page: page.num, start: text.length });
			text += pageText;
		}
		return { text, pages };
	} finally {
		await parser.destroy().catch(() => {});
	}
}

/**
 * Heuristic OCR/garbage detector. Scanned government PDFs often turn "₹" into
 * "{" or "t", merge words, and swap digits ("Rs. 12000/-" → "Rs. 120001").
 * A low score means numeric fields must not be auto-extracted.
 */
export function assessTextQuality(text) {
	const reasons = [];
	const sample = String(text || "");
	const words = sample.split(/\s+/).filter(Boolean);
	if (words.length < 30) reasons.push("too_little_text");

	const longJoined = words.filter((w) => /^[a-z]{25,}$/i.test(w)).length;
	if (longJoined >= 2) reasons.push("merged_words");

	const oddTokens = (sample.match(/[{}$][\s]?\d|\bt\d{3,}|\bl\d{1,2}\b|\bl\$h\b/g) || []).length;
	if (oddTokens >= 2) reasons.push("ocr_symbol_substitution");

	const letters = (sample.match(/[a-z]/gi) || []).length;
	const junk = (sample.match(/[^\w\s.,;:()'"\-–—/₹%&@#\[\]!?+*=<>|\u2018\u2019\u201c\u201d]/g) || []).length;
	if (letters > 0 && junk / letters > 0.03) reasons.push("high_symbol_noise");

	const ocrSuspect = reasons.some((r) => r !== "too_little_text");
	return { ocrSuspect, reasons, words: words.length };
}

/** Pull a self-declared document date/version label from the first lines. */
export function detectDocumentDateLabel(text) {
	const head = String(text || "").split("\n").slice(0, 12).join("\n");
	const monthYear = head.match(
		/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/,
	);
	if (monthYear) return { label: `${monthYear[1]} ${monthYear[2]}`, year: Number(monthYear[2]) };
	const paren = head.match(/\((20\d{2})\)/);
	if (paren) return { label: paren[1], year: Number(paren[1]) };
	const applicable = String(text || "").match(/Applicable for academic year (20\d{2}-\d{2}) onwards/i);
	if (applicable) {
		return { label: `AY ${applicable[1]} onwards`, year: Number(applicable[1].slice(0, 4)), openEnded: true };
	}
	return null;
}

/**
 * Build a document from a fetch result.
 * kind: html | pdf | json | text
 */
export async function toDocument(fetchResult, { gazetteClient = null, ocrLanguages, onIssue = async () => {} } = {}) {
	const contentType = fetchResult.contentType || "";
	const body = fetchResult.body;
	let kind;
	let text;
	let pages = null;
	let json = null;
	let documentIntelligence = null;
	let extractionMethod = null;

	if (contentType.startsWith("text/x-captured-text")) {
		// Recorded capture: the text was extracted at capture time.
		const src = fetchResult.capturedSourceType || "text/plain";
		if (src.includes("json")) {
			kind = "json";
			const raw = body.toString("utf8");
			json = JSON.parse(raw);
			text = raw;
		} else {
			kind = src.includes("pdf") ? "pdf" : src.includes("html") ? "html" : "text";
			text = normalizeWhitespace(body.toString("utf8"));
		}
	} else if (contentType.includes("pdf") || body.subarray(0, 5).toString("latin1") === "%PDF-") {
		kind = "pdf";
		if (gazetteClient?.enabled) {
			try { documentIntelligence = await gazetteClient.extract(body, { ocrLanguages }); }
			catch (error) {
				await onIssue({ code: "gazette_service_fallback", severity: "warning", message: "Document intelligence was unavailable or rejected this PDF; baseline text extraction was attempted.", details: { reason: error.code || "GAZETTE_UNAVAILABLE", httpStatus: error.status || null } });
			}
		}
		if (documentIntelligence?.status === "complete") {
			text = documentIntelligence.text;
			pages = documentIntelligence.pages.map(page => ({ page: page.number, start: page.start }));
			extractionMethod = "gazette";
		} else {
			try { ({ text, pages } = await pdfToText(body)); extractionMethod = "baseline"; }
			catch {
				if (!documentIntelligence?.text) {
					await onIssue({ code: "gazette_pdf_unreadable", severity: "warning", message: "This PDF could not be read by the available extractors. Existing verified scholarship values are preserved." });
					throw Object.assign(new Error("The PDF could not be read by the available extractors."), { code: "PDF_UNREADABLE" });
				}
			}
			if (!text?.trim() && documentIntelligence?.text) {
				text = documentIntelligence.text;
				pages = documentIntelligence.pages.map(page => ({ page: page.number, start: page.start }));
				extractionMethod = "partial_gazette";
			}
		}
		if (documentIntelligence?.status === "partial") await onIssue({ code: "gazette_partial_extraction", severity: "warning", message: "Some page content or geometry could not be extracted. Numeric policy fields require manual source review." });
		if (documentIntelligence?.requires_review) await onIssue({ code: "gazette_review_required", severity: "warning", message: "The PDF contains OCR, structured tables or incomplete content. Extracted policy values require source review.", details: { ocrPages: documentIntelligence.pages.filter(p => p.method === "ocr").map(p => p.number), tableCount: documentIntelligence.tables.length, warnings: documentIntelligence.warnings.map(w => ({ code: w.code, page: w.page })) } });
		if (!text?.trim()) {
			await onIssue({ code: "gazette_pdf_unreadable", severity: "warning", message: "No readable PDF text was found. Existing verified scholarship values are preserved." });
			throw Object.assign(new Error("No readable PDF text was found."), { code: "PDF_UNREADABLE" });
		}
	} else if (contentType.includes("json")) {
		kind = "json";
		const raw = body.toString("utf8");
		json = JSON.parse(raw);
		text = raw;
	} else if (contentType.includes("html") || /^\s*</.test(body.subarray(0, 200).toString("utf8"))) {
		kind = "html";
		text = htmlToText(body.toString("utf8"), fetchResult.finalUrl || fetchResult.url);
	} else {
		kind = "text";
		text = normalizeWhitespace(body.toString("utf8"));
	}

	return {
		url: fetchResult.url,
		finalUrl: fetchResult.finalUrl || fetchResult.url,
		kind,
		html: kind === "html" && !contentType.startsWith("text/x-captured-text") ? body.toString("utf8") : null,
		text,
		pages,
		json,
		textHash: sha256(text),
		quality: { ...assessTextQuality(text), ...(documentIntelligence?.requires_review ? { requiresManualReview: true } : {}) },
		documentDate: kind === "pdf" ? detectDocumentDateLabel(text) : null,
		documentIntelligence,
		extractionMethod,
	};
}

export function pageForOffset(pages, offset) {
	if (!Array.isArray(pages) || pages.length === 0) return null;
	let current = null;
	for (const p of pages) {
		if (p.start <= offset) current = p.page;
		else break;
	}
	return current;
}
