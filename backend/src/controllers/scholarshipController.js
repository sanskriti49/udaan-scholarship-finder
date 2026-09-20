import crypto from "crypto";
import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";
import UserProfile from "../models/UserProfile.js";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";
import ScholarshipCycle from "../models/ScholarshipCycle.js";
import SourceSnapshot from "../models/SourceSnapshot.js";
import IngestionIssue from "../models/IngestionIssue.js";
import SourceState from "../models/SourceState.js";
import CrawlRun from "../models/CrawlRun.js";
import { crawlerScheduler } from "../pipeline/scheduler.js";
import { SOURCE_REGISTRY } from "../pipeline/sources.js";
import { computeStatus } from "../pipeline/core/status.js";
import { verifyEvidence } from "../pipeline/core/evidence.js";

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
		} = req.query;

		const conditions = [PUBLIC_FILTER];

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

		if (hasChanges === "true" || hasChanges === true) conditions.push({ hasChanges: true });
		if (status) {
			const wanted = String(status).split(",").filter((x) => STATUSES.has(x));
			if (wanted.length) conditions.push({ status: { $in: wanted } });
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
				? { score: { $meta: "textScore" }, _noDeadline: 1, sortDeadline: 1 }
				: { _noDeadline: 1, sortDeadline: 1, title: 1 };
		})();

		const runQuery = async (conds) => {
			const match = { $and: conds };
			const pipeline = [
				{ $match: match },
				{
					$addFields: {
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
		const now = new Date();
		scholarships = scholarships.map((d) => withLiveStatus(d, now));

		const recentUpdatesCount = await Scholarship.countDocuments({
			...PUBLIC_FILTER,
			hasChanges: true,
		});

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

		return res.status(200).json({ success: true, data: featured.map((d) => withLiveStatus(d)) });
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

		return res.status(200).json({
			success: true,
			data: {
				...withLiveStatus(scholarship),
				cycles: cycles.map(({ evidence, ...c }) => c),
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

		const history = await ScholarshipVersion.find({ scholarship: scholarshipId, legacyUnverified: { $ne: true } })
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

		// Auto-save/sync profile in background if user is authenticated
		if (req.user && req.body && Object.keys(req.body).length > 0) {
			UserProfile.findOneAndUpdate(
				{ user: req.user._id },
				{
					$set: {
						...req.body,
						user: req.user._id,
					},
				},
				{ upsert: true, returnDocument: "after", runValidators: false },
			).catch((err) =>
				console.warn("[Evaluate] Non-fatal profile auto-save warning:", err.message),
			);
		}

		// Deterministic cache key based on profile attributes
		const profileFingerprint = {
			income: profile.familyIncome || profile.income,
			cgpa: profile.cgpa,
			percentage: profile.percentage,
			educationLevel: profile.educationLevel,
			stream: profile.courseStream || profile.stream,
			gender: profile.gender,
			casteCategory: profile.casteCategory || profile.caste_category,
			state: profile.state,
			hasDisability: profile.hasDisability,
			documents: (profile.documentsHeld || []).slice().sort(),
		};
		const profileHash = crypto
			.createHash("sha256")
			.update(JSON.stringify(profileFingerprint))
			.digest("hex")
			.slice(0, 16);
		const cacheKey = `scholarship:eval:${profileHash}`;

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

		if (profile.state && profile.state !== "All India") {
			query.state = { $in: [profile.state, "All India"] };
		}
		if (profile.gender === "Male") {
			query["eligibility.gender"] = { $ne: "Female" };
		} else if (profile.gender === "Female") {
			query["eligibility.gender"] = { $ne: "Male" };
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

