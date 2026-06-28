import express from "express";
import {
	registerUser,
	loginUser,
	googleLogin,
} from "../controllers/authController.js";

import { verifyTurnstile } from "../middlewares/turnstileMiddleware.js";

const router = express.Router();

router.post("/register", verifyTurnstile, registerUser);
router.post("/login", verifyTurnstile, loginUser);
router.post("/google", googleLogin);

export default router;
