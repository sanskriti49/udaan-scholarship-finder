import { makeEvidence } from "../core/evidence.js";
import { findStatedAcademicYear, parseOfficialDate } from "../core/time.js";
import { validateOfficialUrl } from "../core/urls.js";
import { buildSchemeKey } from "../core/dedupe.js";
import {
	casteGroupsFromTitle,
	cleanTitle,
	disabilityFromTitle,
	genderFromTitle,
	levelFromTitle,
	schemeTypeFromTitle,
	tagsFromTitle,
} from "../core/extract.js";

/**
 * Adapter for https://scholarships.gov.in/All-Scholarships
 *
 * The page is server-rendered (no browser needed). Each scheme block is:
 *   <ministry name> / <ministry logo>
 *   ###### <official scheme title>
 *   Scheme Open from [(for Renewal)] : DD-MM-YYYY Student Application Open till ... : DD-MM-YYYY ...
 *   [Specifications](<guideline pdf>) [FAQ](<faq pdf>)
 *
 * The adapter only reports what the page states. The academic year comes from
 * the page's own "Academic Year YYYY-YY" banner; if it is missing, cycles are
 * not created at all.
 */

const DATE_LABELS = {
	opensAt: /Scheme Open from\s*(\(for Renewal\))?\s*:\s*([^\s]+)/i,
	closesAt: /Student Application Open till\s*(?:\(for Renewal\))?\s*:\s*([^\s]+)/i,
	defectiveVerificationUntil: /Defective Application Verification Open till\s*(?:\(for Renewal\))?\s*:\s*([^\s]+)/i,
	instituteVerificationUntil: /Institute Verification Open till\s*(?:\(for Renewal\))?\s*:\s*([^\s]+)/i,
	officerVerificationUntil: /DNO\/SNO\/MNO Verification Open till\s*(?:\(for Renewal\))?\s*:\s*([^\s]+)/i,
};

/** Extract the target of a markdown-style link, allowing parentheses in the URL. */
export function extractLinkTarget(line, label) {
	const marker = `[${label}](`;
	const at = line.indexOf(marker);
	if (at === -1) return null;
	let depth = 1;
	let i = at + marker.length;
	const start = i;
	for (; i < line.length; i += 1) {
		if (line[i] === "(") depth += 1;
		else if (line[i] === ")") {
			depth -= 1;
			if (depth === 0) break;
		}
	}
	return depth === 0 ? line.slice(start, i) : null;
}

function splitLines(text) {
	const lines = [];
	let offset = 0;
	for (const raw of text.split("\n")) {
		lines.push({ text: raw, offset });
		offset += raw.length + 1;
	}
	return lines;
}

const isImage = (t) => /^!\[/.test(t);
const isHeading6 = (t) => /^#{6}\s+/.test(t);
const isDateLine = (t) => /Scheme Open from/i.test(t) && /Open till/i.test(t);
const isLinkLine = (t) => /\[(Specifications|FAQ)\]\(/.test(t);

export const nspSchemeListAdapter = {
	id: "nspSchemeList",

	extract(doc, snapshot, ctx) {
		const issues = [];
		const records = [];
		const text = doc.text;
		const allowedDomains = ctx.source.allowedDomains;

		const academicYear = findStatedAcademicYear(text);
		const ayMatch = text.match(/Academic\s+Year\s+20\d{2}-\d{2}/i);
		const ayEvidence = ayMatch ? makeEvidence(snapshot, ayMatch[0], { field: "academicYear", locator: "page banner" }) : null;
		if (!academicYear || !ayEvidence) {
			issues.push({
				code: "academic_year_not_stated",
				severity: "blocking",
				message: "Listing page does not state an academic year; no application windows were recorded.",
			});
		}

		let applyUrl = null;
		let applyEvidence = null;
		const applyLine = text.split("\n").find((l) => /\[Apply For Scholarship\]\(/i.test(l));
		if (applyLine) {
			const target = extractLinkTarget(applyLine, "Apply For Scholarship");
			const checked = validateOfficialUrl(target, allowedDomains);
			if (checked.ok) {
				applyUrl = checked.url;
				applyEvidence = makeEvidence(snapshot, applyLine.trim(), { field: "applicationLink", locator: "Students menu" });
			}
		}

		const lines = splitLines(text);
		const startIdx = lines.findLastIndex((l) => /^#{3,6}\s*Schemes On NSP\s*$/i.test(l.text.trim()));
		if (startIdx === -1) {
			issues.push({
				code: "page_structure_changed",
				severity: "blocking",
				message: "Could not find the 'Schemes On NSP' section. The page layout may have changed.",
			});
			return { records, issues, pageFacts: { academicYear } };
		}

		const nextNonEmpty = (i) => {
			for (let j = i + 1; j < lines.length; j += 1) if (lines[j].text.trim()) return lines[j].text.trim();
			return "";
		};

		let ministry = null;
		let ministryLine = null;
		let current = null;
		const blocks = [];

		for (let i = startIdx + 1; i < lines.length; i += 1) {
			const line = lines[i];
			const t = line.text.trim();
			if (!t) continue;
			if (isHeading6(t)) {
				current = { title: t.replace(/^#{6}\s+/, "").trim(), titleLine: line, ministry, ministryLine };
				blocks.push(current);
				continue;
			}
			if (isImage(t)) continue;
			if (current && isDateLine(t)) {
				current.dateLine = line;
				continue;
			}
			if (current && isLinkLine(t)) {
				current.linkLine = line;
				continue;
			}
			if (/^[-[#]/.test(t) || /^Last update/i.test(t)) continue;
			if (isImage(nextNonEmpty(i))) {
				ministry = t;
				ministryLine = line;
			}
		}

		for (const block of blocks) {
			const rawTitle = block.title;
			const title = cleanTitle(rawTitle);
			const recordIssues = [];
			const titleEvidence = makeEvidence(snapshot, rawTitle, {
				field: "title",
				locator: "scheme heading",
				fromIndex: block.titleLine.offset,
			});
			const ministryEvidence = block.ministryLine
				? makeEvidence(snapshot, block.ministry, {
						field: "organization",
						locator: "ministry group heading",
						fromIndex: block.ministryLine.offset,
					})
				: null;

			const schemeKey = buildSchemeKey("nsp", block.ministry || "unknown", rawTitle);
			const evidence = [];
			if (titleEvidence) evidence.push(titleEvidence);
			if (ministryEvidence) evidence.push(ministryEvidence);

			const fields = { title, officialTitle: rawTitle, organization: block.ministry || null };

			// Title-derived facts: the title line itself is the citation.
			const derived = {
				category: schemeTypeFromTitle(rawTitle),
				gender: genderFromTitle(rawTitle),
				level: levelFromTitle(rawTitle),
				disabilityRequired: disabilityFromTitle(rawTitle) || null,
				casteGroups: casteGroupsFromTitle(rawTitle),
			};
			for (const [field, value] of Object.entries(derived)) {
				if (value === null || value === undefined) continue;
				fields[field] = value;
				if (titleEvidence) evidence.push({ ...titleEvidence, field, locator: "official scheme title" });
			}
			fields.tags = tagsFromTitle(rawTitle);

			// Links
			const links = { listingUrl: snapshot.url, guidelinesUrl: null, faqUrl: null, applyUrl };
			if (applyEvidence) evidence.push(applyEvidence);
			if (block.linkLine) {
				const linkText = block.linkLine.text.trim();
				for (const [label, key] of [
					["Specifications", "guidelinesUrl"],
					["FAQ", "faqUrl"],
				]) {
					const target = extractLinkTarget(linkText, label);
					if (target === null) continue;
					const checked = validateOfficialUrl(target, allowedDomains);
					if (checked.ok) {
						links[key] = checked.url;
						const ev = makeEvidence(snapshot, linkText, { field: key, locator: `${label} link`, fromIndex: block.linkLine.offset });
						if (ev) evidence.push(ev);
					} else {
						recordIssues.push({
							code: "official_link_invalid",
							severity: "warning",
							message: `${label} link on the listing is not usable (${checked.reason}: ${target}); it was not stored.`,
							details: { label, target, reason: checked.reason },
						});
					}
				}
			} else {
				recordIssues.push({ code: "official_link_missing", severity: "warning", message: "No guideline links listed." });
			}

			// Cycle
			const cycles = [];
			if (!block.dateLine) {
				recordIssues.push({
					code: "cycle_dates_missing",
					severity: "warning",
					message: "The listing shows no application window for this scheme.",
				});
			} else if (academicYear && ayEvidence) {
				const dl = block.dateLine.text;
				const cycle = {
					academicYear,
					applicationType: /\(for Renewal\)/i.test(dl) ? "renewal" : "general",
				};
				let dateError = false;
				for (const [field, re] of Object.entries(DATE_LABELS)) {
					const m = dl.match(re);
					if (!m) {
						cycle[field] = null;
						continue;
					}
					const raw = field === "opensAt" ? m[2] : m[1];
					const parsed = parseOfficialDate(raw, { endOfDay: field !== "opensAt" });
					if (!parsed) {
						dateError = true;
						recordIssues.push({
							code: "unparseable_date",
							severity: "blocking",
							message: `Could not parse ${field} value "${raw}" from the listing.`,
						});
					}
					cycle[field] = parsed;
				}
				const dateEvidence = makeEvidence(snapshot, dl.trim(), {
					field: "cycle",
					locator: "application window",
					fromIndex: block.dateLine.offset,
				});
				if (dateEvidence && !dateError) {
					cycle.evidence = [dateEvidence, ayEvidence];
					cycles.push(cycle);
				} else if (!dateEvidence) {
					recordIssues.push({ code: "evidence_not_locatable", severity: "blocking", message: "Date line could not be cited." });
				}
			}

			records.push({
				sourceId: ctx.source.id,
				schemeKey,
				fields,
				evidence,
				cycles,
				links,
				issues: recordIssues,
				followUps: links.guidelinesUrl ? [{ url: links.guidelinesUrl, adapter: "guidelinePdf", role: "guidelines" }] : [],
			});
		}

		if (records.length < (ctx.source.minExpectedSchemes ?? 1)) {
			issues.push({
				code: "too_few_schemes",
				severity: "blocking",
				message: `Parsed ${records.length} schemes, expected at least ${ctx.source.minExpectedSchemes}. Treating the page as broken; nothing was updated.`,
			});
		}

		return { records, issues, pageFacts: { academicYear } };
	},
};
