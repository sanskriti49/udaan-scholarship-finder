import test from "node:test";
import assert from "node:assert/strict";
import { makeEvidence, verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { createHash } from "node:crypto";
import { findPassages, queryTerms } from "../../src/agents/navigator/passages.js";
import { createGroqProvider } from "../../src/agents/navigator/groqProvider.js";
import { researchFixture, modelResponse, jsonResponse, toolCall } from "../navigatorHelpers.js";

test("Indian income formats rank the same source without changing exact citation proofs", () => {
	const fixture = researchFixture();
	fixture.snapshot.text = "The gross parental earnings limit is Rs. 4,50,000/- per annum.";
	fixture.snapshot.textHash = createHash("sha256").update(fixture.snapshot.text).digest("hex");
	fixture.scheme.fieldEvidence = [makeEvidence(fixture.snapshot, fixture.snapshot.text)];
	for (const query of ["4.5 lakh", "4.5 lakhs", "4.50 lac", "450000", "4,50,000"]) {
		assert.ok(queryTerms(query).includes("450000"));
		const found = findPassages(fixture.scheme, [fixture.snapshot], query);
		assert.equal(found.length, 1); assert.equal(found[0].evidence.quote, fixture.snapshot.text);
		assert.equal(verifyEvidence(found[0].evidence, fixture.snapshot).ok, true);
	}
	assert.deepEqual(findPassages(fixture.scheme, [fixture.snapshot], "8 lakh"), []);
});

test("supporting context is explicit and never borrows another scheme's shared-page conditions", () => {
	const fixture = researchFixture();
	assert.deepEqual(findPassages(fixture.scheme, [fixture.snapshot], "hostel"), []);
	const context = findPassages(fixture.scheme, [fixture.snapshot], "hostel", { includeContext: true });
	assert.equal(context.length, 1); assert.equal(context[0].relevance, "scheme_context");
	assert.equal(context[0].evidence.quote, fixture.income);
	fixture.scheme.fieldEvidence[0].charStart++;
	assert.deepEqual(findPassages(fixture.scheme, [fixture.snapshot], "hostel", { includeContext: true }), []);
});

test("the optional planner sends only the search tool and a small output budget", async () => {
	const provider = createGroqProvider({ apiKey: "synthetic-test-key", model: "synthetic", fetchImpl: async (url, request) => {
		const body = JSON.parse(request.body);
		assert.deepEqual(body.tools.map(tool => tool.function.name), ["searchScholarships"]);
		assert.equal(body.max_completion_tokens, 250);
		return jsonResponse(modelResponse([toolCall("searchScholarships", { query: "hostel" })]));
	} });
	await provider.complete({ mode: "search_plan", messages: [{ role: "user", content: "Synthetic question" }], reserveCall: async () => {} });
});
