import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import UserProfile from "../models/UserProfile.js";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";
import { sourceRegistry } from "../ingestion/SourceRegistry.js";

/**
 * GET /api/scholarships
 * List & search scholarships with filtering and sorting
 */
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
			hasChanges,
			sort = "deadline",
			page = 1,
			limit = 12,
		} = req.query;

		const query = {};

		if (search) {
			query.$or = [
				{ title: { $regex: search, $options: "i" } },
				{ organization: { $regex: search, $options: "i" } },
				{ description: { $regex: search, $options: "i" } },
			];
		}

		if (category && category !== "All") query.category = category;
		if (level && level !== "All") query.level = level;
		if (state && state !== "All" && state !== "All India") {
			query.state = { $in: [state, "All India"] };
		}
		if (sourceType && sourceType !== "All") query.sourceType = sourceType;
		if (hasChanges === "true") query.hasChanges = true;

		if (minAmount || maxAmount) {
			query["amount.value"] = {};
			if (minAmount) query["amount.value"].$gte = Number(minAmount);
			if (maxAmount) query["amount.value"].$lte = Number(maxAmount);
		}

		let sortOptions = {};
		if (sort === "deadline") sortOptions = { deadline: 1 };
		else if (sort === "amount_high") sortOptions = { "amount.value": -1 };
		else if (sort === "amount_low") sortOptions = { "amount.value": 1 };
		else if (sort === "trust") sortOptions = { trustScore: -1, deadline: 1 };
		else if (sort === "newest") sortOptions = { createdAt: -1 };

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.max(1, parseInt(limit, 10) || 12);
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
		return res.status(500).json({
			success: false,
			message: "Server error fetching scholarships",
			error: error.message,
		});
	}
};

/**
 * GET /api/scholarships/featured
 */
export const getFeaturedScholarships = async (req, res) => {
	try {
		const featured = await Scholarship.find({
			$or: [{ popular: true }, { verified: true }],
		})
			.sort({ "amount.value": -1, trustScore: -1 })
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
 * Fetch single scholarship by ObjectId or slug, including attached change history
 */
export const getScholarshipById = async (req, res) => {
	try {
		const { id } = req.params;
		let query;

		if (mongoose.Types.ObjectId.isValid(id)) {
			query = { _id: id };
		} else {
			query = { slug: id };
		}

		const scholarship = await Scholarship.findOne(query).lean();
		if (!scholarship) {
			return res
				.status(404)
				.json({ success: false, message: "Scholarship opportunity not found" });
		}

		// Retrieve version diff history
		const history = await ScholarshipVersion.find({
			scholarship: scholarship._id,
		})
			.sort({ observedAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			data: {
				...scholarship,
				history,
			},
		});
	} catch (error) {
		console.error("Error retrieving scholarship details:", error);
		return res
			.status(500)
			.json({ success: false, message: "Error retrieving scholarship details" });
	}
};

/**
 * GET /api/scholarships/:id/history
 * Fetch full version change history for a scholarship
 */
export const getScholarshipHistory = async (req, res) => {
	try {
		const { id } = req.params;
		let scholarshipId = id;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			const s = await Scholarship.findOne({ slug: id }).select("_id").lean();
			if (!s) {
				return res
					.status(404)
					.json({ success: false, message: "Scholarship not found" });
			}
			scholarshipId = s._id;
		}

		const history = await ScholarshipVersion.find({ scholarship: scholarshipId })
			.sort({ observedAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			count: history.length,
			data: history,
		});
	} catch (error) {
		return res
			.status(500)
			.json({ success: false, message: "Error fetching scholarship history" });
	}
};

/**
 * POST /api/scholarships/evaluate
 * Deterministic, evidence-backed matching engine
 * Returns eligible opportunities, ineligibility diagnostics, and document readiness audit
 */
export const evaluateScholarships = async (req, res) => {
	try {
		let profile = req.body;

		// Fallback to user's saved profile if logged in and body is empty
		if (!profile || Object.keys(profile).length === 0) {
			if (req.user) {
				profile = await UserProfile.findOne({ user: req.user._id }).lean();
			}
		}

		if (!profile) {
			return res.status(400).json({
				success: false,
				message: "Please provide student profile details to evaluate eligibility.",
			});
		}

		const allScholarships = await Scholarship.find({}).lean();

		const matched = [];
		const ineligible = [];
		const missingProfileData = [];

		for (const scholarship of allScholarships) {
			const evaluation = evaluateEligibility(profile, scholarship);

			const cardData = {
				...scholarship,
				evaluation: {
					isEligible: evaluation.isEligible,
					matchConfidence: evaluation.matchConfidence,
					documentReadiness: evaluation.documentReadiness,
					readinessScore: evaluation.readinessScore,
					passedRules: evaluation.passedRules,
					failedRules: evaluation.failedRules,
					unknownRules: evaluation.unknownRules,
					documentAudit: evaluation.documentAudit,
				},
			};

			if (evaluation.isEligible) {
				matched.push(cardData);
			} else if (evaluation.failedRules.length > 0) {
				ineligible.push(cardData);
			} else if (evaluation.unknownRules.length > 0) {
				missingProfileData.push(cardData);
			}
		}

		// Sort matched by readinessScore descending
		matched.sort(
			(a, b) => b.evaluation.readinessScore - a.evaluation.readinessScore,
		);

		// Sort ineligible by matchConfidence descending (closest to being eligible)
		ineligible.sort(
			(a, b) => b.evaluation.matchConfidence - a.evaluation.matchConfidence,
		);

		return res.status(200).json({
			success: true,
			summary: {
				totalEvaluated: allScholarships.length,
				eligibleCount: matched.length,
				ineligibleCount: ineligible.length,
				missingInfoCount: missingProfileData.length,
			},
			data: {
				matched,
				ineligible,
				missingProfileData,
			},
		});
	} catch (error) {
		console.error("Evaluation error:", error);
		return res.status(500).json({
			success: false,
			message: "Error evaluating scholarship eligibility",
			error: error.message,
		});
	}
};

/**
 * GET /api/scholarships/crawler/status
 * List configured crawler sources, strategies (Playwright/Cheerio), and health telemetry
 */
export const getCrawlerStatus = async (req, res) => {
	try {
		const sources = sourceRegistry.listSources();
		return res.status(200).json({
			success: true,
			totalSources: sources.length,
			lastRunAt: sourceRegistry.lastRunAt,
			sources,
		});
	} catch (error) {
		console.error("Error retrieving crawler status:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to retrieve crawler status",
			error: error.message,
		});
	}
};

/**
 * POST /api/scholarships/crawler/run
 * Trigger full or source-specific crawler ingestion pipeline
 */
export const runCrawler = async (req, res) => {
	try {
		const { sourceId } = req.body || {};
		if (sourceId) {
			const report = await sourceRegistry.runSource(sourceId);
			return res.status(200).json({
				success: true,
				sourceId,
				report,
			});
		}

		const summary = await sourceRegistry.runAll();
		return res.status(200).json({
			success: true,
			summary,
		});
	} catch (error) {
		console.error("Error running crawler:", error);
		return res.status(500).json({
			success: false,
			message: "Crawler execution encountered an error",
			error: error.message,
		});
	}
};

