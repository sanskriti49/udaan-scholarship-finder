import * as cheerio from "cheerio";
import { htmlToText, assessTextQuality } from "../core/documents.js";
import { guidelinePdfAdapter } from "./guidelinePdf.js";

/** Keep portal help modals and unrelated navigation out of scheme-specific facts. */
export const mahadbtGuidelineAdapter = {
	id: "mahadbtGuideline",
	extract(doc, snapshot, ctx) {
		if (!doc.html) return { facts: {}, issues: [{ code: "scheme_details_missing", severity: "warning", message: "Original scheme HTML unavailable; numeric criteria were withheld." }] };
		const $ = cheerio.load(doc.html);
		const heading = $("h3").filter((_, el) => $(el).text().trim() === "Eligibility").first();
		const panel = heading.closest(".col-md-8");
		if (!panel.length) return { facts: {}, issues: [{ code: "scheme_details_missing", severity: "warning", message: "MahaDBT scheme details layout changed; numeric criteria were withheld." }] };
		const text = htmlToText($.html(panel), doc.finalUrl || doc.url);
		return guidelinePdfAdapter.extract({ ...doc, text, quality: assessTextQuality(text) }, snapshot, ctx);
	},
};
