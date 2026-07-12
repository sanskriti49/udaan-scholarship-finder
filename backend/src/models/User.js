import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Name is required"],
			trim: true,
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			trim: true,
		},
		role: {
			type: String,
			enum: ["student", "admin"],
			default: "student",
		},
		password: {
			type: String,
			// Removed minlength from here so it doesn't conflict with OAuth users
			select: false,
		},
		googleId: {
			type: String,
			default: null,
		},
		authProvider: {
			type: String,
			enum: ["local", "google"],
			default: "local",
		},
	},
	{ timestamps: true },
);

userSchema.pre("save", function (next) {
	if (this.authProvider === "local" && this.isModified("password")) {
		if (!this.password || this.password.length < 6) {
			return next(
				new Error("An account must have a password of at least 6 characters"),
			);
		}
	}

	next();
});

export default mongoose.models.User || mongoose.model("User", userSchema);
