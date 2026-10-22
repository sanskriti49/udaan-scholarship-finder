import { createHash } from "node:crypto";

export const digest = value => createHash("sha256").update(value).digest("hex");

export function extraction(body, text = "Circular No. TEST/2026/42\nDepartment of Testing\n1. Eligibility\nAnnual family income must not exceed Rs. 300000.\nThis synthetic public guideline is used to test source preservation, evidence offsets and safe fallback in the ingestion pipeline. 📚", method = "digital") {
	let offset = 0, index = 0;
	const words = [], lines = text.split("\n").map((value, row) => {
		let x = 10;
		for (const raw of value.split(" ")) {
			const width = Math.max(4, raw.length * 5);
			words.push({ index: index++, text: raw, bbox: [x, 10 + row * 20, x + width, 22 + row * 20], confidence: method === "ocr" ? 91 : null }); x += width + 5;
		}
		const line = { text: value, bbox: [10, 10 + row * 20, x, 22 + row * 20], font_size: 12, bold: false, start: offset, end: offset + value.length };
		offset += value.length + 1;
		return line;
	});
	return { contract_version: "1.0", extractor_version: "1.0.0", profile_sha256: digest("fixture-profile"), source_sha256: digest(body), byte_length: body.length,
		status: "complete", offset_unit: "utf16", coordinate_space: "page_points_top_left", ocr_languages: "eng", requires_review: method === "ocr", text,
		pages: [{ number: 1, width: 1600, height: 1000, original_rotation: 0, method, text, start: 0, end: text.length, words, lines }], tables: [],
		sections: [{ id: "s1", parent_id: null, level: 1, title: "Recorded criteria", kind: "eligibility", heading_text: null, start: 0, end: text.length, page_start: 1, page_end: 1, text }],
		metadata: { notification_numbers: [], issuing_authorities: [], deadline_dates: [] }, warnings: [] };
}
