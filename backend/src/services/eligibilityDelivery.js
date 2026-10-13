import mongoose from "mongoose";

export async function deliverEligibilityNotification(userId, payload, prefs, { Notification, EligibilityAlertDelivery, User, emailService, clock = () => new Date() }) {
	const identity = { user: userId, scholarship: payload.scholarship, version: payload.data.currentVersionId };
	let receipt;
	try {
		receipt = await EligibilityAlertDelivery.findOneAndUpdate(identity, { $setOnInsert: {
			...identity, notificationId: new mongoose.Types.ObjectId(), status: "pending",
			emailStatus: prefs.channels?.email ? "pending" : "skipped",
		} }, { upsert: true, new: true, lean: true });
	} catch (error) {
		if (error.code !== 11000) throw error;
		receipt = await EligibilityAlertDelivery.findOne(identity).lean();
	}
	if (receipt.status === "completed") return null;
	const notification = await Notification.findOneAndUpdate({ _id: receipt.notificationId }, { $setOnInsert: {
		user: userId, ...payload, deliveryChannels: {
			inApp: { status: prefs.channels?.inApp ? "delivered" : "skipped", deliveredAt: clock() },
			email: { status: receipt.emailStatus === "sent" ? "sent" : prefs.channels?.email ? "pending" : "skipped" },
		},
	} }, { upsert: true, new: true, runValidators: true });
	if (prefs.channels?.email && !["sent", "skipped"].includes(receipt.emailStatus)) {
		const claim = await EligibilityAlertDelivery.findOneAndUpdate({ _id: receipt._id, $or: [
			{ emailStatus: { $in: ["pending", "failed"] } }, { emailStatus: "sending", leaseUntil: { $lte: clock() } },
		] }, { $set: { emailStatus: "sending", leaseUntil: new Date(clock().getTime() + 120000) } }, { new: true });
		if (!claim) throw new Error("Eligibility email delivery is already in progress; retry later");
		try {
			const user = await User.findById(userId).select("email").lean();
			if (user?.email) {
				const savedPayload = notification.toObject ? notification.toObject() : notification;
				const result = await emailService.sendEmail({ to: user.email, type: payload.type, data: savedPayload,
					notificationId: notification._id, userId });
				if (!result.success) throw new Error(result.error || "Eligibility email delivery failed");
				await Notification.updateOne({ _id: notification._id }, { $set: {
					"deliveryChannels.email.status": "sent", "deliveryChannels.email.sentAt": clock(),
					"deliveryChannels.email.messageId": result.messageId || null, "deliveryChannels.email.error": null,
				} });
			}
			await EligibilityAlertDelivery.updateOne({ _id: receipt._id }, { $set: { emailStatus: user?.email ? "sent" : "skipped" } });
			if (!user?.email) await Notification.updateOne({ _id: notification._id }, { $set: { "deliveryChannels.email.status": "skipped" } });
		} catch (error) {
			await EligibilityAlertDelivery.updateOne({ _id: receipt._id }, { $set: { emailStatus: "failed" } });
			await Notification.updateOne({ _id: notification._id }, { $set: { "deliveryChannels.email.status": "failed", "deliveryChannels.email.error": error.message } });
			throw error;
		}
	}
	if (!prefs.channels?.email && receipt.emailStatus !== "sent") {
		await EligibilityAlertDelivery.updateOne({ _id: receipt._id }, { $set: { emailStatus: "skipped" } });
		await Notification.updateOne({ _id: notification._id }, { $set: { "deliveryChannels.email.status": "skipped" } });
	}
	await EligibilityAlertDelivery.updateOne({ _id: receipt._id }, { $set: { status: "completed" } });
	return notification;
}
