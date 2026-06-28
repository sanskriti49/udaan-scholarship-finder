import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (req, res) => {
	try {
		const { name, email, password } = req.body;
		if (!name || !email || !password) {
			return res.status(400).json({ message: "All fields are required" });
		}
		const existingUser = await User.findOne({ email });

		if (existingUser) {
			return res.status(400).json({ message: "User already exists" });
		}
		const user = await User.create({
			name,
			email,
			password,
			authProvider: "local",
		});

		const token = generateToken(user._id);

		return res.status(201).json({
			message: "User registered successfully",
			token,
			user: {
				id: user.userId,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
};

export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Email and password are required" });
		}
		const user = await User.findOne({ email }).select("+password");
		if (!user) {
			return res.status(401).json({ message: "Invalid email or password" });
		}
		if (!user.password) {
			return res.status(400).json({
				message: "This account uses Google login. Please continue with Google.",
			});
		}
		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			return res.status(401).json({ message: "Invalid email or password" });
		}
		const token = generateToken(user._id);
		return res.status(200).json({
			message: "Login successful",
			token,
			user: {
				id: user.userId,
				name: user.name,
				email: user.email,
				role: user.role,
				avatar: user.avatar,
			},
		});
	} catch (err) {
		return res.status(500).json({
			message: "Server error",
			error: err.message,
		});
	}
};

export const googleLogin = async (req, res) => {
	try {
		const { credential } = req.body;

		if (!credential) {
			return res.status(400).json({ message: "Google credential is required" });
		}

		const ticket = await client.verifyIdToken({
			idToken: credential,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();

		if (!payload.email_verified) {
			return res.status(401).json({ message: "Google email not verified" });
		}

		const { name, email, sub, picture } = payload;

		let user = await User.findOne({ email });

		if (!user) {
			user = await User.create({
				name,
				email,
				googleId: sub,
				avatar: picture,
				authProvider: "google",
			});
		} else {
			// If user already exists but googleId is not saved, link it
			if (!user.googleId) {
				user.googleId = sub;
			}

			if (!user.avatar && picture) {
				user.avatar = picture;
			}

			await user.save();
		}

		const token = generateToken(user._id);

		return res.status(200).json({
			message: "Google login successful",
			token,
			user: {
				id: user.userId,
				name: user.name,
				email: user.email,
				role: user.role,
				avatar: user.avatar,
			},
		});
	} catch (error) {
		return res.status(401).json({
			message: "Google authentication failed",
			error: error.message,
		});
	}
};
