import crypto from "crypto";
import Scholarship from "../models/Scholarship.js";
import { detectAndApplyChanges } from "../engine/diffEngine.js";

/**
 * BaseScholarshipSource
 * Contract and orchestration pipeline for all ingestion adapters.
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
	}

	computeHash(content) {
		return crypto
			.createHash("sha256")
			.update(typeof content === "string" ? content : JSON.stringify(content))
			.digest("hex");
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

			for (const item of items) {
				try {
					const normalizedItem = {
						...item,
						sourceSite: this.name,
						sourceType: this.sourceType,
						trustScore: this.trustScore,
						contentHash,
						lastScrapedAt: new Date(),
					};

					const existing = await Scholarship.findOne({
						$or: [
							{ slug: normalizedItem.slug },
							{ sourceUrl: normalizedItem.sourceUrl },
						],
					});

					if (existing) {
						const diffResult = await detectAndApplyChanges(existing, normalizedItem);
						telemetry.updated++;
						if (diffResult.hasChanges) {
							telemetry.changesDetected++;
							console.log(
								`[Change Alert] Drift detected in '${existing.title}': ${diffResult.summary}`,
							);
						}
					} else {
						await Scholarship.create(normalizedItem);
						telemetry.created++;
						console.log(`[New Scheme] Ingested: '${normalizedItem.title}'`);
					}
				} catch (err) {
					console.error(`[Error] Failed processing item:`, err.message);
					telemetry.errors.push({ itemTitle: item.title, error: err.message });
				}
			}

			telemetry.finishedAt = new Date();
			console.log(
				`[Ingestion Complete] ${this.name} -> Created: ${telemetry.created}, Updated: ${telemetry.updated}, Policy Changes: ${telemetry.changesDetected}`,
			);
			return telemetry;
		} catch (fatalErr) {
			console.error(`[Ingestion Failed] Source ${this.name}:`, fatalErr);
			telemetry.errors.push({ fatal: fatalErr.message });
			return telemetry;
		}
	}
}
