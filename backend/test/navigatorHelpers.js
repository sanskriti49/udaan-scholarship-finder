import { createHash } from "node:crypto";
import { makeEvidence } from "../src/pipeline/core/evidence.js";

export const SCHEME_ID = "111111111111111111111111";
export const OTHER_ID = "222222222222222222222222";
export const SNAPSHOT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
export const FIXTURE_NOW = new Date("2026-10-22T08:00:00.000Z");

/** Entirely synthetic; neither a scholarship feed nor a live model response. */
export function researchFixture({ linkedPdf = false } = {}) {
	const income = "SYNTHETIC TEST ONLY: Annual family income must not exceed Rs 300000.";
	const hostel = "SYNTHETIC TEST ONLY: Maintenance allowance for boarders is subject to the provider's hostel conditions.";
	const text = `${income}\n\n${hostel}`;
	const snapshot = { _id: SNAPSHOT_ID, id: SNAPSHOT_ID, sourceId: "synthetic_test", kind: linkedPdf ? "pdf" : "html", url: "https://example.invalid/synthetic-guideline",
		text, textHash: createHash("sha256").update(text).digest("hex"), fetchedAt: FIXTURE_NOW,
		pages: [{ page: 1, start: 0 }, { page: 2, start: text.indexOf(hostel) }] };
	const incomeEvidence = makeEvidence(snapshot, income, { field: "rules.income" });
	const hostelEvidence = makeEvidence(snapshot, hostel, { field: "description" });
	const scheme = { _id: SCHEME_ID, title: "Synthetic research fixture — not a real scholarship", organization: "Synthetic issuer", publication: { state: "published" },
		applicationLink: "https://example.invalid/apply", officialLinks: linkedPdf ? { guidelinesUrl: snapshot.url } : {},
		currentCycle: { academicYear: "2026-27", applicationType: "fresh", opensAt: "2026-10-01T00:00:00+05:30", closesAt: "2026-11-01T23:59:59+05:30", evidence: [] },
		freshness: { lastVerifiedAt: FIXTURE_NOW, staleAfterHours: 72 },
		fieldEvidence: [incomeEvidence], rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000 }], requiredDocuments: [] };
	const other = { ...structuredClone(scheme), _id: OTHER_ID, title: "Other synthetic scheme", fieldEvidence: [hostelEvidence] };
	const state = { schemes: [scheme, other], snapshots: [snapshot] };
	const repository = {
		async searchPublished() { return state.schemes; },
		async getPublished(ids) { return state.schemes.filter(s => ids.includes(String(s._id))); },
		async getSnapshots(ids) { return state.snapshots.filter(s => ids.includes(String(s._id))); },
	};
	return { state, repository, scheme, other, snapshot, income, hostel };
}

export function toolCall(name, args, id = "call_1") {
	return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

/** Synthetic semantic output; never attempts to interpret the supplied prose. */
export function intentCall(patch = {}) {
	return toolCall("interpretResearchRequest", { objective: "Find relevant recorded opportunities", searchQuery: "income", constraints: [], questions: [], ambiguities: [], ...patch });
}

export function modelResponse(calls) {
	return { choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: calls } }], usage: { prompt_tokens: 100, completion_tokens: 20 } };
}

export const jsonResponse = (data, options = {}) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }, ...options });
