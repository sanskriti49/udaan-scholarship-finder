import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			unique: true,
			required: true,
		},
		fullName: String,
		educationLevel: {
			type: String,
			enum: ["Class 10", "Class 12", "UG", "PG", "PhD"],
		},
		courseStream: {
			type: String,
			enum: [
				"Engineering",
				"Medical",
				"Arts",
				"Commerce",
				"Science",
				"Diploma",
				"Technology",
				"Other",
			],
		},
		stream: String, // Normalized alias
		income: Number,
		familyIncome: Number, // Normalized alias
		gender: { type: String, enum: ["Male", "Female", "Other"] },
		caste_category: {
			type: String,
			enum: ["General", "OBC", "SC", "ST", "EWS"],
		},
		casteCategory: String, // Normalized alias
		state: String,
		cgpa: Number,
		percentage: Number,
		hasDisability: { type: Boolean, default: false },
		documentsHeld: {
			type: [String],
			default: ["MARKSHEET", "COLLEGE_ID", "BANK_PASSBOOK"],
		},
	},
	{ timestamps: true },
);

profileSchema.pre("save", function () {
	if (this.income && !this.familyIncome) this.familyIncome = this.income;
	if (this.familyIncome && !this.income) this.income = this.familyIncome;
	if (this.courseStream && !this.stream) this.stream = this.courseStream;
	if (this.caste_category && !this.casteCategory)
		this.casteCategory = this.caste_category;
});

export default mongoose.models.UserProfile ||
	mongoose.model("UserProfile", profileSchema);
