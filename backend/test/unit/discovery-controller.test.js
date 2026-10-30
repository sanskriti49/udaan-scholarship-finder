import { test, after } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import UserProfile from "../../src/models/UserProfile.js";
import { getScholarships, discoverScholarships } from "../../src/controllers/scholarshipController.js";
import { closeRedisClient } from "../../src/config/redis.js";
import { scholarships, student } from "../fixtures/discovery.js";

after(closeRedisClient);
function response() {
	return { headers: {}, code: 200, setHeader(key, value) { this.headers[key] = value; },
		status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
function mockCatalogue(t, items = scholarships) {
	const pipelines = [];
	t.mock.method(Scholarship, "find", () => ({ select: () => ({ lean: async () => [] }) }));
	t.mock.method(Scholarship, "aggregate", async pipeline => { pipelines.push(pipeline); return structuredClone(items); });
	return pipelines;
}

test("same catalogue filters are retained for personalized requests, ranked before pagination", async t => {
	const pipelines = mockCatalogue(t);
	const res = response();
	await discoverScholarships({ body: { profile: student }, query: { search: "Engineering", level: "ug", category: "government", state: "up", sourceType: "corporate", minAmount: "100", maxAmount: "5000", status: "all", page: "2", limit: "2" } }, res);
	assert.equal(res.code, 200);
	assert.equal(res.body.total, 6); assert.equal(res.body.totalPages, 3); assert.equal(res.body.count, 2);
	assert.deepEqual(res.body.data.map(item => item._id), ["incomplete", "mh"]);
	const conditions = pipelines[0][0].$match.$and;
	assert.ok(conditions.some(condition => condition.$text?.$search === "Engineering"));
	assert.ok(conditions.some(condition => condition.$or?.some(item => item.level === "UG")));
	assert.ok(conditions.some(condition => condition.$or?.some(item => item.category === "Government")));
	assert.ok(conditions.some(condition => condition.state?.$in.includes("All India") && condition.state.$in.includes("Uttar Pradesh")));
	assert.ok(conditions.some(condition => condition.sourceType?.$in.includes("Corporate CSR")));
	assert.ok(conditions.some(condition => condition["amount.value"]?.$gte === 100 && condition["amount.value"].$lte === 5000));
	assert.equal(res.headers["Cache-Control"], "private, no-store");
	assert.equal(res.headers["X-Cache"], "BYPASS");
});

test("saved profiles personalize independently; explicit empty profiles opt out without saving", async t => {
	mockCatalogue(t);
	const users = { up: student, mh: { ...student, state: "MH" } };
	t.mock.method(UserProfile, "findOne", ({ user }) => ({ lean: async () => users[user] }));
	const writes = t.mock.method(UserProfile, "findOneAndUpdate", () => { throw new Error("Discovery must not save profiles"); });
	const up = response(), mh = response(), guest = response();
	await discoverScholarships({ user: { _id: "up" }, body: {}, query: { status: "all" } }, up);
	await discoverScholarships({ user: { _id: "mh" }, body: {}, query: { status: "all" } }, mh);
	await discoverScholarships({ user: { _id: "up" }, body: { profile: {} }, query: { status: "all" } }, guest);
	assert.equal(up.body.data[0]._id, "up"); assert.equal(mh.body.data[0]._id, "mh");
	assert.equal(guest.body.personalized, false); assert.equal(writes.mock.callCount(), 0);
	assert.ok(!JSON.stringify(up.body).includes('"familyIncome":200000'));
});

test("live cycle filtering precedes counts and pages even when persisted status is wrong", async t => {
	const items = [1, 2, 3, 4, 5].map(index => ({ _id: String(index), title: `Item ${index}`, status: index < 3 ? "open" : "closed",
		currentCycle: index < 3 ? { opensAt: "2000-01-01", closesAt: "2000-02-01" } : null }));
	mockCatalogue(t, items);
	const res = response();
	await getScholarships({ query: { status: "active", limit: "2" } }, res);
	assert.equal(res.body.total, 3); assert.equal(res.body.totalPages, 2); assert.equal(res.body.count, 2);
	assert.ok(res.body.data.every(item => item.status === "unknown"));
});

test("text-index fallback has no textScore dependency and searches descriptions with all filters intact", async t => {
	t.mock.method(Scholarship, "find", () => ({ select: () => ({ lean: async () => [] }) }));
	const pipelines = [];
	t.mock.method(Scholarship, "aggregate", async pipeline => {
		pipelines.push(pipeline);
		if (pipelines.length === 1) throw new Error("text index required for $text query");
		return [{ _id: "description", description: "engineering support", rules: [] }];
	});
	const res = response();
	await getScholarships({ query: { search: "engineering", sort: "relevance", category: "stem", status: "all" } }, res);
	assert.equal(res.code, 200); assert.equal(res.body.total, 1);
	assert.ok(!JSON.stringify(pipelines[1]).includes("textScore"));
	assert.ok(pipelines[1][0].$match.$and.some(condition => condition.$or?.some(item => item.description instanceof RegExp)));
	assert.ok(pipelines[1][0].$match.$and.some(condition => condition.$or?.some(item => item.category === "STEM")));
});

test("invalid discovery profiles are rejected before database work", async () => {
	for (const body of [{ profile: { income: -1 } }, { profile: { state: { $ne: null } } }, { profile: { secret: "value" } }, { user: "other" }, []]) {
		const res = response();
		await discoverScholarships({ body, query: {} }, res);
		assert.equal(res.code, 400);
	}
});

test("candidate limit fails explicitly instead of returning incomplete pages", async t => {
	mockCatalogue(t, scholarships);
	const previous = process.env.DISCOVERY_MAX_CANDIDATES;
	process.env.DISCOVERY_MAX_CANDIDATES = "2";
	t.after(() => { if (previous === undefined) delete process.env.DISCOVERY_MAX_CANDIDATES; else process.env.DISCOVERY_MAX_CANDIDATES = previous; });
	const res = response();
	await getScholarships({ query: { status: "all", limit: "1" } }, res);
	assert.equal(res.code, 503);
	assert.equal(res.body.code, "DISCOVERY_CANDIDATE_LIMIT");
	assert.equal(res.body.data, undefined);
});
