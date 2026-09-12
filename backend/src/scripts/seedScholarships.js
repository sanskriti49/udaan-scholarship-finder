import mongoose from "mongoose";
import dotenv from "dotenv";
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

dotenv.config();

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

async function seedDatabase() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/udaan");
		console.log("MongoDB connection established.");

		const sources = [
			new AicteSource(),
			new UgcSource(),
			new NspSource(),
			new StateScholarshipSource(),
			new CorporateCsrSource(),
		];

		const allExtracted = [];
		for (const source of sources) {
			console.log(`Extracting canonical catalog from ${source.name}...`);
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
				if (!validation.isValid) {
					console.warn(`[Quarantined Seed Item] ${validated.title}:`, validation.errors);
					continue;
				}
				allExtracted.push(validated);
			}
		}

		console.log(`\nClearing existing records...`);
		await Scholarship.deleteMany({});
		await ScholarshipVersion.deleteMany({});
		await Scholarship.collection.dropIndexes().catch(() => {});
		await Scholarship.syncIndexes().catch(() => {});

		console.log(`Inserting ${allExtracted.length} verified canonical scholarship schemes...`);
		const inserted = await Scholarship.insertMany(allExtracted);
		console.log(`Successfully persisted ${inserted.length} scholarships into MongoDB!`);

		// Seed historical versions for change tracking
		const versions = [];
		const aicte = inserted.find((s) => s.slug === "aicte-pragati-girls-ug");
		const nsp = inserted.find((s) => s.slug === "nsp-central-sector-scheme");
		const tata = inserted.find((s) => s.slug === "tata-trust-stem-grant");
		const reliance = inserted.find((s) => s.slug === "reliance-foundation-ug-scholarship");
		const mahadbt = inserted.find((s) => s.slug === "mahadbt-rajarshi-shahu-maharaj-ebc");

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

		if (reliance) {
			versions.push({
				scholarship: reliance._id,
				observedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				changeType: "INCOME_CEILING_CHANGE",
				summary: "Income ceiling relaxed up to ₹15 Lakhs for middle income households.",
				deltas: [
					{
						field: "familyIncome",
						oldValue: 800000,
						newValue: 1500000,
						humanReadable: "Maximum gross household income ceiling expanded to ₹15,00,000.",
					},
				],
				sourceSnapshotUrl: reliance.sourceUrl,
			});
		}

		if (mahadbt) {
			versions.push({
				scholarship: mahadbt._id,
				observedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
				changeType: "DOCUMENT_REQUIREMENT_ADDED",
				summary: "Biometric DigiLocker verification integrated for CAP admitted students.",
				deltas: [
					{
						field: "requiredDocuments",
						oldValue: "Physical Aadhar copy",
						newValue: "DigiLocker linked Aadhaar biometric e-KYC",
						humanReadable: "State Government mandate requiring online Aadhaar e-KYC authentication.",
					},
				],
				sourceSnapshotUrl: mahadbt.sourceUrl,
			});
		}

		if (versions.length > 0) {
			await ScholarshipVersion.insertMany(versions);
			console.log(`Generated ${versions.length} historical change versions.`);
		}

		await clearScholarshipCache();
		console.log("Redis scholarship cache purged successfully.");

		console.log(`\n=== Seeding Complete: ${inserted.length} schemes live in Udaan database ===`);
		process.exit(0);
	} catch (err) {
		console.error("Seeding failed:", err);
		process.exit(1);
	}
}

seedDatabase();
