import express from "express";
import {
	getNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
	getPreferences,
	updatePreferences,
	sendTestNotification,
	triggerSchedulerJob,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);
router.patch("/:id/read", markAsRead);
router.post("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);
router.post("/test", sendTestNotification);
router.post("/trigger-job", triggerSchedulerJob);

export default router;
