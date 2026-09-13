import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import NotificationLog from "../models/NotificationLog.js";
import UserProfile from "../models/UserProfile.js";
import User from "../models/User.js";
import Scholarship from "../models/Scholarship.js";
import Bookmark from "../models/Bookmark.js";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";
import { emailService } from "./emailService.js";

class NotificationService {
	/**
	 * Get or initialize default user notification preferences
	 */
	async getPreferences(userId) {
		let prefs = await NotificationPreference.findOne({ user: userId }).lean();
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
	 * Updates notification preferences
	 */
	async updatePreferences(userId, updateData) {
		return await NotificationPreference.findOneAndUpdate(
			{ user: userId },
			{ $set: updateData },
			{ new: true, upsert: true, runValidators: true },
		);
	}

	/**
	 * Dispatches notification with DB-level idempotency
	 */
	async createNotification(userId, payload) {
		const prefs = await this.getPreferences(userId);

		// Preference gates
		if (payload.type === "INSTANT_MATCH" && !prefs.instantMatch) return null;
		if (
			payload.type === "DEADLINE_7_DAYS" &&
			(!prefs.deadlineAlerts || !prefs.deadline7Days)
		)
			return null;
		if (
			payload.type === "DEADLINE_48_HOURS" &&
			(!prefs.deadlineAlerts || !prefs.deadline48Hours)
		)
			return null;
		if (payload.type === "STATE_GRANT_UPDATE" && !prefs.newGrantsInState)
			return null;
		if (payload.type === "WEEKLY_DIGEST" && !prefs.weeklyDigest) return null;

		let notification;
		try {
			notification = await Notification.create({
				user: userId,
				...payload,
				deliveryChannels: {
					inApp: {
						status: prefs.channels?.inApp ? "delivered" : "skipped",
						deliveredAt: new Date(),
					},
					email: {
						status: prefs.channels?.email ? "pending" : "skipped",
					},
				},
			});
		} catch (err) {
			// E11000 duplicate key error confirms job was already delivered
			if (err.code === 11000) {
				return null;
			}
			throw err;
		}

		// Email transport execution
		if (prefs.channels?.email) {
			try {
				const user = await User.findById(userId).select("email name").lean();
				if (user?.email) {
					const emailResult = await emailService.sendEmail({
						to: user.email,
						type: payload.type,
						data: payload,
						notificationId: notification._id,
						userId,
					});

					await Notification.findByIdAndUpdate(notification._id, {
						$set: {
							"deliveryChannels.email.status": emailResult.success
								? "sent"
								: "failed",
							"deliveryChannels.email.sentAt": new Date(),
							"deliveryChannels.email.error": emailResult.error || null,
							"deliveryChannels.email.messageId": emailResult.messageId || null,
						},
					});
				}
			} catch (emailErr) {
				console.error(
					`[NotificationService] Email delivery failure for ${userId}:`,
					emailErr.message,
				);
			}
		}

		return notification;
	}

	/**
	 * Ingestion hook for real-time scholarship updates
	 */
	async onScholarshipIngested(scholarship, isNew, diffResult) {
		try {
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
	 * Evaluates new schemes against registered profiles with concurrency chunking
	 */
	async handleNewScholarshipIngested(scholarship) {
		const profiles = await UserProfile.find({}).lean();
		if (!profiles.length) return;

		const isStateSpecific =
			scholarship.state && scholarship.state !== "All India";

		// Chunk profile processing to prevent event-loop starvation
		const CHUNK_SIZE = 25;
		for (let i = 0; i < profiles.length; i += CHUNK_SIZE) {
			const chunk = profiles.slice(i, i + CHUNK_SIZE);

			await Promise.allSettled(
				chunk.map(async (profile) => {
					const userId = profile.user;
					const prefs = await this.getPreferences(userId);

					// 1. Domicile-specific alert
					const stateMatches =
						isStateSpecific &&
						profile.state &&
						scholarship.state
							.toLowerCase()
							.includes(profile.state.toLowerCase());

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
									passedRulesSummary: evaluation.passedRules.map(
										(r) => r.condition,
									),
									eligibilityReason: `Matches permanent domicile in ${profile.state}`,
									state: scholarship.state,
									category: scholarship.category,
								},
								link: `/scholarships`,
								dedupKey: `state_grant:${userId}:${scholarship._id}`,
							});
						}
					}

					// 2. High-confidence instant match
					if (prefs.instantMatch) {
						const evaluation = evaluateEligibility(profile, scholarship);
						const minScore = prefs.minMatchScore || 70;

						if (
							evaluation.isEligible &&
							evaluation.readinessScore >= minScore
						) {
							await this.createNotification(userId, {
								type: "INSTANT_MATCH",
								title: `Instant Match (${evaluation.readinessScore}%): ${scholarship.title}`,
								message: `Verified match against your ${profile.stream || "course"} criteria.`,
								priority: evaluation.readinessScore >= 85 ? "high" : "medium",
								scholarship: scholarship._id,
								scholarshipTitle: scholarship.title,
								deadline: scholarship.deadline,
								amount: scholarship.amount?.value,
								evidence: {
									matchScore: evaluation.readinessScore,
									passedRulesSummary: evaluation.passedRules.map(
										(r) => r.condition,
									),
									eligibilityReason:
										"Fully eligible based on verified criteria",
									state: scholarship.state,
									category: scholarship.category,
								},
								link: `/scholarships`,
								dedupKey: `instant_match:${userId}:${scholarship._id}`,
							});
						}
					}
				}),
			);
		}
	}

	/**
	 * Notifies users on bookmarked scholarship changes
	 */
	async handleScholarshipChanged(scholarship, diffResult) {
		if (!diffResult.summary?.toLowerCase().includes("deadline")) return;

		const bookmarks = await Bookmark.find({
			scholarship: scholarship._id,
		}).lean();
		const deadlineFormatted = new Date(scholarship.deadline).toLocaleDateString(
			"en-IN",
		);
		const deadlineDateStr = new Date(scholarship.deadline)
			.toISOString()
			.slice(0, 10);

		await Promise.allSettled(
			bookmarks.map((bm) =>
				this.createNotification(bm.user, {
					type: "DEADLINE_CHANGED",
					title: `Deadline Extended: ${scholarship.title}`,
					message: `The application deadline has been officially updated to ${deadlineFormatted}.`,
					priority: "medium",
					scholarship: scholarship._id,
					scholarshipTitle: scholarship.title,
					deadline: scholarship.deadline,
					amount: scholarship.amount?.value,
					link: `/scholarships`,
					dedupKey: `deadline_change:${bm.user}:${scholarship._id}:${deadlineDateStr}`,
				}),
			),
		);
	}

	/**
	 * Periodic background scan using deterministic threshold queries
	 */
	async runDeadlineCheck() {
		const now = new Date();
		console.log(
			`[NotificationService] Running deadline alert scan at: ${now.toISOString()}`,
		);

		// Pull active scholarships closing within the next 8 days
		const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
		const closingScholarships = await Scholarship.find({
			deadline: { $gt: now, $lte: eightDaysFromNow },
		}).lean();

		if (!closingScholarships.length) {
			console.log(
				`[NotificationService] No scholarships closing in the 8-day window.`,
			);
			return { activeScholarshipsChecked: 0, alertsGenerated: 0 };
		}

		// Cache candidate datasets once for the entire scan
		const scholarshipIds = closingScholarships.map((s) => s._id);
		const [allBookmarks, allProfiles] = await Promise.all([
			Bookmark.find({ scholarship: { $in: scholarshipIds } }).lean(),
			UserProfile.find({}).lean(),
		]);

		let alertsGenerated = 0;

		for (const scholarship of closingScholarships) {
			const msUntilDeadline =
				new Date(scholarship.deadline).getTime() - now.getTime();
			const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
			const daysUntilDeadline = hoursUntilDeadline / 24;

			// Threshold evaluations: as long as it entered the window, check for delivery
			const eligibleAlertTypes = [];
			if (hoursUntilDeadline <= 48) {
				eligibleAlertTypes.push("DEADLINE_48_HOURS");
			} else if (daysUntilDeadline <= 7.5) {
				eligibleAlertTypes.push("DEADLINE_7_DAYS");
			}

			if (!eligibleAlertTypes.length) continue;

			const deadlineIso = new Date(scholarship.deadline)
				.toISOString()
				.slice(0, 10);

			// Assemble interested users (Bookmarks + Eligible Profiles)
			const targetUsers = new Set(
				allBookmarks
					.filter((b) => String(b.scholarship) === String(scholarship._id))
					.map((b) => String(b.user)),
			);

			for (const profile of allProfiles) {
				if (!targetUsers.has(String(profile.user))) {
					const evaluation = evaluateEligibility(profile, scholarship);
					if (evaluation.isEligible) {
						targetUsers.add(String(profile.user));
					}
				}
			}

			for (const alertType of eligibleAlertTypes) {
				const isUrgent = alertType === "DEADLINE_48_HOURS";

				for (const userId of targetUsers) {
					const dedupKey = `${alertType.toLowerCase()}:${userId}:${scholarship._id}:${deadlineIso}`;

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
							eligibilityReason:
								"You have bookmarked or matched the criteria for this scheme",
							state: scholarship.state,
							category: scholarship.category,
						},
						link: `/scholarships`,
						dedupKey,
					});

					if (notif) alertsGenerated++;
				}
			}
		}

		await NotificationLog.create({
			jobName: "DEADLINE_SCAN",
			channel: "job",
			status: "SUCCESS",
			metadata: {
				activeScholarshipsChecked: closingScholarships.length,
				alertsGenerated,
			},
		});

		console.log(
			`[NotificationService] Deadline scan completed. Generated ${alertsGenerated} alerts.`,
		);
		return {
			activeScholarshipsChecked: closingScholarships.length,
			alertsGenerated,
		};
	}

	/**
	 * Weekly Digest using ISO calendar week keys
	 */
	async runWeeklyDigest(force = false) {
		const now = new Date();
		const dayOfWeek = now.getDay(); // 1 = Monday

		if (!force && dayOfWeek !== 1) {
			console.log(
				"[NotificationService] Weekly digest skipped: today is not Monday.",
			);
			return { skipped: true, reason: "Not Monday" };
		}

		// Calculate ISO calendar week identifier (e.g., "2026_W37")
		const tempDate = new Date(
			Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
		);
		tempDate.setUTCDate(
			tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7),
		);
		const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
		const weekNum = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
		const weekIdentifier = `${tempDate.getUTCFullYear()}_W${weekNum}`;

		const activeScholarships = await Scholarship.find({
			deadline: { $gt: now },
		}).lean();
		const students = await User.find({ role: "student" }).lean();
		let digestsSent = 0;

		for (const student of students) {
			try {
				const prefs = await this.getPreferences(student._id);
				if (!prefs.weeklyDigest) continue;

				const dedupKey = `weekly_digest:${student._id}:${weekIdentifier}`;
				const profile = await UserProfile.findOne({ user: student._id }).lean();

				const matched = [];
				for (const s of activeScholarships) {
					if (profile) {
						const evalResult = evaluateEligibility(profile, s);
						if (evalResult.isEligible) {
							matched.push({
								id: s._id,
								title: s.title,
								organization: s.organization,
								amount: s.amount?.value,
								deadline: s.deadline,
								readinessScore: evalResult.readinessScore || 80,
							});
						}
					} else if (s.popular || s.verified) {
						matched.push({
							id: s._id,
							title: s.title,
							organization: s.organization,
							amount: s.amount?.value,
							deadline: s.deadline,
							readinessScore: 75,
						});
					}
				}

				matched.sort((a, b) => b.readinessScore - a.readinessScore);
				const topPicks = matched.slice(0, 4);

				if (topPicks.length > 0) {
					const dispatched = await this.createNotification(student._id, {
						type: "WEEKLY_DIGEST",
						title: "Your Monday Scholarship Digest",
						message: `We found ${topPicks.length} active opportunities tailored to your profile this week.`,
						priority: "low",
						data: { topScholarships: topPicks, week: weekIdentifier },
						link: "/scholarships",
						dedupKey,
					});
					if (dispatched) digestsSent++;
				}
			} catch (err) {
				console.error(
					`[NotificationService] Digest error for user ${student._id}:`,
					err.message,
				);
			}
		}

		await NotificationLog.create({
			jobName: "WEEKLY_DIGEST",
			channel: "job",
			status: "SUCCESS",
			metadata: { weekIdentifier, digestsSent },
		});

		console.log(`[NotificationService] Weekly digest sent: ${digestsSent}`);
		return { digestsSent, weekIdentifier };
	}
}

export const notificationService = new NotificationService();
export default notificationService;
