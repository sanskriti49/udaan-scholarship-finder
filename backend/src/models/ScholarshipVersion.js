import mongoose from "mongoose";

/**
 * Change history. Only written when normalised, cited data changes (never for
 * page-only changes). Each entry carries the evidence that justified it.
 */
const scholarshipVersionSchema = new mongoose.Schema(
	{
		scholarship: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship", required: true, index: true },
		schemeKey: { type: String, index: true },
		sourceId: String,
		runId: String,
		academicYear: String,
		observedAt: { type: Date, default: Date.now, index: true },
		changeType: {
			type: String,
			enum: [
				"FIRST_OBSERVED",
				"NEW_CYCLE",
				"CYCLE_DATES_CHANGED",
				"DEADLINE_EXTENSION",
				"DEADLINE_SHORTENED",
				"INCOME_CEILING_CHANGE",
				"AWARD_UPDATE",
				"CRITERIA_MODIFIED",
				"LINK_UPDATED",
				"FIELD_UPDATED",
				// pre-provenance values, kept so old documents still validate
				"ELIGIBILITY_EXPANSION",
				"DOCUMENT_REQUIREMENT_ADDED",
			],
			required: true,
		},
		summary: { type: String, required: true },
		deltas: [
			{
				field: String,
				oldValue: mongoose.Schema.Types.Mixed,
				newValue: mongoose.Schema.Types.Mixed,
				humanReadable: String,
			},
		],
		evidence: [mongoose.Schema.Types.Mixed],
		sourceSnapshotUrl: String,
		contentHash: String,
		// Entries created by the old bootstrap script were invented; they are kept for audit only.
		legacyUnverified: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

scholarshipVersionSchema.index({ scholarship: 1, observedAt: -1 });

export default mongoose.models.ScholarshipVersion || mongoose.model("ScholarshipVersion", scholarshipVersionSchema);
