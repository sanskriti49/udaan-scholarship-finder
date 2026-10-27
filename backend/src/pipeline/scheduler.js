import { crawlerLockKey } from "./lock.js";
import { withDistributedLock } from "../utils/distributedLock.js";
import { runPipeline, refreshStatuses } from "./service.js";
import { rootLogger } from "./core/logger.js";
import SourceState from '../models/SourceState.js';
import { enabledSources } from './sources.js';
import { readRefreshPolicy, dueSources } from './refreshPolicy.js';

/**
 * Small due-source batches, including after startup, reuse existing ingestion
 * safeguards. Redis locks coordinate replicas; fallback locking is process-local.
 */
const log = rootLogger.child({ component: "scheduler" });

export class PipelineScheduler {
	constructor({ env = process.env, intervalMs, statusIntervalMs, checkIntervalMs, maxSourcesPerRun,
		run = runPipeline, refresh = refreshStatuses, sources = enabledSources,
		loadStates = ids => SourceState.find({ sourceId: { $in: ids } }).select('sourceId lastAttemptAt lastStatus consecutiveFailures').maxTimeMS(3000).lean(),
		lock = withDistributedLock, now = () => new Date(), timers = globalThis, logger = log } = {}) {
		this.policy = readRefreshPolicy(env, { intervalMs, statusIntervalMs, checkIntervalMs, maxSourcesPerRun });
		Object.assign(this, { intervalMs: this.policy.intervalMs, statusIntervalMs: this.policy.statusIntervalMs,
			run, refresh, sources, loadStates, lock, now, clock: timers, log: logger });
		this.timers = [];
		this.active = false;
		this.running = false;
		this.stopped = false;
		this.lastCheckedAt = null;
		this.lastExecution = null;
		this.executionCount = 0;
	}

	start() {
		if (this.active || !this.policy.enabled) return;
		this.active = true;
		this.stopped = false;
		// Startup catch-up updates the catalogue without sending a restart burst of
		// change alerts. Later intervals retain the established notification path.
		const check = reason => { if (this.active) return this.triggerNow(reason, { dueOnly: true, notify: reason !== 'startup' }).catch(() => {}); };
		this.timers.push(this.clock.setTimeout(() => check('startup'), 10000));
		this.timers.push(this.clock.setInterval(() => check('interval'), this.policy.checkIntervalMs));
		this.timers.push(
			this.clock.setInterval(() => { if (this.active) return this.refresh().catch((e) => this.log.warn("status refresh failed", { code: e.code || 'REFRESH_FAILED' })); }, this.statusIntervalMs),
		);
		for (const t of this.timers) t.unref?.();
		this.log.info("scheduler started", { intervalMs: this.intervalMs, checkIntervalMs: this.policy.checkIntervalMs, maxSourcesPerRun: this.policy.maxSourcesPerRun });
	}

	stop() {
		for (const t of this.timers) { this.clock.clearInterval(t); this.clock.clearTimeout(t); }
		this.timers = [];
		this.active = false;
		this.stopped = true;
	}

	async triggerNow(reason = "manual", { sourceId, dueOnly = false, notify = true } = {}) {
		if (this.running || (dueOnly && (!this.policy.enabled || this.stopped))) return { executed: false, skipped: true };
		this.running = true;
		try { return await this.lock(crawlerLockKey(), 1800, async () => {
			try {
				let reports;
				if (dueOnly) {
					const sources = this.sources(), states = await this.loadStates(sources.map(source => source.id));
					this.lastCheckedAt = this.now();
					const due = dueSources(sources, states, this.lastCheckedAt, this.policy);
					if (!due.length) return [];
					reports = [];
					for (const source of due) {
						if (this.stopped) break;
						reports.push(...await this.run({ sourceId: source.id, notify }));
					}
				} else reports = await this.run({ sourceId, notify });
				this.executionCount += 1;
				this.lastExecution = { timestamp: this.now(), reason, reports: reports.map(({ pages, ...r }) => r) };
				return reports;
			} catch (error) {
				this.lastExecution = { timestamp: this.now(), reason, error: 'Refresh failed. Saved catalogue data remains available.' };
				this.log.error("scheduled run failed", { code: error.code || 'REFRESH_FAILED' });
				throw error;
			}
		}); } finally { this.running = false; }
	}

	getStatus() {
		return {
			active: this.active,
			running: this.running,
			checkIntervalMs: this.policy.checkIntervalMs,
			maxSourcesPerRun: this.policy.maxSourcesPerRun,
			lastCheckedAt: this.lastCheckedAt,
			intervalMs: this.intervalMs,
			intervalMinutes: this.intervalMs / 60000,
			executionCount: this.executionCount,
			lastExecution: this.lastExecution,
		};
	}
}

export const crawlerScheduler = new PipelineScheduler();
export default crawlerScheduler;
