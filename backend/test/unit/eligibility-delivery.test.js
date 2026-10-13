import test from "node:test";
import assert from "node:assert/strict";
import { deliverEligibilityNotification } from "../../src/services/eligibilityDelivery.js";

function harness({ failEmail = false } = {}) {
	let receipt, emailAttempts = 0;
	const notifications = new Map();
	return { notifications, get receipt() { return receipt; }, get emailAttempts() { return emailAttempts; }, dependencies: {
		clock: () => new Date("2026-10-13T00:00:00Z"),
		EligibilityAlertDelivery: {
			findOneAndUpdate: async (filter, update) => {
				if (update.$setOnInsert) {
					receipt ||= { ...update.$setOnInsert, _id: "receipt" }; return { ...receipt };
				}
				if (receipt.emailStatus === "sending") return null;
				Object.assign(receipt, update.$set); return { ...receipt };
			},
			updateOne: async (filter, update) => Object.assign(receipt, update.$set),
		},
		Notification: {
			findOneAndUpdate: async (filter, update) => {
				const id = String(filter._id);
				if (!notifications.has(id)) notifications.set(id, { ...update.$setOnInsert, _id: id });
				return notifications.get(id);
			}, updateOne: async () => {},
		},
		User: { findById: () => ({ select: () => ({ lean: async () => ({ email: "student@example.invalid" }) }) }) },
		emailService: { sendEmail: async () => { emailAttempts++; if (failEmail && emailAttempts === 1) return { success: false, error: "SMTP temporarily unavailable" }; return { success: true, messageId: "synthetic" }; } },
	} };
}
const payload = { type: "ELIGIBILITY_CHANGED", title: "Synthetic alert", message: "Example only", scholarship: "012345678901234567890123", data: { currentVersionId: "012345678901234567890124" }, dedupKey: "synthetic-key" };
const prefs = { channels: { inApp: true, email: true } };

test("actual delivery resumes failed email without creating another notification", async () => {
	const h = harness({ failEmail: true });
	await assert.rejects(deliverEligibilityNotification("user", payload, prefs, h.dependencies), /SMTP temporarily/);
	assert.equal(h.receipt.status, "pending"); assert.equal(h.receipt.emailStatus, "failed");
	await deliverEligibilityNotification("user", payload, prefs, h.dependencies);
	assert.equal(h.notifications.size, 1); assert.equal(h.emailAttempts, 2); assert.equal(h.receipt.status, "completed");
	assert.equal(await deliverEligibilityNotification("user", payload, prefs, h.dependencies), null);
	assert.equal(h.emailAttempts, 2);
});

test("permanent receipts prevent repeat delivery after the inbox item is dismissed", async () => {
	const h = harness();
	await deliverEligibilityNotification("user", payload, { channels: { inApp: true, email: false } }, h.dependencies);
	h.notifications.clear();
	assert.equal(await deliverEligibilityNotification("user", payload, prefs, h.dependencies), null);
	assert.equal(h.notifications.size, 0); assert.equal(h.emailAttempts, 0);
});

test("email-only settings preserve skipped in-app delivery and schema accepts it", async () => {
	const h = harness();
	const notification = await deliverEligibilityNotification("user", payload, { channels: { inApp: false, email: true } }, h.dependencies);
	assert.equal(notification.deliveryChannels.inApp.status, "skipped");
	assert.equal(h.emailAttempts, 1);
});

test("dismissal during a failed email is preserved and retries use the original assessed payload", async () => {
	const h = harness({ failEmail: true });
	await assert.rejects(deliverEligibilityNotification("user", payload, prefs, h.dependencies));
	const notice = [...h.notifications.values()][0]; notice.isDismissed = true;
	let emailData;
	h.dependencies.emailService.sendEmail = async data => { emailData = data.data; return { success: true }; };
	await deliverEligibilityNotification("user", { ...payload, message: "Changed profile assessment on retry" }, prefs, h.dependencies);
	assert.equal(h.notifications.size, 1); assert.equal(notice.isDismissed, true);
	assert.equal(emailData.message, payload.message);
});
