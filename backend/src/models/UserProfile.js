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
			enum: ["Engineering", "Medical", "Arts", "Commerce", "Science", "Other"],
		},
		income: Number,
		gender: { type: String, enum: ["Male", "Female", "Other"] },
		caste_category: {
			type: String,
			enum: ["General", "OBC", "SC", "ST", "EWS"],
		},
		state: String,
		cgpa: Number,
		hasDisability: { type: Boolean, default: false },
	},
	{ timestamps: true },
);
export default mongoose.models.UserProfile ||
	mongoose.model("UserProfile", profileSchema);
