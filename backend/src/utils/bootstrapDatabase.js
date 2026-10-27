import Scholarship from "../models/Scholarship.js";
import { runMigrations } from "../migrations/runner.js";

/**
 * Startup bootstrap:
 *  1. apply pending schema/data migrations;
 *  2. start a bounded due-source refresh in the background in live mode.
 * Scheduled refresh is independent of PIPELINE_BOOTSTRAP=off, so an existing
 * catalogue can be maintained without performing a full crawl on every boot.
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
		const mode = process.env.PIPELINE_BOOTSTRAP || "live";
		if (mode === "off" || process.env.ENABLE_CRAWLER === "false") return ingested;
		console.log(`[Bootstrap] ${ingested} source-backed records; refreshing ${mode} catalogue...`);
		if (mode === "replay") {
			if (ingested > 0) return ingested;
			const { runPipeline } = await import("../pipeline/service.js");
			await runPipeline({ replay: true });
			const count = await Scholarship.countDocuments({ schemeKey: { $exists: true } });
			console.log(`[Bootstrap] Replay complete. ${count} verified scholarships loaded.`);
			return count;
		}
		const { crawlerScheduler } = await import('../pipeline/scheduler.js');
		crawlerScheduler.triggerNow('bootstrap', { dueOnly: true, notify: false }).catch((error) =>
			console.error("[Bootstrap] initial pipeline run failed:", error.message),
		);
		return ingested;
	} catch (error) {
		console.error("[Bootstrap] warning:", error.message);
		return 0;
	}
}

export default bootstrapDatabase;
