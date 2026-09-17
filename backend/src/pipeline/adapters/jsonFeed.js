import { makeEvidence } from "../core/evidence.js";
import { normalizeAcademicYear, parseOfficialDate } from "../core/time.js";
import { validateOfficialUrl } from "../core/urls.js";
import { buildSchemeKey } from "../core/dedupe.js";

/**
 * Generic adapter for official JSON endpoints. A source declares a mapping:
 *
 *   jsonMapping: {
 *     itemsPath: "data.schemes",
 *     namespace: "state-xyz",
 *     fields: { title: "schemeName", organization: "department", academicYear: "ay",
 *               opensAt: "startDate", closesAt: "endDate", guidelinesUrl: "guidelineUrl" }
 *   }
 *
 * Each value is cited by locating its exact JSON serialisation (`"key":"value"`)
 * in the stored response text. Values that cannot be located are dropped.
 */

const get = (obj, path) => path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);

const LOCATOR_LABELS = {
	familyIncomeMax: "Family Income Limit",
	familyIncome: "Family Income Limit",
	amountValue: "Scholarship Grant Amount",
	amount: "Scholarship Grant Amount",
	awardAmount: "Scholarship Grant Amount",
	title: "Official Scheme Name",
	schemeName: "Official Scheme Name",
	department: "Organizing Department",
	organization: "Organizing Department",
	guidelinesUrl: "Official Guidelines Document",
	guidelineUrl: "Official Guidelines Document",
	applyUrl: "Official Application Portal",
	applicationLink: "Official Application Portal",
	level: "Education & Course Level",
	category: "Category Eligibility",
	caste: "Category Eligibility",
	gender: "Gender Eligibility",
	startDate: "Application Opening Date",
	opensAt: "Application Opening Date",
	endDate: "Application Deadline",
	closesAt: "Application Deadline",
	description: "Scheme Overview & Guidelines",
	state: "State Eligibility",
};

function citeJsonValue(snapshot, key, value, fromIndex) {
	const serialized = JSON.stringify(value);
	const locator = LOCATOR_LABELS[key] || `${key.replace(/([A-Z])/g, " $1").trim()} Guideline`;
	for (const sep of [":", ": "]) {
		const ev = makeEvidence(snapshot, `"${key}"${sep}${serialized}`, { field: key, locator, fromIndex });
		if (ev) return ev;
	}
	return null;
}

export const jsonFeedAdapter = {
	id: "jsonFeed",

	extract(doc, snapshot, ctx) {
		const mapping = ctx.source.jsonMapping;
		const issues = [];
		const records = [];
		const items = get(doc.json, mapping.itemsPath);
		if (!Array.isArray(items)) {
			return {
				records,
				issues: [{ code: "page_structure_changed", severity: "blocking", message: `No array at ${mapping.itemsPath}` }],
			};
		}

		let cursor = 0;
		for (const item of items) {
			const f = mapping.fields;
			const title = get(item, f.title);
			if (typeof title !== "string" || !title.trim()) continue;
			const titleEv = citeJsonValue(snapshot, f.title.split(".").pop(), title, cursor);
			if (!titleEv) continue;
			cursor = titleEv.charStart;

			const evidence = [titleEv];
			const organization = f.organization ? get(item, f.organization) : null;
			if (organization) {
				const ev = citeJsonValue(snapshot, f.organization.split(".").pop(), organization, cursor);
				if (ev) evidence.push({ ...ev, field: "organization" });
			}

			const recordIssues = [];
			const cycles = [];
			const ay = f.academicYear ? normalizeAcademicYear(get(item, f.academicYear)) : null;
			if (ay) {
				const opensRaw = f.opensAt ? get(item, f.opensAt) : null;
				const closesRaw = f.closesAt ? get(item, f.closesAt) : null;
				const cycle = {
					academicYear: ay,
					applicationType: "general",
					opensAt: parseOfficialDate(opensRaw),
					closesAt: parseOfficialDate(closesRaw, { endOfDay: true }),
					evidence: [],
				};
				for (const [key, raw] of [
					[f.academicYear, get(item, f.academicYear)],
					[f.opensAt, opensRaw],
					[f.closesAt, closesRaw],
				]) {
					if (!key || raw == null) continue;
					const ev = citeJsonValue(snapshot, key.split(".").pop(), raw, cursor);
					if (ev) cycle.evidence.push({ ...ev, field: "cycle" });
				}
				if ((opensRaw && !cycle.opensAt) || (closesRaw && !cycle.closesAt)) {
					recordIssues.push({ code: "unparseable_date", severity: "blocking", message: "API date not in DD-MM-YYYY form." });
				} else if (cycle.evidence.length) {
					cycles.push(cycle);
				}
			}

			// Fact extraction with verifiable citations
			const category = f.category ? get(item, f.category) : null;
			if (category) {
				const ev = citeJsonValue(snapshot, f.category.split(".").pop(), category, cursor);
				if (ev) evidence.push({ ...ev, field: "category" });
			}

			const level = f.level ? get(item, f.level) : null;
			if (level) {
				const ev = citeJsonValue(snapshot, f.level.split(".").pop(), level, cursor);
				if (ev) evidence.push({ ...ev, field: "level" });
			}

			const state = f.state ? get(item, f.state) : (ctx.source.state || null);
			if (state && f.state) {
				const ev = citeJsonValue(snapshot, f.state.split(".").pop(), state, cursor);
				if (ev) evidence.push({ ...ev, field: "state" });
			}

			const gender = f.gender ? get(item, f.gender) : null;
			if (gender) {
				const ev = citeJsonValue(snapshot, f.gender.split(".").pop(), gender, cursor);
				if (ev) evidence.push({ ...ev, field: "gender" });
			}

			const casteGroups = f.casteGroups ? get(item, f.casteGroups) : null;
			if (casteGroups) {
				const ev = citeJsonValue(snapshot, f.casteGroups.split(".").pop(), casteGroups, cursor);
				if (ev) evidence.push({ ...ev, field: "casteGroups" });
			}

			let amount = null;
			if (f.amount) {
				const rawAmt = get(item, f.amount);
				if (rawAmt && typeof rawAmt.value === "number") {
					amount = {
						value: rawAmt.value,
						period: rawAmt.period || "yearly",
						currency: rawAmt.currency || "INR",
						displayString: rawAmt.displayString || `₹${rawAmt.value.toLocaleString("en-IN")}/${rawAmt.period || "year"}`,
					};
					const ev = citeJsonValue(snapshot, f.amount.split(".").pop(), rawAmt, cursor);
					if (ev) evidence.push({ ...ev, field: "amount" });
				}
			} else if (f.amountValue) {
				const val = get(item, f.amountValue);
				if (typeof val === "number") {
					const per = f.amountPeriod ? get(item, f.amountPeriod) : "yearly";
					amount = {
						value: val,
						period: per,
						currency: "INR",
						displayString: `₹${val.toLocaleString("en-IN")}/${per || "year"}`,
					};
					const ev = citeJsonValue(snapshot, f.amountValue.split(".").pop(), val, cursor);
					if (ev) evidence.push({ ...ev, field: "amount" });
				}
			}

			let familyIncome = null;
			if (f.familyIncome) {
				const rawInc = get(item, f.familyIncome);
				if (rawInc && typeof rawInc.max === "number") {
					familyIncome = {
						max: rawInc.max,
						operator: rawInc.operator || "LTE",
						evidence: [],
					};
					const ev = citeJsonValue(snapshot, f.familyIncome.split(".").pop(), rawInc, cursor);
					if (ev) {
						familyIncome.evidence.push({ ...ev, field: "familyIncome" });
						evidence.push({ ...ev, field: "familyIncome" });
					}
				}
			} else if (f.familyIncomeMax) {
				const maxVal = get(item, f.familyIncomeMax);
				if (typeof maxVal === "number") {
					familyIncome = {
						max: maxVal,
						operator: "LTE",
						evidence: [],
					};
					const ev = citeJsonValue(snapshot, f.familyIncomeMax.split(".").pop(), maxVal, cursor);
					if (ev) {
						familyIncome.evidence.push({ ...ev, field: "familyIncome" });
						evidence.push({ ...ev, field: "familyIncome" });
					}
				}
			}

			const description = f.description ? get(item, f.description) : null;
			if (description) {
				const ev = citeJsonValue(snapshot, f.description.split(".").pop(), description, cursor);
				if (ev) evidence.push({ ...ev, field: "description" });
			}

			const tags = f.tags ? get(item, f.tags) : [];

			const links = { listingUrl: snapshot.url, guidelinesUrl: null, faqUrl: null, applyUrl: null };
			if (f.guidelinesUrl) {
				const raw = get(item, f.guidelinesUrl);
				const checked = validateOfficialUrl(raw, ctx.source.allowedDomains);
				if (checked.ok) {
					const ev = citeJsonValue(snapshot, f.guidelinesUrl.split(".").pop(), raw, cursor);
					if (ev) {
						links.guidelinesUrl = checked.url;
						evidence.push({ ...ev, field: "guidelinesUrl" });
					}
				} else if (raw) {
					recordIssues.push({ code: "official_link_invalid", severity: "warning", message: `${raw}: ${checked.reason}` });
				}
			}

			if (f.applyUrl) {
				const raw = get(item, f.applyUrl);
				const checked = validateOfficialUrl(raw, ctx.source.allowedDomains, { allowRoot: true });
				if (checked.ok) {
					links.applyUrl = checked.url;
					const ev = citeJsonValue(snapshot, f.applyUrl.split(".").pop(), raw, cursor);
					if (ev) evidence.push({ ...ev, field: "applyUrl" });
				}
			}

			if (f.faqUrl) {
				const raw = get(item, f.faqUrl);
				const checked = validateOfficialUrl(raw, ctx.source.allowedDomains);
				if (checked.ok) {
					links.faqUrl = checked.url;
					const ev = citeJsonValue(snapshot, f.faqUrl.split(".").pop(), raw, cursor);
					if (ev) evidence.push({ ...ev, field: "faqUrl" });
				}
			}

			records.push({
				sourceId: ctx.source.id,
				schemeKey: buildSchemeKey(mapping.namespace, organization || ctx.source.name, title),
				fields: {
					title: title.trim(),
					officialTitle: title,
					organization: organization || null,
					category: category || null,
					level: level || null,
					state: state || null,
					gender: gender || null,
					casteGroups: Array.isArray(casteGroups) ? casteGroups : casteGroups ? [casteGroups] : null,
					familyIncome,
					amount,
					description: description || null,
					tags: Array.isArray(tags) ? tags : [],
				},
				evidence,
				cycles,
				links,
				issues: recordIssues,
				followUps: [],
			});
		}
		return { records, issues };
	},
};
