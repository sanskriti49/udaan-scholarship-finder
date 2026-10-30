import express from "express";
import {
	getScholarships,
	discoverScholarships,
	getFeaturedScholarships,
	getScholarshipById,
	getScholarshipHistory,
	evaluateScholarships,
	evaluateRuleTree,
	getCrawlerStatus,
	runCrawler,
	flushScholarshipCache,
	getScholarshipSuggestions,
	getIngestionIssues,
	getScholarshipEvidence,
	replayScholarshipEligibility,
} from "../controllers/scholarshipController.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";
import { translateScholarshipTitle } from "../controllers/translationController.js";
import { rateLimiter } from "../middlewares/rateLimiterMiddleware.js";
import {
	protect,
	authorizeRoles,
	optionalAuth,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", cacheMiddleware({ ttl: 300 }), getScholarships);
router.get("/featured", cacheMiddleware({ ttl: 300 }), getFeaturedScholarships);
router.get("/suggestions", cacheMiddleware({ ttl: 300 }), getScholarshipSuggestions);
router.post("/discover", optionalAuth, discoverScholarships);

// Admin-Only Cache Control Endpoints
router.post("/cache/clear", protect, authorizeRoles("admin"), flushScholarshipCache);
router.delete("/cache", protect, authorizeRoles("admin"), flushScholarshipCache);

// Admin-Only Crawler Monitoring & Ingestion Pipeline Endpoints
router.get("/crawler/status", protect, authorizeRoles("admin"), getCrawlerStatus);
router.post("/crawler/run", protect, authorizeRoles("admin"), runCrawler);
router.get("/crawler/issues", protect, authorizeRoles("admin"), getIngestionIssues);

router.get("/:id", cacheMiddleware({ ttl: 300 }), getScholarshipById);
router.get("/:id/history", cacheMiddleware({ ttl: 300 }), getScholarshipHistory);
router.get("/:id/evidence", cacheMiddleware({ ttl: 300 }), getScholarshipEvidence);
router.post("/:id/translate", rateLimiter({ windowMs: 60000, max: 30, keyPrefix: "translation" }), translateScholarshipTitle);
router.post("/:id/replay", optionalAuth, replayScholarshipEligibility);

router.post("/evaluate", optionalAuth, evaluateScholarships);
router.post("/match", optionalAuth, evaluateScholarships);
router.post("/evaluate-tree", protect, authorizeRoles("admin"), evaluateRuleTree);

export default router;
