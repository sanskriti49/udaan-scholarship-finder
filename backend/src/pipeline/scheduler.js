import { withDistributedLock } from "../utils/distributedLock.js";
import { runPipeline, refreshStatuses } from "./service.js";
import { rootLogger } from "./core/logger.js";

/**
 * Periodic runner. Crawls every CRAWLER_INTERVAL_MS (default 24h) and refreshes
 * open/closed/stale status hourly so status never depends on a crawl having
 * succeeded. A distributed lock prevents two instances crawling at once.
 */
const log = rootLogger.child({ component: "scheduler" });

export class PipelineScheduler {
	constructor({ intervalMs, statusIntervalMs } = {}) {
		this.intervalMs = intervalMs || Number(process.env.CRAWLER_INTERVAL_MS) || 24 * 60 * 60 * 1000;
		this.statusIntervalMs = statusIntervalMs || 60 * 60 * 1000;
		this.timers = [];
		this.active = false;
		this.lastExecution = null;
		this.executionCount = 0;
	}

	start() {
		if (this.active || process.env.ENABLE_CRAWLER === "false") return;
		this.active = true;
		this.timers.push(setInterval(() => this.triggerNow("interval").catch(() => {}), this.intervalMs));
		this.timers.push(
			setInterval(() => refreshStatuses().catch((e) => log.warn("status refresh failed", { error: e.message })), this.statusIntervalMs),
		);
		for (const t of this.timers) t.unref?.();
		log.info("scheduler started", { intervalMs: this.intervalMs });
	}

	stop() {
		this.timers.forEach(clearInterval);
		this.timers = [];
		this.active = false;
	}

	async triggerNow(reason = "manual", { sourceId } = {}) {
		return withDistributedLock("lock:crawler:run", 1800, async () => {
			this.executionCount += 1;
			try {
				const reports = await runPipeline({ sourceId });
				this.lastExecution = { timestamp: new Date(), reason, reports: reports.map(({ pages, ...r }) => r) };
				return reports;
			} catch (error) {
				this.lastExecution = { timestamp: new Date(), reason, error: error.message };
				log.error("scheduled run failed", { error: error.message });
				throw error;
			}
		});
	}

	getStatus() {
		return {
			active: this.active,
			intervalMs: this.intervalMs,
			intervalMinutes: this.intervalMs / 60000,
			executionCount: this.executionCount,
			lastExecution: this.lastExecution,
		};
	}
}

export const crawlerScheduler = new PipelineScheduler();
export default crawlerScheduler;
