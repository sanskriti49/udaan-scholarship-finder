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
} from "../controllers/scholarshipController.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.get("/", cacheMiddleware({ ttl: 1800 }), getScholarships);
router.get("/featured", cacheMiddleware({ ttl: 1800 }), getFeaturedScholarships);

// Cache Control Endpoint
router.post("/cache/clear", flushScholarshipCache);
router.delete("/cache", flushScholarshipCache);

// Crawler Monitoring & Ingestion Pipeline Endpoints
router.get("/crawler/status", getCrawlerStatus);
router.post("/crawler/run", runCrawler);

router.get("/:id", getScholarshipById);
router.get("/:id/history", getScholarshipHistory);

router.post("/evaluate", evaluateScholarships);
router.post("/match", evaluateScholarships);

export default router;
