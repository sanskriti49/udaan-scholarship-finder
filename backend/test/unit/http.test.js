import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SafeFetcher, parseRobots, robotsAllows, resetHostState } from "../../src/pipeline/core/http.js";

const res = (status, body = "", headers = {}) => ({
	status,
	headers: { get: (n) => headers[n.toLowerCase()] ?? null },
	body: Buffer.from(body),
});

function fetcher(transport, extra = {}) {
	const sleeps = [];
	const f = new SafeFetcher({
		allowedDomains: ["scholarships.gov.in"],
		transport,
		minIntervalMs: 0,
		retries: 3,
		backoffBaseMs: 10,
		respectRobots: false,
		sleep: async (ms) => sleeps.push(ms),
		...extra,
	});
	return { f, sleeps };
}

beforeEach(() => resetHostState());

test("rejects hosts outside the allowlist before any request", async () => {
	let called = false;
	const { f } = fetcher(async () => {
		called = true;
		return res(200, "x");
	});
	await assert.rejects(f.fetch("https://example.com/"), { code: "DOMAIN_NOT_ALLOWED" });
	await assert.rejects(f.fetch("https://scholarships.gov.in.attacker.net/"), { code: "DOMAIN_NOT_ALLOWED" });
	assert.equal(called, false);
});

test("a redirect to a foreign domain is blocked", async () => {
	const { f } = fetcher(async (url) =>
		url.includes("scholarships.gov.in") ? res(302, "", { location: "https://phish.example/login" }) : res(200, "evil"),
	);
	await assert.rejects(f.fetch("https://scholarships.gov.in/x"), { code: "DOMAIN_NOT_ALLOWED" });
});

test("allowed redirects are followed and the final URL recorded", async () => {
	const { f } = fetcher(async (url) =>
		url.endsWith("/old") ? res(301, "", { location: "/new" }) : res(200, "hello", { "content-type": "text/html" }),
	);
	const out = await f.fetch("https://scholarships.gov.in/old");
	assert.equal(out.finalUrl, "https://scholarships.gov.in/new");
	assert.equal(out.body.toString(), "hello");
});

test("retries 503 with Retry-After, then succeeds", async () => {
	let calls = 0;
	const { f, sleeps } = fetcher(async () => {
		calls += 1;
		return calls < 3 ? res(503, "", { "retry-after": "2" }) : res(200, "ok");
	});
	const out = await f.fetch("https://scholarships.gov.in/");
	assert.equal(out.attempts, 3);
	assert.deepEqual(sleeps, [2000, 2000]);
});

test("exponential backoff for network errors, gives up after retries", async () => {
	let calls = 0;
	const { f, sleeps } = fetcher(async () => {
		calls += 1;
		const e = new Error("socket hang up");
		e.code = "ECONNRESET";
		throw e;
	});
	await assert.rejects(f.fetch("https://scholarships.gov.in/"), { code: "NETWORK" });
	assert.equal(calls, 4);
	assert.equal(sleeps.length, 3);
	assert.ok(sleeps[1] >= 20 && sleeps[2] >= 40, `backoff grows: ${sleeps}`);
});

test("404 is not retried and is an error (never parsed as content)", async () => {
	let calls = 0;
	const { f } = fetcher(async () => {
		calls += 1;
		return res(404, "<html>Not found</html>");
	});
	await assert.rejects(f.fetch("https://scholarships.gov.in/gone"), { code: "HTTP_STATUS", status: 404 });
	assert.equal(calls, 1);
});

test("timeouts abort the request", async () => {
	const { f } = fetcher(
		(url, { signal }) =>
			new Promise((_, reject) => {
				signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
			}),
		{ timeoutMs: 20, retries: 0 },
	);
	await assert.rejects(f.fetch("https://scholarships.gov.in/slow"), { code: "TIMEOUT" });
});

test("conditional request returns notModified on 304", async () => {
	let seen;
	const { f } = fetcher(async (url, { headers }) => {
		seen = headers;
		return res(304);
	});
	const out = await f.fetch("https://scholarships.gov.in/", { etag: '"abc"', lastModified: "Wed, 16 Sep 2026 00:00:00 GMT" });
	assert.equal(out.notModified, true);
	assert.equal(seen["If-None-Match"], '"abc"');
	assert.match(seen["User-Agent"], /UdaanScholarshipBot/);
});

test("robots.txt disallow is honoured", async () => {
	const { f } = fetcher(
		async (url) => (url.endsWith("/robots.txt") ? res(200, "User-agent: *\nDisallow: /private/") : res(200, "ok")),
		{ respectRobots: true },
	);
	await assert.rejects(f.fetch("https://scholarships.gov.in/private/a"), { code: "ROBOTS_DISALLOWED" });
	assert.equal((await f.fetch("https://scholarships.gov.in/public/a")).status, 200);
});

test("robots parser picks the most specific rule", () => {
	const rules = parseRobots("User-agent: *\nDisallow: /\nAllow: /public/\n\nUser-agent: other\nDisallow: /public/");
	assert.equal(robotsAllows(rules, "/public/x.pdf"), true);
	assert.equal(robotsAllows(rules, "/admin"), false);
});

test("requests to one host are spaced by the rate limit", async () => {
	let clock = 0;
	const sleeps = [];
	const f = new SafeFetcher({
		allowedDomains: ["scholarships.gov.in"],
		transport: async () => res(200, "ok"),
		minIntervalMs: 2500,
		respectRobots: false,
		now: () => clock,
		sleep: async (ms) => {
			sleeps.push(ms);
			clock += ms;
		},
	});
	await Promise.all([f.fetch("https://scholarships.gov.in/a"), f.fetch("https://scholarships.gov.in/b"), f.fetch("https://scholarships.gov.in/c")]);
	assert.deepEqual(sleeps, [2500, 2500]);
});
