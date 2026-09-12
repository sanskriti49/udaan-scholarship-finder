import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import { AicteSource } from "../ingestion/sources/AicteSource.js";
import { UgcSource } from "../ingestion/sources/UgcSource.js";
import { NspSource } from "../ingestion/sources/NspSource.js";
import { StateScholarshipSource } from "../ingestion/sources/StateScholarshipSource.js";
import { CorporateCsrSource } from "../ingestion/sources/CorporateCsrSource.js";
import { Validator } from "../ingestion/core/Validator.js";
import { Deduplicator } from "../ingestion/core/Deduplicator.js";
import { clearScholarshipCache } from "../middlewares/cacheMiddleware.js";

const POPULAR_SLUGS = new Set([
	"aicte-pragati-girls-ug",
	"nsp-central-sector-scheme",
	"post-matric-sc-scholarship",
	"reliance-foundation-ug-scholarship",
	"tata-trust-stem-grant",
	"mahadbt-rajarshi-shahu-maharaj-ebc",
	"ugc-indira-gandhi-girl-child",
	"infosys-foundation-stem-stars-girls",
]);

const CHANGED_SLUGS = new Map([
	[
		"aicte-pragati-girls-ug",
		"Income ceiling increased from ₹2.5L to ₹3.0L with relaxed document requirements.",
	],
	[
		"nsp-central-sector-scheme",
		"Application deadline extended by 15 calendar days across all states.",
	],
	[
		"tata-trust-stem-grant",
		"Annual grant assistance increased to ₹60,000 for academic year 2026.",
	],
	[
		"reliance-foundation-ug-scholarship",
		"Household annual income ceiling relaxed to ₹15 Lakh with focus on lower income tiers.",
	],
	[
		"mahadbt-rajarshi-shahu-maharaj-ebc",
		"Biometric DigiLocker verification integrated for CAP admitted students.",
	],
]);

/**
 * Bootstrap Database
 * Inspects the database on server startup. If empty, automatically
 * populates the canonical verified scholarship catalog and versions.
 */
export async function bootstrapDatabase() {
	try {
		const existingCount = await Scholarship.countDocuments();
		if (existingCount > 0) {
			console.log(`[Database] Found ${existingCount} scholarships. Database is ready.`);
			return existingCount;
		}

		console.log("[Bootstrap] Empty database detected. Auto-populating canonical scholarship catalog...");

		const sources = [
			new AicteSource(),
			new UgcSource(),
			new NspSource(),
			new StateScholarshipSource(),
			new CorporateCsrSource(),
		];

		const allExtracted = [];
		for (const source of sources) {
			const items = await source.extract("");
			for (const item of items) {
				const slug = item.slug || Deduplicator.generateSlug(item.organization, item.title, item.level);
				const contentHash = Deduplicator.computeHash(item);
				const validated = {
					...item,
					slug,
					sourceSite: item.sourceSite || source.name,
					sourceType: item.sourceType || source.sourceType,
					trustScore: item.trustScore || source.trustScore,
					contentHash,
					popular: POPULAR_SLUGS.has(slug),
					verified: true,
					hasChanges: CHANGED_SLUGS.has(slug),
					latestChangeSummary: CHANGED_SLUGS.get(slug) || null,
					lastScrapedAt: new Date(),
				};

				const validation = Validator.validate(validated);
				if (validation.isValid) {
					allExtracted.push(validated);
				}
			}
		}

		if (allExtracted.length > 0) {
			const inserted = await Scholarship.insertMany(allExtracted);
			console.log(`[Bootstrap] Successfully seeded ${inserted.length} scholarships into database.`);

			// Create sample versions for change tracking
			const versions = [];
			const aicte = inserted.find((s) => s.slug === "aicte-pragati-girls-ug");
			const nsp = inserted.find((s) => s.slug === "nsp-central-sector-scheme");
			const tata = inserted.find((s) => s.slug === "tata-trust-stem-grant");

			if (aicte) {
				versions.push({
					scholarship: aicte._id,
					observedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
					changeType: "INCOME_CEILING_CHANGE",
					summary: "Income ceiling increased from ₹2.5L to ₹3.0L (+₹50,000 relaxation).",
					deltas: [
						{
							field: "familyIncome",
							oldValue: 250000,
							newValue: 300000,
							humanReadable: "Annual income ceiling relaxed from ₹2,50,000 to ₹3,00,000 per annum.",
						},
					],
					sourceSnapshotUrl: aicte.sourceUrl,
				});
			}

			if (nsp) {
				versions.push({
					scholarship: nsp._id,
					observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
					changeType: "DEADLINE_EXTENSION",
					summary: "Application deadline extended by 15 calendar days.",
					deltas: [
						{
							field: "deadline",
							oldValue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
							newValue: nsp.deadline,
							humanReadable: "Portal closing date extended to allow Class 12 re-evaluation students to apply.",
						},
					],
					sourceSnapshotUrl: nsp.sourceUrl,
				});
			}

			if (tata) {
				versions.push({
					scholarship: tata._id,
					observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
					changeType: "AWARD_UPDATE",
					summary: "Grant amount enhanced from ₹50,000 to ₹60,000/year.",
					deltas: [
						{
							field: "amount.value",
							oldValue: 50000,
							newValue: 60000,
							humanReadable: "Financial assistance incremented to accommodate rising engineering tuition fees.",
						},
					],
					sourceSnapshotUrl: tata.sourceUrl,
				});
			}

			if (versions.length > 0) {
				await ScholarshipVersion.insertMany(versions);
			}

			// Invalidate any existing empty cache in Redis
			await clearScholarshipCache();
			console.log("[Bootstrap] Redis cache flushed. System fully operational.");
			return inserted.length;
		}

		return 0;
	} catch (err) {
		console.error("[Bootstrap] Database initialization warning:", err.message);
		return 0;
	}
}

export default bootstrapDatabase;
