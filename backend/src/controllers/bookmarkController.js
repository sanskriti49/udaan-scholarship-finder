import Bookmark from "../models/Bookmark.js";
import Scholarship from "../models/Scholarship.js";
import User from "../models/User.js";
import { scheduleDeadlineReminder } from "../queues/reminderQueue.js";

/**
 * GET /api/bookmarks
 * Fetch all bookmarked scholarships for the authenticated user
 */
export const getBookmarks = async (req, res) => {
	try {
		const bookmarks = await Bookmark.find({ user: req.user._id })
			.populate({
				path: "scholarship",
				select: "title organization deadline amount category level state slug trustScore hasChanges",
			})
			.sort({ createdAt: -1 })
			.lean();

		const scholarships = bookmarks
			.map((b) => b.scholarship)
			.filter(Boolean);

		return res.status(200).json({
			success: true,
			count: scholarships.length,
			data: scholarships,
		});
	} catch (error) {
		console.error("[BookmarkController] Error fetching bookmarks:", error);
		return res.status(500).json({
			success: false,
			message: "Server error fetching bookmarks",
			error: error.message,
		});
	}
};

/**
 * POST /api/bookmarks/:scholarshipId
 * Toggle bookmark state for a scholarship and schedule BullMQ deadline alerts
 */
export const toggleBookmark = async (req, res) => {
	try {
		const { scholarshipId } = req.params;

		const scholarship = await Scholarship.findById(scholarshipId).lean();
		if (!scholarship) {
			return res.status(404).json({
				success: false,
				message: "Scholarship not found",
			});
		}

		const existing = await Bookmark.findOne({
			user: req.user._id,
			scholarship: scholarshipId,
		});

		if (existing) {
			await Bookmark.deleteOne({ _id: existing._id });
			return res.status(200).json({
				success: true,
				bookmarked: false,
				message: "Scholarship removed from bookmarks",
			});
		}

		// Create bookmark
		const bookmark = await Bookmark.create({
			user: req.user._id,
			scholarship: scholarshipId,
		});

		// Queue real-time BullMQ countdown alerts for active deadline
		if (scholarship.deadline && new Date(scholarship.deadline).getTime() > Date.now()) {
			const user = await User.findById(req.user._id).select("email").lean();
			const email = user?.email;

			if (email) {
				// 1. Enqueue 7-day reminder
				await scheduleDeadlineReminder({
					userId: String(req.user._id),
					email,
					scholarshipId: String(scholarship._id),
					scholarshipName: scholarship.title,
					deadlineDate: scholarship.deadline,
					reminderWindow: "7_days",
				}).catch((err) =>
					console.warn("[Bookmark] BullMQ 7-day reminder enqueue warning:", err.message),
				);

				// 2. Enqueue 48-hour reminder
				await scheduleDeadlineReminder({
					userId: String(req.user._id),
					email,
					scholarshipId: String(scholarship._id),
					scholarshipName: scholarship.title,
					deadlineDate: scholarship.deadline,
					reminderWindow: "48_hours",
				}).catch((err) =>
					console.warn("[Bookmark] BullMQ 48-hour reminder enqueue warning:", err.message),
				);
			}
		}

		return res.status(201).json({
			success: true,
			bookmarked: true,
			message: "Scholarship bookmarked and deadline alerts queued",
			data: bookmark,
		});
	} catch (error) {
		console.error("[BookmarkController] Error toggling bookmark:", error);
		return res.status(500).json({
			success: false,
			message: "Server error modifying bookmark",
			error: error.message,
		});
	}
};

/**
 * DELETE /api/bookmarks/:scholarshipId
 * Remove a bookmark
 */
export const removeBookmark = async (req, res) => {
	try {
		const { scholarshipId } = req.params;
		await Bookmark.findOneAndDelete({
			user: req.user._id,
			scholarship: scholarshipId,
		});

		return res.status(200).json({
			success: true,
			bookmarked: false,
			message: "Scholarship bookmark removed",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Server error removing bookmark",
			error: error.message,
		});
	}
};
