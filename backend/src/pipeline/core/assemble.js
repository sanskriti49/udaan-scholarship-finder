import { formatIstDate, isWithinAcademicYearWindow } from "./time.js";
import { canonicalTitle } from "./dedupe.js";
import { cleanPortalUrl } from "./urls.js";

/**
 * Assemble a normalised scholarship record from:
 *   - the listing candidate (title, body, cycle dates, links — all cited)
 *   - guideline facts (amount, income, disability — all cited, may be absent)
 *   - cross-check assertions from other official pages
 *
 * Nothing is filled in from defaults. Unknown stays null and is listed in
 * dataQuality.unknownFields so the UI can say "not published" honestly.
 */

const REGION_FROM_TITLE = [
	[/\bNER\b|north\s+eastern/i, "North Eastern Region"],
	[/jammu\s+kashmir\s+and\s+ladakh/i, "Jammu & Kashmir and Ladakh"],
];

const CRITICAL_FIELDS = ["amount", "familyIncome", "deadline", "applicationLink", "guidelinesUrl"];

function evidenceFor(evidence, field) {
	return evidence.filter((e) => e.field === field);
}

function ruleCitation(rule, evidenceList) {
	const ev = evidenceList[0];
	if (!ev) return null;
	return {
		ruleId: rule.id,
		sourceUrl: ev.url,
		quote: ev.quote,
		clause: ev.locator,
		page: ev.page ?? null,
		snapshotId: ev.snapshotId,
		verifiedAt: ev.fetchedAt,
	};
}

/** Build evaluator rules only from facts that carry evidence. */
export function buildRules(schemeKey, facts, evidence) {
	const rules = [];
	const quotes = [];
	const push = (rule, evs) => {
		const citation = ruleCitation(rule, evs);
		if (!citation) return;
		rules.push({ ...rule, isMandatory: true, evidenceSnapshotId: citation.snapshotId });
		quotes.push(citation);
	};
	const id = (suffix) => `${schemeKey}#${suffix}`;

	if (facts.familyIncome) {
		const { max, operator } = facts.familyIncome;
		const inr = `₹${max.toLocaleString("en-IN")}`;
		push(
			{
				id: id("income"),
				field: "familyIncome",
				operator,
				targetValue: max,
				description: operator === "LT" ? `Family income must be below ${inr} per year` : `Family income must not exceed ${inr} per year`,
				failMessage: `Family income is above the official limit of ${inr}`,
			},
			facts.familyIncome.evidence,
		);
	}
	if (facts.gender === "Female") {
		push(
			{ id: id("gender"), field: "gender", operator: "EQ", targetValue: "Female", description: "Open to girl students only" },
			evidenceFor(evidence, "gender"),
		);
	}
	if (facts.disabilityRequired) {
		const pct = facts.minDisabilityPercent?.value;
		push(
			{
				id: id("disability"),
				field: "hasDisability",
				operator: "BOOLEAN_MATCH",
				targetValue: true,
				description: pct ? `Disability of at least ${pct}% required` : "For students with disabilities",
			},
			facts.minDisabilityPercent?.evidence || evidenceFor(evidence, "disabilityRequired"),
		);
	}
	if (facts.level === "UG" || facts.level === "PG") {
		push(
			{ id: id("level"), field: "educationLevel", operator: "EQ", targetValue: facts.level, description: `For ${facts.level} students` },
			evidenceFor(evidence, "level"),
		);
	}
	if (Array.isArray(facts.casteGroups) && facts.casteGroups.length) {
		push(
			{
				id: id("caste"),
				field: "casteCategory",
				operator: "IN",
				targetValue: facts.casteGroups,
				description: `For ${facts.casteGroups.join("/")} students`,
			},
			evidenceFor(evidence, "casteGroups"),
		);
	}
	return { rules, provenanceQuotes: quotes };
}

/**
 * Apply cross-check assertions (e.g. an NSP announcement stating a closing
 * date). Agreement adds evidence; disagreement is recorded as a conflict and
 * the earlier (safer) date is used as closesAt with the later one kept as
 * latestPossibleClosesAt.
 */
export function applyAssertions(record, assertions) {
	const issues = [];
	const title = canonicalTitle(record.officialTitle || record.title);
	for (const a of assertions) {
		if (a.type !== "cycleDate" || a.canonicalTitle !== title) continue;
		const cycle = record.cycles.find((c) => c.academicYear === a.academicYear && c.applicationType === a.applicationType);
		if (!cycle) {
			issues.push({
				code: "assertion_without_cycle",
				severity: "info",
				message: `An official announcement mentions a ${a.applicationType} window for AY ${a.academicYear} that the listing does not show.`,
			});
			continue;
		}
		const current = cycle[a.field];
		if (current && current.getTime() === a.value.getTime()) {
			cycle.evidence.push(a.evidence);
			continue;
		}
		const values = [current, a.value].filter(Boolean).sort((x, y) => x - y);
		cycle.conflicts = cycle.conflicts || [];
		cycle.conflicts.push({
			field: a.field,
			values: [
				{ value: current, evidence: cycle.evidence[0] },
				{ value: a.value, evidence: a.evidence },
			],
		});
		cycle.evidence.push(a.evidence);
		if (a.field === "closesAt") {
			cycle.closesAt = values[0];
			cycle.latestPossibleClosesAt = values[values.length - 1];
		}
		issues.push({
			code: "official_date_conflict",
			severity: "warning",
			message: `Official NSP pages disagree on the ${a.applicationType} closing date for AY ${a.academicYear}: ${formatIstDate(current)} (scheme list) vs ${formatIstDate(a.value)} (announcement). Showing the earlier date; review required.`,
			details: { values: values.map((v) => v.toISOString()) },
		});
	}
	return issues;
}

export function selectCurrentCycle(cycles) {
	if (!cycles?.length) return null;
	return [...cycles].sort((a, b) => {
		if (a.academicYear !== b.academicYear) return a.academicYear < b.academicYear ? 1 : -1;
		// Prefer the general window over renewal-only when both exist for one year.
		if (a.applicationType !== b.applicationType) return a.applicationType === "general" ? -1 : 1;
		return 0;
	})[0];
}

export function validateRecord(record) {
	const issues = [];
	const block = (code, message) => issues.push({ code, severity: "blocking", message });
	if (!record.title || record.title.length < 5) block("missing_title", "Title is missing.");
	if (!record.fieldEvidence.some((e) => e.field === "title")) block("title_not_cited", "Title has no citation.");
	if (!record.organization) block("missing_organization", "Administering body is unknown.");
	if (!record.sourceUrl) block("missing_source_url", "No official source URL.");

	for (const cycle of record.cycles) {
		if (!cycle.academicYear) block("cycle_without_academic_year", "Cycle has no academic year.");
		if (!cycle.evidence?.length) block("cycle_not_cited", "Cycle dates have no citation.");
		if (cycle.opensAt && cycle.closesAt && cycle.closesAt < cycle.opensAt) {
			block("close_before_open", `Closing date ${formatIstDate(cycle.closesAt)} is before opening date ${formatIstDate(cycle.opensAt)}.`);
		}
		for (const field of ["opensAt", "closesAt", "latestPossibleClosesAt"]) {
			if (cycle[field] && !isWithinAcademicYearWindow(cycle[field], cycle.academicYear)) {
				block("date_outside_academic_year", `${field} ${formatIstDate(cycle[field])} is implausible for AY ${cycle.academicYear}.`);
			}
		}
	}

	for (const rule of record.rules) {
		if (!record.provenanceQuotes.some((q) => q.ruleId === rule.id)) {
			block("rule_not_cited", `Rule ${rule.id} has no citation.`);
		}
	}
	return issues;
}

/**
 * @returns {{ record, issues }}
 */
export function assembleRecord(candidate, { source, guideline, assertions = [] }) {
	const f = candidate.fields;
	const issues = [...(candidate.issues || [])];
	const evidence = [...candidate.evidence];

	const facts = {
		gender: f.gender || null,
		level: f.level || null,
		disabilityRequired: f.disabilityRequired || false,
		casteGroups: f.casteGroups || null,
		familyIncome: f.familyIncome || null,
		minDisabilityPercent: f.minDisabilityPercent || null,
	};

	let amount = f.amount || null;
	if (guideline?.facts) {
		const g = guideline.facts;
		if (g.amount) {
			const { evidence: amountEvidence, ...rest } = g.amount;
			amount = rest;
			evidence.push(...amountEvidence);
		}
		if (g.familyIncome) {
			facts.familyIncome = g.familyIncome;
			evidence.push(...g.familyIncome.evidence);
		}
		if (g.minDisabilityPercent && facts.disabilityRequired) {
			facts.minDisabilityPercent = g.minDisabilityPercent;
			evidence.push(...g.minDisabilityPercent.evidence);
		}
	}
	if (guideline?.issues) issues.push(...guideline.issues);
	if (guideline?.error) {
		issues.push({
			code: "guideline_fetch_failed",
			severity: "info",
			message: `Guideline document could not be fetched this run (${guideline.error}); previously verified figures are kept.`,
		});
	}

	const cycles = candidate.cycles.map((c) => ({ ...c, evidence: [...c.evidence] }));
	const record = {
		schemeKey: candidate.schemeKey,
		title: f.title,
		officialTitle: f.officialTitle,
		organization: f.organization,
		sourceType: f.sourceType || source.sourceType,
		authorityTier: source.authorityTier,
		primarySourceId: source.id,
		sourceSite: source.name,
		sourceUrl: cleanPortalUrl(candidate.links.guidelinesUrl || candidate.links.listingUrl || candidate.links.applyUrl),
		applicationLink: cleanPortalUrl(candidate.links.applyUrl || candidate.links.listingUrl || null),
		officialLinks: {
			listingUrl: cleanPortalUrl(candidate.links.listingUrl),
			guidelinesUrl: cleanPortalUrl(candidate.links.guidelinesUrl || null),
			faqUrl: cleanPortalUrl(candidate.links.faqUrl || null),
			applyUrl: cleanPortalUrl(candidate.links.applyUrl || candidate.links.listingUrl || null),
		},
		category: f.category || null,
		level: f.level || null,
		tags: f.tags || [],
		state: f.state || candidate.state || source.state || "All India",
		amount,
		eligibility: {
			gender: facts.gender,
			disabilityRequired: facts.disabilityRequired,
			minDisabilityPercent: facts.minDisabilityPercent?.value ?? null,
			familyIncome: facts.familyIncome ? { max: facts.familyIncome.max, operator: facts.familyIncome.operator } : null,
			casteCategories: facts.casteGroups || [],
		},
		requiredDocuments: [],
		cycles,
		fieldEvidence: evidence,
	};

	for (const [re, region] of REGION_FROM_TITLE) {
		if (re.test(record.officialTitle || "")) {
			record.state = region;
			const titleEv = evidence.find((e) => e.field === "title");
			if (titleEv) evidence.push({ ...titleEv, field: "state", locator: "official scheme title" });
		}
	}

	issues.push(...applyAssertions(record, assertions));
	const { rules, provenanceQuotes } = buildRules(record.schemeKey, facts, evidence);
	record.rules = rules;
	record.provenanceQuotes = provenanceQuotes;
	record.currentCycle = selectCurrentCycle(record.cycles);

	if (record.currentCycle?.applicationType === "renewal") {
		issues.push({
			code: "renewal_only_window",
			severity: "info",
			message: `The published AY ${record.currentCycle.academicYear} window is for renewal applications only; no fresh-application window is listed.`,
		});
	}

	// Plain factual summary built only from cited fields.
	const portalName = source.name && source.name.includes("National Scholarship Portal")
		? "the National Scholarship Portal"
		: (source.name || "the official portal");
	const parts = [`Listed on ${portalName}`];
	if (record.currentCycle) parts.push(`for AY ${record.currentCycle.academicYear}`);
	if (record.organization) parts.push(`under ${record.organization}`);
	record.summary = `${parts.join(" ")}.`;
	record.description = f.description || record.summary;

	const known = {
		amount: Boolean(amount),
		familyIncome: Boolean(facts.familyIncome) || false,
		deadline: Boolean(record.currentCycle?.closesAt),
		applicationLink: Boolean(record.applicationLink),
		guidelinesUrl: Boolean(record.officialLinks.guidelinesUrl),
	};
	record.dataQuality = {
		unknownFields: CRITICAL_FIELDS.filter((k) => !known[k]),
		completeness: Math.round((CRITICAL_FIELDS.filter((k) => known[k]).length / CRITICAL_FIELDS.length) * 100),
	};

	issues.push(...validateRecord(record));
	return { record, issues };
}
