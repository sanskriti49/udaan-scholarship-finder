import mongoose from "mongoose";

const scholarshipSchema = new mongoose.Schema(
	{
		sourceUrl: {
			type: String,
			unique: true,
			required: true,
			sparse: true,
		},
		applicationLink: String,

		sourceSite: {
			type: String,
			required: true,
		},
		lastScrapedAt: Date,

		title: {
			type: String,
			required: true,
			index: "text",
		},
		organization: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		summary: String,

		amount: {
			value: { type: Number, required: true },
			currency: { type: String, default: "INR" },
			period: {
				type: String,
				enum: ["yearly", "monthly", "one-time", "total"],
				default: "yearly",
			},
			displayString: String,
		},

		deadline: {
			type: Date,
			required: true,
			index: true,
		},

		applicationOpenDate: Date,

		category: {
			type: String,
			enum: [
				"Merit based",
				"Need based",
				"Women",
				"SC / ST / OBC",
				"Minority",
				"Sports",
				"Disability",
				"Government",
			],
			required: true,
		},
		tags: [
			{
				type: String,
				enum: [
					"Merit-Based",
					"Need-Based",
					"Women Only",
					"SC/ST/OBC",
					"Minority",
					"Sports",
					"Disability",
					"STEM",
					"EWS",
					"Rural",
					"Differently Abled",
				],
			},
		],
		level: {
			type: String,
			enum: ["Class 10", "Class 12", "UG", "PG", "PhD"],
		},
		state: {
			type: String,
			default: "All India",
			index: true,
		},
		sourceType: {
			type: String,
			enum: ["Government", "Institution", "NGO / Trust", "Corporate"],
			default: "Government",
		},
		eligibility: {
			gender: {
				type: String,
				enum: ["Any", "Male", "Female"],
				default: "Any",
			},
			casteCategories: [String],
			eligibleStreams: [String],
			eligibleLevels: [String],
			minCGPA: Number,
			maxCGPA: Number,
			disabilityRequired: { type: Boolean, default: false },
			familyIncome: {
				min: Number,
				max: Number,
			},
			age: {
				min: Number,
				max: Number,
			},
		},

		popular: { type: Boolean, default: false },
		verified: { type: Boolean, default: false },

		rawData: { type: mongoose.Schema.Types.Mixed },
	},
	{ timestamps: true },
);

scholarshipSchema.index({
	title: "text",
	organization: "text",
	description: "text",
});
scholarshipSchema.index({ state: 1, category: 1, deadline: 1 });
scholarshipSchema.index({ level: 1 });
scholarshipSchema.index({ "amount.value": 1 });
scholarshipSchema.index({ tags: 1 });
scholarshipSchema.index({ popular: 1, verified: 1 });

export default mongoose.model("Scholarship", scholarshipSchema);
