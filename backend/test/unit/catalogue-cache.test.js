import { test, after } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { getScholarships } from "../../src/controllers/scholarshipController.js";
import { buildDeterministicCacheKey } from "../../src/middlewares/cacheMiddleware.js";
import { canonicalizeCatalogueQuery } from "../../src/engine/catalogueQuery.js";
import { closeRedisClient } from "../../src/config/redis.js";

after(closeRedisClient);
const key = query => buildDeterministicCacheKey("test", { baseUrl: "/api/scholarships", path: "/", query });

test("enum case, multi-select order and repeated filter syntax share the same canonical cache identity", () => {
	assert.equal(key({ level: "ug" }), key({ level: "UG" }));
	assert.equal(key({ level: ["pg", "ug", "PG"], category: "women,stem" }), key({ category: ["STEM", "Women"], level: "UG,PG" }));
	assert.deepEqual(canonicalizeCatalogueQuery({ level: "ug", category: "stem", sourceType: "government", sort: "AMOUNT_HIGH", status: "OPEN" }),
		{ level: "UG", category: "STEM", sourceType: "Government", sort: "amount_high", status: "open" });
});

test("unknown values, search case/whitespace, array types and object values cannot pollute other entries", () => {
	for (const field of ["search", "q", "unknown", "level", "state"]) assert.notEqual(key({ [field]: "Unlisted" }), key({ [field]: "unlisted" }));
	assert.notEqual(key({ search: "Engineering" }), key({ search: " Engineering " }));
	assert.notEqual(key({ q: ["a", "b"] }), key({ q: "a,b" }));
	assert.notEqual(key({ q: { a: 1 } }), key({ q: { b: 1 } }));
	assert.notEqual(key({ q: ["a"] }), key({ q: '~["array",[["string","a"]]]' }));
	assert.notEqual(key({ page: 1 }), key({ page: "1" }));
	assert.equal(key({ q: { b: 2, a: 1 } }), key({ q: { a: 1, b: 2 } }));
	const unusualKeys = Object.fromEntries([["constructor", "VALUE"], ["__proto__", "VALUE"], ["toString", "VALUE"]]);
	assert.deepEqual(canonicalizeCatalogueQuery(unusualKeys), unusualKeys);
	assert.doesNotThrow(() => key(unusualKeys));
});

test("cache keys use a new namespace and strip tracking parameters without mutating requests", () => {
	const query = { level: "ug", utm_source: "test", _: "123" };
	assert.equal(key(query), key({ level: "UG" }));
	assert.match(key(query), /^test:v3:/);
	assert.equal(query.level, "ug"); assert.equal(query.utm_source, "test");
});

test("actual catalogue controller and cache key agree on case-insensitive enum filters", async t => {
	const pipelines = [];
	t.mock.method(Scholarship, "aggregate", async pipeline => { pipelines.push(pipeline); return []; });
	t.mock.method(Scholarship, "countDocuments", async () => 0);
	t.mock.method(Scholarship, "find", () => ({ select: () => ({ lean: async () => [] }) }));
	const response = { status(code) { assert.equal(code, 200); return this; }, json() {} };
	for (const level of ["ug", "UG"]) await getScholarships({ query: { level, category: "government", status: "all" } }, response);
	assert.deepEqual(pipelines[0][0], pipelines[1][0]);
	assert.ok(pipelines[0][0].$match.$and.some(c => c.$or?.some(v => v.level === "UG")));
	assert.equal(key({ level: "ug", category: "government" }), key({ level: "UG", category: "Government" }));
});
