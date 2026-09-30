import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { notificationService } from "../services/notificationService.js";
import { notificationScheduler } from "../jobs/notificationScheduler.js";

/**
 * GET /api/notifications
 * Paginated list of notifications for the authenticated user
 */
export const getNotifications = async (req, res) => {
	try {
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const skip = (page - 1) * limit;

		const filter = {
			user: req.user._id,
			"deliveryChannels.inApp.status": { $ne: "skipped" },
		};
		if (req.query.unread === "true") {
			filter.isRead = false;
		}
		if (req.query.type) {
			filter.type = req.query.type;
		}

		const [notifications, total, unreadCount] = await Promise.all([
			Notification.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Notification.countDocuments(filter),
			Notification.countDocuments({
				user: req.user._id,
				isRead: false,
				"deliveryChannels.inApp.status": { $ne: "skipped" },
			}),
		]);

		return res.status(200).json({
			success: true,
			notifications,
			total,
			unreadCount,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed fetching notifications",
			error: err.message,
		});
	}
};

/**
 * GET /api/notifications/unread-count
 * Fast endpoint for navbar badge
 */
export const getUnreadCount = async (req, res) => {
	try {
		const unreadCount = await Notification.countDocuments({
			user: req.user._id,
			isRead: false,
			"deliveryChannels.inApp.status": { $ne: "skipped" },
		});

		return res.status(200).json({
			success: true,
			unreadCount,
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed fetching unread count",
			error: err.message,
		});
	}
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markAsRead = async (req, res) => {
	try {
		const { id } = req.params;

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: "Invalid notification ID format",
			});
		}

		const notification = await Notification.findOneAndUpdate(
			{ _id: id, user: req.user._id },
			{ isRead: true, readAt: new Date() },
			{ new: true },
		);

		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found",
			});
		}

		return res.status(200).json({
			success: true,
			notification,
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed marking notification as read",
			error: err.message,
		});
	}
};

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
export const markAllAsRead = async (req, res) => {
	try {
		await Notification.updateMany(
			{ user: req.user._id, isRead: false },
			{ isRead: true, readAt: new Date() },
		);

		return res.status(200).json({
			success: true,
			message: "All notifications marked as read",
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed marking all notifications as read",
			error: err.message,
		});
	}
};

/**
 * DELETE /api/notifications/:id
 * Delete/dismiss a notification
 */
export const deleteNotification = async (req, res) => {
	try {
		const { id } = req.params;

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: "Invalid notification ID format",
			});
		}

		const deleted = await Notification.findOneAndDelete({
			_id: id,
			user: req.user._id,
		});

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: "Notification not found",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Notification deleted successfully",
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed deleting notification",
			error: err.message,
		});
	}
};

/**
 * GET /api/notifications/preferences
 * Retrieve user's notification preferences
 */
export const getPreferences = async (req, res) => {
	try {
		const preferences = await notificationService.getPreferences(req.user._id);
		return res.status(200).json({
			success: true,
			preferences,
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed fetching preferences",
			error: err.message,
		});
	}
};

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
export const updatePreferences = async (req, res) => {
	try {
		const updated = await notificationService.updatePreferences(
			req.user._id,
			req.body,
		);
		return res.status(200).json({
			success: true,
			preferences: updated,
			message: "Preferences updated successfully",
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed updating preferences",
			error: err.message,
		});
	}
};

/**
 * POST /api/notifications/test
 * Trigger an instant test notification
 */
export const sendTestNotification = async (req, res) => {
	try {
		const notification = await notificationService.sendTestNotification(
			req.user._id,
		);
		return res.status(200).json({
			success: true,
			notification,
			message: "Test notification sent successfully",
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Failed sending test notification",
			error: err.message,
		});
	}
};

/**
 * POST /api/notifications/trigger-job
 * Manual trigger for scheduled jobs (Admin / Dev)
 */
export const triggerSchedulerJob = async (req, res) => {
	try {
		const { jobName } = req.body;
		await notificationScheduler.triggerJobManually(jobName || "all");
		return res.status(200).json({
			success: true,
			message: `Job '${jobName || "all"}' executed successfully`,
		});
	} catch (err) {
		return res.status(500).json({
			success: false,
			message: "Job trigger failed",
			error: err.message,
		});
	}
};
