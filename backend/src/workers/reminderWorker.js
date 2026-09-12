import { Worker } from "bullmq";
import { bullMqConnection } from "../config/redis.js";
import { REMINDER_QUEUE_NAME } from "../queues/reminderQueue.js";
import { emailService } from "../services/emailService.js";
import { notificationService } from "../services/notificationService.js";
import Scholarship from "../models/Scholarship.js";
import NotificationLog from "../models/NotificationLog.js";

/**
 * BullMQ Reminder Worker for Udaan
 *
 * Processes delayed deadline reminder jobs in the background.
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

			const now = new Date();
			if (new Date(scholarship.deadline).getTime() <= now.getTime()) {
				console.warn(
					`[ReminderWorker] Scholarship '${scholarship.title}' has expired. Suppressing reminder.`,
				);
				return { status: "SKIPPED", reason: "Deadline expired" };
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

			// Step 3: Dispatch In-App Notification (Idempotent)
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

			// Step 4: Dispatch Email via EmailService
			let emailResult = { success: false, skipped: true };
			if (prefs.channels?.email && email) {
				emailResult = await emailService.sendEmail({
					to: email,
					type: alertType,
					data: {
						title: isUrgent
							? `Urgent: 48 Hours Left to Apply: ${scholarship.title}`
							: `7 Days Remaining: ${scholarship.title}`,
						scholarshipTitle: scholarship.title,
						deadline: scholarship.deadline,
						link: "/scholarships",
					},
					notificationId: notification?._id,
					userId,
				});
			}

			// Step 5: Log telemetry in NotificationLog
			await NotificationLog.create({
				notification: notification?._id,
				user: userId,
				jobName: "BULLMQ_REMINDER_WORKER",
				channel: "job",
				status: "SUCCESS",
				recipient: email,
				subject: `Deadline reminder (${reminderWindow}): ${scholarship.title}`,
				metadata: {
					jobId: job.id,
					attemptsMade: job.attemptsMade,
					emailDispatched: emailResult.success,
				},
			});

			return {
				status: "COMPLETED",
				jobId: job.id,
				notificationId: notification?._id,
				emailSent: emailResult.success,
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
