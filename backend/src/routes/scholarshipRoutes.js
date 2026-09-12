import express from "express";
import {
	getScholarships,
	getFeaturedScholarships,
	getScholarshipById,
	getScholarshipHistory,
	evaluateScholarships,
	getCrawlerStatus,
	runCrawler,
} from "../controllers/scholarshipController.js";
import { cacheMiddleware } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.get("/", cacheMiddleware({ ttl: 1800 }), getScholarships);
router.get("/featured", cacheMiddleware({ ttl: 1800 }), getFeaturedScholarships);

// Crawler Monitoring & Ingestion Pipeline Endpoints
router.get("/crawler/status", getCrawlerStatus);
router.post("/crawler/run", runCrawler);

router.get("/:id", getScholarshipById);
router.get("/:id/history", getScholarshipHistory);

router.post("/evaluate", evaluateScholarships);
router.post("/match", evaluateScholarships);

export default router;
