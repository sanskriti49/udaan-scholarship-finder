import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { makeEvidence, verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { createResearchTools } from "../../src/agents/navigator/researchTools.js";
import { findPassages, queryTerms, safeSourceUrl } from "../../src/agents/navigator/passages.js";
import { createMongoResearchRepository } from "../../src/agents/navigator/mongoRepository.js";
import { NavigatorError } from "../../src/agents/navigator/contracts.js";
import { researchFixture, SCHEME_ID, OTHER_ID, SNAPSHOT_ID, FIXTURE_NOW } from "../navigatorHelpers.js";

const toolsFor = (fixture, profile = {}) => createResearchTools({ repository: fixture.repository, profile, now: () => FIXTURE_NOW });

test("resumed pre-discovery matching summaries are recomputed while exact source evidence survives", async () => {
	for (const [profile, expected] of [[{ stream: "Engineering" }, "failed"], [{ stream: "Medical" }, "passed"], [{}, "unknown"]]) {
		const fixture = researchFixture();
		fixture.scheme.rules = [];
		fixture.scheme.eligibility = { eligibleStreams: ["Medical"] };
		const tools = toolsFor(fixture, profile);
		const found = await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" });
		await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
		const checkpoint = tools.exportState();
		Object.assign(checkpoint.evaluations[0][1].summary, { policyVersion: 3, status: "passed", failedCount: 0, unknownCount: 0, missingFields: [] });
		const resumed = createResearchTools({ repository: fixture.repository, profile, checkpoint, now: () => FIXTURE_NOW });
		const plan = await resumed.execute("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
		assert.equal(plan.entries[0].matching.status, expected);
		assert.equal(plan.entries[0].matching.policyVersion, 4);
		assert.equal(plan.entries[0].citations[0].evidence.quote, fixture.income);
	}
});
const code = expected => error => error instanceof NavigatorError && error.code === expected;
async function citeAndMatch(tools, schemeId = SCHEME_ID, query = "income") {
	const found = await tools.execute("findGuidelinePassages", { schemeId, query });
	await tools.execute("evaluateMatches", { schemeIds: [schemeId] });
	return { schemeId, evidenceIds: found.passages.map(p => p.id) };
}

test("shared listings cannot lend another scholarship's hostel clause to this scheme", async () => {
	const fixture = researchFixture(), tools = toolsFor(fixture);
	assert.equal((await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "hostel fees" })).passages.length, 0);
	const other = await tools.execute("findGuidelinePassages", { schemeId: OTHER_ID, query: "hostel" });
	assert.equal(other.passages.length, 1);
	assert.equal(other.passages[0].evidence.quote, fixture.hostel);
	assert.equal(other.passages[0].scope, "scheme_cited_excerpt");
	assert.ok(queryTerms("Does this scholarship cover hostel fees?").includes("boarders"));
});

test("a linked PDF can answer an unmodelled question while preserving exact page and offsets", async () => {
	const fixture = researchFixture({ linkedPdf: true });
	const [passage] = findPassages(fixture.scheme, [fixture.snapshot], "hostel fees");
	assert.equal(passage.evidence.page, 2);
	assert.equal(passage.evidence.quote, fixture.hostel);
	assert.equal(passage.evidence.charStart, fixture.snapshot.text.indexOf(fixture.hostel));
	assert.equal(passage.scope, "linked_guideline");
	assert.equal(passage.interpretationVerified, false);
	assert.equal(passage.documentDate, null);
	assert.equal(passage.academicYear, undefined);
	assert.equal(verifyEvidence(passage.evidence, fixture.snapshot).ok, true);
});

test("hash, URL, offset and quotation mismatches do not become model context", () => {
	for (const change of [{ textHash: "forged" }, { url: "https://example.invalid/other" }, { charStart: -1 }, { charEnd: 99999 }, { quote: "invented" }, { snapshotId: "bbbbbbbbbbbbbbbbbbbbbbbb" }]) {
		const fixture = researchFixture({ linkedPdf: true });
		Object.assign(fixture.scheme.fieldEvidence[0], change);
		assert.deepEqual(findPassages(fixture.scheme, [fixture.snapshot], "hostel"), []);
	}
	const fixture = researchFixture({ linkedPdf: true });
	fixture.scheme.fieldEvidence = [];
	fixture.scheme.provenanceQuotes = [{ snapshotId: SNAPSHOT_ID, quote: fixture.income, sourceUrl: fixture.snapshot.url }];
	assert.deepEqual(findPassages(fixture.scheme, [fixture.snapshot], "hostel"), []);
});

test("source text integrity and the pipeline's actual manual-review flag are preserved", () => {
	const fixture = researchFixture({ linkedPdf: true });
	fixture.snapshot.quality = { requiresManualReview: true };
	assert.equal(findPassages(fixture.scheme, [fixture.snapshot], "hostel")[0].extractionNeedsReview, true);
	// A valid old bound quote must not authorize newly altered surrounding PDF content.
	fixture.snapshot.text += " Undetected content change outside the original cited span.";
	assert.deepEqual(findPassages(fixture.scheme, [fixture.snapshot], "hostel"), []);
});

test("retrieval is bounded and exact even across repeated text and surrogate pairs", () => {
	const fixture = researchFixture({ linkedPdf: true });
	fixture.snapshot.text = `${fixture.income}\n${"Hostel 😀 boarders have conditional support. ".repeat(160)}`;
	fixture.snapshot.textHash = createHash("sha256").update(fixture.snapshot.text).digest("hex");
	fixture.snapshot.pages = [{ page: 1, start: 0 }];
	fixture.scheme.fieldEvidence = [makeEvidence(fixture.snapshot, fixture.income)];
	const passages = findPassages(fixture.scheme, [fixture.snapshot], "hostel");
	assert.equal(passages.length, 4);
	for (const passage of passages) {
		assert.ok(passage.evidence.quote.length <= 1400);
		assert.equal(verifyEvidence(passage.evidence, fixture.snapshot).ok, true);
		assert.ok(!/^[\uDC00-\uDFFF]/.test(passage.evidence.quote));
		assert.ok(!/[\uD800-\uDBFF]$/.test(passage.evidence.quote));
	}
	assert.deepEqual(passages.map(p => p.id), findPassages(fixture.scheme, [fixture.snapshot], "hostel").map(p => p.id));
});

test("unpublished and legacy records are excluded even when a repository returns them", async () => {
	const fixture = researchFixture();
	fixture.scheme.publication.state = "needs_review";
	fixture.other.legacy = true;
	const tools = toolsFor(fixture);
	assert.deepEqual((await tools.execute("searchScholarships", {})).schemes, []);
	await assert.rejects(tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] }), code("SCHEME_UNAVAILABLE"));
});

test("matching preserves unknowns and returns no private values or profile mutations", async () => {
	const fixture = researchFixture();
	fixture.scheme.rules.push({ id: "domicile", field: "state", operator: "EQ", targetValue: "Maharashtra" });
	const profile = Object.freeze({ fullName: "Private Student Name", familyIncome: 218765, percentage: 73.3, state: "All India" });
	const before = JSON.stringify(fixture.state);
	const tools = toolsFor(fixture, profile);
	const output = await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
	assert.equal(output.matches[0].status, "unknown");
	assert.deepEqual(output.matches[0].missingFields, ["state"]);
	assert.equal(output.matches[0].passedCount, 1);
	assert.equal(JSON.stringify(fixture.state), before);
	for (const secret of ["Private Student Name", "218765", "73.3", "All India"]) assert.ok(!JSON.stringify(output).includes(secret));
	assert.deepEqual((await tools.execute("requestClarification", { fields: ["state"] })).fields, ["state"]);
	await assert.rejects(tools.execute("requestClarification", { fields: ["familyIncome"] }), code("INVALID_CLARIFICATION"));
});

test("manual review remains distinct from missing profile fields", async () => {
	const fixture = researchFixture();
	fixture.scheme.dataQuality = { unknownFields: ["eligibility"] };
	const tools = toolsFor(fixture, { familyIncome: 0 });
	const output = await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
	assert.equal(output.matches[0].status, "unknown");
	assert.equal(output.matches[0].requiresManualReview, true);
	assert.deepEqual(output.matches[0].missingFields, []);
	await assert.rejects(tools.execute("requestClarification", { fields: ["state"] }), code("INVALID_CLARIFICATION"));
});

test("plans use server facts, matching and retrieved evidence IDs; fabrication is rejected", async () => {
	const fixture = researchFixture(), tools = toolsFor(fixture, { familyIncome: 0 });
	const selection = await citeAndMatch(tools);
	const plan = await tools.execute("finishInvestigation", { selections: [selection] });
	assert.equal(plan.entries[0].title, fixture.scheme.title);
	assert.equal(plan.entries[0].matching.status, "passed");
	assert.equal(plan.entries[0].status, "open");
	assert.equal(plan.entries[0].academicYear, "2026-27");
	assert.equal(plan.outcome, "review_required");
	assert.equal(plan.entries[0].citations[0].evidence.quote, fixture.income);
	await assert.rejects(tools.execute("finishInvestigation", { selections: [{ ...selection, evidenceIds: [`ev_${"0".repeat(40)}`] }] }), code("INVALID_CITATION"));
	await assert.rejects(tools.execute("finishInvestigation", { selections: [{ ...selection, title: "Invented award" }] }), code("INVALID_TOOL_ARGUMENTS"));
	await tools.execute("evaluateMatches", { schemeIds: [OTHER_ID] });
	await assert.rejects(tools.execute("finishInvestigation", { selections: [{ ...selection, schemeId: OTHER_ID }] }), code("INVALID_CITATION"));
	assert.equal((await tools.execute("finishInvestigation", { selections: [] })).outcome, "insufficient_evidence");
});

test("finishing runs missing deterministic matching locally and rejects a previous rule version", async () => {
	const fixture = researchFixture(), tools = toolsFor(fixture);
	const cited = await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" });
	const selection = { schemeId: SCHEME_ID, evidenceIds: cited.passages.map(p => p.id) };
	const plan = await tools.execute("finishInvestigation", { selections: [selection] });
	assert.equal(plan.entries[0].matching.status, "unknown"); assert.deepEqual(plan.entries[0].matching.missingFields, ["familyIncome"]);
	await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
	fixture.scheme.rules[0].targetValue = 200000;
	await assert.rejects(tools.execute("finishInvestigation", { selections: [selection] }), code("SOURCE_CHANGED"));
});

test("citation proofs are checked again when finishing, including deleted or altered snapshots", async () => {
	for (const change of [fixture => { fixture.state.snapshots = []; }, fixture => { fixture.snapshot.text = fixture.snapshot.text.replace("300000", "999999"); }, fixture => { fixture.snapshot.textHash = "changed"; }]) {
		const fixture = researchFixture(), tools = toolsFor(fixture);
		const selection = await citeAndMatch(tools);
		change(fixture);
		await assert.rejects(tools.execute("finishInvestigation", { selections: [selection] }), code("SOURCE_CHANGED"));
	}
});

test("missing cycles and unsafe application links remain unknown rather than fabricated", async () => {
	const fixture = researchFixture();
	fixture.scheme.currentCycle = null;
	fixture.scheme.applicationLink = "javascript:alert(1)";
	const [scheme] = (await toolsFor(fixture).execute("searchScholarships", {})).schemes;
	assert.equal(scheme.academicYear, null); assert.equal(scheme.deadline, null); assert.equal(scheme.status, "unknown"); assert.equal(scheme.applicationLink, null);
	for (const url of ["http://example.invalid", "https://user:password@example.invalid", "file:///tmp/file", "javascript:alert(1)"]) assert.equal(safeSourceUrl(url), null);
});

test("invalid or future verification timestamps cannot make an opportunity look fresh", async () => {
	for (const lastVerifiedAt of ["not-a-date", "2050-01-01T00:00:00Z"]) {
		const fixture = researchFixture();
		fixture.scheme.freshness.lastVerifiedAt = lastVerifiedAt;
		const [scheme] = (await toolsFor(fixture).execute("searchScholarships", {})).schemes;
		assert.equal(scheme.stale, true);
		assert.equal(scheme.lastVerifiedAt, null);
	}
});

test("recorded date conflicts remain unknown even if one date looks open", async () => {
	const fixture = researchFixture();
	fixture.scheme.currentCycle.hasConflict = true;
	const [scheme] = (await toolsFor(fixture).execute("searchScholarships", {})).schemes;
	assert.equal(scheme.status, "unknown");
	assert.match(scheme.statusReason, /disagree/);
});

test("Mongo repository uses bounded publication-filtered reads and no model-authored operators", async () => {
	const requests = [];
	const Model = { aggregate(pipeline) {
		const request = { filter: pipeline[0].$match, pipeline, limit: pipeline.find(stage => stage.$limit)?.$limit }; requests.push(request);
		return { async option(options) { request.timeout = options.maxTimeMS; return []; } };
	}, find(filter) {
		const request = { filter }; requests.push(request);
		const chain = { select(value) { request.select = value; return chain; }, sort(value) { request.sort = value; return chain; }, limit(value) { request.limit = value; return chain; }, maxTimeMS(value) { request.timeout = value; return chain; }, async lean() { return []; } };
		return chain;
	} };
	const repo = createMongoResearchRepository({ ScholarshipModel: Model, SnapshotModel: Model });
	await repo.searchPublished({ query: "$where special.*", limit: 1000 });
	assert.equal(requests[0].limit, 8); assert.equal(requests[0].timeout, 3000);
	assert.equal(requests[0].filter.$and[0]["publication.state"], "published");
	assert.ok(!Object.hasOwn(requests[0].filter, "$where"));
	assert.ok(requests[0].pipeline.findIndex(stage => stage.$sort) < requests[0].pipeline.findIndex(stage => stage.$limit));
	await repo.getPublished([SCHEME_ID]);
	assert.equal(requests[1].filter["publication.state"], "published");
	assert.deepEqual(requests[1].filter._id.$in, [SCHEME_ID]);
	await repo.getSnapshots(Array(20).fill(SNAPSHOT_ID));
	assert.equal(requests[2].filter._id.$in.length, 12);
});

test("filler-only and punctuation-only searches do not silently become catalogue browsing", async () => {
	let reads = 0;
	const repo = createMongoResearchRepository({ ScholarshipModel: { find() { reads++; }, aggregate() { reads++; } } });
	for (const query of ["help me find a scholarship", "a an the for", "$where .*", "???"]) assert.deepEqual(await repo.searchPublished({ query }), []);
	assert.equal(reads, 0);
});

test("research context restores checked evidence without raw profile data or shared mutable outputs", async () => {
	const fixture = researchFixture(), tools = toolsFor(fixture, { familyIncome: 218765 });
	const found = await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" });
	const selection = { schemeId: SCHEME_ID, evidenceIds: found.passages.map(passage => passage.id) };
	await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
	found.passages[0].evidence.quote = "modified by caller";
	const context = tools.exportState(); assert.ok(!JSON.stringify(context).includes("218765"));
	const restored = createResearchTools({ repository: fixture.repository, profile: { familyIncome: 218765 }, checkpoint: context });
	context.passages[0][1].evidence.quote = "another caller mutation";
	assert.equal((await restored.execute("finishInvestigation", { selections: [selection] })).entries[0].citations[0].evidence.quote, fixture.income);
	fixture.scheme.rules[0].targetValue = 200000;
	await assert.rejects(restored.execute("finishInvestigation", { selections: [selection] }), code("SOURCE_CHANGED"));
	assert.throws(() => createResearchTools({ repository: fixture.repository, checkpoint: { version: 999, evaluations: [], passages: [] } }), code("CHECKPOINT_INVALID"));
});
