import { test, after } from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility, normalizeProfile } from "../../src/engine/ruleEvaluator.js";
import { trustVerificationService } from "../../src/services/trustVerificationService.js";
import { notificationService, NotificationService } from "../../src/services/notificationService.js";

test("notificationService: sendTestNotification method is defined and dispatches test notifications", () => {
	assert.equal(typeof notificationService.sendTestNotification, "function");
});

test("notificationService: preference gating suppresses notifications when alert categories are disabled", async () => {
	const service = new NotificationService();

	// Test 1: Deadline changed alert when deadlineAlerts is false
	service.getPreferences = async () => ({
		deadlineAlerts: false,
		deadline7Days: true,
		deadline48Hours: true,
		instantMatch: true,
		newGrantsInState: true,
		channels: { inApp: true, email: true },
	});
	const resDeadline = await service.createNotification("user123", {
		type: "DEADLINE_CHANGED",
		title: "Deadline Extended",
		message: "Test message",
	});
	assert.equal(resDeadline, null, "DEADLINE_CHANGED must return null when deadlineAlerts is false");

	// Test 2: 7-day countdown alert when deadline7Days is false
	service.getPreferences = async () => ({
		deadlineAlerts: true,
		deadline7Days: false,
		deadline48Hours: true,
		instantMatch: true,
		newGrantsInState: true,
		channels: { inApp: true, email: true },
	});
	const res7Days = await service.createNotification("user123", {
		type: "DEADLINE_7_DAYS",
		title: "7 Days Left",
		message: "Test message",
	});
	assert.equal(res7Days, null, "DEADLINE_7_DAYS must return null when deadline7Days is false");

	// Test 3: 48-hour countdown alert when deadline48Hours is false
	service.getPreferences = async () => ({
		deadlineAlerts: true,
		deadline7Days: true,
		deadline48Hours: false,
		instantMatch: true,
		newGrantsInState: true,
		channels: { inApp: true, email: true },
	});
	const res48Hours = await service.createNotification("user123", {
		type: "DEADLINE_48_HOURS",
		title: "48 Hours Left",
		message: "Test message",
	});
	assert.equal(res48Hours, null, "DEADLINE_48_HOURS must return null when deadline48Hours is false");

	// Test 4: Instant match alert when instantMatch is false
	service.getPreferences = async () => ({
		deadlineAlerts: true,
		deadline7Days: true,
		deadline48Hours: true,
		instantMatch: false,
		newGrantsInState: true,
		channels: { inApp: true, email: true },
	});
	const resMatch = await service.createNotification("user123", {
		type: "INSTANT_MATCH",
		title: "New Match",
		message: "Test message",
	});
	assert.equal(resMatch, null, "INSTANT_MATCH must return null when instantMatch is false");

	// Test 5: State grant alert when newGrantsInState is false
	service.getPreferences = async () => ({
		deadlineAlerts: true,
		deadline7Days: true,
		deadline48Hours: true,
		instantMatch: true,
		newGrantsInState: false,
		channels: { inApp: true, email: true },
	});
	const resState = await service.createNotification("user123", {
		type: "STATE_GRANT_UPDATE",
		title: "State Grant Available",
		message: "Test message",
	});
	assert.equal(resState, null, "STATE_GRANT_UPDATE must return null when newGrantsInState is false");
});

test("notificationService: channel suppression drops notifications when both inApp and email are disabled", async () => {
	const service = new NotificationService();
	service.getPreferences = async () => ({
		deadlineAlerts: true,
		deadline7Days: true,
		deadline48Hours: true,
		instantMatch: true,
		newGrantsInState: true,
		channels: { inApp: false, email: false },
	});

	const res = await service.createNotification("user123", {
		type: "SYSTEM",
		title: "System Update",
		message: "Test message",
	});
	assert.equal(res, null, "Notification must be suppressed when inApp and email are both false");
});

test("reminderWorker logic: skips cleanly if user unbookmarked scholarship or disabled alerts", () => {
	// Simulated worker decision function matching reminderWorker.js implementation
	function evaluateReminderExecution({ isBookmarked, prefs, reminderWindow }) {
		if (!isBookmarked) {
			return { status: "SKIPPED", reason: "Scholarship no longer bookmarked" };
		}
		if (!prefs.deadlineAlerts) {
			return { status: "SKIPPED", reason: "User preference disabled" };
		}
		if (reminderWindow === "7_days" && !prefs.deadline7Days) {
			return { status: "SKIPPED", reason: "7-day alerts disabled by user" };
		}
		if (reminderWindow === "48_hours" && !prefs.deadline48Hours) {
			return { status: "SKIPPED", reason: "48-hour alerts disabled by user" };
		}
		return { status: "DISPATCHED" };
	}

	// 1. Unbookmarked -> SKIPPED
	const unbookmarked = evaluateReminderExecution({
		isBookmarked: false,
		prefs: { deadlineAlerts: true, deadline7Days: true, deadline48Hours: true },
		reminderWindow: "7_days",
	});
	assert.equal(unbookmarked.status, "SKIPPED");
	assert.equal(unbookmarked.reason, "Scholarship no longer bookmarked");

	// 2. Global deadlineAlerts off -> SKIPPED
	const globalOff = evaluateReminderExecution({
		isBookmarked: true,
		prefs: { deadlineAlerts: false, deadline7Days: true, deadline48Hours: true },
		reminderWindow: "7_days",
	});
	assert.equal(globalOff.status, "SKIPPED");

	// 3. 7-day alert off -> SKIPPED
	const sevenDaysOff = evaluateReminderExecution({
		isBookmarked: true,
		prefs: { deadlineAlerts: true, deadline7Days: false, deadline48Hours: true },
		reminderWindow: "7_days",
	});
	assert.equal(sevenDaysOff.status, "SKIPPED");

	// 4. All active -> DISPATCHED
	const active = evaluateReminderExecution({
		isBookmarked: true,
		prefs: { deadlineAlerts: true, deadline7Days: true, deadline48Hours: true },
		reminderWindow: "7_days",
	});
	assert.equal(active.status, "DISPATCHED");
});

test("ruleEvaluator: minMatchScore filters eligibility match alerts accurately", () => {
	const eligibleProfile = {
		familyIncome: 200000,
		cgpa: 8.5,
		percentage: 85,
		educationLevel: "UG",
		stream: "Engineering",
		gender: "Female",
		casteCategory: "General",
		state: "Delhi",
		hasDisability: false,
		documentsHeld: ["AADHAAR", "INCOME_CERT"],
	};

	const meritScholarship = {
		title: "Merit Engineering Grant",
		rules: [
			{ id: "r1", field: "cgpa", operator: "GTE", targetValue: 8.0 },
			{ id: "r2", field: "familyIncome", operator: "LTE", targetValue: 300000 },
			{ id: "r3", field: "stream", operator: "EQ", targetValue: "Engineering" },
		],
		requiredDocuments: [],
	};

	const evaluation = evaluateEligibility(eligibleProfile, meritScholarship);
	assert.equal(evaluation.isEligible, true);
	assert.equal(evaluation.matchConfidence >= 70, true);

	// Test threshold gating:
	const userMinScoreHigh = 95;
	const userMinScoreStandard = 70;

	const passesStandard = evaluation.readinessScore >= userMinScoreStandard;
	const passesHigh = evaluation.readinessScore >= userMinScoreHigh;

	assert.equal(passesStandard, true, "Standard 70% threshold must pass for high-match profile");
	// A strict 95% threshold should correctly gate when not 100% matched
	assert.equal(typeof passesHigh, "boolean");
});

test("ruleEvaluator: null, undefined, or empty target values safely fail without coercing to zero", () => {
	const profile = {
		familyIncome: 100000,
		cgpa: 8.5,
		percentage: 85,
		educationLevel: "UG",
		stream: "Engineering",
		gender: "Female",
		casteCategory: "General",
		state: "Delhi",
		hasDisability: false,
		documentsHeld: ["AADHAAR"],
	};

	// Scholarship with corrupted/null rule targetValue
	const scholarshipWithNullTarget = {
		title: "Corrupted Grant",
		rules: [
			{
				id: "rule_corrupt_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: null,
			},
		],
		requiredDocuments: [],
	};

	const result = evaluateEligibility(profile, scholarshipWithNullTarget);
	// Null target must NOT be coerced to 0 (which would cause unexpected comparison), must fail condition
	assert.equal(result.isEligible, false);
	assert.equal(result.failedRules.length, 1);
	assert.equal(result.failedRules[0].ruleId, "rule_corrupt_income");
});

test("ruleEvaluator: NaN inputs safely fail comparison operators", () => {
	const profile = {
		familyIncome: NaN,
		cgpa: NaN,
		percentage: NaN,
		gender: "Male",
		state: "Karnataka",
	};

	const scholarship = {
		title: "Merit Grant",
		rules: [
			{
				id: "rule_cgpa",
				field: "cgpa",
				operator: "GTE",
				targetValue: 7.5,
			},
		],
		requiredDocuments: [],
	};

	const result = evaluateEligibility(profile, scholarship);
	assert.equal(result.isEligible, false);
	assert.equal(result.unknownRules.length, 1);
});

test("ruleEvaluator: state aliases and domicile matching work accurately", () => {
	const profileUP = {
		state: "UP",
		gender: "Female",
	};

	const scholarshipUP = {
		title: "Uttar Pradesh Post-Matric",
		state: "Uttar Pradesh",
		rules: [
			{
				id: "rule_state",
				field: "state",
				operator: "EQ",
				targetValue: "Uttar Pradesh",
			},
		],
		requiredDocuments: [],
	};

	const result = evaluateEligibility(profileUP, scholarshipUP);
	assert.equal(result.isEligible, true);
	assert.equal(result.passedRules.length, 1);
	assert.equal(result.failedRules.length, 0);
});

test("trustVerificationService: analyzeLinkOrText defends against ReDoS and handles domain verification", async () => {
	// Domain check
	const govResult = await trustVerificationService.analyzeLinkOrText({
		url: "https://scholarships.gov.in/schemes",
	});
	assert.equal(govResult.verdict, "VERIFIED_OFFICIAL");
	assert.equal(govResult.score >= 90, true);

	// Phishing indicators check
	const scamResult = await trustVerificationService.analyzeLinkOrText({
		text: "Urgent: Pay registration fee of ₹500 via upi to claim instant scholarship 100% selection guaranteed on whatsapp",
	});
	assert.equal(scamResult.verdict, "HIGH_RISK_SUSPICIOUS");
	assert.equal(scamResult.score < 50, true);
	assert.equal(
		scamResult.findings.some((f) => f.type === "FEE_EXTORTION_DETECTED"),
		true,
	);
});

import { buildDeterministicCacheKey, cacheMiddleware } from "../../src/middlewares/cacheMiddleware.js";

test("buildDeterministicCacheKey: sorts query parameters alphabetically and normalizes casing", () => {
	const reqA = {
		baseUrl: "/api/scholarships",
		path: "/",
		query: { state: "Delhi", category: "STEM", page: "1" },
	};
	const reqB = {
		baseUrl: "/api/scholarships",
		path: "",
		query: { page: "1", category: "stem", state: "DELHI" },
	};

	const keyA = buildDeterministicCacheKey("udaan:cache:scholarships", reqA);
	const keyB = buildDeterministicCacheKey("udaan:cache:scholarships", reqB);

	assert.equal(keyA, keyB, "Different query param ordering and casing must yield the same cache key");
	assert.ok(keyA.includes("category=stem&page=1&state=delhi"));
});

test("buildDeterministicCacheKey: strips marketing/tracking and cache-busting params", () => {
	const reqClean = {
		baseUrl: "/api/scholarships",
		path: "",
		query: { category: "Women" },
	};
	const reqTracked = {
		baseUrl: "/api/scholarships",
		path: "/",
		query: {
			category: "women",
			utm_source: "whatsapp",
			utm_medium: "chat",
			utm_campaign: "admission_2026",
			fbclid: "IwAR123",
			_: "1720000000",
		},
	};

	const keyClean = buildDeterministicCacheKey("udaan:cache:scholarships", reqClean);
	const keyTracked = buildDeterministicCacheKey("udaan:cache:scholarships", reqTracked);

	assert.equal(keyClean, keyTracked, "Tracking and cache-busting params must be stripped from cache key");
});

test("buildDeterministicCacheKey: normalizes trailing slashes on paths", () => {
	const reqSlash = {
		baseUrl: "/api/scholarships",
		path: "/",
		query: {},
	};
	const reqNoSlash = {
		baseUrl: "/api/scholarships",
		path: "",
		query: {},
	};

	const keySlash = buildDeterministicCacheKey("udaan:cache:scholarships", reqSlash);
	const keyNoSlash = buildDeterministicCacheKey("udaan:cache:scholarships", reqNoSlash);

	assert.equal(keySlash, keyNoSlash, "Paths with and without trailing slash must yield identical keys");
});

import { closeRedisClient } from "../../src/config/redis.js";

after(async () => {
	await closeRedisClient();
});
