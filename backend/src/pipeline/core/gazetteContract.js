import { z } from "zod";

const integer = z.number().int().nonnegative();
const pageNumber = integer.min(1).max(200);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const bbox = z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative(), z.number().finite().nonnegative(), z.number().finite().nonnegative()])
	.refine(b => b[2] > b[0] && b[3] > b[1], "Empty or inverted bounding box");
const word = z.object({ index: integer, text: z.string().min(1).max(20000), bbox, confidence: z.number().min(0).max(100).nullable() }).strict();
const line = z.object({ text: z.string(), bbox, start: integer, end: integer, font_size: z.number().finite().nonnegative(), bold: z.boolean() }).strict();
const page = z.object({ number: pageNumber, width: z.number().finite().positive().max(100000), height: z.number().finite().positive().max(100000), original_rotation: z.number().int(),
	method: z.enum(["digital", "ocr", "unreadable", "blank"]), text: z.string(), start: integer, end: integer, words: z.array(word).max(12000), lines: z.array(line).max(12000) }).strict();
const cell = z.object({ row: integer.max(1999), column: integer.max(1999), row_span: integer.min(1).max(2000), column_span: integer.min(1).max(2000), text: z.string(), bbox, word_indices: z.array(integer).max(12000) }).strict();
const table = z.object({ id: z.string().min(1), page: pageNumber, method: z.enum(["pdfplumber_lines", "pdfplumber_text", "ocr_grid"]), bbox,
	row_count: integer.min(2).max(2000), column_count: integer.min(2).max(2000), rows: z.array(z.array(z.string().nullable()).max(2000)).max(2000), cells: z.array(cell).max(2000), requires_review: z.literal(true) }).strict();
const section = z.object({ id: z.string().min(1), parent_id: z.string().nullable(), level: integer.max(8), title: z.string(), kind: z.enum(["preamble", "eligibility", "benefits", "documents", "dates", "annexure", "other"]),
	heading_text: z.string().nullable(), start: integer, end: integer, page_start: pageNumber, page_end: pageNumber, text: z.string() }).strict();
const hit = z.object({ value: z.string(), quote: z.string(), page: pageNumber, bbox, start: integer, end: integer, method: z.enum(["digital", "ocr"]), requires_review: z.literal(true),
	date_text: z.string().nullable(), iso_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), date_note: z.string().nullable() }).strict();

export const gazetteExtractionSchema = z.object({
	contract_version: z.literal("1.0"), extractor_version: z.string().min(1).max(80), profile_sha256: hash, source_sha256: hash, byte_length: integer.min(1),
	status: z.enum(["complete", "partial"]), offset_unit: z.literal("utf16"), coordinate_space: z.literal("page_points_top_left"), ocr_languages: z.string().regex(/^[a-z]{3}(?:\+[a-z]{3}){0,7}$/), requires_review: z.boolean(),
	text: z.string().min(1).max(2_000_000), pages: z.array(page).min(1).max(200), tables: z.array(table).max(4000), sections: z.array(section).max(500),
	metadata: z.object({ notification_numbers: z.array(hit).max(500), issuing_authorities: z.array(hit).max(500), deadline_dates: z.array(hit).max(500) }).strict(),
	warnings: z.array(z.object({ code: z.string().regex(/^[A-Z0-9_]{1,80}$/), page: pageNumber.nullable(), message: z.string().max(500) }).strict()).max(1000),
}).strict().superRefine((data, context) => {
	const invalid = message => context.addIssue({ code: "custom", message });
	const within = (b, p) => b[0] >= -.1 && b[1] >= -.1 && b[2] <= p.width + 1 && b[3] <= p.height + 1;
	const exact = (start, end, text) => end >= start && end <= data.text.length && data.text.slice(start, end) === text;
	let offset = 0;
	for (const [index, p] of data.pages.entries()) {
		if (index) offset += 2;
		if (p.number !== index + 1 || p.start !== offset || !exact(p.start, p.end, p.text) || p.end !== p.start + p.text.length || p.lines.map(l => l.text).join("\n") !== p.text) invalid("Page text or UTF-16 offsets are inconsistent");
		offset = p.end;
		for (const [i, w] of p.words.entries()) if (w.index !== i || !within(w.bbox, p)) invalid("Word geometry or index is invalid");
		for (const l of p.lines) if (!within(l.bbox, p) || l.start < p.start || l.end > p.end || !exact(l.start, l.end, l.text)) invalid("Line evidence is inconsistent");
	}
	if (data.pages.map(p => p.text).join("\n\n") !== data.text || offset !== data.text.length) invalid("Document text is inconsistent");
	const tableIds = new Set();
	for (const t of data.tables) {
		const p = data.pages[t.page - 1];
		if (tableIds.has(t.id) || !p || !within(t.bbox, p) || t.row_count * t.column_count > 2000 || t.rows.length !== t.row_count || t.rows.some(r => r.length !== t.column_count)) { invalid("Table dimensions or identity are invalid"); continue; }
		tableIds.add(t.id);
		const occupied = new Set();
		for (const c of t.cells) {
			if (c.row + c.row_span > t.row_count || c.column + c.column_span > t.column_count || t.rows[c.row]?.[c.column] !== c.text || !within(c.bbox, p) || c.bbox[0] < t.bbox[0] - 1 || c.bbox[1] < t.bbox[1] - 1 || c.bbox[2] > t.bbox[2] + 1 || c.bbox[3] > t.bbox[3] + 1) { invalid("Cell dimensions are inconsistent"); continue; }
			for (let r = c.row; r < c.row + c.row_span; r++) for (let col = c.column; col < c.column + c.column_span; col++) {
				const key = `${r}:${col}`;
				if (occupied.has(key)) invalid("Table cells overlap");
				occupied.add(key);
			}
			for (const i of c.word_indices) {
				const w = p.words[i];
				if (!w) { invalid("Cell references a missing word"); continue; }
				const x = (w.bbox[0] + w.bbox[2]) / 2, y = (w.bbox[1] + w.bbox[3]) / 2;
				if (x < c.bbox[0] - 1 || x > c.bbox[2] + 1 || y < c.bbox[1] - 1 || y > c.bbox[3] + 1) invalid("Cell references a word outside its geometry");
			}
		}
	}
	const sections = new Map();
	for (const s of data.sections) {
		const parent = s.parent_id && sections.get(s.parent_id);
		const first = data.pages[s.page_start - 1], last = data.pages[s.page_end - 1];
		if (sections.has(s.id) || !exact(s.start, s.end, s.text) || !first || !last || s.page_end < s.page_start || first && (s.start < first.start || s.start > first.end) || last && s.end > last.end + 2 || s.heading_text && !s.text.startsWith(s.heading_text) || s.parent_id && (!parent || parent.level >= s.level || parent.start > s.start || parent.end < s.end)) invalid("Clause hierarchy or offsets are inconsistent");
		sections.set(s.id, s);
	}
	for (const group of Object.values(data.metadata)) for (const item of group) {
		const p = data.pages[item.page - 1];
		if (!p || !within(item.bbox, p) || item.start < p.start || item.end > p.end || !exact(item.start, item.end, item.quote) || !item.quote.includes(item.value) || item.method !== p.method) invalid("Metadata evidence is inconsistent");
		if (item.iso_date && (!Number.isFinite(Date.parse(item.iso_date)) || new Date(item.iso_date).toISOString().slice(0, 10) !== item.iso_date)) invalid("Metadata contains an invalid normalized date");
	}
	if (data.status === "complete" && data.pages.some(p => p.method === "unreadable")) invalid("An unreadable page requires partial extraction status");
	if ((data.status === "partial" || data.tables.length || data.pages.some(p => p.method === "ocr" || p.method === "unreadable")) && !data.requires_review) invalid("Uncertain extraction must require review");
});
