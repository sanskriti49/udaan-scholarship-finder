import express from "express";
import { getUserProfile, updateUserProfile } from "../controllers/profileController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getUserProfile);
router.put("/", updateUserProfile);
router.post("/", updateUserProfile);

export default router;
