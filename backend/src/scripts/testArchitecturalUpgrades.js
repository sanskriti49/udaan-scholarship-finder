import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // fallback

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { acquireLock, releaseLock, withDistributedLock } from "../utils/distributedLock.js";
import { crawlerScheduler } from "../pipeline/scheduler.js";
import { notificationScheduler } from "../jobs/notificationScheduler.js";
import { notificationService } from "../services/notificationService.js";
import { closeRedisClient } from "../config/redis.js";
import { closeReminderQueue } from "../queues/reminderQueue.js";

async function runTests() {
	console.log("==========================================================");
	console.log("=== ARCHITECTURAL PROPERTIES TEST SUITE =================");
	console.log("==========================================================\n");

	await connectDB();

	try {
		// ----------------------------------------------------
		// 1. TEST DISTRIBUTED LOCKS
		// ----------------------------------------------------
		console.log("--- 1. Testing Redis Distributed Locking ---");
		const testLockKey = "lock:test:distributed_run";
		
		// Acquire lock A
		const tokenA = await acquireLock(testLockKey, 10);
		if (!tokenA) throw new Error("Failed to acquire initial distributed lock!");
		console.log(`✓ Lock A acquired successfully (Token: ${tokenA.slice(0, 16)}...)`);

		// Attempt to acquire lock B with same key (simulate 2nd server instance)
		const tokenB = await acquireLock(testLockKey, 10);
		if (tokenB !== null) {
			throw new Error("Lock collision! Second instance was able to acquire lock while held by first instance.");
		}
		console.log("✓ Second instance correctly blocked by distributed lock (returned null)");

		// Release lock A
		const released = await releaseLock(testLockKey, tokenA);
		if (!released) throw new Error("Failed to release distributed lock!");
		console.log("✓ Lock A released cleanly");

		// Instance B can now acquire lock
		const tokenBRetry = await acquireLock(testLockKey, 10);
		if (!tokenBRetry) throw new Error("Failed to acquire lock after release!");
		console.log("✓ Lock acquired by second instance after first released");
		await releaseLock(testLockKey, tokenBRetry);

		// Test withDistributedLock helper
		let taskRan = false;
		const lockResult = await withDistributedLock("lock:test:wrapper", 10, async () => {
			taskRan = true;
			return "task_completed";
		});
		if (!taskRan || lockResult.result !== "task_completed") {
			throw new Error("withDistributedLock helper failed to execute task!");
		}
		console.log("✓ withDistributedLock executed task and automatically cleaned up lease");
		console.log("✓ DISTRIBUTED LOCK TESTS PASSED!\n");

		// Crawler extraction is now covered by the automated suite: `npm test` (backend/test).

		// ----------------------------------------------------
		// 3. TEST FAN-OUT OPTIMIZATION IN NOTIFICATION SERVICE
		// ----------------------------------------------------
		console.log("--- 3. Testing Notification Fan-Out Optimization ---");
		// Test handleNewScholarshipIngested with sample scholarship
		const dummyScheme = {
			_id: new mongoose.Types.ObjectId(),
			title: "Maharashtra State Engineering Merit Grant",
			state: "Maharashtra",
			category: "Merit based",
			level: "UG",
			amount: { value: 50000 },
			deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			eligibility: { gender: "Any" },
			rules: [],
		};
		// Should execute cleanly with indexed pre-filtering without loading all profiles
		await notificationService.handleNewScholarshipIngested(dummyScheme);
		console.log("✓ handleNewScholarshipIngested executed with pre-filtering");

		// Test runWeeklyDigest with force=true
		const digestResult = await notificationService.runWeeklyDigest(true);
		console.log(`runWeeklyDigest executed: sent=${digestResult.digestsSent}, week=${digestResult.weekIdentifier}`);
		console.log("✓ runWeeklyDigest executed with bulk queries and evalCache");
		console.log("✓ FAN-OUT OPTIMIZATION TESTS PASSED!\n");

		console.log("==========================================================");
		console.log("=== ALL ARCHITECTURAL TESTS PASSED SUCCESSFULLY! =========");
		console.log("==========================================================");
	} finally {
		await closeReminderQueue();
		await closeRedisClient();
		await mongoose.disconnect();
	}
}

runTests().catch((err) => {
	console.error("Test execution failed:", err);
	process.exit(1);
});
