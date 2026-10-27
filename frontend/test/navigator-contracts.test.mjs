import test from "node:test";
import assert from "node:assert/strict";
import { parseRun, selectedProfile, safeSourceUrl, planText, sourceCheckText, researchQuotaNotice, researchRetryTime, providerLabel } from "../src/navigator/contracts.js";
import { researchFixture, SCHEME_ID } from "../../backend/test/navigatorHelpers.js";
import { createResearchTools } from "../../backend/src/agents/navigator/researchTools.js";
import { compileResearchIntent } from '../../backend/src/agents/navigator/researchIntent.js';
import { answerPlanFixture } from '../../backend/test/answerFixture.js';

test('provider disclosures use known labels and never display unknown provider content', () => {
  assert.equal(providerLabel('groq'), 'Groq'); assert.equal(providerLabel('gemini'), 'Google Gemini');
  assert.equal(providerLabel(undefined), 'the configured AI service');
  assert.equal(providerLabel('<script>private</script>'), 'the configured AI service');
});

test('saved provider identity survives parsing and invalid provider metadata is rejected', () => {
  const parsed = parseRun({ ...run(), provider: 'gemini', model: 'gemini-3.8-flash' });
  assert.equal(parsed.provider, 'gemini'); assert.equal(parsed.model, 'gemini-3.8-flash');
  assert.equal(parseRun(run()).provider, undefined);
  for (const patch of [{ provider: 'unknown', model: 'x' }, { provider: 'gemini', model: 'https://bad.invalid' }, { provider: 'gemini' }]) assert.throws(() => parseRun({ ...run(), ...patch }));
});
import { adaptiveFixture, memoryJourney } from '../../backend/test/adaptiveFixture.js';

test('adaptive coverage gaps survive public parsing and notes without becoming eligibility failures', async () => {
  const result = await memoryJourney(adaptiveFixture({ missing: true, unavailable: true }));
  const r = { ...run(), status: 'completed', workflow: 'adaptive_v2', plan: result.session.plan };
  assert.equal(parseRun(r).plan.research.gaps[0].kind, 'missing_source');
  assert.match(planText(r), /official source was attempted/);
  for (const mutate of [copy => { copy.plan.research.gaps = {}; }, copy => { copy.plan.research.gaps[0].missingFields = ['secretField']; }, copy => { copy.plan.research.decisions = 100; }]) {
    const copy = structuredClone(r); mutate(copy); assert.throws(() => parseRun(copy), /unsupported research result/);
  }
});

test('source answers survive the public contract and export without turning source interpretations into verified eligibility', async () => {
  const plan = await answerPlanFixture(), r = { ...run(), status: 'completed', plan };
  const parsed = parseRun(r);
  assert.deepEqual(parsed.plan.entries[0].answer.conditions.map(c => c.status), ['supported', 'contradicted', 'unknown']);
  assert.equal(parsed.plan.entries[0].qualification.status, 'needs_verification');
  assert.equal(parsed.plan.entries[0].answer.concern, true);
  const text = planText(r); assert.match(text, /fourth-year renewal/); assert.match(text, /Source: https:/); assert.match(text, /not certified/);
  for (const mutate of [v => { v.plan.entries[0].answer.conditions[0].evidence[0].quote = 'A fabricated official quotation'; },
    v => { v.plan.entries[0].answer.conditions[0].evidence = []; }, v => { v.plan.answer.cacheHit = 'yes'; }]) {
    const copy = structuredClone(r); mutate(copy); assert.throws(() => parseRun(copy));
  }
});

test('partial findings export no rejected claims and cannot be forged into an answered result', async () => {
  const r = { ...run(), status: 'completed', plan: await answerPlanFixture({ invalidRenewal: true }) };
  const result = parseRun(r); assert.equal(result.plan.answer.acceptedAssessments, 2); assert.equal(result.plan.answer.rejectedAssessments, 1);
  const text = planText(result); assert.match(text, /Class 12/); assert.match(text, /Technical validation details/); assert.match(text, /QUOTE_NOT_FOUND/); assert.doesNotMatch(text, /PRIVATE_UNSUPPORTED|guaranteed for every year/);
  const forged = structuredClone(r); forged.plan.answer.status = 'answered'; assert.throws(() => parseRun(forged));
  const altered = structuredClone(r); altered.plan.entries[0].answer.conditions[0].evidence[0].span.charStart++; assert.throws(() => parseRun(altered));
  const legacy = structuredClone(r); legacy.plan.answer.version = 1;
  for (const entry of legacy.plan.entries) for (const condition of entry.answer.conditions) for (const proof of condition.evidence) delete proof.span;
  assert.equal(parseRun(legacy).plan.answer.version, 1);
});

const run = () => ({ runId: "0e659cbf-582c-4545-b2a1-3649eb39dd26", goal: "A synthetic question", revision: 0, status: "ready",
	createdAt: "2026-10-22T00:00:00Z", expiresAt: "2026-10-29T00:00:00Z", limits: { maxModelCalls: 6, maxToolCalls: 8 },
	usage: { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, reportedModelCalls: 0, tokenUsageIncomplete: false }, events: [], clarification: null, plan: null, error: null });

test('real coverage plans preserve unknown applicability independently from passed eligibility checks and exports', async () => {
  const fixture = researchFixture();
  const { retrieval, report } = compileResearchIntent({ objective: 'Funding', searchQuery: '', constraints: [{ field: 'educationLevel', operator: 'include', value: 'UG', source: { messageIndex: 0, quote: 'synthetic' } }], questions: [], ambiguities: [] });
  const tools = createResearchTools({ repository: fixture.repository, profile: { familyIncome: 0 }, retrieval, includeContext: true });
  const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'income' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(item => item.id) }] });
  plan.intent = report; plan.coverage = { reviewed: [{ schemeId: SCHEME_ID, title: fixture.scheme.title, ...plan.entries[0].retrieval, examined: true }], excluded: [], deferred: [] };
  const r = { ...run(), status: 'completed', plan };
  assert.equal(parseRun(r).plan.entries[0].matching.status, 'passed');
  assert.equal(parseRun(r).plan.entries[0].retrieval.status, 'unknown');
  assert.match(planText(r), /Important details still need checking/);
  assert.match(planText(r), /Education level: UG: unknown/);
  const forged = structuredClone(r); forged.plan.entries[0].retrieval.status = 'match';
  assert.throws(() => parseRun(forged));
  const badCitation = structuredClone(r); badCitation.plan.entries[0].retrieval.conditions[0].evidenceIds = ['ev_' + 'a'.repeat(40)];
  assert.throws(() => parseRun(badCitation));
});

test("selected profile keeps zero and false, omits blanks and excludes unrequested identity fields", () => {
	assert.deepEqual(selectedProfile({ familyIncome: "0", hasDisability: "false", cgpa: "", state: "", fullName: "Never shared", ownerId: "Injected" }), { familyIncome: 0, hasDisability: false });
	assert.deepEqual(selectedProfile({ state: "Goa", familyIncome: "9000" }, ["state"]), { state: "Goa" });
	for (const bad of [{ percentage: "101" }, { cgpa: "11" }, { familyIncome: "-1" }, { familyIncome: "NaN" }, { hasDisability: "maybe" }]) assert.throws(() => selectedProfile(bad));
});

test("evidence availability uses a bounded server count and accepts an honest empty-retrieval event", () => {
	const parsed = parseRun({ ...run(), collectedPassageCount: 0, workflow: "catalogue_v1", catalogueNoAI: true,
		events: [{ sequence: 1, type: "tool_completed", tool: "findGuidelinePassages", resultCount: 0 }, { sequence: 2, type: "model_failed" }] });
	assert.equal(parsed.collectedPassageCount, 0); assert.equal(parsed.catalogueNoAI, true);
	for (const patch of [{ collectedPassageCount: -1 }, { collectedPassageCount: 49 }, { collectedPassageCount: "4" }, { workflow: "invented" }, { catalogueNoAI: "true" }]) assert.throws(() => parseRun({ ...run(), ...patch }));
});

test("daily application allowances and provider limits have different notices and an explicit India reset time", () => {
	const daily = researchQuotaNotice({ status: "quota_exhausted", error: { code: "QUOTA_EXHAUSTED" } });
	assert.equal(daily.label, "Today’s research allowance is used up"); assert.match(daily.message, /shared daily/); assert.match(daily.message, /does not reset/);
	const provider = researchQuotaNotice({ status: "quota_exhausted", error: { code: "PROVIDER_QUOTA" } });
	assert.equal(provider.label, "Research needs a short pause"); assert.match(provider.message, /temporarily/); assert.match(provider.message, /sources already collected/);
	assert.equal(researchQuotaNotice({ status: "cancelled", error: { code: "QUOTA_EXHAUSTED" } }), null);
	assert.equal(researchQuotaNotice({ status: "quota_exhausted", error: { code: "UNKNOWN" } }), null);
	assert.match(researchRetryTime("2026-10-24T00:00:00.000Z"), /24 Oct 2026/); assert.match(researchRetryTime("2026-10-24T00:00:00.000Z"), /5:30/);
	assert.equal(researchRetryTime("invalid"), null); assert.equal(researchRetryTime(null), null);
});
test("run parser rejects missing, unbounded and inconsistent responses", () => {
	assert.equal(parseRun(run()).status, "ready");
	for (const patch of [{ runId: "../injection" }, { status: "invented" }, { revision: -1 }, { createdAt: "unknown" }, { status: "completed" }, { status: "awaiting_input" }, { events: [{ sequence: 1, type: "thought", private: "secret" }] }, { events: Array(101).fill({}) }]) assert.throws(() => parseRun({ ...run(), ...patch }));
	assert.equal(parseRun({ ...run(), privateProfile: { familyIncome: 999 } }).privateProfile, undefined);
});
test("unknown clarification fields and unsafe source links fail closed", () => {
	assert.throws(() => parseRun({ ...run(), clarification: { kind: "clarification", fields: ["fullName"] } }));
	for (const url of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "https://user:password@example.com"]) assert.equal(safeSourceUrl(url), null);
	assert.equal(safeSourceUrl("https://scholarships.gov.in/"), "https://scholarships.gov.in/");
});
test("empty real plans export evidence gaps and research boundaries", () => {
	const r = { ...run(), status: "completed", plan: { kind: "plan", generatedAt: run().createdAt, entries: [], outcome: "insufficient_evidence", caveat: "Research aid; official eligibility not confirmed." } };
	assert.equal(parseRun(r).plan.entries.length, 0);
	assert.match(planText(r), /No sufficiently supported shortlist/); assert.match(planText(r), /official eligibility not confirmed/);
});

test("intent reports preserve unresolved conditions and failure reasons in exports without declaring them verified", () => {
	const r = { ...run(), status: "completed", plan: { kind: "plan", generatedAt: run().createdAt, entries: [], outcome: "insufficient_evidence", caveat: "Research aid.",
		intent: { status: "interpreted", reason: null, constraints: ["fourth year"], questions: ["Can the award be renewed?"], unresolved: ["fourth year"], ambiguities: [] } } };
	assert.equal(parseRun(r).plan.intent.unresolved[0], "fourth year");
	assert.match(planText(r), /Condition not resolved by catalogue filters: fourth year/);
	assert.match(planText(r), /Research question: Can the award be renewed/);
	r.plan.intent = { ...r.plan.intent, status: "unavailable", reason: "INVALID_RESEARCH_INTENT" };
	assert.match(planText(parseRun(r)), /unavailable \(INVALID_RESEARCH_INTENT\)/);
	for (const patch of [{ status: "confirmed_eligible" }, { unresolved: Array(13).fill("too much") }, { questions: [123] }, { reason: {} }]) {
		assert.throws(() => parseRun({ ...r, plan: { ...r.plan, intent: { ...r.plan.intent, ...patch } } }));
	}
});

test("source receipts validate and export real outcomes while old plans remain readable", async () => {
	const fixture = researchFixture(), tools = createResearchTools({ repository: fixture.repository });
	const { passages } = await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" });
	await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
	const plan = await tools.execute("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: [passages[0].id] }] });
	const r = { ...run(), status: "completed", plan }, entry = plan.entries[0];
	delete entry.sourceChecks; assert.equal(parseRun(r).plan.entries.length, 1);
	assert.match(planText(r), /Official source check: Not performed/);
	const check = { snapshotId: fixture.snapshot._id, url: fixture.snapshot.url, checkedAt: run().createdAt, status: "changed", reason: "different_bytes" };
	entry.sourceChecks = [check]; assert.equal(parseRun(r).plan.entries[0].sourceChecks[0].status, "changed");
	assert.match(planText(r), /Source content changed/); assert.match(planText(r), /2026-10-22/);
	assert.match(sourceCheckText({ reason: "unsupported_snapshot" }), /cannot be compared/);
	for (const patch of [{ status: "unchanged" }, { url: "javascript:alert(1)" }, { reason: "made_up" }, { checkedAt: "unknown" }, { snapshotId: "invalid" }]) {
		entry.sourceChecks = [{ ...check, ...patch }]; assert.throws(() => parseRun(r));
	}
	entry.sourceChecks = [check, check]; assert.throws(() => parseRun(r));
});


test('qualification crosses the real backend contract, explains rejection, and rejects forged supported claims', async () => {
  const fixture = researchFixture();
  const tools = createResearchTools({ repository: fixture.repository, profile: { familyIncome: 500000 }, includeContext: true });
  const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'income' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
  const r = { ...run(), status: 'completed', plan };
  assert.equal(parseRun(r).plan.entries[0].qualification.status, 'excluded');
  assert.match(planText(r), /Not suitable for this request/); assert.match(planText(r), /Annual family income/);
  assert.doesNotMatch(planText(r), /500000/);
  const forged = structuredClone(r); forged.plan.entries[0].qualification = { status: 'supported', supported: [], unresolved: [], reasons: [] };
  assert.throws(() => parseRun(forged));
  delete r.plan.entries[0].qualification; assert.equal(parseRun(r).plan.entries[0].matching.status, 'failed');
});


test('typed category support and pre-inspection exclusions round-trip through the student contract', async () => {
  const fixture = researchFixture();
  fixture.scheme.rules = [{ id: 'category', field: 'casteCategory', operator: 'IN', targetValue: ['OBC'] }];
  fixture.other.rules = [{ id: 'category', field: 'casteCategory', operator: 'IN', targetValue: ['SC'] }];
  const { retrieval } = compileResearchIntent({ objective: 'Funding', searchQuery: '', constraints: [{ field: 'category', role: 'funding', value: 'OBC', operator: 'include', source: { messageIndex: 0, quote: 'synthetic' } }], questions: [], ambiguities: [] });
  const tools = createResearchTools({ repository: fixture.repository, profile: { casteCategory: 'OBC' }, retrieval, includeContext: true });
  const search = await tools.execute('searchScholarships', {});
  const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'income' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
  plan.coverage = { reviewed: [], deferred: [], excluded: search.excluded.map(item => ({ schemeId: item.schemeId, title: item.title, ...item.retrieval, qualification: item.qualification, examined: false })) };
  const r = parseRun({ ...run(), status: 'completed', plan });
  assert.equal(r.plan.entries[0].qualification.status, 'supported');
  assert.match(planText(r), /Promising candidate/); assert.match(planText(r), /Not suitable:.*SC/);
});
