import express from "express";
import {
	getBookmarks,
	toggleBookmark,
	removeBookmark,
} from "../controllers/bookmarkController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getBookmarks);
router.post("/:scholarshipId", toggleBookmark);
router.delete("/:scholarshipId", removeBookmark);

export default router;
