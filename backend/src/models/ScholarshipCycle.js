import mongoose from "mongoose";

/**
 * One application window of a scheme for one academic year and application
 * type. A new academic year creates a new document; older cycles are never
 * overwritten, so history ("what were the AY 2025-26 dates?") is preserved.
 */
const scholarshipCycleSchema = new mongoose.Schema(
	{
		schemeKey: { type: String, required: true },
		scholarship: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship" },
		sourceId: String,
		academicYear: { type: String, required: true, match: /^20\d{2}-\d{2}$/ },
		applicationType: { type: String, enum: ["general", "renewal", "fresh"], required: true },
		opensAt: Date,
		closesAt: Date,
		latestPossibleClosesAt: Date,
		defectiveVerificationUntil: Date,
		instituteVerificationUntil: Date,
		officerVerificationUntil: Date,
		conflicts: [mongoose.Schema.Types.Mixed],
		evidence: [mongoose.Schema.Types.Mixed],
		firstSeenAt: Date,
		lastSeenAt: Date,
		dataHash: String,
	},
	{ timestamps: true },
);

scholarshipCycleSchema.index({ schemeKey: 1, academicYear: 1, applicationType: 1 }, { unique: true });

export default mongoose.models.ScholarshipCycle || mongoose.model("ScholarshipCycle", scholarshipCycleSchema);
