import test, { after } from "node:test";
import assert from "node:assert/strict";
import Notification from "../../src/models/Notification.js";
import NotificationPreference from "../../src/models/NotificationPreference.js";
import { deleteNotification, getNotifications, getUnreadCount } from "../../src/controllers/notificationController.js";
import { closeRedisClient } from "../../src/config/redis.js";
after(closeRedisClient);

const id = "012345678901234567890123", userId = "012345678901234567890124";
const request = { user: { _id: userId }, params: { id }, query: {} };
function response() {
	return { code: null, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test("actual inbox dismissal hides eligibility alerts instead of deleting an email retry's record", async t => {
	t.mock.method(Notification, "findOneAndUpdate", async (filter, update) => {
		assert.equal(filter.user, userId); assert.equal(filter.type, "ELIGIBILITY_CHANGED");
		assert.equal(update.$set.isDismissed, true); assert.equal(update.$set.isRead, true);
		return { _id: id };
	});
	t.mock.method(Notification, "findOneAndDelete", () => { throw new Error("Must retain retry record"); });
	const res = response(); await deleteNotification(request, res);
	assert.equal(res.code, 200);
});

test("other notifications keep their deletion behavior with user ownership enforced", async t => {
	t.mock.method(Notification, "findOneAndUpdate", async () => null);
	t.mock.method(Notification, "findOneAndDelete", async filter => {
		assert.equal(filter._id, id); assert.equal(filter.user, userId);
		assert.equal(filter.type.$ne, "ELIGIBILITY_CHANGED"); return { _id: id };
	});
	const res = response(); await deleteNotification(request, res);
	assert.equal(res.code, 200);
});

test("inbox lists and unread counts exclude dismissed eligibility records", async t => {
	const filters = [];
	t.mock.method(Notification, "find", filter => {
		filters.push(filter); return { sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }) };
	});
	t.mock.method(Notification, "countDocuments", async filter => { filters.push(filter); return 0; });
	await getNotifications(request, response()); await getUnreadCount(request, response());
	assert.equal(filters.length, 4);
	assert.ok(filters.every(filter => filter.user === userId && filter.isDismissed.$ne === true));
});

test("real schemas default eligibility opt-in off and accept email-only eligibility notifications", () => {
	assert.equal(new NotificationPreference({ user: userId }).eligibilityChanges, false);
	const notification = new Notification({ user: userId, type: "ELIGIBILITY_CHANGED", title: "Synthetic", message: "Example only",
		deliveryChannels: { inApp: { status: "skipped" }, email: { status: "pending" } } });
	assert.equal(notification.validateSync(), undefined);
});
