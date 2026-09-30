import mongoose from "mongoose";

/**
 * A scholarship SCHEME (stable identity across academic years).
 * Year-specific application windows live in ScholarshipCycle; the fields
 * `currentCycle`, `deadline` and `applicationOpenDate` are a denormalised view of
 * the latest cycle for fast queries.
 *
 * Unknown values are stored as null. Nothing here has a "sensible default"
 * that could be mistaken for official information.
 */

const evidenceSchema = new mongoose.Schema(
	{
		field: String,
		snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "SourceSnapshot" },
		sourceId: String,
		url: String,
		fetchedAt: Date,
		contentSha256: String,
		textHash: String,
		quote: String,
		charStart: Number,
		charEnd: Number,
		page: Number,
		locator: String,
		authorityTier: Number,
		documentDate: String,
	},
	{ _id: false },
);

const cycleViewSchema = new mongoose.Schema(
	{
		academicYear: String,
		applicationType: { type: String, enum: ["general", "renewal", "fresh"] },
		opensAt: Date,
		closesAt: Date,
		latestPossibleClosesAt: Date,
		defectiveVerificationUntil: Date,
		instituteVerificationUntil: Date,
		officerVerificationUntil: Date,
		hasConflict: { type: Boolean, default: false },
		evidence: [evidenceSchema],
	},
	{ _id: false },
);

const scholarshipSchema = new mongoose.Schema(
	{
		// ---- Identity ----
		schemeKey: { type: String, unique: true, sparse: true },
		slug: { type: String, unique: true, sparse: true },
		title: { type: String, required: true },
		officialTitle: String,
		organization: { type: String, default: null },

		// ---- Provenance ----
		sourceUrl: { type: String, default: null },
		sourceSite: { type: String, default: null },
		sourceType: {
			type: String,
			enum: ["Government", "Institution", "NGO / Trust", "Corporate", "Corporate CSR"],
			default: "Government",
		},
		primarySourceId: { type: String, index: true },
		authorityTier: Number,
		applicationLink: { type: String, default: null },
		officialLinks: {
			listingUrl: String,
			guidelinesUrl: String,
			faqUrl: String,
		},
		fieldEvidence: [evidenceSchema],

		// ---- Content (null = not published by an official source) ----
		description: { type: String, default: null },
		summary: { type: String, default: null },
		amount: {
			type: new mongoose.Schema(
				{
					value: { type: Number, default: null },
					currency: { type: String, default: "INR" },
					period: { type: String, enum: ["yearly", "monthly", "one-time", "total", null], default: null },
					months: { type: Number, default: null },
					options: [{ _id: false, value: Number, period: String, months: Number }],
					displayString: String,
				},
				{ _id: false },
			),
			default: null,
		},
		category: {
			type: String,
			enum: ["Merit based", "Need based", "Welfare based", "Women", "SC / ST / OBC", "Minority", "Sports", "Disability", "Government", null],
			default: null,
		},
		tags: [{ type: String, trim: true }],
		level: { type: String, enum: ["Class 10", "Class 12", "Diploma", "UG", "PG", "PhD", null], default: null },
		state: { type: String, default: "All India", index: true },
		eligibility: {
			gender: { type: String, enum: ["Any", "Male", "Female", null], default: null },
			casteCategories: [String],
			eligibleStreams: [String],
			eligibleLevels: [String],
			minCGPA: Number,
			maxCGPA: Number,
			disabilityRequired: { type: Boolean, default: false },
			minDisabilityPercent: { type: Number, default: null },
			familyIncome: {
				min: Number,
				max: Number,
				operator: { type: String, enum: ["LT", "LTE", null], default: null },
			},
			age: { min: Number, max: Number },
		},
		rules: [
			{
				id: { type: String, required: true },
				field: {
					type: String,
					enum: ["familyIncome", "cgpa", "percentage", "educationLevel", "stream", "gender", "casteCategory", "state", "hasDisability"],
					required: true,
				},
				operator: { type: String, enum: ["LT", "LTE", "GTE", "EQ", "IN", "BOOLEAN_MATCH"], required: true },
				targetValue: mongoose.Schema.Types.Mixed,
				isMandatory: { type: Boolean, default: true },
				description: String,
				failMessage: String,
				evidenceSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "SourceSnapshot" },
			},
		],
		requiredDocuments: [
			{
				code: { type: String, required: true },
				name: { type: String, required: true },
				mandatory: { type: Boolean, default: true },
			},
		],
		// Legacy-compatible citation projection used by the eligibility evaluator.
		provenanceQuotes: [
			{
				ruleId: String,
				sourceUrl: String,
				quote: String,
				clause: String,
				page: Number,
				snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "SourceSnapshot" },
				verifiedAt: Date,
			},
		],

		// ---- Cycle view ----
		currentCycle: { type: cycleViewSchema, default: null },
		academicYears: [String],
		deadline: { type: Date, default: null, index: true },
		applicationOpenDate: { type: Date, default: null },
		sortDeadline: { type: Date, default: null },

		// ---- Status & freshness (backend-computed) ----
		status: {
			type: String,
			enum: ["upcoming", "open", "closing_soon", "closed", "unknown"],
			default: "unknown",
			index: true,
		},
		statusReason: String,
		statusComputedAt: Date,
		stale: { type: Boolean, default: true },
		freshness: {
			firstSeenAt: Date,
			lastSeenAt: Date,
			lastVerifiedAt: Date,
			lastChangedAt: Date,
			lastSuccessfulCrawlAt: Date,
			staleAfterHours: { type: Number, default: 72 },
			missingSince: Date,
			missingRunCount: { type: Number, default: 0 },
		},
		publication: {
			state: {
				type: String,
				enum: ["published", "needs_review", "retired"],
				default: "needs_review",
				index: true,
			},
			updatedAt: Date,
			note: String,
		},
		dataQuality: {
			completeness: Number,
			unknownFields: [String],
		},
		dataHash: String,
		// true only when published, has an official current cycle and was re-verified recently
		verified: { type: Boolean, default: false },
		popular: { type: Boolean, default: false },
		hasChanges: { type: Boolean, default: false },
		latestChangeSummary: String,

		// ---- Pre-provenance catalogue ----
		legacy: { type: Boolean, default: false },
		legacySnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
	},
	{ timestamps: true },
);

scholarshipSchema.index(
	{ title: "text", organization: "text", tags: "text", category: "text", description: "text" },
	{
		weights: { title: 10, organization: 6, tags: 5, category: 3, description: 1 },
		name: "ScholarshipTextSearchIndex",
	},
);
scholarshipSchema.index({ "publication.state": 1, status: 1, sortDeadline: 1 });
scholarshipSchema.index({ "publication.state": 1, hasChanges: 1 });
scholarshipSchema.index({ "publication.state": 1, state: 1 });
scholarshipSchema.index({ state: 1, category: 1, deadline: 1 });
scholarshipSchema.index({ level: 1 });
scholarshipSchema.index({ "amount.value": 1 });
scholarshipSchema.index({ tags: 1 });
scholarshipSchema.index({ popular: 1, verified: 1 });

export default mongoose.models.Scholarship || mongoose.model("Scholarship", scholarshipSchema);
