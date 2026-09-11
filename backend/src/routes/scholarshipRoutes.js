import express from "express";
import {
	getScholarships,
	getFeaturedScholarships,
	getScholarshipById,
	getScholarshipHistory,
	evaluateScholarships,
} from "../controllers/scholarshipController.js";

const router = express.Router();

router.get("/", getScholarships);
router.get("/featured", getFeaturedScholarships);
router.get("/:id", getScholarshipById);
router.get("/:id/history", getScholarshipHistory);

router.post("/evaluate", evaluateScholarships);
router.post("/match", evaluateScholarships);

export default router;
