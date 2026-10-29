import test from "node:test";
import assert from "node:assert/strict";
import { readNavigatorConfig } from "../../src/agents/navigator/config.js";
import { NavigatorError, parseToolArguments, NAVIGATOR_TOOLS } from "../../src/agents/navigator/contracts.js";
import { createGroqProvider } from "../../src/agents/navigator/groqProvider.js";
import { jsonResponse, modelResponse, toolCall } from "../navigatorHelpers.js";

const messages = [{ role: "system", content: "Synthetic contract test" }, { role: "user", content: "Find official scholarship guidelines" }];
const options = { apiKey: "synthetic_key_not_real", model: "explicit-test-model" };
const reserveCall = async () => {};
const code = expected => error => error instanceof NavigatorError && error.code === expected;

test('provider schema rejections retain safe diagnostics without exposing response text or retrying', async () => {
	let requests = 0, reserved = 0;
	const provider = createGroqProvider({ ...options, fetchImpl: async () => {
		requests++; return jsonResponse({ error: { code: 'invalid_request_error', message: 'Invalid json_schema: SYNTHETIC_PRIVATE_PAYLOAD' } }, { status: 400 });
	} });
	await assert.rejects(provider.complete({ messages, reserveCall: async () => { reserved++; } }), error => {
		assert.equal(error.code, 'PROVIDER_REQUEST_REJECTED'); assert.match(error.message, /backend configuration fix/);
		assert.deepEqual(error.providerDiagnostics, { httpStatus: 400, reason: 'schema_rejected', providerCode: 'invalid_request_error' });
		assert.doesNotMatch(JSON.stringify(error), /SYNTHETIC_PRIVATE_PAYLOAD/); return true;
	});
	assert.equal(requests, 1); assert.equal(reserved, 1);
});

test("GPT-OSS uses low reasoning and sequential tools without exporting reasoning", async () => {
	const provider = createGroqProvider({ ...options, model: "openai/gpt-oss-120b", fetchImpl: async (_, request) => {
		const body = JSON.parse(request.body);
		assert.equal(body.reasoning_effort, "low"); assert.equal(body.include_reasoning, false); assert.equal(body.parallel_tool_calls, false);
		assert.equal(body.tool_choice, "required");
		assert.equal(body.temperature, 0);
		assert.equal(body.reasoning_format, undefined);
		return jsonResponse(modelResponse([toolCall("searchScholarships", {})]));
	} });
	await provider.complete({ messages, reserveCall });
});

test("Navigator is disabled by default; enabling requires explicit provider, model and key", () => {
	assert.deepEqual(readNavigatorConfig({}), { enabled: false });
	assert.deepEqual(readNavigatorConfig({ NAVIGATOR_ENABLED: "false", GROQ_API_KEY: "ignored" }), { enabled: false });
	const env = { NAVIGATOR_ENABLED: "true", NAVIGATOR_PROVIDER: "groq", NAVIGATOR_MODEL: "chosen-free-model", GROQ_API_KEY: "not_real" };
	assert.equal(readNavigatorConfig(env).maxModelCalls, 6);
	assert.equal(readNavigatorConfig(env).globalDailyLimit, 20);
	assert.equal(readNavigatorConfig(env).userDailyLimit, 8);
	for (const change of [{ NAVIGATOR_ENABLED: "yes" }, { NAVIGATOR_PROVIDER: "auto" }, { NAVIGATOR_MODEL: "" }, { GROQ_API_KEY: "" }, { NAVIGATOR_MAX_MODEL_CALLS: "0" }, { NAVIGATOR_TIMEOUT_MS: "31000" }, { NAVIGATOR_MAX_TOOL_CALLS: "Infinity" }, { NAVIGATOR_MAX_OUTPUT_TOKENS: "2e3" }]) {
		assert.throws(() => readNavigatorConfig({ ...env, ...change }), code("INVALID_CONFIGURATION"));
	}
	for (const change of [{ NAVIGATOR_GLOBAL_DAILY_CALLS: "0" }, { NAVIGATOR_USER_DAILY_CALLS: "10001" }, { NAVIGATOR_GLOBAL_DAILY_CALLS: "2", NAVIGATOR_USER_DAILY_CALLS: "3" }]) assert.throws(() => readNavigatorConfig({ ...env, ...change }), code("INVALID_CONFIGURATION"));
});

test("tool contracts reject injected operators, profile data, executable tools and oversized input", () => {
	assert.deepEqual(parseToolArguments("searchScholarships", {}), {});
	assert.ok(NAVIGATOR_TOOLS.every(tool => tool.function.parameters.additionalProperties === false));
	for (const [name, args] of [["searchScholarships", { $where: "true" }], ["evaluateMatches", { schemeIds: [], profile: { income: 1 } }], ["searchScholarships", { query: "x".repeat(301) }], ["searchScholarships", "{"], ["searchScholarships", "x".repeat(8001)]]) {
		assert.throws(() => parseToolArguments(name, args), code("INVALID_TOOL_ARGUMENTS"));
	}
	for (const name of ["constructor", "__proto__", "eval", "runCrawler", "saveProfile"]) assert.throws(() => parseToolArguments(name, {}), code("UNKNOWN_TOOL"));
});

test("Groq reserves before inference, pins the endpoint/model and returns only supported fields", async () => {
	const order = [];
	const provider = createGroqProvider({ ...options, fetchImpl: async (url, request) => {
		order.push("fetch");
		assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
		assert.equal(request.redirect, "error");
		const body = JSON.parse(request.body);
		assert.equal(body.model, options.model); assert.equal(body.max_completion_tokens, 1000); assert.equal(body.stream, false);
		assert.equal(body.response_format, undefined);
		assert.deepEqual(body.tools, NAVIGATOR_TOOLS);
		const response = modelResponse([toolCall("searchScholarships", {})]);
		response.choices[0].message.reasoning = "must never be exposed";
		response.usage.total_tokens = 120;
		return jsonResponse(response);
	} });
	const response = await provider.complete({ messages, reserveCall: async () => order.push("reserve") });
	assert.deepEqual(order, ["reserve", "fetch"]);
	assert.deepEqual(response.usage, { inputTokens: 100, outputTokens: 20 });
	assert.ok(!JSON.stringify(response).includes("reasoning"));
});

test("missing budget, denied reservation, invalid context and pre-cancellation never reach inference", async () => {
	let calls = 0;
	const provider = createGroqProvider({ ...options, fetchImpl: async () => { calls++; } });
	await assert.rejects(provider.complete({ messages }), code("BUDGET_REQUIRED"));
	await assert.rejects(provider.complete({ messages, reserveCall: async () => { throw new NavigatorError("QUOTA_EXHAUSTED", "Daily allowance reached."); } }), code("QUOTA_EXHAUSTED"));
	await assert.rejects(provider.complete({ messages: [{ role: "user", content: "x".repeat(33000) }], reserveCall }), code("CONTEXT_LIMIT"));
	await assert.rejects(provider.complete({ messages: [{ role: "developer", content: "unsupported role" }], reserveCall }), code("CONTEXT_LIMIT"));
	await assert.rejects(provider.complete({ messages, reserveCall, signal: AbortSignal.abort() }), code("CANCELLED"));
	assert.equal(calls, 0);
});

for (const [status, expected] of [[429, "PROVIDER_QUOTA"], [401, "PROVIDER_AUTH"], [403, "PROVIDER_AUTH"], [500, "PROVIDER_UNAVAILABLE"], [400, "PROVIDER_REQUEST_REJECTED"], [422, "PROVIDER_REQUEST_REJECTED"]]) {
	test(`HTTP ${status} produces a sanitized error with no automatic retries`, async () => {
		let calls = 0;
		const provider = createGroqProvider({ ...options, fetchImpl: async () => { calls++; return new Response("secret provider body", { status, headers: { "retry-after": "60" } }); } });
		await assert.rejects(provider.complete({ messages, reserveCall }), error => code(expected)(error) && !error.message.includes("secret") && (status !== 429 || error.retryAfterSeconds === 60));
		assert.equal(calls, 1);
	});
}

test("invalid tool generation is distinct from outages, without exposing provider text or retrying", async () => {
	for (const status of [400, 422, 503]) {
		let calls = 0, reservations = 0;
		const provider = createGroqProvider({ ...options, fetchImpl: async () => { calls++; return jsonResponse({ error: {
			code: "tool_use_failed", message: "private provider explanation", failed_generation: "private generated content", apiKey: options.apiKey,
		} }, { status }); } });
		await assert.rejects(provider.complete({ messages, reserveCall: async () => { reservations++; } }), error => {
			assert.equal(error.code, status === 503 ? "PROVIDER_UNAVAILABLE" : "MODEL_PROTOCOL");
			for (const secret of ["private provider", "private generated", options.apiKey]) assert.ok(!error.message.includes(secret));
			return true;
		});
		assert.equal(calls, 1); assert.equal(reservations, 1);
	}
});

test("malformed, oversized and unknown request-error bodies use a bounded safe category", async () => {
	for (const body of ["{", JSON.stringify({ error: { code: "untrusted-secret-code", message: "secret" } }), JSON.stringify({ error: { code: "tool_use_failed", failed_generation: "secret".repeat(30000) } })]) {
		const provider = createGroqProvider({ ...options, fetchImpl: async () => new Response(body, { status: 400 }) });
		await assert.rejects(provider.complete({ messages, reserveCall }), error => code("PROVIDER_REQUEST_REJECTED")(error) && !error.message.includes("secret"));
	}
});

test("a stalled request-error body is still bounded by timeout and cancellation", async () => {
	const fetchImpl = async () => new Response(new ReadableStream({ pull: () => new Promise(() => {}) }), { status: 400 });
	await assert.rejects(createGroqProvider({ ...options, timeoutMs: 15, fetchImpl }).complete({ messages, reserveCall }), code("PROVIDER_TIMEOUT"));
	const controller = new AbortController();
	const pending = createGroqProvider({ ...options, fetchImpl }).complete({ messages, reserveCall, signal: controller.signal });
	setImmediate(() => controller.abort()); await assert.rejects(pending, code("CANCELLED"));
});

test("network failures do not leak request details or credentials", async () => {
	const provider = createGroqProvider({ ...options, fetchImpl: async () => { throw new Error("sensitive URL and synthetic_key_not_real"); } });
	await assert.rejects(provider.complete({ messages, reserveCall }), error => code("PROVIDER_UNAVAILABLE")(error) && !error.message.includes(options.apiKey));
});

test("malformed, truncated, duplicate-call and oversized responses fail closed", async () => {
	const base = modelResponse([toolCall("searchScholarships", {})]);
	const truncated = structuredClone(base); truncated.choices[0].finish_reason = "length";
	const duplicate = modelResponse([toolCall("searchScholarships", {}), toolCall("searchScholarships", {})]);
	const fixtures = [() => new Response("{", { headers: { "content-type": "application/json" } }), () => new Response("html"),
		() => jsonResponse({ choices: [] }), () => jsonResponse(truncated), () => jsonResponse(duplicate), () => jsonResponse({ huge: "x".repeat(130 * 1024) })];
	for (const make of fixtures) {
		const provider = createGroqProvider({ ...options, fetchImpl: async () => make() });
		await assert.rejects(provider.complete({ messages, reserveCall }), code("PROVIDER_RESPONSE_INVALID"));
	}
});

test("provider deadline includes stalled fetches and response bodies", async () => {
	for (const fetchImpl of [async () => new Promise(() => {}), async () => new Response(new ReadableStream({ pull: () => new Promise(() => {}) }), { headers: { "content-type": "application/json" } })]) {
		const provider = createGroqProvider({ ...options, timeoutMs: 15, fetchImpl });
		await assert.rejects(provider.complete({ messages, reserveCall }), code("PROVIDER_TIMEOUT"));
	}
});

test("cancellation interrupts a transport even if it ignores AbortSignal", async () => {
	const controller = new AbortController();
	const provider = createGroqProvider({ ...options, fetchImpl: async () => new Promise(() => {}) });
	const pending = provider.complete({ messages, reserveCall, signal: controller.signal });
	setImmediate(() => controller.abort());
	await assert.rejects(pending, code("CANCELLED"));
});
