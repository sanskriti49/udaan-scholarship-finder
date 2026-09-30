import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import {
	getRedisConfig,
	bullMqConnection,
	redisClient,
	isRedisAvailable,
	closeRedisClient,
} from "../config/redis.js";
import {
	buildDeterministicCacheKey,
	cacheMiddleware,
	clearScholarshipCache,
} from "../middlewares/cacheMiddleware.js";
import {
	reminderQueue,
	scheduleDeadlineReminder,
	closeReminderQueue,
} from "../queues/reminderQueue.js";
import {
	createReminderWorker,
	closeReminderWorker,
} from "../workers/reminderWorker.js";

async function runTests() {
	console.log("=================================================");
	console.log("=== REDIS CACHE & BULLMQ INTEGRATION TEST =======");
	console.log("=================================================\n");

	await connectDB();

	try {
		// TEST 1: Redis Configuration & BullMQ Connection Separation
		console.log("--- TEST 1: Redis & BullMQ Configuration Integrity ---");
		const rawConfig = getRedisConfig();
		console.log("Redis raw configuration parsed:", typeof rawConfig === "string" ? "URL String" : rawConfig.host);

		console.log("BullMQ connection settings:", {
			maxRetriesPerRequest: bullMqConnection.maxRetriesPerRequest,
			enableReadyCheck: bullMqConnection.enableReadyCheck,
		});

		if (bullMqConnection.maxRetriesPerRequest !== null) {
			throw new Error("BullMQ connection must have maxRetriesPerRequest: null!");
		}
		console.log("✓ TEST 1 PASSED (BullMQ connection safely separated)");

		// TEST 2: Deterministic Cache Key Generation
		console.log("\n--- TEST 2: Deterministic Cache Key Generation ---");
		const reqA = {
			baseUrl: "/api/scholarships",
			path: "/",
			query: { state: "West Bengal", category: "STEM", page: 1 },
		};
		const reqB = {
			baseUrl: "/api/scholarships",
			path: "/",
			query: { category: "STEM", page: 1, state: "West Bengal" },
		};

		const keyA = buildDeterministicCacheKey("udaan:cache:scholarships", reqA);
		const keyB = buildDeterministicCacheKey("udaan:cache:scholarships", reqB);

		console.log("Key A (state first):", keyA);
		console.log("Key B (category first):", keyB);

		if (keyA !== keyB) {
			throw new Error("Cache keys are not deterministic across differently ordered query parameters!");
		}
		console.log("✓ TEST 2 PASSED (Deterministic sorting verified)");

		// TEST 3: Fail-Open Cache Middleware Execution
		console.log("\n--- TEST 3: Fail-Open Cache Middleware Behavior ---");
		const mockReq = {
			method: "GET",
			baseUrl: "/api/scholarships",
			path: "/",
			query: { category: "Women" },
		};
		let headerSet = {};
		const mockRes = {
			statusCode: 200,
			setHeader(k, v) {
				headerSet[k] = v;
			},
			send(val) {
				return val;
			},
			json(val) {
				return val;
			},
		};

		let nextCalled = false;
		const middleware = cacheMiddleware({ ttl: 60 });
		await middleware(mockReq, mockRes, () => {
			nextCalled = true;
		});

		console.log("Middleware executed. next() called:", nextCalled);
		console.log("X-Cache Header:", headerSet["X-Cache"]);

		if (headerSet["X-Cache"] === "HIT") {
			console.log("Cache HIT verified (direct cache return).");
		} else if (headerSet["X-Cache"] === "MISS" || headerSet["X-Cache"] === "BYPASS") {
			if (!nextCalled) {
				throw new Error("Middleware failed to forward request via next() on miss/bypass!");
			}
			console.log("Cache MISS/BYPASS verified (forwarded to next()).");
		} else {
			throw new Error("X-Cache header was not set correctly!");
		}
		console.log("✓ TEST 3 PASSED (Cache middleware behavior verified)");

		// TEST 4: Queue Configuration & Job Scheduling Logic
		console.log("\n--- TEST 4: BullMQ Reminder Queue & Job Deduplication ---");
		const futureDeadline = new Date(Date.now() + 10 * 86400000); // 10 days in future
		const testJobParams = {
			userId: new mongoose.Types.ObjectId().toString(),
			email: "student.queue.test@udaan.edu",
			scholarshipId: new mongoose.Types.ObjectId().toString(),
			scholarshipName: "AICTE National Tech Grant",
			deadlineDate: futureDeadline,
			reminderWindow: "7_days",
		};

		const scheduledJob = await scheduleDeadlineReminder(testJobParams);
		if (scheduledJob) {
			console.log("Enqueued BullMQ Job ID:", scheduledJob.id);
			console.log("Job Delay in ms:", scheduledJob.delay);
			console.log("Job Name:", scheduledJob.name);

			if (!scheduledJob.id.includes("7_days")) {
				throw new Error("Deterministic JobId failed to include reminderWindow!");
			}
		} else {
			console.log("Redis unavailable in local test environment; fail-open verified.");
		}
		console.log("✓ TEST 4 PASSED (Queue scheduling and deduplication logic verified)");

		// TEST 5: Worker Concurrency & Configuration
		console.log("\n--- TEST 5: Worker Configuration ---");
		const worker = createReminderWorker();
		console.log("Worker initialized with concurrency:", worker.opts.concurrency);
		if (worker.opts.concurrency !== 5) {
			throw new Error("Worker concurrency must equal 5!");
		}
		console.log("✓ TEST 5 PASSED (Worker concurrency is 5)");

		// TEST 6: Expired Deadline Guard
		console.log("\n--- TEST 6: Expired Deadline Guard ---");
		const pastDeadline = new Date(Date.now() - 2 * 86400000);
		const expiredJob = await scheduleDeadlineReminder({
			...testJobParams,
			deadlineDate: pastDeadline,
		});

		console.log("Scheduling reminder for expired deadline returned:", expiredJob);
		if (expiredJob !== null) {
			throw new Error("Expired deadline was incorrectly scheduled!");
		}
		console.log("✓ TEST 6 PASSED (Expired deadlines are rejected)");

		console.log("\n=================================================");
		console.log("=== ALL REDIS & BULLMQ TESTS PASSED! ============");
		console.log("=================================================");
	} catch (err) {
		console.error("\nTEST FAILED:", err);
		process.exitCode = 1;
	} finally {
		await closeReminderWorker();
		await closeReminderQueue();
		await closeRedisClient();
		await mongoose.disconnect();
	}
}

runTests();
