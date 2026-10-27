import test from "node:test";
import assert from "node:assert/strict";
import { investigate } from "../../src/agents/navigator/investigation.js";
import { createResearchTools } from "../../src/agents/navigator/researchTools.js";
import { NavigatorError } from "../../src/agents/navigator/contracts.js";
import { researchFixture, toolCall, SCHEME_ID, FIXTURE_NOW } from "../navigatorHelpers.js";

const goal = "Find the official income conditions for a scholarship.";
const reserveCall = async () => {};
function setup(respond, profile = {}) {
	const fixture = researchFixture();
	return { fixture, options: { goal, tools: createResearchTools({ repository: fixture.repository, profile, now: () => FIXTURE_NOW }), reserveCall,
		provider: { name: "synthetic", model: "offline-test", complete: respond } } };
}
const response = calls => ({ message: { role: "assistant", content: "Untrusted model prose must not become a fact", tool_calls: calls } });

test("a multi-tool investigation completes with checked citations and canonical facts", async () => {
	let turn = 0, reservations = 0;
	const { options } = setup(async ({ messages, reserveCall: reserve }) => {
		await reserve(); // The runner and adapter share a single reservation.
		turn++;
		if (turn === 1) return response([toolCall("searchScholarships", {})]);
		if (turn === 2) return response([toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" }, "evidence"), toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }, "match")]);
		const passages = messages.filter(m => m.role === "tool").map(m => JSON.parse(m.content)).find(m => m.kind === "passages");
		return response([toolCall("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: passages.passages.map(p => p.id) }] })]);
	}, { familyIncome: 218765 });
	options.reserveCall = async () => { reservations++; };
	const result = await investigate(options);
	assert.equal(result.status, "completed");
	assert.equal(result.plan.entries[0].matching.status, "passed");
	assert.equal(reservations, 3); assert.equal(result.usage.modelCalls, 3); assert.equal(result.usage.toolCalls, 4);
	assert.ok(!JSON.stringify(result).includes("218765"));
	assert.ok(!JSON.stringify(result).includes("Untrusted model prose"));
	assert.deepEqual(result.events.map(e => e.sequence), result.events.map((_, i) => i + 1));
});

test("missing information pauses without fabricating a profile or a completed plan", async () => {
	let turn = 0;
	const { options } = setup(async () => response([++turn === 1 ? toolCall("evaluateMatches", { schemeIds: [SCHEME_ID] }) : toolCall("requestClarification", { fields: ["familyIncome"] })]));
	const result = await investigate(options);
	assert.equal(result.status, "awaiting_input");
	assert.deepEqual(result.clarification.fields, ["familyIncome"]);
	assert.equal(result.plan, undefined);
});

test("an invalid tool can be corrected without executing an unsupported action", async () => {
	let turn = 0;
	const { options } = setup(async () => response([++turn === 1 ? toolCall("saveProfile", { familyIncome: 0 }) : toolCall("finishInvestigation", { selections: [] })]));
	const result = await investigate(options);
	assert.equal(result.status, "completed");
	assert.equal(result.plan.outcome, "insufficient_evidence");
	assert.ok(result.events.some(e => e.type === "tool_failed"));
});

test("model and tool budgets stop loops without calling another provider", async () => {
	let calls = 0;
	const { options } = setup(async () => { calls++; return response([toolCall("searchScholarships", {})]); });
	let result = await investigate({ ...options, maxModelCalls: 2 });
	assert.equal(result.error.code, "MODEL_LIMIT"); assert.equal(result.usage.modelCalls, 2); assert.equal(calls, 2);
	calls = 0;
	result = await investigate({ ...options, maxToolCalls: 1 });
	assert.equal(result.error.code, "TOOL_LIMIT"); assert.equal(result.usage.toolCalls, 1); assert.equal(calls, 2);
});

test("quota refusal never reaches inference and produces a visible quota state", async () => {
	let calls = 0;
	const { options } = setup(async () => { calls++; });
	const result = await investigate({ ...options, reserveCall: async () => { throw new NavigatorError("QUOTA_EXHAUSTED", "Daily allowance reached."); } });
	assert.equal(result.status, "quota_exhausted"); assert.equal(result.usage.modelCalls, 0); assert.equal(calls, 0);
});

test("narrative answers and batched terminal actions cannot bypass validated finishing", async () => {
	for (const answer of [{ message: { content: "You qualify for Rs 1 million" } }, response([toolCall("searchScholarships", {}), toolCall("finishInvestigation", { selections: [] }, "finish")])]) {
		const { options } = setup(async () => answer);
		const result = await investigate(options);
		assert.equal(result.status, "partial"); assert.equal(result.error.code, "MODEL_PROTOCOL"); assert.equal(result.plan, undefined);
	}
});

test("cancellation stops before any model or tool execution", async () => {
	let calls = 0;
	const { options } = setup(async () => { calls++; });
	const result = await investigate({ ...options, signal: AbortSignal.abort() });
	assert.equal(result.status, "cancelled"); assert.equal(calls, 0);
});

test("run deadlines and cancellation interrupt uncooperative providers", async () => {
	const { options } = setup(async () => new Promise(() => {}));
	const timedOut = await investigate({ ...options, maxDurationMs: 20 });
	assert.equal(timedOut.error.code, "RUN_TIMEOUT");
	const controller = new AbortController();
	const pending = investigate({ ...options, signal: controller.signal });
	setImmediate(() => controller.abort());
	assert.equal((await pending).status, "cancelled");
});

test("unexpected internal tool errors are sanitized and do not get sent back as model context", async () => {
	const { options } = setup(async () => response([toolCall("searchScholarships", {})]));
	options.tools = { async execute() { throw new Error("mongodb://secret:password@private-host"); } };
	const result = await investigate(options);
	assert.equal(result.error.code, "TOOL_UNAVAILABLE");
	assert.ok(!JSON.stringify(result).includes("password"));
});

test("failed event observers stop cleanly without leaking internal details or starting inference", async () => {
	let calls = 0;
	const { options } = setup(async () => { calls++; });
	const result = await investigate({ ...options, onEvent: async () => { throw new Error("secret storage connection string"); } });
	assert.equal(result.status, "partial"); assert.equal(result.error.code, "EVENT_RECORDING_FAILED");
	assert.equal(calls, 0);
	assert.ok(!JSON.stringify(result).includes("secret"));
});

test("a late reservation cannot start inference after cancellation", async () => {
	let release, calls = 0;
	const controller = new AbortController();
	const { options } = setup(async () => { calls++; });
	const pending = investigate({ ...options, signal: controller.signal, reserveCall: () => new Promise(resolve => { release = resolve; }) });
	await new Promise(resolve => setImmediate(resolve));
	controller.abort();
	const result = await pending;
	const events = JSON.stringify(result.events);
	release();
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(result.status, "cancelled"); assert.equal(calls, 0);
	assert.equal(JSON.stringify(result.events), events);
});

test("a late model response cannot execute tools or change the stopped timeline", async () => {
	let release, calls = 0;
	const { options } = setup(() => new Promise(resolve => { release = resolve; }));
	options.tools = { async execute() { calls++; } };
	const result = await investigate({ ...options, maxDurationMs: 20 });
	const events = JSON.stringify(result.events);
	release(response([toolCall("searchScholarships", {})]));
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(result.error.code, "RUN_TIMEOUT"); assert.equal(calls, 0);
	assert.equal(JSON.stringify(result.events), events);
});
