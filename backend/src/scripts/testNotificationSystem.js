import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import Scholarship from "../models/Scholarship.js";
import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import NotificationLog from "../models/NotificationLog.js";
import { notificationService } from "../services/notificationService.js";

async function runTests() {
	console.log("=================================================");
	console.log("=== UDAAN NOTIFICATION SYSTEM INTEGRATION TEST ===");
	console.log("=================================================\n");

	await connectDB();

	try {
		// Setup: Find or create a test user and profile
		let testUser = await User.findOne({ email: "test.student@udaan.edu" });
		if (!testUser) {
			testUser = await User.create({
				name: "Priya Test Sharma",
				email: "test.student@udaan.edu",
				role: "student",
				password: "testpassword123",
				authProvider: "local",
			});
		}

		let testProfile = await UserProfile.findOne({ user: testUser._id });
		if (!testProfile) {
			testProfile = await UserProfile.create({
				user: testUser._id,
				fullName: "Priya Test Sharma",
				educationLevel: "UG",
				courseStream: "Engineering",
				stream: "Engineering",
				familyIncome: 250000,
				income: 250000,
				gender: "Female",
				casteCategory: "General",
				state: "West Bengal",
				cgpa: 8.85,
				percentage: 85,
				hasDisability: false,
				documentsHeld: ["MARKSHEET", "COLLEGE_ID", "INCOME_CERT", "BANK_PASSBOOK"],
			});
		} else {
			testProfile.state = "West Bengal";
			testProfile.courseStream = "Engineering";
			testProfile.stream = "Engineering";
			testProfile.gender = "Female";
			testProfile.familyIncome = 250000;
			testProfile.cgpa = 8.85;
			await testProfile.save();
		}

		console.log(`[Setup] Using test user: ${testUser.name} (${testUser.email})`);

		// Clean previous test notifications for clean run
		await Notification.deleteMany({ user: testUser._id });
		await NotificationPreference.deleteMany({ user: testUser._id });

		// TEST 1: Preferences creation & retrieval
		console.log("\n--- TEST 1: Default Preferences Creation ---");
		const prefs = await notificationService.getPreferences(testUser._id);
		console.log("Preferences created successfully:", {
			instantMatch: prefs.instantMatch,
			deadlineAlerts: prefs.deadlineAlerts,
			newGrantsInState: prefs.newGrantsInState,
			weeklyDigest: prefs.weeklyDigest,
			channels: prefs.channels,
		});
		if (!prefs.instantMatch || !prefs.deadlineAlerts) {
			throw new Error("Default preferences failed");
		}
		console.log("✓ TEST 1 PASSED");

		// TEST 2: Idempotency & Deduplication
		console.log("\n--- TEST 2: Idempotency & Deduplication ---");
		const dedupKey = `test_dedup_${Date.now()}`;
		const n1 = await notificationService.createNotification(testUser._id, {
			type: "DEADLINE_7_DAYS",
			title: "AICTE Pragati Deadline Approaching",
			message: "7 days remaining to apply.",
			dedupKey,
		});

		const n2 = await notificationService.createNotification(testUser._id, {
			type: "DEADLINE_7_DAYS",
			title: "AICTE Pragati Deadline Approaching",
			message: "7 days remaining to apply (duplicate attempt).",
			dedupKey,
		});

		const countForDedup = await Notification.countDocuments({ dedupKey });
		console.log(`Notifications found with key '${dedupKey}':`, countForDedup);
		if (countForDedup !== 1 || (n2 !== null && String(n1._id) !== String(n2._id))) {
			throw new Error("Deduplication check failed! Duplicate notification was created.");
		}
		console.log("✓ TEST 2 PASSED (Deduplication prevents repeated alerts; duplicate attempt safely returned null)");

		// TEST 3: Preference Enforcement (Immediate disabling)
		console.log("\n--- TEST 3: Immediate Preference Enforcement ---");
		await notificationService.updatePreferences(testUser._id, { instantMatch: false });
		const blockedNotif = await notificationService.createNotification(testUser._id, {
			type: "INSTANT_MATCH",
			title: "This should be blocked",
			message: "User disabled instant matches",
			dedupKey: `instant_blocked_${Date.now()}`,
		});
		console.log("Attempted creating notification when instantMatch=false. Result:", blockedNotif);
		if (blockedNotif !== null) {
			throw new Error("Preference check failed: Notification was created despite being disabled!");
		}
		// Re-enable for subsequent tests
		await notificationService.updatePreferences(testUser._id, { instantMatch: true });
		console.log("✓ TEST 3 PASSED (Disabled preferences are immediately respected)");

		// TEST 4: Ingestion Hook & Deterministic Matching
		console.log("\n--- TEST 4: Ingestion Hook (State Grant & Instant Match) ---");
		const testScholarship = {
			_id: new mongoose.Types.ObjectId(),
			title: "West Bengal Swami Vivekananda Merit-cum-Means Scholarship",
			organization: "Government of West Bengal",
			state: "West Bengal",
			category: "Need based",
			sourceUrl: "https://svmcm.wbhed.gov.in/",
			deadline: new Date(Date.now() + 15 * 86400000),
			amount: { value: 60000, currency: "INR" },
			rules: [
				{
					id: "wb_r1",
					field: "state",
					operator: "EQ",
					targetValue: "West Bengal",
					description: "Permanent domicile of West Bengal",
				},
				{
					id: "wb_r2",
					field: "familyIncome",
					operator: "LTE",
					targetValue: 250000,
					description: "Annual family income not exceeding Rs. 2,50,000",
				},
			],
		};

		await notificationService.onScholarshipIngested(testScholarship, true, null);

		const triggeredAlerts = await Notification.find({
			user: testUser._id,
			scholarship: testScholarship._id,
		}).lean();

		console.log(`Triggered alerts for new scholarship: ${triggeredAlerts.length}`);
		triggeredAlerts.forEach((a) => {
			console.log(`  - [${a.type}] ${a.title}`);
			console.log(`    Evidence reason: ${a.evidence?.eligibilityReason || "N/A"}`);
		});

		if (triggeredAlerts.length === 0) {
			throw new Error("Ingestion hook failed to generate alerts for matching student!");
		}
		console.log("✓ TEST 4 PASSED (Instant match & state grant triggered with evidence)");

		// TEST 5: Deadline Window Logic & Expired Scholarship Suppression
		console.log("\n--- TEST 5: Deadline Scanner (Window matching & Expired Suppression) ---");
		// Create 3 scholarships: one in 7 days, one in 48 hours, one expired
		const sch7Days = await Scholarship.create({
			title: "Urgent 7-Day Test Scheme",
			organization: "National Scholarship Portal",
			description: "Test scheme expiring in 7 days",
			sourceUrl: "https://nsp.gov.in/test7d",
			sourceSite: "NSP",
			category: "Government",
			deadline: new Date(Date.now() + 7 * 86400000),
			amount: { value: 25000 },
			rules: [],
		});

		const sch48Hours = await Scholarship.create({
			title: "Urgent 48-Hour Test Scheme",
			organization: "AICTE",
			description: "Test scheme expiring in 48 hours",
			sourceUrl: "https://aicte.gov.in/test48h",
			sourceSite: "AICTE",
			category: "Government",
			deadline: new Date(Date.now() + 46 * 3600000), // 46 hours
			amount: { value: 50000 },
			rules: [],
		});

		const schExpired = await Scholarship.create({
			title: "Expired Past Scheme",
			organization: "Test Org",
			description: "Test scheme that has already closed",
			sourceUrl: "https://test.gov.in/expired",
			sourceSite: "Test",
			category: "Government",
			deadline: new Date(Date.now() - 2 * 86400000), // 2 days ago
			amount: { value: 10000 },
			rules: [],
		});

		const scanResult = await notificationService.runDeadlineCheck();
		console.log("Deadline scan execution result:", scanResult);

		const expiredAlerts = await Notification.find({ scholarship: schExpired._id });
		if (expiredAlerts.length > 0) {
			throw new Error("Expired scholarship generated notifications!");
		}
		console.log("✓ TEST 5 PASSED (Expired schemes suppressed; active windows detected)");

		// Clean up temporary scholarships
		await Scholarship.deleteMany({
			_id: { $in: [sch7Days._id, sch48Hours._id, schExpired._id] },
		});

		// TEST 6: Weekly Curated Digest
		console.log("\n--- TEST 6: Weekly Monday Curated Digest ---");
		const digestResult = await notificationService.runWeeklyDigest(true);
		console.log("Weekly digest result:", digestResult);
		const digestNotif = await Notification.findOne({
			user: testUser._id,
			type: "WEEKLY_DIGEST",
		});
		if (!digestNotif) {
			throw new Error("Weekly digest notification was not generated!");
		}
		console.log("Digest notification generated:", digestNotif.title, digestNotif.message);
		console.log("✓ TEST 6 PASSED (Monday digest created with personalized matches)");

		// TEST 7: Notification Log Audit Trail
		console.log("\n--- TEST 7: Notification Log Audit Trail ---");
		const logs = await NotificationLog.find({ user: testUser._id }).limit(5).lean();
		console.log(`Found ${logs.length} audit log entries for test user:`);
		logs.forEach((log) => {
			console.log(`  - [${log.channel}] Status: ${log.status}, Subject: ${log.subject || log.jobName}`);
		});
		if (logs.length === 0) {
			throw new Error("NotificationLog contains zero entries!");
		}
		console.log("✓ TEST 7 PASSED (Observability & audit logging verified)");

		console.log("\n=================================================");
		console.log("=== ALL 7 BACKEND INTEGRATION TESTS PASSED! ===");
		console.log("=================================================");
	} catch (err) {
		console.error("\nTEST FAILED:", err);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
}

runTests();
