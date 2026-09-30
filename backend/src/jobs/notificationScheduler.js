import { notificationService } from "../services/notificationService.js";
import { withDistributedLock } from "../utils/distributedLock.js";

/**
 * NotificationScheduler
 * Periodic background scheduler for:
 * 1. 7-Day & 48-Hour upcoming deadline reminders (Idempotent)
 * 2. Timezone-aware Monday morning curated scholarship digests
 */
export class NotificationScheduler {
	constructor(options = {}) {
		// Default to every 30 minutes (1,800,000 ms)
		this.intervalMs =
			options.intervalMs ||
			parseInt(process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS, 10) ||
			30 * 60 * 1000;
		this.timer = null;
		this.active = false;
		this.lastDeadlineScan = null;
		this.lastWeeklyDigestRun = null;
		this.executionCount = 0;
	}

	start() {
		if (this.active) {
			console.log("[NotificationScheduler] Scheduler is already active.");
			return;
		}

		this.active = true;
		console.log(
			`[NotificationScheduler] Periodic notification scheduler started (Interval: ${
				this.intervalMs / 1000 / 60
			} minutes).`,
		);

		// Initial scan after 10 seconds of server boot
		setTimeout(async () => {
			if (this.active) {
				await this.executeJobs("STARTUP_SCAN");
			}
		}, 10000);

		this.timer = setInterval(async () => {
			await this.executeJobs("PERIODIC_INTERVAL");
		}, this.intervalMs);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.active = false;
		console.log("[NotificationScheduler] Periodic notification scheduler stopped.");
	}

	async executeJobs(triggerReason = "SCHEDULED") {
		this.executionCount++;
		console.log(`[NotificationScheduler] Executing scheduled jobs (${triggerReason})...`);

		try {
			// 1. Deadline scan with distributed lock (10-min lease)
			await withDistributedLock("lock:notification:deadline_scan", 600, async () => {
				const deadlineResult = await notificationService.runDeadlineCheck();
				this.lastDeadlineScan = {
					timestamp: new Date(),
					result: deadlineResult,
				};
				return deadlineResult;
			});
		} catch (err) {
			console.error("[NotificationScheduler] Deadline check error:", err.message);
		}

		try {
			// 2. Monday weekly digest check with distributed lock (20-min lease)
			await withDistributedLock("lock:notification:weekly_digest", 1200, async () => {
				const digestResult = await notificationService.runWeeklyDigest();
				this.lastWeeklyDigestRun = {
					timestamp: new Date(),
					result: digestResult,
				};
				return digestResult;
			});
		} catch (err) {
			console.error("[NotificationScheduler] Weekly digest error:", err.message);
		}
	}

	async triggerJobManually(jobName = "all") {
		console.log(`[NotificationScheduler] Manual trigger requested for: '${jobName}'`);
		if (jobName === "deadline" || jobName === "all") {
			await notificationService.runDeadlineCheck();
		}
		if (jobName === "digest" || jobName === "all") {
			// Force true for manual trigger
			await notificationService.runWeeklyDigest(true);
		}
	}

	getStatus() {
		return {
			active: this.active,
			intervalMinutes: this.intervalMs / 1000 / 60,
			executionCount: this.executionCount,
			lastDeadlineScan: this.lastDeadlineScan,
			lastWeeklyDigestRun: this.lastWeeklyDigestRun,
		};
	}
}

export const notificationScheduler = new NotificationScheduler();
export default notificationScheduler;
