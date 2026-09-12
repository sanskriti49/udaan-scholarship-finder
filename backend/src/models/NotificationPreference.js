import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
			index: true,
		},
		instantMatch: {
			type: Boolean,
			default: true,
		},
		deadlineAlerts: {
			type: Boolean,
			default: true,
		},
		deadline7Days: {
			type: Boolean,
			default: true,
		},
		deadline48Hours: {
			type: Boolean,
			default: true,
		},
		newGrantsInState: {
			type: Boolean,
			default: true,
		},
		weeklyDigest: {
			type: Boolean,
			default: true,
		},
		channels: {
			inApp: {
				type: Boolean,
				default: true,
			},
			email: {
				type: Boolean,
				default: true,
			},
		},
		frequency: {
			type: String,
			enum: ["instant", "daily_digest", "weekly"],
			default: "instant",
		},
		timezone: {
			type: String,
			default: "Asia/Kolkata",
		},
		minMatchScore: {
			type: Number,
			default: 70,
			min: 0,
			max: 100,
		},
	},
	{ timestamps: true },
);

export default mongoose.models.NotificationPreference ||
	mongoose.model("NotificationPreference", notificationPreferenceSchema);
