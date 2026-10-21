import { test, after } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import EligibilityRuleVersion from "../../src/models/EligibilityRuleVersion.js";
import { replayScholarshipEligibility } from "../../src/controllers/scholarshipController.js";
import { closeRedisClient } from "../../src/config/redis.js";

after(closeRedisClient);

async function runReplay(params, body, user = null) {
	let status = 200, output = null;
	const req = { params, body, user };
	const res = {
		status(code) { status = code; return this; },
		json(data) { output = data; return this; },
	};
	await replayScholarshipEligibility(req, res);
	return { status, output };
}

test("replayScholarshipEligibility: rejects requests missing profile", async (t) => {
	t.mock.method(Scholarship, "findOne", () => ({
		lean: async () => ({ _id: "scheme-123", title: "Test Scheme" }),
	}));

	const { status, output } = await runReplay({ id: "scheme-123" }, { targetDate: "2026-08-15" });
	assert.equal(status, 400);
	assert.match(output.message, /provide student profile/i);
});

test("replayScholarshipEligibility: rejects requests missing both targetDate and versionKey", async (t) => {
	t.mock.method(Scholarship, "findOne", () => ({
		lean: async () => ({ _id: "scheme-123", title: "Test Scheme" }),
	}));

	const { status, output } = await runReplay(
		{ id: "scheme-123" },
		{ profile: { familyIncome: 200000 } },
	);
	assert.equal(status, 400);
	assert.match(output.message, /Provide either targetDate or versionKey/i);
});

test("replayScholarshipEligibility: returns 404 when scholarship does not exist", async (t) => {
	t.mock.method(Scholarship, "findOne", () => ({
		lean: async () => null,
	}));

	const { status, output } = await runReplay(
		{ id: "unknown-scheme" },
		{ profile: { familyIncome: 200000 }, targetDate: "2026-08-15" },
	);
	assert.equal(status, 404);
	assert.match(output.message, /scholarship not found/i);
});

test("replayScholarshipEligibility: successfully replays eligibility and detects status flipped", async (t) => {
	const scholarshipDoc = {
		_id: "507f1f77bcf86cd799439011",
		slug: "merit-scheme",
		title: "Merit Scheme",
		schemeKey: "merit_scheme",
		publication: { state: "published" },
		eligibilityVersion: "version-current-id",
	};

	const historicalVersionDoc = {
		_id: "version-old-id",
		versionKey: "v1_key",
		observedAt: new Date("2025-08-01"),
		verified: true,
		snapshot: {
			rules: [
				{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 250000 },
			],
			provenanceQuotes: [
				{ ruleId: "income", quote: "Annual family income not exceeding Rs. 2,50,000", sourceUrl: "https://nsp.gov.in" },
			],
		},
		evidence: [{ ruleId: "income", quote: "Annual family income not exceeding Rs. 2,50,000", url: "https://nsp.gov.in" }],
	};

	const currentVersionDoc = {
		_id: "version-current-id",
		versionKey: "v2_key",
		observedAt: new Date("2026-08-01"),
		verified: true,
		snapshot: {
			rules: [
				{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000 },
			],
			provenanceQuotes: [
				{ ruleId: "income", quote: "Annual family income not exceeding Rs. 3,00,000", sourceUrl: "https://nsp.gov.in" },
			],
		},
		evidence: [{ ruleId: "income", quote: "Annual family income not exceeding Rs. 3,00,000", url: "https://nsp.gov.in" }],
	};

	t.mock.method(Scholarship, "findOne", () => ({
		lean: async () => scholarshipDoc,
	}));

	t.mock.method(EligibilityRuleVersion, "findOne", (query) => {
		if (query?.versionKey === "v1_key" || query?.observedAt) {
			return {
				sort: () => ({ lean: async () => historicalVersionDoc }),
				lean: async () => historicalVersionDoc,
			};
		}
		return {
			sort: () => ({ lean: async () => currentVersionDoc }),
			lean: async () => currentVersionDoc,
		};
	});

	t.mock.method(EligibilityRuleVersion, "findById", () => ({
		lean: async () => currentVersionDoc,
	}));

	// Student with familyIncome 280,000 was ineligible under historical (<= 250k), but eligible under current (<= 300k)
	const { status, output } = await runReplay(
		{ id: "merit-scheme" },
		{
			profile: { familyIncome: 280000 },
			targetDate: "2025-08-15",
		},
	);

	assert.equal(status, 200);
	assert.equal(output.success, true);
	assert.equal(output.historical.status, "failed");
	assert.equal(output.current.status, "passed");
	assert.equal(output.statusFlipped, true);
	assert.equal(output.transition.from, "failed");
	assert.equal(output.transition.to, "passed");
	assert.equal(output.changes.length, 1);
	assert.equal(output.changes[0].field, "familyIncome");
});
