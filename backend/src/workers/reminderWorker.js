import { Worker } from "bullmq";
import { bullMqConnection } from "../config/redis.js";
import { REMINDER_QUEUE_NAME, scheduleDeadlineReminder } from "../queues/reminderQueue.js";
import { processReminderJob } from "./processReminderJob.js";
import { notificationService } from "../services/notificationService.js";
import Scholarship from "../models/Scholarship.js";
import Bookmark from "../models/Bookmark.js";
import User from "../models/User.js";
import NotificationLog from "../models/NotificationLog.js";

/**
 * BullMQ Reminder Worker for Udaan
 *
 * Processes delayed deadline reminder countdowns and real-time scraper change alert fan-outs.
 * Concurrency: 5 parallel workers.
 * Features automatic retries with exponential backoff and structured event telemetry.
 */

let workerInstance = null;

export function createReminderWorker() {
	if (workerInstance) {
		return workerInstance;
	}

	workerInstance = new Worker(
		REMINDER_QUEUE_NAME,
		async (job) => {
			if (job.name === "handleDeadlineChangeAlert") {
				return await processDeadlineChangeAlert(job);
			}

			return processReminderJob(job, { Scholarship, Bookmark, notificationService, NotificationLog });
		},
		{
			connection: bullMqConnection,
			concurrency: 5,
		},
	);

	// Structured Event Logging
	workerInstance.on("completed", (job, returnvalue) => {
		console.log(
			`[ReminderWorker] Job ${job.id} completed successfully:`,
			returnvalue?.status || "DONE",
		);
	});

	workerInstance.on("failed", (job, err) => {
		console.error(
			`[ReminderWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
			err.message,
		);
	});

	workerInstance.on("error", (err) => {
		console.warn(
			`[ReminderWorker] Worker encountered connection warning: ${err.message}. Running fail-open.`,
		);
	});

	console.log("[ReminderWorker] Worker initialized with concurrency: 5.");
	return workerInstance;
}

/**
 * Processes an asynchronous scraper change event:
 * Fans out alerts to all bookmarked students and reschedules upcoming 7-day/48-hour reminders.
 */
async function processDeadlineChangeAlert(job) {
	const { scholarshipId, scholarshipTitle, changeType, summary, oldClosesAt, newClosesAt } = job.data;
	console.log(
		`[ReminderWorker] Processing deadline change alert for '${scholarshipTitle}' (${changeType}).`,
	);

	const scholarship = await Scholarship.findById(scholarshipId).lean();
	if (!scholarship) {
		console.warn(`[ReminderWorker] Scholarship ${scholarshipId} not found. Skipping.`);
		return { status: "SKIPPED", reason: "Scholarship not found" };
	}

	const bookmarks = await Bookmark.find({ scholarship: scholarshipId }).lean();
	if (!bookmarks.length) {
		console.log(`[ReminderWorker] No bookmarked users for '${scholarship.title}'. Skipping fan-out.`);
		return { status: "COMPLETED", recipients: 0, dispatched: 0 };
	}

	const newDeadline = newClosesAt || scholarship.deadline;
	const newDateFormatted = newDeadline
		? new Date(newDeadline).toLocaleDateString("en-IN", {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: "Open";
	const oldDateFormatted = oldClosesAt
		? new Date(oldClosesAt).toLocaleDateString("en-IN", {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: null;

	let alertTitle = `Deadline Updated: ${scholarship.title}`;
	let alertMessage = `The application deadline has been officially updated to ${newDateFormatted}.`;

	if (changeType === "DEADLINE_EXTENSION" && oldDateFormatted && newClosesAt) {
		const daysExtended = Math.round(
			(new Date(newClosesAt) - new Date(oldClosesAt)) / (1000 * 60 * 60 * 24),
		);
		alertTitle =
			daysExtended > 0
				? `🎉 Deadline Extended by ${daysExtended} Days: ${scholarship.title}`
				: `🎉 Deadline Extended: ${scholarship.title}`;
		alertMessage = `Great news! The official application deadline has been extended to ${newDateFormatted} (was ${oldDateFormatted}). Complete and submit your documents before the new cutoff!`;
	} else if (changeType === "STATUS_OPENED" || changeType === "CYCLE_REOPENED") {
		alertTitle = `📢 Applications Now Open: ${scholarship.title}`;
		alertMessage = `Official applications are now live until ${newDateFormatted}. Review required documents and submit your application!`;
	}

	let dispatchedCount = 0;
	const newDeadlineIso = newDeadline
		? new Date(newDeadline).toISOString().slice(0, 10)
		: "open";

	for (const bm of bookmarks) {
		try {
			const prefs = await notificationService.getPreferences(bm.user);
			if (!prefs.deadlineAlerts) continue;

			const dedupKey = `deadline_change:${bm.user}:${scholarshipId}:${newDeadlineIso}:${changeType}`;
			const notif = await notificationService.createNotification(bm.user, {
				type: "DEADLINE_CHANGED",
				title: alertTitle,
				message: alertMessage,
				priority: "high",
				scholarship: scholarship._id,
				scholarshipTitle: scholarship.title,
				deadline: newDeadline,
				amount: scholarship.amount?.value,
				evidence: {
					eligibilityReason:
						"Automated alert for your bookmarked or tracked opportunity",
					state: scholarship.state,
					category: scholarship.category,
				},
				link: `/scholarships`,
				dedupKey,
			});

			if (notif) {
				dispatchedCount++;

				// Automatically reschedule fresh 7-day and 48-hour reminders for the newly extended deadline
				if (newDeadline && new Date(newDeadline).getTime() > Date.now()) {
					const userDoc = await User.findById(bm.user).select("email").lean();
					if (userDoc?.email) {
						await scheduleDeadlineReminder({
							userId: bm.user,
							email: userDoc.email,
							scholarshipId: scholarship._id,
							scholarshipName: scholarship.title,
							deadlineDate: newDeadline,
							reminderWindow: "7_days",
						});
						await scheduleDeadlineReminder({
							userId: bm.user,
							email: userDoc.email,
							scholarshipId: scholarship._id,
							scholarshipName: scholarship.title,
							deadlineDate: newDeadline,
							reminderWindow: "48_hours",
						});
					}
				}
			}
		} catch (err) {
			console.warn(
				`[ReminderWorker] Failed notifying user ${bm.user} on deadline change:`,
				err.message,
			);
		}
	}

	await NotificationLog.create({
		jobName: "BULLMQ_DEADLINE_CHANGE_FANOUT",
		channel: "job",
		status: "SUCCESS",
		metadata: {
			scholarshipId,
			changeType,
			recipients: bookmarks.length,
			dispatched: dispatchedCount,
		},
	});

	return {
		status: "COMPLETED",
		recipients: bookmarks.length,
		dispatched: dispatchedCount,
	};
}

/**
 * Start worker in-process
 */
export function startReminderWorker() {
	return createReminderWorker();
}

/**
 * Gracefully close worker
 */
export async function closeReminderWorker() {
	if (workerInstance) {
		try {
			await workerInstance.close();
			workerInstance = null;
			console.log("[ReminderWorker] Worker closed gracefully.");
		} catch (err) {
			console.error("[ReminderWorker] Error closing worker:", err.message);
		}
	}
}

// Standalone execution support: node src/workers/reminderWorker.js
if (process.argv[1]?.endsWith("reminderWorker.js")) {
	import("dotenv").then(({ default: dotenv }) => {
		dotenv.config();
		import("../config/db.js").then(({ default: connectDB }) => {
			connectDB().then(() => {
				console.log(
					"[ReminderWorker] Standalone worker process started and connected to MongoDB.",
				);
				startReminderWorker();
			});
		});
	});

	const handleExit = async (signal) => {
		console.log(`[ReminderWorker] Received ${signal}. Shutting down worker...`);
		await closeReminderWorker();
		process.exit(0);
	};

	process.on("SIGTERM", () => handleExit("SIGTERM"));
	process.on("SIGINT", () => handleExit("SIGINT"));
}

export default createReminderWorker;