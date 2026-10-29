import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createResearchTools } from "../agents/navigator/researchTools.js";
import { investigate } from "../agents/navigator/investigation.js";
import { makeEvidence } from "../pipeline/core/evidence.js";

// Explicit synthetic data: this script never imports dotenv, connects to MongoDB,
// starts the application, or instantiates a live model provider.
const schemeId = "111111111111111111111111", snapshotId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const now = new Date("2026-10-22T08:00:00.000Z");
const text = "SYNTHETIC DEMO ONLY: Annual family income must not exceed Rs 300000. Maharashtra domicile is required.\n\nSYNTHETIC DEMO ONLY: Maintenance allowance for boarders depends on the provider's stated hostel conditions.";
const snapshot = { id: snapshotId, sourceId: "synthetic_navigator_demo", kind: "pdf", url: "https://example.invalid/synthetic-guidelines.pdf", text,
	textHash: createHash("sha256").update(text).digest("hex"), fetchedAt: now, pages: [{ page: 1, start: 0 }] };
const scheme = { _id: schemeId, title: "Synthetic Navigator demonstration — not a real scholarship", publication: { state: "published" },
	applicationLink: "https://example.invalid/apply", officialLinks: { guidelinesUrl: snapshot.url }, freshness: { lastVerifiedAt: now },
	currentCycle: { academicYear: "2026-27", applicationType: "fresh", opensAt: "2026-10-01T00:00:00+05:30", closesAt: "2026-11-01T23:59:59+05:30" },
	rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000 }, { id: "domicile", field: "state", operator: "EQ", targetValue: "Maharashtra" }],
	fieldEvidence: [makeEvidence(snapshot, "Annual family income must not exceed Rs 300000.", { field: "rules.income" })] };
const repository = {
	async searchPublished() { return [scheme]; },
	async getPublished(ids) { return ids.includes(schemeId) ? [scheme] : []; },
	async getSnapshots(ids) { return ids.includes(snapshotId) ? [snapshot] : []; },
};
const call = (name, args, id = name) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });

function scriptedProvider({ clarify = false } = {}) {
	let turn = 0;
	return { name: "synthetic-offline", model: "scripted-fixture-not-ai", async complete({ messages }) {
		turn++;
		let calls;
		if (turn === 1) calls = [call("searchScholarships", {})];
		else if (turn === 2) calls = [call("findGuidelinePassages", { schemeId, query: "hostel support" }), call("evaluateMatches", { schemeIds: [schemeId] })];
		else if (clarify) calls = [call("requestClarification", { fields: ["familyIncome", "state"] })];
		else {
			const found = messages.filter(message => message.role === "tool").map(message => JSON.parse(message.content)).find(output => output.kind === "passages");
			calls = [call("finishInvestigation", { selections: [{ schemeId, evidenceIds: found.passages.map(passage => passage.id) }] })];
		}
		return { message: { role: "assistant", content: null, tool_calls: calls } };
	} };
}

console.log("Udaan Navigator — OFFLINE SYNTHETIC WALKTHROUGH (no AI API, database, portal or notification calls)\n");
for (const clarify of [false, true]) {
	const tools = createResearchTools({ repository, profile: clarify ? {} : { familyIncome: 0, state: "Maharashtra" }, now: () => now });
	let reservations = 0;
	const result = await investigate({ goal: "Find scholarship guidance about hostel support and check the recorded conditions.", provider: scriptedProvider({ clarify }), tools, reserveCall: async () => { reservations++; } });
	assert.equal(result.status, clarify ? "awaiting_input" : "completed");
	assert.equal(reservations, 3);
	console.log(clarify ? "Scenario 2 — missing inputs remain unknown" : "Scenario 1 — cited research plan");
	for (const event of result.events) console.log(`  ${event.sequence}. ${event.type}${event.tool ? `: ${event.tool}` : ""}`);
	console.log(`  State: ${result.status}; model fixtures: ${result.usage.modelCalls}; tool executions: ${result.usage.toolCalls}`);
	if (result.plan) {
		const entry = result.plan.entries[0];
		console.log(`  ${entry.title}`);
		console.log(`  Recorded matching: ${entry.matching.status}; final outcome: ${result.plan.outcome}`);
		console.log(`  Checked quote: ${entry.citations[0].evidence.quote}`);
	} else console.log(`  Optional clarification: ${result.clarification.fields.join(", ")}`);
	console.log();
}
console.log("Passed. Real model quality, live account quotas, HTTP persistence and deployment are not exercised by this walkthrough.");
