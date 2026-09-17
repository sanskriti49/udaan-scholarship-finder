import { makeEvidence } from "../core/evidence.js";
import { findStatedAcademicYear, parseOfficialDate } from "../core/time.js";
import { canonicalTitle } from "../core/dedupe.js";

/**
 * Adapter for the NSP home page announcements. It does not create schemes; it
 * produces date assertions that the pipeline cross-checks against the scheme
 * listing. A disagreement between two official statements is surfaced, never
 * silently resolved.
 */
const RENEWAL_RE =
	/Renewal applications for (?:the )?(.+?)\s+(?:is|are) currently open[^.]*\.\s*Closing dates? for student application is\s*:?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i;

export const nspAnnouncementsAdapter = {
	id: "nspAnnouncements",

	extract(doc, snapshot) {
		const assertions = [];
		const issues = [];
		const academicYear = findStatedAcademicYear(doc.text);

		for (const paragraph of doc.text.split(/\n{1,}/)) {
			const m = paragraph.match(RENEWAL_RE);
			if (!m) continue;
			const titles = [...m[1].matchAll(/["“]([^"”]+)["”]/g)].map((x) => x[1].trim());
			const closesAt = parseOfficialDate(m[2].replace(/\//g, "-"), { endOfDay: true });
			if (!closesAt || titles.length === 0) {
				issues.push({ code: "announcement_unparsed", severity: "info", message: paragraph.slice(0, 160) });
				continue;
			}
			const evidence = makeEvidence(snapshot, paragraph.trim(), { field: "closesAt", locator: "home page announcement" });
			if (!evidence) continue;
			for (const title of titles) {
				assertions.push({
					type: "cycleDate",
					canonicalTitle: canonicalTitle(title),
					officialTitle: title,
					academicYear,
					applicationType: "renewal",
					field: "closesAt",
					value: closesAt,
					evidence,
				});
			}
		}
		return { records: [], assertions, issues, pageFacts: { academicYear } };
	},
};
