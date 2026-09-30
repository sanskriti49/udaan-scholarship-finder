import express from "express";
import {
	registerUser,
	loginUser,
	googleLogin,
} from "../controllers/authController.js";

import { verifyTurnstile } from "../middlewares/turnstileMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiterMiddleware.js";

const router = express.Router();

router.use(authLimiter);

router.post("/register", verifyTurnstile, registerUser);
router.post("/login", verifyTurnstile, loginUser);
router.post("/google", googleLogin);

export default router;
