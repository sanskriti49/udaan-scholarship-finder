import express from "express";
import {
	getScholarships,
	getFeaturedScholarships,
	getScholarshipById,
	getScholarshipHistory,
	evaluateScholarships,
	getCrawlerStatus,
	runCrawler,
	flushScholarshipCache,
	getScholarshipSuggestions,
} from "../controllers/scholarshipController.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";
import {
	protect,
	authorizeRoles,
	optionalAuth,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", cacheMiddleware({ ttl: 1800 }), getScholarships);
router.get("/featured", cacheMiddleware({ ttl: 1800 }), getFeaturedScholarships);
router.get("/suggestions", cacheMiddleware({ ttl: 300 }), getScholarshipSuggestions);

// Admin-Only Cache Control Endpoints
router.post("/cache/clear", protect, authorizeRoles("admin"), flushScholarshipCache);
router.delete("/cache", protect, authorizeRoles("admin"), flushScholarshipCache);

// Admin-Only Crawler Monitoring & Ingestion Pipeline Endpoints
router.get("/crawler/status", protect, authorizeRoles("admin"), getCrawlerStatus);
router.post("/crawler/run", protect, authorizeRoles("admin"), runCrawler);

router.get("/:id", getScholarshipById);
router.get("/:id/history", getScholarshipHistory);

router.post("/evaluate", optionalAuth, evaluateScholarships);
router.post("/match", optionalAuth, evaluateScholarships);

export default router;
