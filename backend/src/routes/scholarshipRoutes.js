import express from "express";
import {
	getScholarships,
	getFeaturedScholarships,
	getScholarshipById,
	matchScholarships,
} from "../controllers/scholarshipController.js";

const router = express.Router();

router.get("/", getScholarships);
router.get("/featured", getFeaturedScholarships);
router.get("/:id", getScholarshipById);

router.post("/match", matchScholarships);

export default router;
