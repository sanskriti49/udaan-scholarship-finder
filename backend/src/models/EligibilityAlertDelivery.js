import mongoose from "mongoose";

// Permanent receipt survives inbox dismissal and job retention cleanup.
const schema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	scholarship: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship", required: true },
	version: { type: mongoose.Schema.Types.ObjectId, ref: "EligibilityRuleVersion", required: true },
	notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Notification", required: true },
	status: { type: String, enum: ["pending", "completed"], default: "pending" },
	emailStatus: { type: String, enum: ["pending", "sending", "sent", "failed", "skipped"], default: "pending" },
	leaseUntil: Date,
}, { timestamps: true });
schema.index({ user: 1, scholarship: 1, version: 1 }, { unique: true });
export default mongoose.models.EligibilityAlertDelivery || mongoose.model("EligibilityAlertDelivery", schema);
