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
scholarshipSchema.index({ scholarship: 1 });
