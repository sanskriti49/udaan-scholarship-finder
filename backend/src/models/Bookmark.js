import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		scholarship: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Scholarship",
			required: true,
		},
	},
	{ timestamps: true },
);

bookmarkSchema.index({ user: 1, scholarship: 1 }, { unique: true });
bookmarkSchema.index({ scholarship: 1 });

export default mongoose.models.Bookmark ||
	mongoose.model("Bookmark", bookmarkSchema);
