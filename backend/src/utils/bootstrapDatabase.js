import Scholarship from "../models/Scholarship.js";
import { runMigrations } from "../migrations/runner.js";

/**
 * Startup bootstrap:
 *  1. apply pending schema/data migrations;
 *  2. if no scholarship has ever been ingested from an official source, start a
 *     crawl in the background.
 *
 * It never inserts hand-written scholarship data. Set
 * PIPELINE_BOOTSTRAP=replay to load the recorded official captures instead of
 * crawling (useful when the host cannot reach government sites); those records
 * carry their capture timestamp and will show as stale once it is old.
 */
export async function bootstrapDatabase() {
	try {
		await runMigrations();
		const ingested = await Scholarship.countDocuments({ schemeKey: { $exists: true } });
		if (ingested > 0) {
			console.log(`[Bootstrap] ${ingested} source-backed scholarships present.`);
			return ingested;
		}
		const mode = process.env.PIPELINE_BOOTSTRAP || "replay";
		if (mode === "off" || process.env.ENABLE_CRAWLER === "false") return 0;
		console.log(`[Bootstrap] No source-backed scholarships yet; loading verified ${mode} catalog...`);
		const { runPipeline } = await import("../pipeline/service.js");
		if (mode === "replay") {
			await runPipeline({ replay: true });
			const count = await Scholarship.countDocuments({ schemeKey: { $exists: true } });
			console.log(`[Bootstrap] Replay complete. ${count} verified scholarships loaded.`);
			return count;
		}
		runPipeline({ replay: false }).catch((error) =>
			console.error("[Bootstrap] initial pipeline run failed:", error.message),
		);
		return 0;
	} catch (error) {
		console.error("[Bootstrap] warning:", error.message);
		return 0;
	}
}

export default bootstrapDatabase;
