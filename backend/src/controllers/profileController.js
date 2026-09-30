import UserProfile from "../models/UserProfile.js";

/**
 * GET /api/user/profile
 * Retrieve authenticated user's student academic/demographic profile
 */
export const getUserProfile = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: "Not authorized" });
		}

		const profile = await UserProfile.findOne({ user: req.user._id }).lean();

		return res.status(200).json({
			success: true,
			data: profile || null,
		});
	} catch (error) {
		console.error("[ProfileController] Error fetching profile:", error);
		return res.status(500).json({
			success: false,
			message: "Server error fetching user profile",
			error: error.message,
		});
	}
};

/**
 * PUT /api/user/profile
 * Create or update authenticated user's student profile
 */
export const updateUserProfile = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: "Not authorized" });
		}

		const allowedFields = [
			"fullName",
			"educationLevel",
			"courseStream",
			"stream",
			"income",
			"familyIncome",
			"gender",
			"caste_category",
			"casteCategory",
			"state",
			"cgpa",
			"percentage",
			"hasDisability",
			"documentsHeld",
		];

		const updatePayload = {};
		for (const key of allowedFields) {
			if (req.body[key] !== undefined) {
				updatePayload[key] = req.body[key];
			}
		}

		// Normalize aliases
		if (updatePayload.income && !updatePayload.familyIncome) {
			updatePayload.familyIncome = updatePayload.income;
		}
		if (updatePayload.courseStream && !updatePayload.stream) {
			updatePayload.stream = updatePayload.courseStream;
		}
		if (updatePayload.caste_category && !updatePayload.casteCategory) {
			updatePayload.casteCategory = updatePayload.caste_category;
		}

		const profile = await UserProfile.findOneAndUpdate(
			{ user: req.user._id },
			{
				$set: {
					...updatePayload,
					user: req.user._id,
				},
			},
			{ new: true, upsert: true, runValidators: true },
		);

		return res.status(200).json({
			success: true,
			message: "User profile updated successfully",
			data: profile,
		});
	} catch (error) {
		console.error("[ProfileController] Error updating profile:", error);
		return res.status(500).json({
			success: false,
			message: "Server error updating user profile",
			error: error.message,
		});
	}
};
