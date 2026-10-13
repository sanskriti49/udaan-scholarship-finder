import test from "node:test";
import assert from "node:assert/strict";
import { processReminderJob } from "../../src/workers/processReminderJob.js";

function harness(overrides = {}) {
	const calls = { notification: [], logs: [] };
	const prefs = { deadlineAlerts: true, deadline7Days: true, deadline48Hours: true, ...overrides.prefs };
	const scholarship = overrides.scholarship === null ? null : { _id: "scheme", title: "Example grant", publication: { state: "published" }, deadline: "2026-10-31T23:59:59.999Z", ...overrides.scholarship };
	const notification = overrides.notification === null ? null : { _id: "notification", deliveryChannels: { email: { status: "sent" } } };
	return { calls, dependencies: {
		clock: () => new Date("2026-10-13T00:00:00Z"),
		Scholarship: { findById: () => ({ lean: async () => scholarship }) },
		Bookmark: { exists: async () => overrides.bookmarked !== false },
		notificationService: { getPreferences: async () => prefs, createNotification: async (...args) => { calls.notification.push(args); return notification; } },
		NotificationLog: { create: async (data) => { calls.logs.push(data); } },
	} };
}
const job = (reminderWindow = "7_days") => ({ id: "job-1", attemptsMade: 0, data: { userId: "student", email: "test@example.invalid", scholarshipId: "scheme", scholarshipName: "Example grant", reminderWindow } });

test("actual reminder processor suppresses removed bookmarks and disabled preferences before dispatch", async () => {
	for (const [overrides, window, reason] of [
		[{ bookmarked: false }, "7_days", "Scholarship no longer bookmarked"],
		[{ prefs: { deadlineAlerts: false } }, "7_days", "User preference disabled"],
		[{ prefs: { deadline7Days: false } }, "7_days", "7-day alerts disabled by user"],
		[{ prefs: { deadline48Hours: false } }, "48_hours", "48-hour alerts disabled by user"],
	]) {
		const h = harness(overrides);
		assert.deepEqual(await processReminderJob(job(window), h.dependencies), { status: "SKIPPED", reason });
		assert.equal(h.calls.notification.length, 0);
		assert.equal(h.calls.logs.length, 0);
	}
});

test("actual reminder processor checks existence, publication and expiry", async () => {
	for (const scholarship of [null, { publication: { state: "needs_review" } }, { deadline: null }, { deadline: "2026-10-12T00:00:00Z" }]) {
		const h = harness({ scholarship });
		assert.equal((await processReminderJob(job(), h.dependencies)).status, "SKIPPED");
		assert.equal(h.calls.notification.length, 0);
	}
});

test("actual reminder dispatch uses the current scheme data and a deterministic deduplication key", async () => {
	const h = harness();
	const result = await processReminderJob(job("48_hours"), h.dependencies);
	assert.equal(result.status, "COMPLETED");
	assert.equal(result.emailSent, true);
	assert.equal(h.calls.notification[0][1].type, "DEADLINE_48_HOURS");
	assert.equal(h.calls.notification[0][1].dedupKey, "deadline_48_hours:student:scheme:2026-10-31");
	assert.equal(h.calls.logs[0].metadata.jobId, "job-1");
});

test("a suppressed or previously recorded notification produces no success telemetry", async () => {
	const h = harness({ notification: null });
	assert.equal((await processReminderJob(job(), h.dependencies)).status, "SKIPPED");
	assert.equal(h.calls.notification.length, 1);
	assert.equal(h.calls.logs.length, 0);
});
