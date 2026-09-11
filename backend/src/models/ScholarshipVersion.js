import mongoose from "mongoose";

const scholarshipVersionSchema = new mongoose.Schema(
	{
		scholarship: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Scholarship",
			required: true,
			index: true,
		},
		observedAt: {
			type: Date,
			default: Date.now,
			index: true,
		},
		changeType: {
			type: String,
			enum: [
				"ELIGIBILITY_EXPANSION",
				"DEADLINE_EXTENSION",
				"DEADLINE_SHORTENED",
				"INCOME_CEILING_CHANGE",
				"AWARD_UPDATE",
				"DOCUMENT_REQUIREMENT_ADDED",
				"CRITERIA_MODIFIED",
			],
			required: true,
		},
		summary: {
			type: String,
			required: true,
		},
		deltas: [
			{
				field: String,
				oldValue: mongoose.Schema.Types.Mixed,
				newValue: mongoose.Schema.Types.Mixed,
				humanReadable: String,
			},
		],
		sourceSnapshotUrl: String,
		contentHash: String,
	},
	{ timestamps: true },
);

scholarshipVersionSchema.index({ scholarship: 1, observedAt: -1 });

export default mongoose.models.ScholarshipVersion ||
	mongoose.model("ScholarshipVersion", scholarshipVersionSchema);
