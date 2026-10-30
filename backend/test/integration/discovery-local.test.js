import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Explicit opt-in; only fixed loopback hosts are accepted. A random database
// and Redis namespace are created and removed by this test, never the app DB.
test("local Mongo discovery and optional Redis cache integration", { skip: process.env.DISCOVERY_LOCAL_SMOKE !== "1", timeout: 60000 }, async () => {
	const dbName = `udaan_discovery_smoke_${randomUUID().replaceAll("-", "")}`;
	process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${dbName}`;
	process.env.REDIS_URL = ""; process.env.REDIS_HOST = "127.0.0.1";
	process.env.REDIS_PORT = process.env.DISCOVERY_SMOKE_REDIS === "1" ? "6379" : "1";
	process.env.REDIS_PASSWORD = ""; process.env.REDIS_USERNAME = ""; process.env.REDIS_TLS = "false";
	process.env.JWT_SECRET = "local-discovery-smoke-only";
	const [{ default: mongoose }, { default: express }, { default: jwt }, { default: Scholarship },
		{ default: User }, { default: UserProfile }, { default: router }, redis, { catalogueNamespace },
		{ apiLimiter }, { protectScholarshipAlias }] = await Promise.all([
		import("mongoose"), import("express"), import("jsonwebtoken"), import("../../src/models/Scholarship.js"),
		import("../../src/models/User.js"), import("../../src/models/UserProfile.js"), import("../../src/routes/scholarshipRoutes.js"),
		import("../../src/config/redis.js"), import("../../src/pipeline/lock.js"),
		import("../../src/middlewares/rateLimiterMiddleware.js"), import("../../src/middlewares/scholarshipAliasProtection.js"),
	]);
	let server, namespace, limiterKey;
	try {
		await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
		namespace = `udaan:cache:scholarships:${catalogueNamespace()}:`;
		await Scholarship.createIndexes();
		const now = Date.now(), open = { opensAt: new Date(now - 86400000), closesAt: new Date(now + 86400000 * 30) };
		const base = { publication: { state: "published" }, category: "Merit based", level: "UG", state: "All India", verified: true,
			freshness: { lastVerifiedAt: new Date(now) }, currentCycle: open };
		const rule = value => [{ id: "domicile", field: "state", operator: "EQ", targetValue: value }];
		await Scholarship.collection.insertMany([
			{ ...base, title: "Engineering support UP", rules: rule("Uttar Pradesh") },
			{ ...base, title: "Engineering engineering Maharashtra", rules: rule("Maharashtra") },
			{ ...base, title: "Engineering unknown", rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000 }] },
			{ ...base, title: "Engineering expired", rules: rule("UP"), currentCycle: { opensAt: new Date(now - 200000), closesAt: new Date(now - 100000) } },
			{ ...base, title: "Engineering other category", category: "Women", rules: rule("UP") },
			{ ...base, title: "Engineering unpublished", publication: { state: "needs_review" }, rules: rule("UP") },
		]);
		const userId = new mongoose.Types.ObjectId();
		await User.collection.insertOne({ _id: userId, name: "Fixture", email: "fixture@example.invalid", role: "student" });
		await UserProfile.collection.insertOne({ user: userId, state: "UP", educationLevel: "UG" });
		const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);
		const app = express(); app.use(express.json()); app.use("/api", apiLimiter); protectScholarshipAlias(app);
		app.use("/api/scholarships", router); app.use("/scholarships", router);
		server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
		const clientId = `smoke-${randomUUID()}`;
		limiterKey = `ratelimit:api:${clientId}`;
		const request = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
			...options, headers: { "x-forwarded-for": clientId, ...(options.headers || {}) },
		});
		const query = "?search=engineering&category=merit%20based&status=active&limit=1";
		const first = await request(`/api/scholarships${query}`);
		assert.equal(first.status, 200); const general = await first.json();
		if (process.env.DISCOVERY_SMOKE_REDIS === "1") assert.equal(first.headers.get("x-cache"), "MISS");
		assert.equal(general.total, 3); assert.equal(general.totalPages, 3); assert.equal(general.count, 1);
		const body = { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: "{}" };
		const pages = [];
		for (let page = 1; page <= 3; page++) {
			const response = await request(`/api/scholarships/discover${query}&page=${page}`, body);
			assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
			assert.equal(response.headers.get("x-cache"), "BYPASS");
			const data = await response.json(); assert.equal(data.total, 3); assert.equal(data.count, 1); pages.push(data.data[0]);
		}
		assert.match(pages[0].title, /UP/, JSON.stringify(pages.map(({ title, discovery }) => ({ title, discovery })))); assert.equal(pages[0].discovery.status, "potentially_eligible");
		assert.match(pages[2].title, /Maharashtra/); assert.equal(pages[2].discovery.status, "known_mismatch");
		const closed = await (await request("/api/scholarships?search=engineering&category=merit%20based&status=closed")).json();
		assert.equal(closed.total, 1); assert.match(closed.data[0].title, /expired/);
		const partial = await (await request(`/api/scholarships/discover${query}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: { educationLevel: "UG" } }) })).json();
		assert.equal(partial.personalized, true); assert.equal(partial.total, 3); assert.equal(partial.data[0].discovery.status, "needs_verification");
		const aliasProfile = await request(`/scholarships/discover${query}`, body);
		assert.equal(aliasProfile.status, 200); assert.equal((await aliasProfile.json()).data[0].discovery.personalized, true);
		process.env.DISCOVERY_MAX_CANDIDATES = "2";
		const overloaded = await request("/api/scholarships/discover?search=engineering&status=all", body);
		assert.equal(overloaded.status, 503); assert.equal((await overloaded.json()).code, "DISCOVERY_CANDIDATE_LIMIT");
		delete process.env.DISCOVERY_MAX_CANDIDATES;
		if (process.env.DISCOVERY_SMOKE_REDIS === "1") {
			assert.equal(redis.isRedisAvailable(), true, "local Redis must be ready for this opt-in check");
			const key = (await redis.redisClient.keys(`${namespace}*`))[0]; assert.ok(key);
			const before = await redis.redisClient.keys(`${namespace}*`);
			const hit = await request(`/api/scholarships${query}`); assert.equal(hit.headers.get("x-cache"), "HIT");
			await request(`/api/scholarships/discover${query}`, body);
			assert.deepEqual((await redis.redisClient.keys(`${namespace}*`)).sort(), before.sort());
			await redis.redisClient.set(limiterKey, "298", "EX", 60);
			const canonical = await request(`/api/scholarships${query}`); assert.equal(canonical.headers.get("x-ratelimit-remaining"), "1");
			const alias = await request(`/scholarships${query}`); assert.equal(alias.status, 200); assert.equal(alias.headers.get("x-ratelimit-remaining"), "0");
			assert.equal((await request(`/scholarships${query}`)).status, 429);
		}
	} finally {
		if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
		if (redis.isRedisAvailable() && namespace) {
			const keys = await redis.redisClient.keys(`${namespace}*`);
			if (keys.length) await redis.redisClient.del(...keys);
			if (limiterKey) await redis.redisClient.del(limiterKey);
		}
		if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
		await mongoose.disconnect(); await redis.closeRedisClient();
	}
});
