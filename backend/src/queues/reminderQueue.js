import { Queue } from "bullmq";
import { bullMqConnection, isRedisAvailable } from "../config/redis.js";

/**
 * BullMQ Reminder Queue for Udaan
 *
 * Handles asynchronous, non-blocking delayed jobs for scholarship deadline countdowns.
 * Configured with memory-safe job retention to prevent Redis memory bloat.
 */

export const REMINDER_QUEUE_NAME = "scholarshipReminders";

export const reminderQueue = new Queue(REMINDER_QUEUE_NAME, {
	connection: bullMqConnection,
	defaultJobOptions: {
		// Memory protection: Keep last 100 completed jobs or up to 1 hour
		removeOnComplete: {
			count: 100,
			age: 3600,
		},
		// Retain failed jobs for 7 days to facilitate debugging and telemetry
		removeOnFail: {
			age: 7 * 86400,
		},
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
	},
});

/**
 * Schedule a delayed deadline reminder job
 *
 * @param {Object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.email - Recipient email
 * @param {string} params.scholarshipId - Scholarship MongoDB ObjectId
 * @param {string} params.scholarshipName - Scholarship Title
 * @param {Date|string} params.deadlineDate - Official application cutoff
 * @param {"7_days" | "48_hours"} [params.reminderWindow="7_days"] - Alert window type
 * @returns {Promise<Object|null>} Enqueued job or null on fail-open
 */
export async function scheduleDeadlineReminder({
	userId,
	email,
	scholarshipId,
	scholarshipName,
	deadlineDate,
	reminderWindow = "7_days",
}) {
	const cutoff = new Date(deadlineDate);
	const now = new Date();

	// Guard: Do not schedule reminders for past/expired deadlines
	if (cutoff.getTime() <= now.getTime()) {
		console.warn(`[ReminderQueue] Deadline for '${scholarshipName}' has already passed. Skipping.`);
		return null;
	}

	// Guard: If Redis is offline/unavailable, fail open immediately without hanging
	if (!isRedisAvailable()) {
		console.warn(`[ReminderQueue] Redis unavailable. Operating in fail-open mode, skipping reminder enqueue.`);
		return null;
	}

	// Calculate target execution time
	let targetTime;
	if (reminderWindow === "7_days") {
		targetTime = new Date(cutoff.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (reminderWindow === "48_hours") {
		targetTime = new Date(cutoff.getTime() - 48 * 60 * 60 * 1000);
	} else {
		targetTime = new Date(cutoff.getTime() - 24 * 60 * 60 * 1000);
	}

	// Calculate delay in milliseconds
	let delayMs = targetTime.getTime() - now.getTime();
	if (delayMs < 0) {
		// Window already entered but deadline is still in the future: dispatch promptly
		delayMs = 0;
	}

	const deadlineIso = cutoff.toISOString().slice(0, 10);
	// Queue-level deduplication: BullMQ rejects duplicate jobIds
	const jobId = `reminder_${userId}_${scholarshipId}_${reminderWindow}_${deadlineIso}`;

	const jobPayload = {
		userId,
		email,
		scholarshipId,
		scholarshipName,
		deadlineDate: cutoff.toISOString(),
		reminderWindow,
		scheduledFor: targetTime.toISOString(),
		enqueuedAt: now.toISOString(),
	};

	try {
		const job = await reminderQueue.add("sendDeadlineReminder", jobPayload, {
			jobId,
			delay: delayMs,
		});

		console.log(
			`[ReminderQueue] Enqueued '${reminderWindow}' reminder for '${scholarshipName}' (Job ID: ${job.id}, Delay: ${Math.round(
				delayMs / 1000 / 60,
			)} mins).`,
		);
		return job;
	} catch (err) {
		// Fail-open: catch connection or queue errors without breaking callers
		console.warn(`[ReminderQueue] Failed enqueuing job (${err.message}). Continuing in fail-open mode.`);
		return null;
	}
}

/**
 * Gracefully close reminder queue
 */
export async function closeReminderQueue() {
	try {
		await reminderQueue.close();
		console.log("[ReminderQueue] Queue closed gracefully.");
	} catch (err) {
		console.error("[ReminderQueue] Error closing queue:", err.message);
	}
}

export default reminderQueue;
