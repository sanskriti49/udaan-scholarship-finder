import express from "express";
import {
  scanLinkOrText,
  getOfficialRegistry,
} from "../controllers/verifyController.js";

const router = express.Router();

// Public verification endpoints (no auth required so all students can check links safely)
router.post("/scan", scanLinkOrText);
router.post("/scan-link", scanLinkOrText);
router.get("/registry", getOfficialRegistry);

export default router;
