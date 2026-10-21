import { test, after } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { evaluateRuleTree, evaluateScholarships } from "../../src/controllers/scholarshipController.js";
import UserProfile from "../../src/models/UserProfile.js";
import { closeRedisClient } from "../../src/config/redis.js";

after(closeRedisClient);
async function evaluate(t, body, records = []) {
	let query, output, status;
	t.mock.method(Scholarship, "find", (criteria) => {
		query = criteria;
		return { select: () => ({ lean: async () => records }) };
	});
	const response = { setHeader() {}, status(code) { status = code; return this; }, json(data) { output = data; return this; } };
	await evaluateScholarships({ body }, response);
	assert.equal(status, 200);
	return { query, output };
}

test("the actual evaluation controller restricts national-only requests to all-India listings", async t => {
	const { query } = await evaluate(t, { state: "All India" });
	assert.equal(query.state, "All India");
});

test("the actual evaluation controller leaves unknown domicile in the missing-information results", async t => {
	const { query, output } = await evaluate(t, {}, [{
		_id: "scheme", title: "Maharashtra example", state: "Maharashtra", requiredDocuments: [],
		rules: [{ id: "domicile", field: "state", operator: "EQ", targetValue: "Maharashtra" }],
	}]);
	assert.equal(query.state, undefined);
	assert.equal(output.summary.eligibleCount, 0);
	assert.equal(output.data.missingProfileData[0].evaluation.unknownRules[0].field, "state");
});

test("invalid evaluation requests fail before querying or saving profiles", async t => {
	const find = t.mock.method(Scholarship, "find", () => { throw new Error("Must not query"); });
	const save = t.mock.method(UserProfile, "findOneAndUpdate", () => { throw new Error("Must not save"); });
	for (const body of [null, [], { familyIncome: {} }, { percentage: 101 }, { cgpa: -1 }, { hasDisability: "yes" },
		{ documentsHeld: "AADHAAR" }, { user: "other-user" }, { $set: {} }, { ruleTree: {} }, { familyIncome: "Infinity" }]) {
		let status, output;
		await evaluateScholarships({ body, user: { _id: "student" } }, {
			status(code) { status = code; return this; }, json(data) { output = data; },
		});
		assert.equal(status, 400); assert.ok(output.errors.length);
	}
	assert.equal(find.mock.callCount(), 0); assert.equal(save.mock.callCount(), 0);
});

test("public matching categorizes OR outcomes by root status, including failed and unknown alternatives", async t => {
	const leaf = (id, field, operator, targetValue) => ({ type: "CONDITION", id, field, operator, targetValue });
	const records = [
		{ _id: "passes", ruleTree: { type: "OR", children: [leaf("g", "gender", "EQ", "Female"), leaf("income", "familyIncome", "LTE", 300000)] } },
		{ _id: "pending", ruleTree: { type: "OR", children: [leaf("g", "gender", "EQ", "Female"), leaf("merit", "percentage", "GTE", 75)] } },
		{ _id: "fails", ruleTree: { type: "AND", children: [leaf("g", "gender", "EQ", "Female"), leaf("merit", "percentage", "GTE", 75)] } },
	];
	const { query, output } = await evaluate(t, { familyIncome: 250000, gender: "Male", state: "Delhi" }, records);
	assert.deepEqual(output.summary, { totalEvaluated: 3, eligibleCount: 1, ineligibleCount: 1, missingInfoCount: 1 });
	assert.equal(output.data.matched[0]._id, "passes"); assert.equal(output.data.matched[0].evaluation.failedRules.length, 0);
	assert.equal(output.data.missingProfileData[0]._id, "pending"); assert.equal(output.data.ineligible[0]._id, "fails");
	assert.equal(output.data.matched[0].evaluation.evaluationTree.status, "passed");
	assert.ok(query.$and.every(condition => condition.$or.some(clause => clause.ruleTree?.$ne === null)));
});

test("admin policy preview validates both tree and profile and returns the recursive explanation", () => {
	const ruleTree = { type: "CONDITION", id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000 };
	for (const [body, expected] of [[{ profile: { familyIncome: "280000" }, ruleTree }, 200],
		[{ profile: {}, ruleTree: { type: "OR", children: [] } }, 400], [{ profile: {}, ruleTree, extra: true }, 400]]) {
		let status, output;
		evaluateRuleTree({ body }, { status(code) { status = code; return this; }, json(data) { output = data; } });
		assert.equal(status, expected);
		if (expected === 200) { assert.equal(output.data.status, "passed"); assert.equal(output.data.evaluationTree.type, "CONDITION"); }
		else assert.ok(output.errors.length);
	}
});

test("validated partial profile saves synchronize aliases without erasing unrelated answers", async t => {
	let saved;
	t.mock.method(UserProfile, "findOneAndUpdate", async (filter, update) => { saved = update.$set; });
	t.mock.method(Scholarship, "find", () => ({ select: () => ({ lean: async () => [] }) }));
	await evaluateScholarships({ body: { courseStream: "Humanities", familyIncome: "", hasDisability: "false", percentage: "70" }, user: { _id: "student" } }, {
		setHeader() {}, status(code) { assert.equal(code, 200); return this; }, json() {},
	});
	assert.equal(saved.stream, "Humanities"); assert.equal(saved.courseStream, "Humanities");
	assert.equal(saved.familyIncome, null); assert.equal(saved.income, null);
	assert.equal(saved.hasDisability, false); assert.equal(saved.percentage, 70);
	for (const field of ["state", "gender", "casteCategory", "fullName", "documentsHeld", "cgpa", "educationLevel"]) assert.equal(Object.hasOwn(saved, field), false, field);
});
