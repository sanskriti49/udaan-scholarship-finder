import { nspSchemeListAdapter } from "./adapters/nspSchemeList.js";
import { nspAnnouncementsAdapter } from "./adapters/nspAnnouncements.js";
import { guidelinePdfAdapter } from "./adapters/guidelinePdf.js";
import { jsonFeedAdapter } from "./adapters/jsonFeed.js";

export const ADAPTERS = {
	[nspSchemeListAdapter.id]: nspSchemeListAdapter,
	[nspAnnouncementsAdapter.id]: nspAnnouncementsAdapter,
	[guidelinePdfAdapter.id]: guidelinePdfAdapter,
	[jsonFeedAdapter.id]: jsonFeedAdapter,
};

/**
 * Authority tiers (lower is more authoritative):
 *   1  Official portal / notification of the administering government body
 *   2  Official site of a statutory body or PSU implementing the scheme
 *   3  Official site of a private trust / CSR programme (about its own scheme)
 * Aggregators and news sites are never registered as sources.
 *
 * Adding a source = adding an entry here plus (if the page shape is new) one
 * small adapter. Sources are crawled in `priority` order; when two sources
 * state the same field, the lower tier wins, then the lower priority number.
 */
const JSON_MAPPING_TEMPLATE = (namespace) => ({
	itemsPath: "schemes",
	namespace,
	fields: {
		title: "title",
		organization: "department",
		academicYear: "academicYear",
		opensAt: "opensAt",
		closesAt: "closesAt",
		guidelinesUrl: "guidelinesUrl",
		applyUrl: "applyUrl",
		category: "category",
		level: "level",
		state: "state",
		gender: "gender",
		tags: "tags",
		casteGroups: "casteGroups",
		familyIncomeMax: "familyIncomeMax",
		amountValue: "amountValue",
		amountPeriod: "amountPeriod",
		description: "description",
	},
});

export const SOURCE_REGISTRY = [
	{
		id: "nsp_central_sector",
		name: "National Scholarship Portal (Government of India)",
		publisher: "Ministry of Electronics & Information Technology / NIC",
		sourceType: "Government",
		authorityTier: 1,
		priority: 10,
		enabled: true,
		strategy: "static",
		allowedDomains: ["scholarships.gov.in"],
		entries: [
			{ url: "https://scholarships.gov.in/All-Scholarships", adapter: "nspSchemeList", role: "listing" },
			{ url: "https://scholarships.gov.in/", adapter: "nspAnnouncements", role: "announcements", optional: true },
		],
		followUps: { adapter: "guidelinePdf", maxPerRun: 40 },
		minExpectedSchemes: 10,
		cadenceHours: 24,
		staleAfterHours: 72,
		// Report (never auto-delete) schemes that vanish from the listing after this many successful runs.
		missingRunsBeforeReview: 3,
		rateLimit: { minIntervalMs: 2500 },
		// Legacy slugs from the pre-provenance catalogue that are the same scheme as an NSP entry.
		// Mapping them keeps existing bookmarks attached to the refreshed record.
		legacyAliases: {
			"nsp-central-sector-scheme":
				"nsp:department-of-higher-education:pm-usp-central-sector-scheme-of-scholarship-for-college-and-university-students-csss",
			"aicte-pragati-girls-ug":
				"nsp:all-india-council-for-technical-education:aicte-pragati-scholarship-scheme-for-girl-students-technical-degree",
			"aicte-pragati-girls-diploma":
				"nsp:all-india-council-for-technical-education:aicte-pragati-scholarship-scheme-for-girl-students-technical-diploma",
			"aicte-saksham-pwd-ug":
				"nsp:all-india-council-for-technical-education:aicte-saksham-scholarship-scheme-for-specially-abled-student-technical-degree",
			"aicte-saksham-pwd-diploma":
				"nsp:all-india-council-for-technical-education:aicte-saksham-scholarship-scheme-for-specially-abled-student-technical-diploma",
			"aicte-swanath-ug":
				"nsp:all-india-council-for-technical-education:aicte-swanath-scholarship-scheme-technical-degree",
			"ugc-ishan-uday-ner": "nsp:ugc:ishan-uday-special-scholarship-scheme-for-ner",
			"top-class-education-sc":
				"nsp:department-of-social-justice-and-empowerment:central-sector-scholarship-of-top-class-education-for-sc-students",
		},
	},
	{
		id: "up_state_scholarship",
		name: "Uttar Pradesh Scholarship and Fee Reimbursement Online System",
		publisher: "Social Welfare / Backward Classes Welfare Department, Government of Uttar Pradesh",
		sourceType: "Government",
		authorityTier: 1,
		priority: 15,
		enabled: true,
		strategy: "static",
		state: "UP",
		allowedDomains: ["scholarship.up.gov.in", "up.gov.in"],
		entries: [
			{ url: "https://scholarship.up.gov.in/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("up-state"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "mahadbt_state_scholarship",
		name: "MahaDBT Aaple Sarkar State Scholarship Portal (Government of Maharashtra)",
		publisher: "Higher & Technical Education / Social Justice Department, Government of Maharashtra",
		sourceType: "Government",
		authorityTier: 1,
		priority: 20,
		enabled: true,
		strategy: "static",
		state: "Maharashtra",
		allowedDomains: ["mahadbt.maharashtra.gov.in", "mahadbt2.maharashtra.gov.in", "maharashtra.gov.in"],
		entries: [
			{ url: "https://mahadbt.maharashtra.gov.in/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("mahadbt-state"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "karnataka_ssp_scholarship",
		name: "State Scholarship Portal (Government of Karnataka)",
		publisher: "Social Welfare / Backward Classes Welfare Department, Government of Karnataka",
		sourceType: "Government",
		authorityTier: 1,
		priority: 25,
		enabled: true,
		strategy: "static",
		state: "Karnataka",
		allowedDomains: ["ssp.karnataka.gov.in", "ssp.postmatric.karnataka.gov.in", "karnataka.gov.in"],
		entries: [
			{ url: "https://ssp.postmatric.karnataka.gov.in/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("karnataka-ssp"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "wb_svmcm_scholarship",
		name: "Swami Vivekananda Merit-cum-Means Scholarship (Government of West Bengal)",
		publisher: "Department of Higher Education, Government of West Bengal",
		sourceType: "Government",
		authorityTier: 1,
		priority: 30,
		enabled: true,
		strategy: "static",
		state: "West Bengal",
		allowedDomains: ["svmcm.wbhed.gov.in", "wb.gov.in"],
		entries: [
			{ url: "https://svmcm.wbhed.gov.in/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("wb-svmcm"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "bihar_pms_scholarship",
		name: "Bihar Post Matric Scholarship Portal (Government of Bihar)",
		publisher: "Education Department / BC & EBC Welfare, Government of Bihar",
		sourceType: "Government",
		authorityTier: 1,
		priority: 35,
		enabled: true,
		strategy: "static",
		state: "Bihar",
		allowedDomains: ["pmsonline.bihar.gov.in", "pmsonline.bih.nic.in", "bihar.gov.in"],
		entries: [
			{ url: "https://pmsonline.bihar.gov.in/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("bihar-pms"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "dst_inspire_scholarship",
		name: "Department of Science & Technology - INSPIRE (Government of India)",
		publisher: "Ministry of Science and Technology, Government of India",
		sourceType: "Government",
		authorityTier: 1,
		priority: 40,
		enabled: true,
		strategy: "static",
		state: "All India",
		allowedDomains: ["online-inspire.gov.in", "dst.gov.in"],
		entries: [
			{ url: "https://online-inspire.gov.in/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("dst-inspire"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "aicte_ugc_national",
		name: "National Autonomous & Statutory Councils (AICTE & UGC)",
		publisher: "All India Council for Technical Education & University Grants Commission",
		sourceType: "Institution",
		authorityTier: 2,
		priority: 45,
		enabled: true,
		strategy: "static",
		state: "All India",
		allowedDomains: ["aicte-india.org", "ugc.gov.in", "ugc.ac.in"],
		entries: [
			{ url: "https://www.aicte-india.org/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("national-councils"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
	{
		id: "premier_foundations_csr",
		name: "National Premier Public Sector & CSR Foundations",
		publisher: "ONGC Foundation, Reliance Foundation & LIC Golden Jubilee",
		sourceType: "Corporate CSR",
		authorityTier: 2,
		priority: 50,
		enabled: true,
		strategy: "static",
		state: "All India",
		allowedDomains: ["ongcscholar.org", "scholarships.reliancefoundation.org", "licindia.in"],
		entries: [
			{ url: "https://www.ongcscholar.org/", adapter: "jsonFeed", role: "listing" },
		],
		jsonMapping: JSON_MAPPING_TEMPLATE("premier-foundations"),
		minExpectedSchemes: 1,
		cadenceHours: 24,
		staleAfterHours: 72,
		rateLimit: { minIntervalMs: 2000 },
	},
];

export function getSource(id) {
	return SOURCE_REGISTRY.find((s) => s.id === id) || null;
}

export function enabledSources() {
	return SOURCE_REGISTRY.filter((s) => s.enabled).sort((a, b) => a.priority - b.priority);
}
