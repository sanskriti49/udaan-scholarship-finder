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

const router = express.Router();

router.get("/", getScholarships);
router.get("/featured", getFeaturedScholarships);

// Crawler Monitoring & Ingestion Pipeline Endpoints
router.get("/crawler/status", getCrawlerStatus);
router.post("/crawler/run", runCrawler);

router.get("/:id", getScholarshipById);
router.get("/:id/history", getScholarshipHistory);

router.post("/evaluate", evaluateScholarships);
router.post("/match", evaluateScholarships);

export default router;
