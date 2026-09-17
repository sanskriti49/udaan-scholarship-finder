import mongoose from "mongoose";

const crawlRunSchema = new mongoose.Schema(
	{
		runId: { type: String, unique: true },
		sourceId: { type: String, index: true },
		startedAt: Date,
		finishedAt: Date,
		status: { type: String, enum: ["running", "success", "partial", "failed", "rejected"] },
		pageChanged: Boolean,
		pages: [mongoose.Schema.Types.Mixed],
		counts: mongoose.Schema.Types.Mixed,
		failures: [mongoose.Schema.Types.Mixed],
	},
	{ timestamps: true },
);
crawlRunSchema.index({ sourceId: 1, startedAt: -1 });

export default mongoose.models.CrawlRun || mongoose.model("CrawlRun", crawlRunSchema);
