import { crawlerLockKey } from "../pipeline/lock.js";
import Scholarship from "../models/Scholarship.js";
import { runMigrations } from "../migrations/runner.js";

/**
 * Startup bootstrap:
 *  1. apply pending schema/data migrations;
 *  2. refresh the existing catalogue from current official pages with a
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
		const mode = process.env.PIPELINE_BOOTSTRAP || "live";
		if (mode === "off" || process.env.ENABLE_CRAWLER === "false") return ingested;
		console.log(`[Bootstrap] ${ingested} source-backed records; refreshing ${mode} catalogue...`);
		const { runPipeline } = await import("../pipeline/service.js");
		if (mode === "replay") {
			if (ingested > 0) return ingested;
			await runPipeline({ replay: true });
			const count = await Scholarship.countDocuments({ schemeKey: { $exists: true } });
			console.log(`[Bootstrap] Replay complete. ${count} verified scholarships loaded.`);
			return count;
		}
		const { withDistributedLock } = await import("./distributedLock.js");
		withDistributedLock(crawlerLockKey(), 1800, () => runPipeline({ replay: false, notify: false })).catch((error) =>
			console.error("[Bootstrap] initial pipeline run failed:", error.message),
		);
		return ingested;
	} catch (error) {
		console.error("[Bootstrap] warning:", error.message);
		return 0;
	}
}

export default bootstrapDatabase;
