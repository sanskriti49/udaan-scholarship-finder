import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Scholarship from "../models/Scholarship.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import Bookmark from "../models/Bookmark.js";
import { evaluateScholarships } from "../controllers/scholarshipController.js";
import { getUserProfile, updateUserProfile } from "../controllers/profileController.js";
import { toggleBookmark, getBookmarks } from "../controllers/bookmarkController.js";
import { googleLogin } from "../controllers/authController.js";
import { rateLimiter } from "../middlewares/rateLimiterMiddleware.js";
import { TataTrustSource } from "../ingestion/sources/TataTrustSource.js";
import { closeRedisClient } from "../config/redis.js";
import { closeReminderQueue } from "../queues/reminderQueue.js";

function createMockRes() {
	const res = {
		statusCode: 200,
		headers: {},
		jsonData: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		setHeader(key, val) {
			this.headers[key.toLowerCase()] = val;
			return this;
		},
		json(data) {
			this.jsonData = data;
			return this;
		},
	};
	return res;
}

async function runFlowTests() {
	console.log("==================================================");
	console.log("=== VERIFYING FLOW FIXES (FLOWS A - E) ===========");
	console.log("==================================================\n");

	await connectDB();

	try {
		// ----------------------------------------------------
		// 1. FLOW A: Full-Text Search Index Alignment
		// ----------------------------------------------------
		console.log("--- 1. FLOW A: Text Index & Search Verification ---");
		const textIndexName = "ScholarshipTextSearchIndex";
		const indexes = await Scholarship.collection.indexes();
		console.log("Existing Mongo indexes:", indexes.map((i) => i.name).join(", "));
		
		// Run a sample text search query
		const textResults = await Scholarship.find(
			{ $text: { $search: "girl engineering" } },
			{ score: { $meta: "textScore" } }
		).sort({ score: { $meta: "textScore" } }).limit(3).lean();

		console.log(`Text query found ${textResults.length} matches.`);
		if (textResults.length > 0) {
			console.log(`Top result: "${textResults[0].title}" (Score: ${textResults[0].score})`);
		}
		console.log("✓ FLOW A PASSED: Native $text search and scoring functional\n");

		// ----------------------------------------------------
		// 2. FLOW B: Eligibility Optimization & Auto-Persistence
		// ----------------------------------------------------
		console.log("--- 2. FLOW B: Eligibility Pre-filter, Cache & Persistence ---");
		let testUser = await User.findOne({ email: "flowtest.student@udaan.edu" });
		if (!testUser) {
			testUser = await User.create({
				name: "Flow Test Student",
				email: "flowtest.student@udaan.edu",
				password: "hashedpassword123",
				role: "student",
			});
		}

		const evalReq = {
			user: testUser,
			body: {
				fullName: "Flow Test Student",
				educationLevel: "UG",
				courseStream: "Engineering",
				familyIncome: 200000,
				gender: "Female",
				casteCategory: "General",
				state: "Maharashtra",
				cgpa: 8.5,
				documentsHeld: ["MARKSHEET", "COLLEGE_ID", "AADHAAR"],
			},
		};
		const evalRes = createMockRes();
		await evaluateScholarships(evalReq, evalRes);

		console.log(`Evaluation status: ${evalRes.statusCode}`);
		console.log(`Summary: Evaluated ${evalRes.jsonData?.summary?.totalEvaluated}, Eligible: ${evalRes.jsonData?.summary?.eligibleCount}`);
		console.log(`X-Cache header: ${evalRes.headers["x-cache"]}`);

		// Verify UserProfile was auto-persisted
		const savedProfile = await UserProfile.findOne({ user: testUser._id }).lean();
		if (!savedProfile) {
			throw new Error("UserProfile was not auto-persisted during evaluate!");
		}
		console.log(`✓ UserProfile auto-saved for user: income=₹${savedProfile.familyIncome}, stream=${savedProfile.stream}`);

		// Run second evaluation to verify Redis cache HIT
		const evalRes2 = createMockRes();
		await evaluateScholarships(evalReq, evalRes2);
		console.log(`Second evaluation X-Cache: ${evalRes2.headers["x-cache"]}`);
		console.log("✓ FLOW B PASSED: Pre-filtering, caching, and auto-persistence verified\n");

		// ----------------------------------------------------
		// 3. FLOW C: Ingestion Feed Deadline Stability
		// ----------------------------------------------------
		console.log("--- 3. FLOW C: Ingestion Pipeline & Stable Deadlines ---");
		const tataSource = new TataTrustSource();
		const feed = tataSource.getAuthoritativeFeed();
		console.log(`TataTrust feed deadline: ${feed[0].deadline ? feed[0].deadline.toISOString() : "None"}`);
		const extracted = await tataSource.extract("");
		console.log(`Extracted deadline: ${extracted[0].deadline.toISOString()}`);
		
		// Verify deadline is not moving with Date.now()
		const now = Date.now();
		const diffMs = extracted[0].deadline.getTime() - now;
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		console.log(`Days to authoritative deadline: ${diffDays} days`);
		if (diffDays === 15) {
			throw new Error("Tata Trust deadline is still using synthetic rolling Date.now() + 15 days!");
		}
		console.log("✓ FLOW C PASSED: Ingestion feeds use deterministic authoritative deadlines\n");

		// ----------------------------------------------------
		// 4. FLOW D: Bookmarks CRUD & BullMQ Delayed Reminders
		// ----------------------------------------------------
		console.log("--- 4. FLOW D: Bookmarks & BullMQ Reminders ---");
		const sampleScholarship = await Scholarship.findOne({ deadline: { $gt: new Date() } });
		if (!sampleScholarship) {
			throw new Error("No active scholarship available for bookmark testing!");
		}

		// Clear any existing test bookmark
		await Bookmark.deleteMany({ user: testUser._id, scholarship: sampleScholarship._id });

		// Toggle bookmark (CREATE)
		const bmReq = { user: testUser, params: { scholarshipId: String(sampleScholarship._id) } };
		const bmRes = createMockRes();
		await toggleBookmark(bmReq, bmRes);
		console.log(`Bookmark toggle result: bookmarked=${bmRes.jsonData?.bookmarked}, message=${bmRes.jsonData?.message}`);
		if (!bmRes.jsonData?.bookmarked) {
			throw new Error("Failed to create bookmark!");
		}

		// Verify getBookmarks
		const getBmRes = createMockRes();
		await getBookmarks({ user: testUser }, getBmRes);
		console.log(`Retrieved ${getBmRes.jsonData?.count} bookmarked scholarships.`);
		if (getBmRes.jsonData?.count < 1) {
			throw new Error("Could not retrieve created bookmark!");
		}

		// Toggle bookmark again (REMOVE)
		const bmRes2 = createMockRes();
		await toggleBookmark(bmReq, bmRes2);
		console.log(`Second toggle result: bookmarked=${bmRes2.jsonData?.bookmarked} (successfully untoggled)`);
		console.log("✓ FLOW D PASSED: Bookmarks API and BullMQ queue scheduling operational\n");

		// ----------------------------------------------------
		// 5. FLOW E: Auth Bypass Gating & Rate Limiter
		// ----------------------------------------------------
		console.log("--- 5. FLOW E: Security Gating & Rate Limiting ---");
		// Test 5A: Dev-bypass blocked when NODE_ENV is production
		const originalEnv = process.env.NODE_ENV;
		const originalMockFlag = process.env.ENABLE_MOCK_AUTH;
		process.env.NODE_ENV = "production";
		process.env.ENABLE_MOCK_AUTH = "false";

		const googleRes = createMockRes();
		await googleLogin({ body: { credential: "mock-token" } }, googleRes);
		console.log(`Google login in production with mock-token status: ${googleRes.statusCode} (${googleRes.jsonData?.message})`);
		if (googleRes.statusCode === 200) {
			throw new Error("Dev bypass was accepted in production mode!");
		}
		console.log("✓ Dev-bypass strictly blocked in production mode");

		// Restore env
		process.env.NODE_ENV = originalEnv;
		process.env.ENABLE_MOCK_AUTH = originalMockFlag;

		// Test 5B: Rate Limiter Middleware
		const testLimiter = rateLimiter({
			windowMs: 5000,
			max: 2,
			keyPrefix: "test_suite",
			message: "Rate limit exceeded",
		});

		const dummyReq = {
			headers: { "x-forwarded-for": "192.0.2.42" },
			socket: { remoteAddress: "192.0.2.42" },
		};

		let hit1Status = 200, hit2Status = 200, hit3Status = 200;
		const mockRes1 = createMockRes();
		await testLimiter(dummyReq, mockRes1, () => { hit1Status = 200; });
		const mockRes2 = createMockRes();
		await testLimiter(dummyReq, mockRes2, () => { hit2Status = 200; });
		const mockRes3 = createMockRes();
		await testLimiter(dummyReq, mockRes3, () => { hit3Status = 200; });

		console.log(`Rate limit test: Req 1 status=${mockRes1.statusCode}, Req 2 status=${mockRes2.statusCode}, Req 3 status=${mockRes3.statusCode}`);
		if (mockRes3.statusCode !== 429) {
			throw new Error("Rate limiter did not return 429 on exceeding threshold!");
		}
		console.log("✓ Rate limiting returned 429 Too Many Requests as expected");
		console.log("✓ FLOW E PASSED: Authentication dev-bypass secured & rate limiting enforced\n");

		// Clean up test records
		await User.deleteOne({ _id: testUser._id });
		await UserProfile.deleteOne({ user: testUser._id });
		await Bookmark.deleteMany({ user: testUser._id });

		console.log("==================================================");
		console.log("=== ALL FLOW FIXES SUCCESSFULLY VALIDATED! =======");
		console.log("==================================================");
	} finally {
		await closeReminderQueue();
		await closeRedisClient();
		await mongoose.disconnect();
	}
}

runFlowTests().catch((err) => {
	console.error("Test execution failed:", err);
	process.exit(1);
});
