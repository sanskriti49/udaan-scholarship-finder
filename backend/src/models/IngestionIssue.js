import mongoose from "mongoose";

/** Review queue: validation problems, conflicts and suspicious data. */
const ingestionIssueSchema = new mongoose.Schema(
	{
		key: { type: String, unique: true, required: true },
		sourceId: { type: String, index: true },
		schemeKey: { type: String, default: null, index: true },
		code: { type: String, required: true },
		severity: { type: String, enum: ["blocking", "warning", "info"], required: true },
		message: String,
		details: mongoose.Schema.Types.Mixed,
		status: { type: String, enum: ["open", "resolved", "acknowledged"], default: "open", index: true },
		runId: String,
		firstSeenAt: Date,
		lastSeenAt: Date,
		resolvedAt: Date,
		occurrences: { type: Number, default: 1 },
	},
	{ timestamps: true },
);

export default mongoose.models.IngestionIssue || mongoose.model("IngestionIssue", ingestionIssueSchema);
