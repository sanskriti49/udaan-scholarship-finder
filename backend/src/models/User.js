import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

userSchema.pre("save", async function () {
	if (this.authProvider != "local" || !this.isModified("password")) return;

	if (!this.password || this.password.length < 6) {
		throw new Error("Password must be at least 6 characters");
	}
	// if (this.authProvider === "local" && this.isModified("password")) {
	// 	if (!this.password || this.password.length < 6) {
	// 		return next(
	// 			new Error("An account must have a password of at least 6 characters"),
	// 		);
	// 	}
	// }

	// next();
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.models.User || mongoose.model("User", userSchema);
