import mongoose from "mongoose";

// The rule snapshot is immutable. Only the delivery state is updated after insertion.
const schema = new mongoose.Schema({
	scholarship: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship", required: true, immutable: true },
	schemeKey: { type: String, required: true, immutable: true },
	versionKey: { type: String, required: true, unique: true, immutable: true },
	contentHash: { type: String, required: true, immutable: true },
	previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: "EligibilityRuleVersion", default: null, immutable: true },
	snapshot: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
	evidence: { type: [mongoose.Schema.Types.Mixed], immutable: true },
	verified: { type: Boolean, required: true, immutable: true },
	observedAt: { type: Date, required: true, immutable: true },
	alert: {
		status: { type: String, enum: ["none", "pending", "queued", "completed", "suppressed"], default: "none" },
		queuedAt: Date,
		completedAt: Date,
		result: mongoose.Schema.Types.Mixed,
	},
}, { timestamps: true });
schema.index({ "alert.status": 1, "alert.queuedAt": 1 });
schema.index({ scholarship: 1, observedAt: -1 });

export default mongoose.models.EligibilityRuleVersion || mongoose.model("EligibilityRuleVersion", schema);
