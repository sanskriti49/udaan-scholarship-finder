import { test, after } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { evaluateScholarships } from "../../src/controllers/scholarshipController.js";
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
