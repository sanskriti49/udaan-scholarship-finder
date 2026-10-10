import { Worker } from "bullmq";
import { bullMqConnection } from "../config/redis.js";
import { REMINDER_QUEUE_NAME, scheduleDeadlineReminder } from "../queues/reminderQueue.js";
import { emailService } from "../services/emailService.js";
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

			const {
				userId,
				email,
				scholarshipId,
				scholarshipName,
				deadlineDate,
				reminderWindow,
			} = job.data;

			console.log(
				`[ReminderWorker] Processing reminder job ${job.id} for user ${userId} on '${scholarshipName}' (${reminderWindow}).`,
			);

			// Step 1: Re-verify scholarship status and deadline freshness
			const scholarship = await Scholarship.findById(scholarshipId).lean();
			if (!scholarship) {
				console.warn(
					`[ReminderWorker] Scholarship ${scholarshipId} no longer exists. Skipping job ${job.id}.`,
				);
				return { status: "SKIPPED", reason: "Scholarship not found" };
			}

			if (scholarship.publication?.state !== "published" || !scholarship.deadline) {
				return { status: "SKIPPED", reason: "Scholarship is not published with an official deadline" };
			}

			const now = new Date();
			if (new Date(scholarship.deadline).getTime() <= now.getTime()) {
				console.warn(
					`[ReminderWorker] Scholarship '${scholarship.title}' has expired. Suppressing reminder.`,
				);
				return { status: "SKIPPED", reason: "Deadline expired" };
			}

			// Check if user still has this scholarship bookmarked
			const isStillBookmarked = await Bookmark.exists({
				user: userId,
				scholarship: scholarshipId,
			});
			if (!isStillBookmarked) {
				console.log(
					`[ReminderWorker] User ${userId} has unbookmarked scholarship ${scholarshipId}. Skipping reminder.`,
				);
				return { status: "SKIPPED", reason: "Scholarship no longer bookmarked" };
			}

			// Step 2: Check user notification preferences
			const prefs = await notificationService.getPreferences(userId);
			if (!prefs.deadlineAlerts) {
				console.log(
					`[ReminderWorker] User ${userId} has deadlineAlerts disabled. Skipping.`,
				);
				return { status: "SKIPPED", reason: "User preference disabled" };
			}

			if (reminderWindow === "7_days" && !prefs.deadline7Days) {
				return { status: "SKIPPED", reason: "7-day alerts disabled by user" };
			}
			if (reminderWindow === "48_hours" && !prefs.deadline48Hours) {
				return { status: "SKIPPED", reason: "48-hour alerts disabled by user" };
			}

			const alertType =
				reminderWindow === "48_hours" ? "DEADLINE_48_HOURS" : "DEADLINE_7_DAYS";
			const isUrgent = reminderWindow === "48_hours";
			const deadlineIsoDate = new Date(scholarship.deadline)
				.toISOString()
				.slice(0, 10);
			const dedupKey = `${alertType.toLowerCase()}:${userId}:${scholarshipId}:${deadlineIsoDate}`;

			// Step 3: Dispatch In-App & Email Notification (Idempotent via unique dedupKey)
			const notification = await notificationService.createNotification(userId, {
				type: alertType,
				title: isUrgent
					? `Urgent: 48 Hours Left to Apply: ${scholarship.title}`
					: `7 Days Remaining: ${scholarship.title}`,
				message: `Application deadline arrives on ${new Date(
					scholarship.deadline,
				).toLocaleDateString(
					"en-IN",
				)}. Submit your application on the official portal.`,
				priority: isUrgent ? "urgent" : "high",
				scholarship: scholarship._id,
				scholarshipTitle: scholarship.title,
				deadline: scholarship.deadline,
				amount: scholarship.amount?.value,
				evidence: {
					eligibilityReason:
						"Scheduled deadline countdown for your saved or matched opportunity",
					state: scholarship.state,
					category: scholarship.category,
				},
				link: "/scholarships",
				dedupKey,
			});

			// If notification is null, the unique dedupKey already exists in the database
			// (e.g. from a prior run or retried job). Cleanly skip to enforce idempotency.
			if (!notification) {
				console.log(
					`[ReminderWorker] Reminder already delivered for user ${userId} on ${scholarship.title} (${dedupKey}). Skipping cleanly.`,
				);
				return { status: "SKIPPED", reason: "Already delivered (idempotent)" };
			}

			const emailSent = notification.deliveryChannels?.email?.status === "sent";

			// Step 4: Log telemetry in NotificationLog
			await NotificationLog.create({
				notification: notification._id,
				user: userId,
				jobName: "BULLMQ_REMINDER_WORKER",
				channel: "job",
				status: "SUCCESS",
				recipient: email,
				subject: `Deadline reminder (${reminderWindow}): ${scholarship.title}`,
				metadata: {
					jobId: job.id,
					attemptsMade: job.attemptsMade,
					emailDispatched: emailSent,
				},
			});

			return {
				status: "COMPLETED",
				jobId: job.id,
				notificationId: notification._id,
				emailSent,
			};
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
