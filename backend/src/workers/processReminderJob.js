// The BullMQ worker and isolated regression tests use this same processor.
export async function processReminderJob(job, { Scholarship, Bookmark, notificationService, NotificationLog, clock = () => new Date() }) {
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

	const now = clock();
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
		return { status: "SKIPPED", reason: "Notification suppressed or already recorded" };
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
}
