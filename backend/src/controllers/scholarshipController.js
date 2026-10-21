import crypto from "crypto";
import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import UserProfile from "../models/UserProfile.js";
import { evaluateEligibility, normalizeProfile } from "../engine/ruleEvaluator.js";
import ScholarshipCycle from "../models/ScholarshipCycle.js";
import SourceSnapshot from "../models/SourceSnapshot.js";
import IngestionIssue from "../models/IngestionIssue.js";
import SourceState from "../models/SourceState.js";
import CrawlRun from "../models/CrawlRun.js";
import EligibilityRuleVersion from "../models/EligibilityRuleVersion.js";
import { explainEligibilityImpact } from "../engine/eligibilityImpact.js";
import { crawlerScheduler } from "../pipeline/scheduler.js";
import { SOURCE_REGISTRY } from "../pipeline/sources.js";
import { computeStatus } from "../pipeline/core/status.js";
import { verifyEvidence } from "../pipeline/core/evidence.js";
import { evaluationCacheKey } from "../pipeline/lock.js";
import { canonicalizeCatalogueQuery } from "../engine/catalogueQuery.js";
import { evaluationProfileSchema, treeEvaluationSchema, validationIssues } from "../engine/ruleSchema.js";
import { publicPolicyVersion } from "../pipeline/core/changes.js";
import { getPublicUpdateIndex, withPublicUpdateState } from "../services/policyUpdates.js";

const PUBLIC_FILTER = { "publication.state": "published" };
const HIDDEN_FIELDS = { legacySnapshot: 0, fieldEvidence: 0, dataHash: 0 };
const STATUSES = new Set(["upcoming", "open", "closing_soon", "closed", "unknown"]);

/** Status is re-derived at read time so it is correct even between refresh jobs. */
function withLiveStatus(doc, now = new Date()) {
	if (!doc || doc.legacy) return doc;
	const s = computeStatus(doc, now);
	return { ...doc, status: s.status, statusReason: s.reason, stale: s.stale };
}

import { clearScholarshipCache } from "../middlewares/cacheMiddleware.js";
import { getRedisClient, isRedisAvailable } from "../config/redis.js";

/**
 * Safely escape regex special characters to prevent syntax errors and ReDoS
 */
function escapeRegex(text) {
	return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Build a flexible, ReDoS-safe regex where hyphens and spaces match interchangeably
 * e.g., "Post-Matric" matches "Post-Matric", "Post Matric", and "Postmatric"
 */
function buildSearchRegex(token) {
	const escaped = escapeRegex(token);
	const flexible = escaped.replace(/\\-/g, "[- ]?");
	return new RegExp(flexible, "i");
}

function parseMultiParam(param) {
	if (!param) return [];
	if (Array.isArray(param)) {
		return param.flatMap((p) => String(p).split(",")).map((s) => s.trim()).filter(Boolean);
	}
	return String(param).split(",").map((s) => s.trim()).filter(Boolean);
}

function getCategoryCondition(cat) {
	if (cat === "Government") {
		return { $or: [{ category: "Government" }, { sourceType: "Government" }] };
	} else if (cat === "STEM") {
		return {
			$or: [
				{ category: "STEM" },
				{ tags: { $in: ["STEM", "Engineering", "Technical"] } },
				{ title: /aicte|technical|energy|statistical|science/i },
			],
		};
	} else if (cat === "Women") {
		return {
			$or: [
				{ category: "Women" },
				{ tags: "Women" },
				{ "eligibility.gender": "Female" },
				{ title: /\b(girl|girls|women|female)\b/i },
			],
		};
	} else if (cat === "SC / ST / OBC") {
		return {
			$or: [
				{ category: "SC / ST / OBC" },
				{ tags: { $in: ["SC/ST/OBC", "SC / ST / OBC"] } },
				{ "eligibility.casteCategories": { $in: ["SC", "ST", "OBC"] } },
				{ title: /\b(sc|st|obc|ebc|dnt|schedule\s+tribe)\b/i },
			],
		};
	} else if (cat === "Need based") {
		return {
			$or: [
				{ category: "Need based" },
				{ category: "Welfare based" },
				{ tags: "Need based" },
				{ "eligibility.familyIncome": { $ne: null } },
				{ title: /means|welfare|pre[\s-]matric|post[\s-]matric/i },
			],
		};
	} else if (cat === "Minority") {
		return {
			$or: [
				{ category: "Minority" },
				{ tags: "Minority" },
				{ title: /minority/i },
			],
		};
	} else if (cat === "Merit based") {
		return {
			$or: [{ category: "Merit based" }, { title: /merit/i }],
		};
	}
	return { category: cat };
}

function getLevelCondition(level) {
	if (level === "Class 10") {
		return { $or: [{ level: "Class 10" }, { tags: "Class 10" }, { title: /pre[\s-]matric|school/i }] };
	} else if (level === "Class 12") {
		return { $or: [{ level: "Class 12" }, { tags: "Class 12" }, { title: /post[\s-]matric/i }] };
	} else if (level === "UG") {
		return { $or: [{ level: "UG" }, { tags: "UG" }, { title: /degree|college|university|nts-ug|under\s*graduate/i }] };
	} else if (level === "PG") {
		return { $or: [{ level: "PG" }, { tags: "PG" }, { title: /post\s*graduate|nts-pg|pgs/i }] };
	} else if (level === "PhD") {
		return { $or: [{ level: "PhD" }, { tags: "PhD" }, { title: /fellowship|jrf|srf/i }] };
	}
	return { $or: [{ level }, { tags: level }] };
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
			status,
			sort = "deadline",
			page = 1,
			limit = 12,
		} = canonicalizeCatalogueQuery(req.query);

		const conditions = [PUBLIC_FILTER];
		const updateIndex = await getPublicUpdateIndex();

		let isTextSearch = false;
		if (search && search.trim()) {
			conditions.push({ $text: { $search: search.trim() } });
			isTextSearch = true;
		}

		// Multi-select Category Filter (Matches any selected category)
		const categories = parseMultiParam(category).filter((c) => c !== "All");
		if (categories.length > 0) {
			const catConditions = categories.map(getCategoryCondition);
			if (catConditions.length === 1) {
				conditions.push(catConditions[0]);
			} else {
				conditions.push({ $or: catConditions });
			}
		}

		// Multi-select Level Filter (Matches any selected education level)
		const levels = parseMultiParam(level).filter((l) => l !== "All");
		if (levels.length > 0) {
			const lvlConditions = levels.map(getLevelCondition);
			if (lvlConditions.length === 1) {
				conditions.push(lvlConditions[0]);
			} else {
				conditions.push({ $or: lvlConditions });
			}
		}

		// Multi-select State Filter (Matches any selected state plus All India)
		const rawStates = parseMultiParam(state).filter((s) => s !== "All" && s !== "All India");
		if (rawStates.length > 0) {
			const allVariants = new Set(["All India"]);
			for (const st of rawStates) {
				allVariants.add(st);
				const s = st.trim().toLowerCase();
				if (s === "up" || s === "uttar pradesh") {
					allVariants.add("UP");
					allVariants.add("Uttar Pradesh");
				} else if (s === "mh" || s === "maharashtra") {
					allVariants.add("MH");
					allVariants.add("Maharashtra");
				} else if (s === "ka" || s === "karnataka") {
					allVariants.add("KA");
					allVariants.add("Karnataka");
				} else if (s === "wb" || s === "west bengal") {
					allVariants.add("WB");
					allVariants.add("West Bengal");
				} else if (s === "br" || s === "bihar") {
					allVariants.add("BR");
					allVariants.add("Bihar");
				} else if (s === "tn" || s === "tamil nadu") {
					allVariants.add("TN");
					allVariants.add("Tamil Nadu");
				} else if (s === "dl" || s === "delhi") {
					allVariants.add("DL");
					allVariants.add("Delhi");
				}
			}
			conditions.push({ state: { $in: Array.from(allVariants) } });
		}

		// Multi-select Source Type Filter
		const rawSources = parseMultiParam(sourceType).filter((s) => s !== "All");
		if (rawSources.length > 0) {
			const resolvedSources = new Set();
			for (const src of rawSources) {
				if (src === "Corporate") {
					resolvedSources.add("Corporate");
					resolvedSources.add("Corporate CSR");
				} else {
					resolvedSources.add(src);
				}
			}
			conditions.push({ sourceType: { $in: Array.from(resolvedSources) } });
		}

		if (hasChanges === "true" || hasChanges === true) conditions.push({ hasChanges: true, _id: { $in: updateIndex.ids } });
		
		const now = new Date();
		if (status === "all") {
			// Include all scholarships regardless of status
		} else if (status === "closed") {
			conditions.push({
				$or: [{ status: "closed" }, { sortDeadline: { $lt: now } }],
			});
		} else if (status && status !== "active") {
			const wanted = String(status).split(",").filter((x) => STATUSES.has(x));
			if (wanted.length) {
				conditions.push({ status: { $in: wanted } });
				if (!wanted.includes("closed")) {
					conditions.push({
						$or: [
							{ sortDeadline: { $gte: now } },
							{ sortDeadline: null },
							{ sortDeadline: { $exists: false } },
						],
					});
				}
			}
		} else {
			// Default: "active" (open, closing_soon, upcoming, unknown with active/unannounced deadline)
			conditions.push({
				status: { $ne: "closed" },
				$or: [
					{ sortDeadline: { $gte: now } },
					{ sortDeadline: null },
					{ sortDeadline: { $exists: false } },
				],
			});
		}

		if (minAmount || maxAmount) {
			const amountCond = {};
			if (minAmount) amountCond.$gte = Number(minAmount);
			if (maxAmount) amountCond.$lte = Number(maxAmount);
			conditions.push({ "amount.value": amountCond });
		}

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
		const skip = (pageNum - 1) * limitNum;

		// Unknown deadlines sort last; no placeholder date is ever stored.
		const sortStage = (() => {
			if (sort === "amount_high") return { "amount.value": -1, _noDeadline: 1, sortDeadline: 1 };
			if (sort === "amount_low") return { _noAmount: 1, "amount.value": 1 };
			if (sort === "newest") return { "freshness.firstSeenAt": -1 };
			if (sort === "relevance" && isTextSearch) return { score: { $meta: "textScore" } };
			return isTextSearch
				? { score: { $meta: "textScore" }, _isClosed: 1, _noDeadline: 1, sortDeadline: 1 }
				: { _isClosed: 1, _noDeadline: 1, sortDeadline: 1, title: 1 };
		})();

		const runQuery = async (conds) => {
			const match = { $and: conds };
			const pipeline = [
				{ $match: match },
				{
					$addFields: {
						_isClosed: {
							$cond: [
								{
									$or: [
										{ $eq: ["$status", "closed"] },
										{
											$and: [
												{ $ne: [{ $ifNull: ["$sortDeadline", null] }, null] },
												{ $lt: ["$sortDeadline", now] },
											],
										},
									],
								},
								1,
								0,
							],
						},
						_noDeadline: { $cond: [{ $ifNull: ["$sortDeadline", false] }, 0, 1] },
						_noAmount: { $cond: [{ $ifNull: ["$amount.value", false] }, 0, 1] },
					},
				},
				{ $sort: sortStage },
				{ $skip: skip },
				{ $limit: limitNum },
				{ $project: { ...HIDDEN_FIELDS, _noDeadline: 0, _noAmount: 0 } },
			];
			return Promise.all([Scholarship.aggregate(pipeline), Scholarship.countDocuments(match)]);
		};

		let scholarships, total;
		try {
			[scholarships, total] = await runQuery(conditions);
		} catch (mongoErr) {
			// Resilient fallback to regex if text index is rebuilding
			if (!isTextSearch) throw mongoErr;
			const fallbackConditions = conditions.filter((c) => !c.$text);
			const cleanedSearch = search.trim().replace(/\s*-\s*/g, "-");
			const rawTokens = cleanedSearch.split(/\s+/).filter((t) => t.length > 0 && t !== "-");
			for (const token of rawTokens) {
				const tokenRegex = buildSearchRegex(token);
				fallbackConditions.push({
					$or: [
						{ title: tokenRegex },
						{ organization: tokenRegex },
						{ tags: tokenRegex },
						{ category: tokenRegex },
						{ state: tokenRegex },
					],
				});
			}
			isTextSearch = false;
			for (const k of Object.keys(sortStage)) if (sortStage[k]?.$meta) delete sortStage[k];
			if (Object.keys(sortStage).length === 0) Object.assign(sortStage, { _noDeadline: 1, sortDeadline: 1 });
			[scholarships, total] = await runQuery(fallbackConditions);
		}
		scholarships = scholarships.map((d) => withLiveStatus(withPublicUpdateState(d, updateIndex), now));
		if (!status || status === "active") {
			scholarships = scholarships.filter((d) => d.status !== "closed");
		}

		const recentUpdatesCount = updateIndex.count;

		return res.status(200).json({
			success: true,
			count: scholarships.length,
			total,
			totalPages: Math.ceil(total / limitNum),
			currentPage: pageNum,
			recentUpdatesCount,
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
		const updateIndex = await getPublicUpdateIndex();
		let featured = await Scholarship.find({
			...PUBLIC_FILTER,
			verified: true,
			status: { $in: ["open", "closing_soon"] },
		})
			.select(HIDDEN_FIELDS)
			.sort({ sortDeadline: 1 })
			.limit(6)
			.lean();

		if (featured.length === 0) {
			featured = await Scholarship.find(PUBLIC_FILTER)
				.select(HIDDEN_FIELDS)
				.sort({ sortDeadline: 1 })
				.limit(6)
				.lean();
		}

		return res.status(200).json({ success: true, data: featured.map((d) => withLiveStatus(withPublicUpdateState(d, updateIndex))) });
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

		const scholarship = await Scholarship.findOne(query).select({ legacySnapshot: 0 }).lean();
		if (!scholarship || scholarship.publication?.state === "needs_review") {
			return res
				.status(404)
				.json({ success: false, message: "Scholarship opportunity not found" });
		}
		if (scholarship.publication?.state === "retired") {
			// Kept so bookmarks resolve, but none of its old values are served.
			return res.status(410).json({
				success: false,
				message: "This listing could not be verified against an official source and has been withdrawn.",
				data: { _id: scholarship._id, title: scholarship.title, publication: scholarship.publication },
			});
		}

		const [history, cycles] = await Promise.all([
			ScholarshipVersion.find({ scholarship: scholarship._id, legacyUnverified: { $ne: true } })
				.sort({ observedAt: -1 })
				.lean(),
			scholarship.schemeKey
				? ScholarshipCycle.find({ schemeKey: scholarship.schemeKey }).sort({ academicYear: -1 }).lean()
				: [],
		]);
		const updateIndex = await getPublicUpdateIndex();

		return res.status(200).json({
			success: true,
			data: {
				...withLiveStatus(withPublicUpdateState(scholarship, updateIndex)),
				cycles: cycles.map(({ evidence, ...c }) => c),
				history: history.map(publicPolicyVersion),
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

		const history = await ScholarshipVersion.find({ scholarship: scholarshipId, legacyUnverified: { $ne: true } })
			.sort({ observedAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			count: history.length,
			data: history.map(publicPolicyVersion),
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
		const request = evaluationProfileSchema.safeParse(req.body === undefined ? {} : req.body);
		if (!request.success) return res.status(400).json({ success: false, message: "Invalid eligibility profile", errors: validationIssues(request.error) });
		let profile = request.data;

		// Fallback to user's saved profile if logged in and body is empty
		if (!profile || Object.keys(profile).length === 0) {
			if (req.user) {
				const saved = await UserProfile.findOne({ user: req.user._id }).lean();
				if (saved) {
					const fields = Object.fromEntries(Object.keys(evaluationProfileSchema.shape).filter(key => saved[key] !== undefined).map(key => [key, saved[key]]));
					const parsed = evaluationProfileSchema.safeParse(fields);
					if (!parsed.success) return res.status(400).json({ success: false, message: "Please review your saved eligibility profile", errors: validationIssues(parsed.error) });
					profile = parsed.data;
				} else profile = null;
			}
		}

		if (!profile) {
			return res.status(400).json({
				success: false,
				message: "Please provide student profile details to evaluate eligibility.",
			});
		}

		// Auto-save/sync profile in background if user is authenticated
		if (req.user && Object.keys(request.data).length > 0) {
			const normalized = normalizeProfile(profile);
			const updates = { ...request.data };
			const supplied = (...fields) => fields.some(field => Object.hasOwn(request.data, field));
			// Partial API submissions must not erase unrelated saved answers. Keep
			// canonical fields and legacy aliases synchronized only when supplied.
			if (supplied("educationLevel", "level")) updates.educationLevel = normalized.educationLevel;
			if (supplied("stream", "courseStream", "eligibleStreams")) Object.assign(updates, { stream: normalized.stream, courseStream: normalized.stream || null });
			if (supplied("familyIncome", "income")) Object.assign(updates, { familyIncome: normalized.familyIncome, income: normalized.familyIncome });
			if (supplied("casteCategory", "caste_category", "category")) Object.assign(updates, { casteCategory: normalized.casteCategory, caste_category: normalized.casteCategory });
			if (supplied("hasDisability", "disabilityRequired")) updates.hasDisability = normalized.hasDisability;
			for (const field of ["cgpa", "percentage", "gender"]) if (supplied(field)) updates[field] = normalized[field];
			UserProfile.findOneAndUpdate(
				{ user: req.user._id },
				{
					$set: {
						...updates,
						user: req.user._id,
					},
				},
				{ upsert: true, returnDocument: "after", runValidators: false },
			).catch((err) =>
				console.warn("[Evaluate] Non-fatal profile auto-save warning:", err.message),
			);
		}

		// Deterministic cache key based on profile attributes
		const normalizedProfile = normalizeProfile(profile);
		delete normalizedProfile.fullName;
		const profileFingerprint = {
			...normalizedProfile,
			documentsHeld: normalizedProfile.documentsHeld.slice().sort(),
			nationalOnly: profile.state === "All India",
			evaluatorVersion: 3,
		};
		const profileHash = crypto
			.createHash("sha256")
			.update(JSON.stringify(profileFingerprint))
			.digest("hex")
			.slice(0, 16);
		const cacheKey = evaluationCacheKey(profileHash);

		// Check Redis cache
		if (isRedisAvailable()) {
			try {
				const cached = await getRedisClient().get(cacheKey);
				if (cached) {
					res.setHeader("X-Cache", "HIT");
					return res.status(200).json(JSON.parse(cached));
				}
			} catch (_) {}
		}

		// DB Pre-filtering: Only evaluate active scholarships and coarse demographic filters
		const now = new Date();
		const query = {
			...PUBLIC_FILTER,
			status: { $ne: "closed" },
		};

		if (profile.state === "All India") {
			// The UI's national-only option does not claim any state domicile.
			query.state = "All India";
		} else if (profile.state) {
			query.$and = [{ $or: [{ ruleTree: { $ne: null } }, { state: { $in: [profile.state, "All India"] } }] }];
		}
		if (profile.gender === "Male") {
			(query.$and ||= []).push({ $or: [{ ruleTree: { $ne: null } }, { "eligibility.gender": { $ne: "Female" } }] });
		} else if (profile.gender === "Female") {
			(query.$and ||= []).push({ $or: [{ ruleTree: { $ne: null } }, { "eligibility.gender": { $ne: "Male" } }] });
		}

		const candidateScholarships = (await Scholarship.find(query).select(HIDDEN_FIELDS).lean())
			.map((d) => withLiveStatus(d, now))
			.filter((d) => d.status !== "closed");

		const matched = [];
		const ineligible = [];
		const missingProfileData = [];

		for (const scholarship of candidateScholarships) {
			const evaluation = evaluateEligibility(profile, scholarship);

			const cardData = {
				...scholarship,
				evaluation: {
					isEligible: evaluation.isEligible,
					status: evaluation.status,
					evaluationTree: evaluation.evaluationTree,
					matchConfidence: evaluation.matchConfidence,
					documentReadiness: evaluation.documentReadiness,
					readinessScore: evaluation.readinessScore,
					passedRules: evaluation.passedRules,
					failedRules: evaluation.failedRules,
					unknownRules: evaluation.unknownRules,
					documentAudit: evaluation.documentAudit,
				},
			};

			if (evaluation.status === "failed") {
				ineligible.push(cardData);
			} else if (evaluation.status === "unknown") {
				missingProfileData.push(cardData);
			} else if (evaluation.isEligible) {
				matched.push(cardData);
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

		const responsePayload = {
			success: true,
			summary: {
				totalEvaluated: candidateScholarships.length,
				eligibleCount: matched.length,
				ineligibleCount: ineligible.length,
				missingInfoCount: missingProfileData.length,
			},
			data: {
				matched,
				ineligible,
				missingProfileData,
			},
		};

		// Cache in Redis with 5-minute TTL
		if (isRedisAvailable()) {
			try {
				await getRedisClient().set(
					cacheKey,
					JSON.stringify(responsePayload),
					"EX",
					300,
				);
			} catch (_) {}
		}

		res.setHeader("X-Cache", "MISS");
		return res.status(200).json(responsePayload);
	} catch (error) {
		console.error("Evaluation error:", error);
		return res.status(500).json({
			success: false,
			message: "Error evaluating scholarship eligibility",
			error: error.message,
		});
	}
};

/** Admin-only, read-only preview. Submitted trees never alter published schemes. */
export const evaluateRuleTree = (req, res) => {
	const parsed = treeEvaluationSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid rule tree or profile", errors: validationIssues(parsed.error) });
	return res.status(200).json({ success: true, data: evaluateEligibility(parsed.data.profile, { ruleTree: parsed.data.ruleTree }) });
};

/**
 * GET /api/scholarships/crawler/status
 * List configured crawler sources, strategies (Playwright/Cheerio), DB catalog health, and scheduler status
 */
export const getCrawlerStatus = async (req, res) => {
	try {
		const [states, recentRuns, byStatus, byPublication, openIssues, staleCount] = await Promise.all([
			SourceState.find({}).lean(),
			CrawlRun.find({}).sort({ startedAt: -1 }).limit(10).select({ pages: 0 }).lean(),
			Scholarship.aggregate([{ $match: PUBLIC_FILTER }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
			Scholarship.aggregate([{ $group: { _id: "$publication.state", count: { $sum: 1 } } }]),
			IngestionIssue.aggregate([{ $match: { status: "open" } }, { $group: { _id: "$severity", count: { $sum: 1 } } }]),
			Scholarship.countDocuments({ ...PUBLIC_FILTER, stale: true }),
		]);
		const stateById = new Map(states.map((s) => [s.sourceId, s]));
		const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? "unset", r.count]));

		return res.status(200).json({
			success: true,
			sources: SOURCE_REGISTRY.map((src) => ({
				id: src.id,
				name: src.name,
				enabled: src.enabled,
				authorityTier: src.authorityTier,
				strategy: src.strategy,
				ingestionStatus: src.ingestionStatus || "ready",
				ingestionNote: src.ingestionNote || null,
				allowedDomains: src.allowedDomains,
				cadenceHours: src.cadenceHours,
				staleAfterHours: src.staleAfterHours,
				state: stateById.get(src.id) || null,
			})),
			catalog: {
				byStatus: toMap(byStatus),
				byPublication: toMap(byPublication),
				stalePublished: staleCount,
			},
			openIssues: toMap(openIssues),
			recentRuns,
			scheduler: crawlerScheduler.getStatus(),
		});
	} catch (error) {
		console.error("Error retrieving crawler status:", error);
		return res.status(500).json({ success: false, message: "Failed to retrieve crawler status", error: error.message });
	}
};

/**
 * POST /api/scholarships/crawler/run  { sourceId? }
 */
export const runCrawler = async (req, res) => {
	try {
		const { sourceId } = req.body || {};
		if (sourceId && !SOURCE_REGISTRY.some((s) => s.id === sourceId)) {
			return res.status(400).json({ success: false, message: `Unknown source '${sourceId}'` });
		}
		const outcome = await crawlerScheduler.triggerNow("admin", { sourceId });
		if (!outcome.executed) {
			return res.status(409).json({ success: false, message: "A crawl is already running on another instance." });
		}
		const reports = outcome.result.map(({ pages, ...r }) => r);
		return res.status(200).json({ success: true, reports });
	} catch (error) {
		console.error("Error running crawler:", error);
		return res.status(500).json({ success: false, message: "Crawler execution encountered an error", error: error.message });
	}
};

/**
 * GET /api/scholarships/crawler/issues?status=open&severity=blocking
 * Review queue for suspicious or conflicting data.
 */
export const getIngestionIssues = async (req, res) => {
	try {
		const filter = { status: req.query.status || "open" };
		if (req.query.severity) filter.severity = req.query.severity;
		if (req.query.schemeKey) filter.schemeKey = req.query.schemeKey;
		const issues = await IngestionIssue.find(filter).sort({ severity: 1, lastSeenAt: -1 }).limit(500).lean();
		return res.status(200).json({ success: true, count: issues.length, data: issues });
	} catch (error) {
		return res.status(500).json({ success: false, message: "Failed to load issues", error: error.message });
	}
};

/**
 * GET /api/scholarships/:id/evidence
 * Every cited field with its verbatim quote, official URL, fetch time and page,
 * re-verified against the stored snapshot on each request.
 */
export const getScholarshipEvidence = async (req, res) => {
	try {
		const { id } = req.params;
		const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
		const scholarship = await Scholarship.findOne({ ...query, ...PUBLIC_FILTER })
			.select({
				title: 1,
				organization: 1,
				category: 1,
				sourceUrl: 1,
				officialLinks: 1,
				applicationLink: 1,
				amount: 1,
				fieldEvidence: 1,
				currentCycle: 1,
			})
			.lean();
		if (!scholarship) return res.status(404).json({ success: false, message: "Scholarship not found" });

		const evidence = [...(scholarship.fieldEvidence || []), ...(scholarship.currentCycle?.evidence || [])];
		const snapshotIds = [...new Set(evidence.map((e) => String(e.snapshotId)).filter(Boolean))];
		const snapshots = await SourceSnapshot.find({ _id: { $in: snapshotIds } })
			.select({ url: 1, text: 1, textHash: 1, fetchedAt: 1, lastSeenAt: 1 })
			.lean();
		const byId = new Map(snapshots.map((s) => [String(s._id), { ...s, id: String(s._id) }]));

		const seen = new Set();
		const data = [];
		for (const e of evidence) {
			const key = `${e.field}|${e.snapshotId}|${e.charStart}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const check = verifyEvidence({ ...e, snapshotId: String(e.snapshotId) }, byId.get(String(e.snapshotId)));
			data.push({
				field: e.field,
				quote: e.quote,
				url: e.url,
				page: e.page ?? null,
				locator: e.locator,
				fetchedAt: e.fetchedAt,
				lastConfirmedAt: byId.get(String(e.snapshotId))?.lastSeenAt || null,
				documentDate: e.documentDate || null,
				verified: check.ok,
				verificationError: check.ok ? null : check.reason,
			});
		}
		return res.status(200).json({
			success: true,
			title: scholarship.title,
			organization: scholarship.organization,
			category: scholarship.category,
			sourceUrl: scholarship.sourceUrl,
			officialLinks: scholarship.officialLinks,
			applicationLink: scholarship.applicationLink,
			amount: scholarship.amount,
			count: data.length,
			data,
		});
	} catch (error) {
		return res.status(500).json({ success: false, message: "Failed to load evidence", error: error.message });
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

		const cleanedSearch = q.trim().replace(/\s*-\s*/g, "-");
		const rawTokens = cleanedSearch
			.split(/\s+/)
			.filter((t) => t.length > 0 && t !== "-");

		const tokenConditions = rawTokens.map((token) => {
			const tokenRegex = buildSearchRegex(token);
			return {
				$or: [
					{ title: tokenRegex },
					{ organization: tokenRegex },
					{ tags: tokenRegex },
					{ category: tokenRegex },
					{ state: tokenRegex },
				],
			};
		});

		const query = { $and: [PUBLIC_FILTER, ...tokenConditions] };

		const suggestions = await Scholarship.find(query)
			.select("title organization slug category amount deadline status tags state")
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



/**
 * POST /api/scholarships/:id/replay
 * Time-Travel Historical Policy Replay
 * Evaluates a student profile against a historical EligibilityRuleVersion snapshot
 * and compares it to the current live version.
 */
export const replayScholarshipEligibility = async (req, res) => {
	try {
		const { id } = req.params;
		const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
		const scholarship = await Scholarship.findOne({ ...query, ...PUBLIC_FILTER }).lean();
		if (!scholarship) {
			return res.status(404).json({ success: false, message: "Scholarship not found" });
		}

		const body = req.body || {};
		const rawProfile = body.profile;
		let profile = null;

		if (rawProfile && Object.keys(rawProfile).length > 0) {
			const parsed = evaluationProfileSchema.safeParse(rawProfile);
			if (!parsed.success) {
				return res.status(400).json({ success: false, message: "Invalid eligibility profile", errors: validationIssues(parsed.error) });
			}
			profile = parsed.data;
		} else if (req.user) {
			const saved = await UserProfile.findOne({ user: req.user._id }).lean();
			if (saved) {
				const fields = Object.fromEntries(
					Object.keys(evaluationProfileSchema.shape)
						.filter((key) => saved[key] !== undefined)
						.map((key) => [key, saved[key]])
				);
				const parsed = evaluationProfileSchema.safeParse(fields);
				if (parsed.success) profile = parsed.data;
			}
		}

		if (!profile) {
			return res.status(400).json({
				success: false,
				message: "Please provide student profile details to replay eligibility.",
			});
		}

		const { targetDate, versionKey } = body;
		if (!targetDate && !versionKey) {
			return res.status(400).json({
				success: false,
				message: "Provide either targetDate or versionKey for historical replay.",
			});
		}

		let historicalVersion = null;
		if (versionKey) {
			historicalVersion = await EligibilityRuleVersion.findOne({
				versionKey,
				scholarship: scholarship._id,
			}).lean();
			if (!historicalVersion) {
				historicalVersion = await EligibilityRuleVersion.findOne({ versionKey }).lean();
			}
		} else if (targetDate) {
			const targetDateObj = new Date(targetDate);
			if (Number.isNaN(targetDateObj.getTime())) {
				return res.status(400).json({ success: false, message: "Invalid targetDate format" });
			}
			historicalVersion = await EligibilityRuleVersion.findOne({
				scholarship: scholarship._id,
				observedAt: { $lte: targetDateObj },
			})
				.sort({ observedAt: -1 })
				.lean();

			if (!historicalVersion) {
				historicalVersion = await EligibilityRuleVersion.findOne({
					scholarship: scholarship._id,
				})
					.sort({ observedAt: 1 })
					.lean();
			}
		}

		if (!historicalVersion) {
			return res.status(404).json({
				success: false,
				message: "No historical rule version found for the requested criteria.",
			});
		}

		let currentVersion = null;
		if (scholarship.eligibilityVersion) {
			currentVersion = await EligibilityRuleVersion.findById(scholarship.eligibilityVersion).lean();
		}
		if (!currentVersion) {
			currentVersion = await EligibilityRuleVersion.findOne({ scholarship: scholarship._id })
				.sort({ observedAt: -1 })
				.lean();
		}
		if (!currentVersion) {
			currentVersion = {
				_id: null,
				versionKey: "current_catalogue",
				snapshot: scholarship,
				evidence: scholarship.fieldEvidence || [],
				verified: Boolean(scholarship.verified),
				observedAt: scholarship.updatedAt || new Date(),
			};
		}

		const historicalEval = evaluateEligibility(profile, historicalVersion.snapshot || historicalVersion);
		const currentEval = evaluateEligibility(profile, currentVersion.snapshot || currentVersion);

		const impact = explainEligibilityImpact(profile, historicalVersion, currentVersion);
		const statusFlipped = historicalEval.status !== currentEval.status;

		return res.status(200).json({
			success: true,
			scholarship: {
				id: scholarship._id,
				slug: scholarship.slug,
				title: scholarship.title,
				schemeKey: scholarship.schemeKey,
			},
			historical: {
				versionKey: historicalVersion.versionKey || null,
				observedAt: historicalVersion.observedAt || null,
				verified: Boolean(historicalVersion.verified),
				status: historicalEval.status,
				isEligible: historicalEval.isEligible,
				matchConfidence: historicalEval.matchConfidence,
				passedRules: historicalEval.passedRules,
				failedRules: historicalEval.failedRules,
				unknownRules: historicalEval.unknownRules,
				documentReadiness: historicalEval.documentReadiness,
				evaluationTree: historicalEval.evaluationTree || null,
			},
			current: {
				versionKey: currentVersion.versionKey || null,
				observedAt: currentVersion.observedAt || null,
				verified: Boolean(currentVersion.verified),
				status: currentEval.status,
				isEligible: currentEval.isEligible,
				matchConfidence: currentEval.matchConfidence,
				passedRules: currentEval.passedRules,
				failedRules: currentEval.failedRules,
				unknownRules: currentEval.unknownRules,
				documentReadiness: currentEval.documentReadiness,
				evaluationTree: currentEval.evaluationTree || null,
			},
			statusFlipped,
			transition: {
				from: historicalEval.status,
				to: currentEval.status,
				summary: statusFlipped
					? `Your eligibility changed from ${historicalEval.status} to ${currentEval.status} between versions.`
					: `Your eligibility remained ${currentEval.status} across versions.`,
			},
			impact,
			changes: impact?.changes || [],
		});
	} catch (error) {
		console.error("Error running historical replay:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to replay eligibility",
			error: error.message,
		});
	}
};
