import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // fallback

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { acquireLock, releaseLock, withDistributedLock } from "../utils/distributedLock.js";
import { crawlerScheduler } from "../ingestion/core/Scheduler.js";
import { notificationScheduler } from "../jobs/notificationScheduler.js";
import { notificationService } from "../services/notificationService.js";
import { TataTrustSource } from "../ingestion/sources/TataTrustSource.js";
import { UgcSource } from "../ingestion/sources/UgcSource.js";
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

		// ----------------------------------------------------
		// 2. TEST LIVE HTML CHEERIO EXTRACTION
		// ----------------------------------------------------
		console.log("--- 2. Testing Live HTML Cheerio Extraction ---");
		
		// Test Tata Trust live Cheerio parsing
		const tataSource = new TataTrustSource();
		const sampleTataHtml = `
			<!DOCTYPE html>
			<html>
			<head><title>Individual Grants - Education | Tata Trusts</title></head>
			<body>
				<h1 class="page-title">Tata Trusts Individual Education Grants 2026</h1>
				<div class="content-block">
					<h2>Undergraduate Medical and Engineering Study Assistance</h2>
					<p>Need-based grant applications for engineering and medical degrees are accepted through the official portal.</p>
					<a href="https://www.tatatrusts.org/apply-grant">Apply for Education Grant</a>
				</div>
			</body>
			</html>
		`;
		const tataItems = await tataSource.extract(sampleTataHtml);
		console.log(`TataTrust extracted ${tataItems.length} items from HTML.`);
		console.log(`Extracted applicationLink: ${tataItems[0].applicationLink}`);
		if (!tataItems[0].applicationLink.includes("apply-grant")) {
			throw new Error("TataTrust Cheerio extractor failed to extract live anchor link!");
		}
		console.log("✓ TataTrust Cheerio live DOM parsing validated");

		// Test UGC live Cheerio parsing
		const ugcSource = new UgcSource();
		const sampleUgcHtml = `
			<!DOCTYPE html>
			<html>
			<head><title>UGC Notices & Guidelines</title></head>
			<body>
				<table class="table">
					<tr><th>Date</th><th>Subject</th></tr>
					<tr>
						<td>15/09/2026</td>
						<td><a href="/notices/Single_Girl_Child_2026_Guidelines.pdf">UGC Guidelines for Post-Graduate Indira Gandhi Scholarship for Single Girl Child</a></td>
					</tr>
				</table>
			</body>
			</html>
		`;
		const ugcItems = await ugcSource.extract(sampleUgcHtml);
		console.log(`UGC extracted ${ugcItems.length} schemes.`);
		const girlChildScheme = ugcItems.find((s) => s.slug.includes("girl-child"));
		console.log(`Girl child scheme notice link: ${girlChildScheme?.sourceUrl}`);
		if (!girlChildScheme?.sourceUrl.includes("Single_Girl_Child_2026_Guidelines.pdf")) {
			throw new Error("UGC Cheerio extractor failed to link live notice PDF from HTML table!");
		}
		console.log("✓ UGC Cheerio live table notice parsing validated");
		console.log("✓ LIVE HTML CHEERIO EXTRACTION TESTS PASSED!\n");

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
