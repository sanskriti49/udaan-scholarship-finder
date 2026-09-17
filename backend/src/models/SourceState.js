import mongoose from "mongoose";

const sourceStateSchema = new mongoose.Schema(
	{
		sourceId: { type: String, unique: true, required: true },
		lastAttemptAt: Date,
		lastSuccessAt: Date,
		lastStatus: String,
		lastRunId: String,
		consecutiveFailures: { type: Number, default: 0 },
		lastError: mongoose.Schema.Types.Mixed,
	},
	{ timestamps: true },
);

export default mongoose.models.SourceState || mongoose.model("SourceState", sourceStateSchema);
