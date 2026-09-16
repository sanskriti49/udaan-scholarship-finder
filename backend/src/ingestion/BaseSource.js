import Scholarship from "../models/Scholarship.js";
import { detectAndApplyChanges } from "../engine/diffEngine.js";
import { Validator } from "./core/Validator.js";
import { Deduplicator } from "./core/Deduplicator.js";
import { ProvenanceExtractor } from "./core/ProvenanceExtractor.js";
import { notificationService } from "../services/notificationService.js";
import { clearScholarshipCache } from "../middlewares/cacheMiddleware.js";

/**
 * BaseScholarshipSource
 * Contract and orchestration pipeline for all ingestion adapters.
 * Implements 8-stage pipeline: Fetch -> Extract -> Normalize -> Deduplicate -> Validate -> Diff & Persist
 */
export class BaseScholarshipSource {
	constructor(config) {
		if (!config.id || !config.name || !config.baseUrl) {
			throw new Error("Source configuration requires id, name, and baseUrl");
		}
		this.id = config.id;
		this.name = config.name;
		this.baseUrl = config.baseUrl;
		this.sourceType = config.sourceType || "Government";
		this.trustScore = config.trustScore || 0.9;
		this.strategy = config.strategy || "CHEERIO";
		this.frequency = config.frequency || "daily";
		this.description = config.description || "";
	}

	computeHash(content) {
		return Deduplicator.computeHash(content);
	}

	async fetch() {
		throw new Error(`fetch() must be implemented by subclass ${this.name}`);
	}

	async extract(rawPayload) {
		throw new Error(`extract() must be implemented by subclass ${this.name}`);
	}

	async run() {
		console.log(`\n[Ingestion] Starting crawl for: ${this.name} (${this.id})...`);
		const telemetry = {
			sourceId: this.id,
			startedAt: new Date(),
			totalExtracted: 0,
			valid: 0,
			quarantined: 0,
			created: 0,
			updated: 0,
			changesDetected: 0,
			errors: [],
		};

		try {
			const rawPayload = await this.fetch();
			const contentHash = this.computeHash(rawPayload);

			const items = await this.extract(rawPayload);
			telemetry.totalExtracted = items.length;

			for (const rawItem of items) {
				try {
					const slug = rawItem.slug || Deduplicator.generateSlug(rawItem.organization, rawItem.title, rawItem.level);
					// Ensure strict schema provenance quotes are validated and persisted
					const provenanceQuotes = ProvenanceExtractor.sanitizeProvenanceQuotes(
						rawItem.provenanceQuotes || []
					);

					const normalizedItem = {
						...rawItem,
						slug,
						sourceSite: rawItem.sourceSite || this.name,
						sourceType: rawItem.sourceType || this.sourceType,
						trustScore: rawItem.trustScore || this.trustScore,
						provenanceQuotes,
						contentHash,
						lastScrapedAt: new Date(),
					};

					// Stage: Validation & Integrity Check
					const validation = Validator.validate(normalizedItem);
					if (!validation.isValid) {
						console.warn(`[Quarantined] '${normalizedItem.title}' failed schema contract:`, validation.errors);
						telemetry.quarantined++;
						telemetry.errors.push({ itemTitle: normalizedItem.title, reasons: validation.errors });
						continue;
					}

					telemetry.valid++;

					// Stage: Deduplication & Database Persistence
					const existing = normalizedItem.slug
						? await Scholarship.findOne({ slug: normalizedItem.slug })
						: await Scholarship.findOne({ sourceUrl: normalizedItem.sourceUrl });

					if (existing) {
						const diffResult = await detectAndApplyChanges(existing, normalizedItem);
						telemetry.updated++;
						if (diffResult.hasChanges) {
							telemetry.changesDetected++;
							console.log(
								`[Change Alert] Drift detected in '${existing.title}': ${diffResult.summary}`,
							);
							// Trigger notification hook for policy drift / deadline change
							await notificationService.onScholarshipIngested(existing, false, diffResult);
						}
					} else {
						const created = await Scholarship.create(normalizedItem);
						telemetry.created++;
						console.log(`[New Scheme] Ingested: '${normalizedItem.title}'`);
						// Trigger notification hook for newly discovered scheme
						await notificationService.onScholarshipIngested(created, true, null);
					}
				} catch (err) {
					console.error(`[Error] Failed processing item:`, err.message);
					telemetry.errors.push({ itemTitle: rawItem.title, error: err.message });
				}
			}

			telemetry.finishedAt = new Date();
			if (telemetry.created > 0 || telemetry.changesDetected > 0) {
				await clearScholarshipCache();
			}
			console.log(
				`[Ingestion Complete] ${this.name} -> Extracted: ${telemetry.totalExtracted}, Valid: ${telemetry.valid}, Quarantined: ${telemetry.quarantined}, Created: ${telemetry.created}, Updated: ${telemetry.updated}, Policy Changes: ${telemetry.changesDetected}`,
			);
			return telemetry;
		} catch (fatalErr) {
			console.error(`[Ingestion Failed] Source ${this.name}:`, fatalErr);
			telemetry.errors.push({ fatal: fatalErr.message });
			return telemetry;
		}
	}
}

