import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
	{
		notification: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Notification",
			default: null,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
			index: true,
		},
		jobName: {
			type: String,
			default: null,
			index: true,
		},
		channel: {
			type: String,
			enum: ["inApp", "email", "job", "system"],
			default: "email",
		},
		status: {
			type: String,
			enum: ["SUCCESS", "FAILED", "SKIPPED", "RETRY"],
			required: true,
			index: true,
		},
		recipient: {
			type: String,
			default: null,
		},
		subject: {
			type: String,
			default: null,
		},
		attempt: {
			type: Number,
			default: 1,
		},
		error: {
			type: String,
			default: null,
		},
		messageId: {
			type: String,
			default: null,
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
	},
	{ timestamps: true },
);

notificationLogSchema.index({ createdAt: -1 });

export default mongoose.models.NotificationLog ||
	mongoose.model("NotificationLog", notificationLogSchema);
