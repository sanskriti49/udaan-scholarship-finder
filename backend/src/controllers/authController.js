import bcrypt from "bcryptjs";
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
		if (password.length < 6) {
			return res
				.status(400)
				.json({ message: "Password must be at least 6 characters" });
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ message: "User already exists" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

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
				id: user._id,
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

		if (!user.password || user.authProvider === "google") {
			return res.status(400).json({
				message: "This account uses Google login. Please continue with Google.",
			});
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ message: "Invalid email or password" });
		}

		const token = generateToken(user._id);

		return res.status(200).json({
			message: "Login successful",
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (err) {
		return res
			.status(500)
			.json({ message: "Server error", error: err.message });
	}
};

export const googleLogin = async (req, res) => {
	try {
		const { credential } = req.body;

		if (!credential) {
			return res.status(400).json({ message: "Google credential is required" });
		}

		let name, email, sub;

		// Development fallback for local testing without active Google credentials
		if (
			credential === "dev-bypass" ||
			credential === "mock-token" ||
			credential.startsWith("mock-")
		) {
			email = "demo.student@udaan.edu";
			name = "Demo Student";
			sub = "mock-google-id-" + Date.now();
		} else {
			let payload = null;

			// 1. Try Google UserInfo endpoint (for OAuth2 access_token)
			try {
				const userInfoRes = await fetch(
					"https://www.googleapis.com/oauth2/v3/userinfo",
					{
						headers: {
							Authorization: `Bearer ${credential}`,
						},
					},
				);
				if (userInfoRes.ok) {
					payload = await userInfoRes.json();
				}
			} catch (_) {}

			// 2. If UserInfo failed, try TokenInfo endpoint (for OpenID id_token JWT)
			if (!payload) {
				try {
					const tokenInfoRes = await fetch(
						`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
					);
					if (tokenInfoRes.ok) {
						payload = await tokenInfoRes.json();
					}
				} catch (_) {}
			}

			if (!payload || !payload.email) {
				return res.status(401).json({
					message:
						"Unable to verify Google credentials. Please check your Google account sign-in or configuration.",
				});
			}

			name = payload.name || payload.given_name || payload.email.split("@")[0];
			email = payload.email.toLowerCase();
			sub = payload.sub || payload.id || payload.user_id;
		}

		let user = await User.findOne({ email });

		if (!user) {
			user = await User.create({
				name,
				email,
				googleId: sub,
				authProvider: "google",
			});
		} else {
			if (!user.googleId) {
				user.googleId = sub;
				await user.save();
			}
		}

		const token = generateToken(user._id);

		return res.status(200).json({
			message: "Google login successful",
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		return res.status(500).json({
			message:
				"Google authentication server error: " +
				(error.message || "Unknown error"),
		});
	}
};
