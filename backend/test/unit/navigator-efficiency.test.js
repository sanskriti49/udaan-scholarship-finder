import test from "node:test";
import assert from "node:assert/strict";
import { compactModelMessages } from "../../src/agents/navigator/modelContext.js";
import { providerRateLimit } from "../../src/agents/navigator/rateLimit.js";
import { createResearchTools } from "../../src/agents/navigator/researchTools.js";
import { researchFixture, SCHEME_ID } from "../navigatorHelpers.js";
import { parseToolArguments } from "../../src/agents/navigator/contracts.js";
import { investigate } from "../../src/agents/navigator/investigation.js";
import { toolCall } from "../navigatorHelpers.js";

test("search, retrieval and a duplicated final selection can finish in three model calls", async () => {
	const fixture = researchFixture({ linkedPdf: true }); let calls = 0;
	const result = await investigate({ goal: "Research the income and hostel conditions", tools: createResearchTools({ repository: fixture.repository }), reserveCall: async () => {}, maxModelCalls: 3,
		provider: { name: "fixture", model: "scripted", async complete({ messages }) {
			calls++;
			const selections = calls === 3 ? JSON.parse(messages.at(-1).content).passages.map(passage => ({ schemeId: SCHEME_ID, evidenceIds: [passage.id] })) : null;
			return { message: { role: "assistant", content: null, tool_calls: [calls === 1 ? toolCall("searchScholarships", { query: "income hostel" }) : calls === 2 ? toolCall("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income hostel" }) : toolCall("finishInvestigation", { selections })] } };
		} } });
	assert.equal(result.status, "completed"); assert.equal(calls, 3); assert.equal(result.plan.entries.length, 1);
	assert.equal(result.plan.entries[0].citations.length, 2); assert.equal(result.plan.entries[0].matching.status, "unknown");
});

test("duplicate selections for one scholarship merge exact evidence IDs without weakening validation", () => {
	const first = `ev_${"a".repeat(40)}`, second = `ev_${"b".repeat(40)}`;
	assert.deepEqual(parseToolArguments("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: [first] }, { schemeId: SCHEME_ID, evidenceIds: [first, second] }] }), { selections: [{ schemeId: SCHEME_ID, evidenceIds: [first, second] }] });
	for (const selections of [
		[{ schemeId: SCHEME_ID, evidenceIds: [first], inventedRequirement: "upload private data" }],
		Array.from({ length: 6 }, () => ({ schemeId: SCHEME_ID, evidenceIds: [first] })),
		[{ schemeId: SCHEME_ID, evidenceIds: [first] }, { schemeId: SCHEME_ID, evidenceIds: Array.from({ length: 5 }, (_, i) => `ev_${String(i).repeat(40)}`) }],
	]) assert.throws(() => parseToolArguments("finishInvestigation", { selections }), error => error.code === "INVALID_TOOL_ARGUMENTS");
});

test("model context is smaller while exact quotes, references and server-side proofs stay intact", async () => {
	const fixture = researchFixture(), tools = createResearchTools({ repository: fixture.repository });
	const search = await tools.execute("searchScholarships", {}), passages = await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" });
	const messages = [{ role: "user", content: "Check the income rule" }, { role: "tool", tool_call_id: "search", content: JSON.stringify(search) }, { role: "tool", tool_call_id: "passages", content: JSON.stringify(passages) }];
	const original = JSON.stringify(messages), context = JSON.stringify(tools.exportState());
	const compact = compactModelMessages(messages), result = JSON.parse(compact[2].content);
	assert.ok(JSON.stringify(compact).length < original.length * .7);
	assert.equal(result.passages[0].id, passages.passages[0].id); assert.equal(result.passages[0].evidence.quote, passages.passages[0].evidence.quote);
	assert.equal(result.passages[0].evidence.textHash, undefined); assert.equal(result.passages[0].evidence.snapshotId, undefined);
	assert.equal(JSON.stringify(messages), original); assert.equal(JSON.stringify(tools.exportState()), context);
	const plan = await tools.execute("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: [result.passages[0].id] }] });
	assert.equal(plan.entries[0].citations[0].evidence.textHash, fixture.snapshot.textHash);
	assert.deepEqual(plan.entries[0].matching.missingFields, ["familyIncome"]);
});

test("compaction preserves unknown tool messages and assistant/tool-call pairing", () => {
	for (const content of ["null", "[]", "not JSON", '{"kind":"tool_error","code":"SOURCE_CHANGED"}']) {
		const messages = [{ role: "assistant", content: null, tool_calls: [{ id: "x", type: "function", function: { name: "searchScholarships", arguments: "{}" } }] }, { role: "tool", tool_call_id: "x", content }];
		assert.deepEqual(compactModelMessages(messages), messages);
	}
});

test("rate limits accept decimal Retry-After, HTTP dates and Groq reset durations without exposing raw headers", () => {
	const now = Date.parse("2026-10-23T06:00:00.000Z");
	assert.deepEqual(providerRateLimit(new Headers({ "retry-after": "1.7", "x-ratelimit-remaining-tokens": "0" }), now), { seconds: 2, scope: "tokens" });
	assert.equal(providerRateLimit(new Headers({ "retry-after": "Fri, 23 Oct 2026 06:00:42 GMT" }), now).seconds, 42);
	assert.deepEqual(providerRateLimit(new Headers({ "x-ratelimit-remaining-tokens": "0", "x-ratelimit-reset-tokens": "2m59.56s" }), now), { seconds: 180, scope: "tokens" });
	assert.deepEqual(providerRateLimit(new Headers({ "x-ratelimit-remaining-requests": "0", "x-ratelimit-reset-requests": "1h2m" }), now), { seconds: 3720, scope: "requests" });
	assert.deepEqual(providerRateLimit(new Headers({ "x-ratelimit-remaining-tokens": "0", "x-ratelimit-remaining-requests": "0", "x-ratelimit-reset-tokens": "100ms", "x-ratelimit-reset-requests": "1d" }), now), { seconds: 86400, scope: "unknown" });
	for (const value of ["secret invalid value", "-3", "Infinity", "99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999"]) {
		const result = providerRateLimit(new Headers({ "retry-after": value }), now);
		assert.ok(result.seconds >= 1 && result.seconds <= 86400); assert.ok(!JSON.stringify(result).includes(value));
	}
});
