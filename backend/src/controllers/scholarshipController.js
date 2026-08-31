import Scholarship from "../models/Scholarship.js";
import UserProfile from "../models/UserProfile.js";
import { calculateMatchScore } from "../utils/matchingEngine.js";

export const getScholarships = async (req, res) => {
	try {
		const {
			search,
			category,
			level,
			state,
			sourceType,
			minAmount,
			maxAmount,
			sort = "deadline",
			page = 1,
			limit = 12,
		} = req.query;

		const query = {};

		if (search) {
			query.$text = { $search: search };
		}

		if (category) query.category = category;
		if (level) query.level = level;
		if (state && state !== "All") query.state = { $in: [state, "All India"] };
		if (sourceType) query.sourceType = sourceType;

		if (minAmount || maxAmount) {
			query["amount.value"] = {};
			if (minAmount) query["amount.value"].$gte = Number(minAmount);
			if (maxAmount) query["amount.value"].$lte = Number(maxAmount);
		}

		let sortOptions = {};
		if (sort === "deadline") sortOptions = { deadline: 1 };
		else if (sort === "amount_high") sortOptions = { "amount.value": -1 };
		else if (sort === "amount_low") sortOptions = { "amount.value": 1 };
		else if (sort === "newest") sortOptions = { createdAt: -1 };

		const pageNum = parseInt(page, 10) || 1;
		const limitNum = parseInt(limit, 10) || 12;
		const skip = (pageNum - 1) * limitNum;

		const [scholarships, total] = await Promise.all([
			Scholarship.find(query)
				.sort(sortOptions)
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Scholarship.countDocuments(query),
		]);

		return res.status(200).json({
			success: true,
			count: scholarships.length,
			total,
			totalPages: Math.ceil(total / limitNum),
			currentPage: pageNum,
			data: scholarships,
		});
	} catch (error) {
		console.error("Error fetching scholarships:", error);
		return res
			.status(500)
			.json({ success: false, message: "Server error fetching scholarships" });
	}
};

export const getFeaturedScholarships = async (req, res) => {
	try {
		const featured = await Scholarship.find({
			$or: [{ popular: true }, { verified: true }],
		})
			.sort({ "amount.value": -1 })
			.limit(6)
			.lean();

		return res.status(200).json({ success: true, data: featured });
	} catch (error) {
		return res
			.status(500)
			.json({ success: false, message: "Error fetching featured items" });
	}
};

/**
 * GET /api/scholarships/:id
 * Single scholarship details
 */
export const getScholarshipById = async (req, res) => {
	try {
		const scholarship = await Scholarship.findById(req.params.id).lean();
		if (!scholarship) {
			return res
				.status(404)
				.json({ success: false, message: "Scholarship not found" });
		}
		return res.status(200).json({ success: true, data: scholarship });
	} catch (error) {
		return res
			.status(500)
			.json({ success: false, message: "Error retrieving scholarship" });
	}
};

export const matchScholarships = async (req, res) => {
	try {
		// profile either from request body or authenticated user's DB record
		let profile = req.body;

		if (!profile || Object.keys(profile).length === 0) {
			if (req.user) {
				profile = await UserProfile.findOne({ user: req.user._id }).lean();
			}
		}

		if (!profile) {
			return res.status(400).json({
				success: false,
				message: "Please provide a student profile to calculate matches",
			});
		}

		const allScholarships = await Scholarship.find({
			deadline: { $gte: new Date() }, // only unexpired
		}).lean();

		const results = [];
		for (const item of allScholarships) {
			const match = calculateMatchScore(profile, item);
			if (match.eligible && match.score >= 50) {
				results.push({
					...item,
					matchScore: match.score,
					matchHighlights: match.highlights,
				});
			}
		}

		results.sort((a, b) => b.matchScore - a.matchScore);

		return res.status(200).json({
			success: true,
			count: results.length,
			data: results,
		});
	} catch (error) {
		console.error("Match error:", error);
		return res
			.status(500)
			.json({ success: false, message: "Error evaluating matches" });
	}
};
