/**
 * Field extractors. Every extractor returns candidates of the form
 * { value, quote, index } where `quote` is a verbatim substring of the input
 * text starting at `index`. Callers turn quotes into evidence; a value without
 * a locatable quote is discarded.
 *
 * Extractors are intentionally narrow: they recognise the phrasing used in
 * Indian central-government scholarship guidelines and return nothing rather
 * than guess when the phrasing differs.
 */

const RUPEE = String.raw`(?:Rs\.?|₹|INR)`;
const NUMBER = String.raw`([0-9][0-9,]*(?:\.[0-9]+)?)`;

function lineBounds(text, index, length) {
	let start = text.lastIndexOf("\n", index - 1) + 1;
	let end = text.indexOf("\n", index + length);
	if (end === -1) end = text.length;
	// Short wrapped lines: include the following line for readable context.
	if (end - start < 50 && end < text.length) {
		const next = text.indexOf("\n", end + 1);
		end = next === -1 ? text.length : next;
	}
	return { start, end };
}

function contextQuote(text, index, length) {
	const { start, end } = lineBounds(text, index, length);
	const raw = text.slice(start, end);
	const leading = raw.length - raw.trimStart().length;
	return { quote: raw.trim(), index: start + leading };
}

export function parseIndianNumber(raw) {
	if (raw === null || raw === undefined) return null;
	const cleaned = String(raw).replace(/,/g, "");
	if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

const PERIOD_MAP = [
	[/^(per\s+annum|p\.?\s*a\.?|per\s+year)$/i, "yearly"],
	[/^(per\s+month|p\.?\s*m\.?)$/i, "monthly"],
];

function normalizePeriod(raw) {
	const cleaned = String(raw || "").replace(/\s+/g, " ").trim();
	for (const [re, period] of PERIOD_MAP) if (re.test(cleaned)) return period;
	return null;
}

/**
 * Scholarship award amounts, e.g. "Rs. 50,000/- per annum",
 * "₹12,000/-per annum", "Rs.8,000/- per month for 10 months".
 * Skips lines about income limits and "Note:" lines about past rates.
 */
export function extractAmounts(text) {
	const re = new RegExp(
		String.raw`${RUPEE}\s*${NUMBER}\s*(?:\/-|\/)?\s*(per\s+annum|p\.\s?a\.|per\s+year|per\s+month)(?:\s+for\s+(\d{1,2})\s+months)?`,
		"gi",
	);
	const out = [];
	let m;
	while ((m = re.exec(text))) {
		const { start, end } = lineBounds(text, m.index, m[0].length);
		const line = text.slice(start, end);
		if (/income/i.test(line)) continue;
		if (/^\s*note\b/i.test(line)) continue;
		const value = parseIndianNumber(m[1]);
		const period = normalizePeriod(m[2]);
		if (value === null || !period) continue;
		const ctx = contextQuote(text, m.index, m[0].length);
		out.push({
			value,
			period,
			months: m[3] ? Number(m[3]) : null,
			quote: ctx.quote,
			index: ctx.index,
			matched: m[0],
		});
	}
	return out;
}

/**
 * Family-income ceilings, e.g. "income ... should not be more than Rs. 8 lakh",
 * "income upto ₹ 4.5 lakh", "income ... should be below Rs. 04.50 lakh".
 */
export function extractIncomeLimits(text) {
	const re = new RegExp(
		String.raw`income[^\n.;]{0,80}(?:\n[^\n.;]{0,60})?\s(not\s+(?:be\s+)?more\s+than|upto|up\s+to|not\s+exceed(?:ing)?|below|less\s+than)\s*${RUPEE}\s*${NUMBER}\s*(lakhs?|lacs?)?`,
		"gi",
	);
	const out = [];
	let m;
	while ((m = re.exec(text))) {
		const base = parseIndianNumber(m[2]);
		if (base === null) continue;
		const value = m[3] ? Math.round(base * 100000) : base;
		const operator = /below|less/i.test(m[1]) ? "LT" : "LTE";
		const ctx = contextQuote(text, m.index, m[0].length);
		out.push({ value, operator, quote: ctx.quote, index: ctx.index, matched: m[0] });
	}
	return out;
}

/** "disability of not less than 40%" */
export function extractMinDisabilityPercent(text) {
	const re = /disability\s+of\s+not\s+less\s+than\s+(\d{2})\s*%/gi;
	const out = [];
	let m;
	while ((m = re.exec(text))) {
		const ctx = contextQuote(text, m.index, m[0].length);
		out.push({ value: Number(m[1]), quote: ctx.quote, index: ctx.index });
	}
	return out;
}

/** Collapse candidates with identical values; report whether they disagree. */
export function consolidate(candidates, keyFn = (c) => JSON.stringify([c.value, c.period ?? null, c.operator ?? null])) {
	const groups = new Map();
	for (const c of candidates) {
		const key = keyFn(c);
		if (!groups.has(key)) groups.set(key, c);
	}
	const distinct = [...groups.values()];
	return { distinct, agreed: distinct.length === 1 ? distinct[0] : null, conflicting: distinct.length > 1 };
}

// ---- Title-derived facts (evidence = the official title line itself) ----

export function schemeTypeFromTitle(title) {
	if (/\(\s*Merit Based Scheme\s*\)/i.test(title)) return "Merit based";
	if (/\(\s*Welfare Based Scheme\s*\)/i.test(title)) return "Welfare based";
	return null;
}

export function genderFromTitle(title) {
	if (/\b(girl|girls|women|woman|female)\b/i.test(title)) return "Female";
	return null;
}

export function levelFromTitle(title) {
	const t = String(title);
	if (/technical\s+diploma/i.test(t)) return "Diploma";
	if (/technical\s+degree/i.test(t)) return "UG";
	if (/under\s*graduate\s+and\s+post\s*graduate/i.test(t)) return null;
	if (/\bnts-?ug\b/i.test(t)) return "UG";
	if (/\bnts-?pg\b|post\s*graduate/i.test(t)) return "PG";
	if (/\bcsss\b|college\s+and\s+university\s+students/i.test(t)) return "UG";
	if (/\bpre[\s-]matric\b/i.test(t)) return "Class 10";
	if (/\bjrf\b|\bsrf\b|junior\s+research\s+fellowships?/i.test(t)) return "PhD";
	return null;
}

export function disabilityFromTitle(title) {
	return /specially\s+abled|with\s+disabilities|disabilit/i.test(title);
}

export function casteGroupsFromTitle(title) {
	const t = String(title);
	if (/\bfor\s+SC\s+students\b/i.test(t)) return ["SC"];
	if (/\bof\s+ST\s+students\b|schedule\s+tribe/i.test(t)) return ["ST"];
	return null;
}

export function tagsFromTitle(title) {
	const tags = new Set();
	if (genderFromTitle(title)) tags.add("Women");
	if (disabilityFromTitle(title)) tags.add("Disability");
	if (/\b(SC|ST|OBC|EBC|DNT)\b/i.test(title) || /schedule\s+tribe/i.test(title)) {
		tags.add("SC/ST/OBC");
		tags.add("SC / ST / OBC");
	}
	if (/\bNER\b|north\s+eastern/i.test(title)) tags.add("North East");
	if (/\bAICTE\b|technical|degree|diploma|engineering|energy/i.test(title)) {
		tags.add("Technical");
		tags.add("STEM");
		tags.add("Engineering");
	}
	if (/fellowship/i.test(title)) tags.add("Fellowship");
	if (/minority/i.test(title)) tags.add("Minority");
	if (/means|welfare|pre[\s-]matric|post[\s-]matric/i.test(title)) tags.add("Need based");
	if (/pre[\s-]matric/i.test(title)) tags.add("Class 10");
	if (/post[\s-]matric/i.test(title)) tags.add("Class 12");
	return [...tags];
}

const SCHEME_TYPE_SUFFIX = /\s*\(\s*(?:Merit|Welfare)\s+Based\s+Scheme\s*\)\s*$/i;

export function cleanTitle(title) {
	return String(title || "")
		.replace(SCHEME_TYPE_SUFFIX, "")
		.replace(/\s+/g, " ")
		.replace(/\(\s+/g, "(")
		.replace(/'S\b/g, "'s")
		.trim();
}
