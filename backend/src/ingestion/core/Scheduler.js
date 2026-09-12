import { sourceRegistry } from "../SourceRegistry.js";

/**
 * Scheduler
 * Automated background scheduler for periodic scholarship crawl runs.
 * Supports configurable intervals, runtime status reporting, and safe error trapping.
 */
export class Scheduler {
	constructor(options = {}) {
		// Default to every 24 hours (86,400,000 ms), or configurable via options / env
		this.intervalMs = options.intervalMs || parseInt(process.env.CRAWLER_INTERVAL_MS, 10) || 24 * 60 * 60 * 1000;
		this.timer = null;
		this.active = false;
		this.lastExecution = null;
		this.executionCount = 0;
	}

	start() {
		if (this.active) {
			console.log("[Scheduler] Crawler scheduler is already running.");
			return;
		}

		this.active = true;
		console.log(`[Scheduler] Background crawler scheduler started (Interval: ${this.intervalMs / 1000 / 60} minutes).`);

		this.timer = setInterval(async () => {
			await this.triggerNow("CRON_INTERVAL");
		}, this.intervalMs);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.active = false;
		console.log("[Scheduler] Background crawler scheduler stopped.");
	}

	async triggerNow(triggerReason = "MANUAL_TRIGGER") {
		console.log(`\n[Scheduler] Executing scheduled crawl (Reason: ${triggerReason})...`);
		try {
			this.executionCount++;
			const summary = await sourceRegistry.runAll();
			this.lastExecution = {
				timestamp: new Date(),
				triggerReason,
				summary,
			};
			return summary;
		} catch (err) {
			console.error("[Scheduler] Execution failed:", err.message);
			this.lastExecution = {
				timestamp: new Date(),
				triggerReason,
				error: err.message,
			};
			throw err;
		}
	}

	getStatus() {
		return {
			active: this.active,
			intervalMs: this.intervalMs,
			intervalMinutes: this.intervalMs / 1000 / 60,
			executionCount: this.executionCount,
			lastExecution: this.lastExecution,
		};
	}
}

export const crawlerScheduler = new Scheduler();
export default crawlerScheduler;
