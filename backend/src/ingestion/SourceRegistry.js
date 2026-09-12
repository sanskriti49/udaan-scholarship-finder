import { AicteSource } from "./sources/AicteSource.js";
import { UgcSource } from "./sources/UgcSource.js";
import { NspSource } from "./sources/NspSource.js";
import { StateScholarshipSource } from "./sources/StateScholarshipSource.js";
import { CorporateCsrSource } from "./sources/CorporateCsrSource.js";

/**
 * SourceRegistry
 * Central registry and orchestrator for all scholarship ingestion sources.
 * Manages crawl execution, strategy dispatch (Playwright vs Cheerio),
 * health monitoring, and system-wide telemetry aggregation.
 */
class SourceRegistry {
	constructor() {
		this.sources = new Map();
		this.history = [];
		this.lastRunAt = null;

		this.register(new AicteSource());
		this.register(new UgcSource());
		this.register(new NspSource());
		this.register(new StateScholarshipSource());
		this.register(new CorporateCsrSource());
	}

	register(sourceInstance) {
		this.sources.set(sourceInstance.id, {
			instance: sourceInstance,
			id: sourceInstance.id,
			name: sourceInstance.name,
			baseUrl: sourceInstance.baseUrl,
			sourceType: sourceInstance.sourceType,
			strategy: sourceInstance.strategy,
			trustScore: sourceInstance.trustScore,
			frequency: sourceInstance.frequency,
			description: sourceInstance.description,
			lastRunAt: null,
			lastStatus: "IDLE",
			telemetry: null,
		});
	}

	listSources() {
		return Array.from(this.sources.values()).map((s) => ({
			id: s.id,
			name: s.name,
			baseUrl: s.baseUrl,
			sourceType: s.sourceType,
			strategy: s.strategy,
			trustScore: s.trustScore,
			frequency: s.frequency,
			description: s.description,
			lastRunAt: s.lastRunAt,
			lastStatus: s.lastStatus,
			telemetry: s.telemetry,
		}));
	}

	getSource(id) {
		const entry = this.sources.get(id);
		return entry ? entry.instance : null;
	}

	async runSource(id) {
		const entry = this.sources.get(id);
		if (!entry) {
			throw new Error(`Source with id '${id}' not found in registry.`);
		}

		entry.lastStatus = "RUNNING";
		const startTime = new Date();
		try {
			const telemetry = await entry.instance.run();
			entry.lastRunAt = new Date();
			entry.lastStatus = telemetry.errors.length > 0 && telemetry.created === 0 && telemetry.updated === 0 ? "FAILED" : "SUCCESS";
			entry.telemetry = telemetry;
			return telemetry;
		} catch (err) {
			entry.lastRunAt = new Date();
			entry.lastStatus = "FAILED";
			entry.telemetry = { error: err.message };
			throw err;
		}
	}

	async runAll() {
		console.log("\n========================================================");
		console.log(`[SourceRegistry] Initiating crawl across ${this.sources.size} registered sources...`);
		console.log("========================================================");

		const runStart = new Date();
		const results = [];
		const summary = {
			startedAt: runStart,
			finishedAt: null,
			totalSources: this.sources.size,
			successfulSources: 0,
			failedSources: 0,
			totalExtracted: 0,
			totalValid: 0,
			totalQuarantined: 0,
			totalCreated: 0,
			totalUpdated: 0,
			totalChangesDetected: 0,
			sourceReports: [],
		};

		for (const [id, entry] of this.sources.entries()) {
			try {
				const report = await this.runSource(id);
				results.push(report);
				summary.successfulSources++;
				summary.totalExtracted += report.totalExtracted || 0;
				summary.totalValid += report.valid || 0;
				summary.totalQuarantined += report.quarantined || 0;
				summary.totalCreated += report.created || 0;
				summary.totalUpdated += report.updated || 0;
				summary.totalChangesDetected += report.changesDetected || 0;
				summary.sourceReports.push(report);
			} catch (err) {
				summary.failedSources++;
				summary.sourceReports.push({
					sourceId: id,
					error: err.message,
				});
			}
		}

		summary.finishedAt = new Date();
		this.lastRunAt = summary.finishedAt;
		this.history.unshift({ ...summary });
		if (this.history.length > 20) this.history.pop();

		console.log("\n========================================================");
		console.log(`[SourceRegistry] Pipeline execution complete!`);
		console.log(`Sources: ${summary.successfulSources}/${summary.totalSources} succeeded.`);
		console.log(`Extracted: ${summary.totalExtracted} | Valid: ${summary.totalValid} | Quarantined: ${summary.totalQuarantined} | Created: ${summary.totalCreated} | Updated: ${summary.totalUpdated} | Policy Drift Detected: ${summary.totalChangesDetected}`);
		console.log("========================================================\n");

		return summary;
	}
}

export const sourceRegistry = new SourceRegistry();
export default sourceRegistry;
