import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import UserProfile from "../models/UserProfile.js";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";
import { sourceRegistry } from "../ingestion/SourceRegistry.js";
import { crawlerScheduler } from "../ingestion/core/Scheduler.js";
import { clearScholarshipCache } from "../middlewares/cacheMiddleware.js";

/**
 * Safely escape regex special characters to prevent syntax errors and ReDoS
 */
function escapeRegex(text) {
	return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

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

		const conditions = [];

		// Multi-token, tag-aware, ReDoS-safe search
		if (search && search.trim()) {
			const rawTokens = search.trim().split(/\s+/).filter(Boolean);
			const escapedTokens = rawTokens.map(escapeRegex);

			const tokenConditions = escapedTokens.map((token) => {
				const tokenRegex = new RegExp(token, "i");
				return {
					$or: [
						{ title: tokenRegex },
						{ organization: tokenRegex },
						{ description: tokenRegex },
						{ tags: tokenRegex },
						{ category: tokenRegex },
					],
				};
			});

			if (tokenConditions.length > 0) {
				conditions.push({ $and: tokenConditions });
			}
		}

		if (category && category !== "All") {
			if (category === "STEM") {
				conditions.push({
					$or: [{ category: "STEM" }, { tags: { $in: ["STEM", "Engineering"] } }],
				});
			} else {
				conditions.push({ category });
			}
		}
		if (level && level !== "All") conditions.push({ level });
		if (state && state !== "All" && state !== "All India") {
			conditions.push({ state: { $in: [state, "All India"] } });
		}
		if (sourceType && sourceType !== "All") {
			if (sourceType === "Corporate") {
				conditions.push({ sourceType: { $in: ["Corporate", "Corporate CSR"] } });
			} else {
				conditions.push({ sourceType });
			}
		}
		if (hasChanges === "true") conditions.push({ hasChanges: true });

		if (minAmount || maxAmount) {
			const amountCond = {};
			if (minAmount) amountCond.$gte = Number(minAmount);
			if (maxAmount) amountCond.$lte = Number(maxAmount);
			conditions.push({ "amount.value": amountCond });
		}

		const query = conditions.length > 0 ? { $and: conditions } : {};

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
 * List configured crawler sources, strategies (Playwright/Cheerio), DB catalog health, and scheduler status
 */
export const getCrawlerStatus = async (req, res) => {
	try {
		const sources = sourceRegistry.listSources();
		const now = new Date();

		const [totalScholarships, activeScholarships, totalVersions] = await Promise.all([
			Scholarship.countDocuments({}),
			Scholarship.countDocuments({ deadline: { $gte: now } }),
			ScholarshipVersion.countDocuments({}),
		]);

		return res.status(200).json({
			success: true,
			totalSources: sources.length,
			lastRunAt: sourceRegistry.lastRunAt,
			databaseCatalog: {
				totalScholarships,
				activeScholarships,
				expiredScholarships: totalScholarships - activeScholarships,
				totalVersionsTracked: totalVersions,
			},
			scheduler: crawlerScheduler.getStatus(),
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
		let result;
		if (sourceId) {
			const report = await sourceRegistry.runSource(sourceId);
			result = { success: true, sourceId, report };
		} else {
			const summary = await sourceRegistry.runAll();
			result = { success: true, summary };
		}

		// Purge stale search cache keys on crawl run
		await clearScholarshipCache().catch((err) => {
			console.warn("[Crawler] Cache purge warning:", err.message);
		});

		return res.status(200).json(result);
	} catch (error) {
		console.error("Error running crawler:", error);
		return res.status(500).json({
			success: false,
			message: "Crawler execution encountered an error",
			error: error.message,
		});
	}
};

/**
 * POST /api/scholarships/cache/clear
 * Flush all Redis cached scholarship search and catalog keys
 */
export const flushScholarshipCache = async (req, res) => {
	try {
		const cleared = await clearScholarshipCache();
		return res.status(200).json({
			success: true,
			message: `Purged ${cleared} cached search keys from Redis`,
			cleared,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to flush scholarship cache",
			error: error.message,
		});
	}
};

/**
 * GET /api/scholarships/suggestions
 * Ultra-fast suggestions and autocomplete for scholarship search bars
 */
export const getScholarshipSuggestions = async (req, res) => {
	try {
		const { q } = req.query;
		if (!q || !q.trim()) {
			return res.status(200).json({ success: true, count: 0, data: [] });
		}

		const rawTokens = q.trim().split(/\s+/).filter(Boolean);
		const escapedTokens = rawTokens.map(escapeRegex);

		const tokenConditions = escapedTokens.map((token) => {
			const tokenRegex = new RegExp(token, "i");
			return {
				$or: [
					{ title: tokenRegex },
					{ organization: tokenRegex },
					{ tags: tokenRegex },
					{ category: tokenRegex },
				],
			};
		});

		const query = tokenConditions.length > 0 ? { $and: tokenConditions } : {};

		const suggestions = await Scholarship.find(query)
			.select("title organization slug category amount deadline tags state")
			.limit(6)
			.lean();

		return res.status(200).json({
			success: true,
			count: suggestions.length,
			data: suggestions,
		});
	} catch (error) {
		console.error("Error retrieving suggestions:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to retrieve suggestions",
			error: error.message,
		});
	}
};

