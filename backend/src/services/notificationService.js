import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import NotificationLog from "../models/NotificationLog.js";
import UserProfile from "../models/UserProfile.js";
import User from "../models/User.js";
import Scholarship from "../models/Scholarship.js";
import Bookmark from "../models/Bookmark.js";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";
import { emailService } from "./emailService.js";

/**
 * Notification Service
 * Orchestrates multi-channel delivery (in-app + email), deterministic rule-based matching,
 * ingestion hooks, deadline alerts, deduplication, and weekly digests.
 */
class NotificationService {
	/**
	 * Get or create default notification preferences for a user
	 */
	async getPreferences(userId) {
		let prefs = await NotificationPreference.findOne({ user: userId });
		if (!prefs) {
			prefs = await NotificationPreference.create({
				user: userId,
				instantMatch: true,
				deadlineAlerts: true,
				deadline7Days: true,
				deadline48Hours: true,
				newGrantsInState: true,
				weeklyDigest: true,
				channels: { inApp: true, email: true },
				frequency: "instant",
				timezone: "Asia/Kolkata",
				minMatchScore: 70,
			});
		}
		return prefs;
	}

	/**
	 * Update notification preferences for a user
	 */
	async updatePreferences(userId, updateData) {
		const prefs = await NotificationPreference.findOneAndUpdate(
			{ user: userId },
			{ $set: updateData },
			{ new: true, upsert: true, runValidators: true },
		);
		return prefs;
	}

	/**
	 * Create and dispatch a notification idempotently
	 */
	async createNotification(userId, payload) {
		const prefs = await this.getPreferences(userId);

		// Respect disabled preferences immediately
		if (payload.type === "INSTANT_MATCH" && !prefs.instantMatch) return null;
		if (payload.type === "DEADLINE_7_DAYS" && (!prefs.deadlineAlerts || !prefs.deadline7Days)) return null;
		if (payload.type === "DEADLINE_48_HOURS" && (!prefs.deadlineAlerts || !prefs.deadline48Hours)) return null;
		if (payload.type === "STATE_GRANT_UPDATE" && !prefs.newGrantsInState) return null;
		if (payload.type === "WEEKLY_DIGEST" && !prefs.weeklyDigest) return null;

		// Deduplication check
		if (payload.dedupKey) {
			const existing = await Notification.findOne({ dedupKey: payload.dedupKey });
			if (existing) {
				return existing;
			}
		}

		// Create in-app notification
		const notification = await Notification.create({
			user: userId,
			...payload,
			deliveryChannels: {
				inApp: {
					status: prefs.channels?.inApp ? "delivered" : "read",
					deliveredAt: new Date(),
				},
				email: {
					status: prefs.channels?.email ? "pending" : "skipped",
				},
			},
		});

		// Dispatch email if enabled
		if (prefs.channels?.email) {
			const user = await User.findById(userId).select("email name");
			if (user && user.email) {
				const emailResult = await emailService.sendEmail({
					to: user.email,
					type: payload.type,
					data: payload,
					notificationId: notification._id,
					userId,
				});

				notification.deliveryChannels.email = {
					status: emailResult.success ? "sent" : "failed",
					sentAt: new Date(),
					error: emailResult.error || null,
					messageId: emailResult.messageId || null,
				};
				await notification.save();
			}
		}

		return notification;
	}

	/**
	 * Ingestion Pipeline Hook: Called after a scholarship is created or updated
	 */
	async onScholarshipIngested(scholarship, isNew, diffResult) {
		console.log(`[NotificationService] Processing ingestion hook for: '${scholarship.title}' (isNew: ${isNew})`);
		try {
			// 1. If newly ingested, evaluate for State Grant Updates & Instant Matches
			if (isNew) {
				await this.handleNewScholarshipIngested(scholarship);
			} else if (diffResult?.hasChanges) {
				await this.handleScholarshipChanged(scholarship, diffResult);
			}
		} catch (err) {
			console.error("[NotificationService] Ingestion hook error:", err.message);
		}
	}

	/**
	 * Handle newly scraped scholarship
	 */
	async handleNewScholarshipIngested(scholarship) {
		// Fetch all user profiles with linked users
		const profiles = await UserProfile.find({}).lean();
		if (!profiles || profiles.length === 0) return;

		let instantAlertsCount = 0;
		const maxInstantAlertsPerRun = 5; // Rate limit guard

		for (const profile of profiles) {
			try {
				const userId = profile.user;
				const prefs = await this.getPreferences(userId);

				// 1. Regional / State Grant Update
				const isStateSpecific = scholarship.state && scholarship.state !== "All India";
				const stateMatches = isStateSpecific && profile.state &&
					scholarship.state.toLowerCase().includes(profile.state.toLowerCase());

				if (stateMatches && prefs.newGrantsInState) {
					const evaluation = evaluateEligibility(profile, scholarship);
					if (evaluation.isEligible) {
						await this.createNotification(userId, {
							type: "STATE_GRANT_UPDATE",
							title: `New State Scheme for ${profile.state}: ${scholarship.title}`,
							message: `A newly published state grant for ${profile.state} is open for applications.`,
							priority: "medium",
							scholarship: scholarship._id,
							scholarshipTitle: scholarship.title,
							deadline: scholarship.deadline,
							amount: scholarship.amount?.value,
							evidence: {
								matchScore: evaluation.matchConfidence,
								passedRulesSummary: evaluation.passedRules.map((r) => r.condition),
								eligibilityReason: `Matches permanent domicile in ${profile.state}`,
								state: scholarship.state,
								category: scholarship.category,
							},
							link: `/scholarships`,
							dedupKey: `state_grant:${userId}:${scholarship._id}`,
						});
					}
				}

				// 2. Instant Match Alert (High Confidence >= minMatchScore)
				if (prefs.instantMatch && instantAlertsCount < maxInstantAlertsPerRun) {
					const evaluation = evaluateEligibility(profile, scholarship);
					const minScore = prefs.minMatchScore || 70;

					if (evaluation.isEligible && evaluation.readinessScore >= minScore) {
						await this.createNotification(userId, {
							type: "INSTANT_MATCH",
							title: `Instant Match (${evaluation.readinessScore}%): ${scholarship.title}`,
							message: `Verified match against your ${profile.stream || "course"} and academic criteria.`,
							priority: evaluation.readinessScore >= 85 ? "high" : "medium",
							scholarship: scholarship._id,
							scholarshipTitle: scholarship.title,
							deadline: scholarship.deadline,
							amount: scholarship.amount?.value,
							evidence: {
								matchScore: evaluation.readinessScore,
								passedRulesSummary: evaluation.passedRules.map((r) => r.condition),
								eligibilityReason: evaluation.passedRules.length > 0
									? `Passed ${evaluation.passedRules.length} verified requirements`
									: "Fully eligible based on student criteria",
								state: scholarship.state,
								category: scholarship.category,
							},
							link: `/scholarships`,
							dedupKey: `instant_match:${userId}:${scholarship._id}`,
						});
						instantAlertsCount++;
					}
				}
			} catch (itemErr) {
				console.error(`[NotificationService] Error matching user ${profile.user}:`, itemErr.message);
			}
		}
	}

	/**
	 * Handle policy changes / deadline extensions on existing scholarships
	 */
	async handleScholarshipChanged(scholarship, diffResult) {
		const isDeadlineChange = diffResult.summary?.toLowerCase().includes("deadline");
		if (!isDeadlineChange) return;

		// Notify users who bookmarked this scholarship
		const bookmarks = await Bookmark.find({ scholarship: scholarship._id }).lean();
		for (const bm of bookmarks) {
			await this.createNotification(bm.user, {
				type: "DEADLINE_CHANGED",
				title: `Deadline Extended: ${scholarship.title}`,
				message: `The application deadline has been updated to ${new Date(scholarship.deadline).toLocaleDateString("en-IN")}.`,
				priority: "medium",
				scholarship: scholarship._id,
				scholarshipTitle: scholarship.title,
				deadline: scholarship.deadline,
				amount: scholarship.amount?.value,
				link: `/scholarships`,
				dedupKey: `deadline_change:${bm.user}:${scholarship._id}:${new Date(scholarship.deadline).toISOString().slice(0, 10)}`,
			});
		}
	}

	/**
	 * Background Job: Scan for upcoming deadlines (7 Days and 48 Hours)
	 * Idempotent, timezone-aware, and ignores expired schemes.
	 */
	async runDeadlineCheck() {
		const now = new Date();
		console.log(`[NotificationService] Running deadline alert scan at: ${now.toISOString()}`);

		// Active, non-expired scholarships
		const activeScholarships = await Scholarship.find({
			deadline: { $gt: now },
		}).lean();

		let alertsGenerated = 0;

		for (const scholarship of activeScholarships) {
			const msUntilDeadline = new Date(scholarship.deadline).getTime() - now.getTime();
			const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
			const daysUntilDeadline = hoursUntilDeadline / 24;

			let alertType = null;
			if (daysUntilDeadline >= 6.0 && daysUntilDeadline <= 7.5) {
				alertType = "DEADLINE_7_DAYS";
			} else if (hoursUntilDeadline >= 40 && hoursUntilDeadline <= 52) {
				alertType = "DEADLINE_48_HOURS";
			}

			if (!alertType) continue;

			const deadlineIsoDate = new Date(scholarship.deadline).toISOString().slice(0, 10);

			// Find interested users: Bookmarks OR matching profiles
			const bookmarks = await Bookmark.find({ scholarship: scholarship._id }).lean();
			const bookmarkedUserIds = new Set(bookmarks.map((b) => String(b.user)));

			// Also evaluate active profiles
			const profiles = await UserProfile.find({}).lean();
			const candidateUsers = new Set([...bookmarkedUserIds]);

			for (const profile of profiles) {
				if (!candidateUsers.has(String(profile.user))) {
					const evaluation = evaluateEligibility(profile, scholarship);
					if (evaluation.isEligible) {
						candidateUsers.add(String(profile.user));
					}
				}
			}

			for (const userId of candidateUsers) {
				const dedupKey = `${alertType.toLowerCase()}:${userId}:${scholarship._id}:${deadlineIsoDate}`;
				const isUrgent = alertType === "DEADLINE_48_HOURS";

				const notif = await this.createNotification(userId, {
					type: alertType,
					title: isUrgent
						? `Urgent: 48 Hours Left to Apply: ${scholarship.title}`
						: `7 Days Remaining: ${scholarship.title}`,
					message: `Application closes on ${new Date(scholarship.deadline).toLocaleDateString("en-IN")}. Complete your official portal submission.`,
					priority: isUrgent ? "urgent" : "high",
					scholarship: scholarship._id,
					scholarshipTitle: scholarship.title,
					deadline: scholarship.deadline,
					amount: scholarship.amount?.value,
					evidence: {
						eligibilityReason: "You have bookmarked or matched the criteria for this scheme",
						state: scholarship.state,
						category: scholarship.category,
					},
					link: `/scholarships`,
					dedupKey,
				});

				if (notif) alertsGenerated++;
			}
		}

		await NotificationLog.create({
			jobName: "DEADLINE_SCAN",
			channel: "job",
			status: "SUCCESS",
			metadata: { activeScholarshipsChecked: activeScholarships.length, alertsGenerated },
		});

		console.log(`[NotificationService] Deadline scan finished. Generated ${alertsGenerated} alerts.`);
		return { activeScholarshipsChecked: activeScholarships.length, alertsGenerated };
	}

	/**
	 * Background Job: Monday Morning Weekly Curated Digest
	 */
	async runWeeklyDigest(force = false) {
		const now = new Date();
		const dayOfWeek = now.getDay(); // 1 = Monday
		const hour = now.getHours();

		// Unless forced, only execute on Mondays between 06:00 and 12:00
		if (!force && (dayOfWeek !== 1 || hour < 6 || hour > 12)) {
			console.log("[NotificationService] Weekly digest skipped: not scheduled Monday morning window.");
			return { skipped: true, reason: "Not Monday morning window" };
		}

		console.log(`[NotificationService] Generating weekly scholarship digest for students...`);

		// Calculate current ISO week identifier
		const year = now.getFullYear();
		const startOfYear = new Date(year, 0, 1);
		const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
		const weekIdentifier = `${year}_W${weekNum}`;

		const activeScholarships = await Scholarship.find({
			deadline: { $gt: now },
		}).lean();

		const users = await User.find({ role: "student" }).lean();
		let digestsSent = 0;

		for (const user of users) {
			try {
				const prefs = await this.getPreferences(user._id);
				if (!prefs.weeklyDigest) continue;

				const dedupKey = `weekly_digest:${user._id}:${weekIdentifier}`;
				const existing = await Notification.findOne({ dedupKey });
				if (existing) continue;

				const profile = await UserProfile.findOne({ user: user._id }).lean();
				const candidateMatches = [];

				for (const scholarship of activeScholarships) {
					if (profile) {
						const evaluation = evaluateEligibility(profile, scholarship);
						if (evaluation.isEligible) {
							candidateMatches.push({
								id: scholarship._id,
								title: scholarship.title,
								organization: scholarship.organization,
								amount: scholarship.amount?.value,
								deadline: scholarship.deadline,
								readinessScore: evaluation.readinessScore || 80,
							});
						}
					} else {
						// For users without profiles yet, provide popular / verified active scholarships
						if (scholarship.popular || scholarship.verified) {
							candidateMatches.push({
								id: scholarship._id,
								title: scholarship.title,
								organization: scholarship.organization,
								amount: scholarship.amount?.value,
								deadline: scholarship.deadline,
								readinessScore: 75,
							});
						}
					}
				}

				candidateMatches.sort((a, b) => b.readinessScore - a.readinessScore);
				const topPicks = candidateMatches.slice(0, 4);

				if (topPicks.length > 0) {
					await this.createNotification(user._id, {
						type: "WEEKLY_DIGEST",
						title: "Your Monday Scholarship Digest",
						message: `We found ${topPicks.length} active scholarship opportunities tailored to your profile this week.`,
						priority: "low",
						data: { topScholarships: topPicks, week: weekIdentifier },
						link: "/scholarships",
						dedupKey,
					});
					digestsSent++;
				}
			} catch (uErr) {
				console.error(`[NotificationService] Digest error for user ${user._id}:`, uErr.message);
			}
		}

		await NotificationLog.create({
			jobName: "WEEKLY_DIGEST",
			channel: "job",
			status: "SUCCESS",
			metadata: { weekIdentifier, digestsSent },
		});

		console.log(`[NotificationService] Weekly digest completed. Dispatched: ${digestsSent}`);
		return { digestsSent, weekIdentifier };
	}

	/**
	 * Send test notification for instant user verification
	 */
	async sendTestNotification(userId) {
		const sampleTitle = "Prime Minister Research Fellowship (PMRF)";
		return await this.createNotification(userId, {
			type: "INSTANT_MATCH",
			title: `[Test Notification] High Match (96%): ${sampleTitle}`,
			message: "This is a live test notification verifying your in-app and email delivery pipeline.",
			priority: "medium",
			scholarshipTitle: sampleTitle,
			deadline: new Date(Date.now() + 14 * 86400000),
			amount: 70000,
			evidence: {
				matchScore: 96,
				passedRulesSummary: [
					"Enrolled in approved technical degree program",
					"CGPA requirement of 8.0 or above satisfied",
					"Valid institute verification document present",
				],
				eligibilityReason: "Satisfies all 3 mandatory scheme criteria with zero exceptions",
				state: "All India",
				category: "Merit based",
			},
			link: "/scholarships",
			dedupKey: `test_notif:${userId}:${Date.now()}`,
		});
	}
}

export const notificationService = new NotificationService();
export default notificationService;
