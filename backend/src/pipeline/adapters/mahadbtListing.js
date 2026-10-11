import * as cheerio from "cheerio";
import { makeEvidence } from "../core/evidence.js";
import { buildSchemeKey } from "../core/dedupe.js";
import { validateOfficialUrl } from "../core/urls.js";
import { genderFromTitle, levelFromTitle, casteGroupsFromTitle, disabilityFromTitle, tagsFromTitle } from "../core/extract.js";

/** Read the actual public MahaDBT department tabs; no assumed JSON API or deadlines. */
export const mahadbtListingAdapter = {
	id: "mahadbtListing",
	extract(doc, snapshot, { source }) {
		const records = [];
		const issues = [];
		if (!doc.html) return { records, issues: [{ code: "page_structure_changed", severity: "blocking", message: "MahaDBT listing requires the original public HTML" }] };
		const $ = cheerio.load(doc.html);
		const seen = new Set();
		$(".parentVerticalTab").each((_, tab) => {
			const root = $(tab);
			const departments = root.find(".resp-tabs-list.hor_1 > li").toArray().map((el) => $(el).text().replace(/\s+/g, " ").trim());
			root.find(".resp-tabs-container.hor_1 > div").each((index, group) => {
				const organization = departments[index];
				if (!organization) return;
				const organizationEv = makeEvidence(snapshot, organization, { field: "organization", locator: "department tab" });
				$(group).find('a[href*="/SchemeData/SchemeData?"]').each((_, el) => {
					const title = $(el).text().replace(/\s+/g, " ").trim();
					const checked = validateOfficialUrl($(el).attr("href"), source.allowedDomains, { base: doc.finalUrl || doc.url });
					if (!checked.ok || !title || !organizationEv) return;
					const titleEv = makeEvidence(snapshot, title, { field: "title", locator: "scheme link" });
					if (!titleEv) return;
					const schemeKey = buildSchemeKey("mahadbt-state", organization, title);
					if (seen.has(schemeKey)) return;
					seen.add(schemeKey);
					const fields = { title, officialTitle: title, organization, tags: tagsFromTitle(title) };
					const evidence = [titleEv, organizationEv];
					for (const [field, value] of Object.entries({ gender: genderFromTitle(title), level: levelFromTitle(title), casteGroups: casteGroupsFromTitle(title), disabilityRequired: disabilityFromTitle(title) || null })) {
						if (value == null) continue;
						fields[field] = value;
						evidence.push({ ...titleEv, field, locator: "official scheme title" });
					}
					records.push({
						sourceId: source.id, schemeKey, fields, evidence, cycles: [],
						links: { listingUrl: snapshot.url, guidelinesUrl: checked.url, applyUrl: checked.url, faqUrl: null },
						issues: [{ code: "cycle_dates_missing", severity: "info", message: "The department listing does not state a scheme-specific application window. Dates remain unknown; check the official scheme page." }],
						followUps: [{ url: checked.url, adapter: "mahadbtGuideline", role: "guidelines" }],
					});
				});
			});
		});
		if (records.length < (source.minExpectedSchemes ?? 1)) {
			issues.push({ code: "page_structure_changed", severity: "blocking", message: `Only ${records.length} MahaDBT scheme links found; department tabs may have changed. Existing data is preserved.` });
		}
		return { records, issues };
	},
};
