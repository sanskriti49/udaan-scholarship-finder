import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: [
				"INSTANT_MATCH",
				"DEADLINE_7_DAYS",
				"DEADLINE_48_HOURS",
				"STATE_GRANT_UPDATE",
				"WEEKLY_DIGEST",
				"DEADLINE_CHANGED",
				"SYSTEM",
			],
			required: true,
			index: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		priority: {
			type: String,
			enum: ["low", "medium", "high", "urgent"],
			default: "medium",
		},
		scholarship: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Scholarship",
			default: null,
			index: true,
		},
		scholarshipTitle: {
			type: String,
			default: null,
		},
		deadline: {
			type: Date,
			default: null,
		},
		amount: {
			type: Number,
			default: null,
		},
		evidence: {
			matchScore: { type: Number, min: 0, max: 100 },
			passedRulesSummary: [String],
			eligibilityReason: String,
			state: String,
			category: String,
		},
		data: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
		link: {
			type: String,
			default: "/scholarships",
		},
		isRead: {
			type: Boolean,
			default: false,
			index: true,
		},
		readAt: {
			type: Date,
			default: null,
		},
		dedupKey: {
			type: String,
			unique: true,
			sparse: true,
			index: true,
		},
		deliveryChannels: {
			inApp: {
				status: {
					type: String,
					enum: ["delivered", "read"],
					default: "delivered",
				},
				deliveredAt: {
					type: Date,
					default: Date.now,
				},
			},
			email: {
				status: {
					type: String,
					enum: ["pending", "sent", "failed", "skipped"],
					default: "pending",
				},
				sentAt: Date,
				error: String,
				messageId: String,
			},
		},
	},
	{ timestamps: true },
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });

export default mongoose.models.Notification ||
	mongoose.model("Notification", notificationSchema);
