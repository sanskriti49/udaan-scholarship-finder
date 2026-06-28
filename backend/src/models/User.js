import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const userSchema = new mongoose.Schema(
	{
		userId: {
			type: String,
			default: randomUUID,
			unique: true,
		},

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
			required: function () {
				return this.authProvider === "local";
			},
			minlength: 6,
			select: false,
		},
		googleId: {
			type: String,
		},
		avatar: {
			type: String,
		},
		authProvider: {
			type: String,
			enum: ["local", "google"],
			default: "local",
		},
	},
	{
		timestamps: true,
	},
);

userSchema.pre("save", async function (next) {
	if (!this.isModified("password") || !this.password) {
		return next();
	}

	this.password = await bcrypt.hash(this.password, 10);
	next();
});

userSchema.methods.comparePassword = async function (enteredPass) {
	return await bcrypt.compare(enteredPass, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
