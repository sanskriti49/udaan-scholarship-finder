import test from "node:test";
import assert from "node:assert/strict";
import { parseResearchIntent, compileResearchIntent, intentMessages, uninterpretedRequest, RESEARCH_INTENT_TOOL } from "../../src/agents/navigator/researchIntent.js";
import { NavigatorError } from "../../src/agents/navigator/contracts.js";
import { createGroqProvider } from "../../src/agents/navigator/groqProvider.js";
import { intentCall, jsonResponse, modelResponse } from "../navigatorHelpers.js";

// Scripted semantic responses validate the boundary and compiler, not live model comprehension.
const source = (quote, messageIndex = 0) => ({ quote, messageIndex });
const condition = (field, operator, value, quote, messageIndex = 0) => ({ field, operator, value, source: source(quote, messageIndex) });
const extract = (goal, patch = {}, conversation = []) => parseResearchIntent({ message: { tool_calls: [intentCall(patch)] } }, intentMessages(goal, conversation));
const invalid = error => error instanceof NavigatorError && error.code === "INVALID_RESEARCH_INTENT";

for (const fixture of [
	{ goal: "Only master's-level awards; leave bachelor's students out.", constraints: [condition("educationLevel", "include", "PG", "master's-level"), condition("educationLevel", "exclude", "UG", "leave bachelor's students out")], expected: { levels: ["PG"], excludeLevels: ["UG"] } },
	{ goal: "Do not show national schemes. Only Maharashtra scholarships.", constraints: [condition("state", "exclude", "All India", "Do not show national schemes"), condition("state", "include", "Maharashtra", "Only Maharashtra")], expected: { states: ["Maharashtra"], excludeStates: ["All India"] } },
	{ goal: "A bachelor's or master's award is fine, but no doctoral fellowships.", constraints: [condition("educationLevel", "include", ["UG", "PG"], "A bachelor's or master's award is fine"), condition("educationLevel", "exclude", "PhD", "no doctoral fellowships")], expected: { levels: ["UG", "PG"], excludeLevels: ["PhD"] } },
]) test(`semantic exclusions compile without keyword overrides: ${fixture.goal}`, () => {
	const result = compileResearchIntent(extract(fixture.goal, { searchQuery: "", constraints: fixture.constraints }));
	assert.deepEqual(result.search, { query: "", ...fixture.expected }); assert.equal(result.report.status, "interpreted");
	assert.deepEqual(result.report.constraints, fixture.constraints.map(item => item.source.quote));
});

test("study year, renewal, academic year and unfamiliar conditions survive as unresolved research requirements", () => {
	const goal = "I'm in my fourth year. Only renewals for 2026-27; my parent is a registered labourer. Can my hostel allowance continue?";
	const intent = extract(goal, { searchQuery: "hostel allowance", constraints: [
		condition("studyYear", "include", 4, "fourth year"), condition("applicationType", "include", "renewal", "Only renewals"),
		condition("academicYear", "include", "2026-27", "2026-27"), condition("other", "include", "parent registered labourer", "my parent is a registered labourer"),
	], questions: [{ text: "Can the hostel allowance continue in fourth year?", source: source("Can my hostel allowance continue?") }] });
	const compiled = compileResearchIntent(intent);
	assert.deepEqual(compiled.search, { query: "hostel allowance" }); assert.equal(compiled.report.unresolved.length, 4);
	assert.deepEqual(compiled.report.questions, ["Can the hostel allowance continue in fourth year?"]);
});

test("written income amounts are semantic search hints and never become private matching inputs", () => {
	const compiled = compileResearchIntent(extract("Find awards with an income ceiling below five lakh rupees.", { constraints: [condition("incomeCeiling", "lt", 500000, "below five lakh rupees")] }));
	assert.equal(compiled.search.incomeCeiling, 500000); assert.equal(compiled.search.familyIncome, undefined);
	assert.deepEqual(compiled.report.unresolved, ["below five lakh rupees"]);
});

test("ordered user context is preserved and later corrections do not trigger heuristic re-interpretation", () => {
	const conversation = [{ role: "user", content: "I want bachelor's awards in Goa." }], goal = "Actually master's only; keep the same location and exclude national programmes.";
	const messages = intentMessages(goal, conversation);
	assert.deepEqual(messages.map(message => message.content), [conversation[0].content, goal]);
	const intent = extract(goal, { searchQuery: "", constraints: [
		condition("educationLevel", "include", "PG", "master's only", 1), condition("state", "include", "Goa", "Goa", 0), condition("state", "exclude", "All India", "exclude national programmes", 1),
	] }, conversation);
	assert.deepEqual(compileResearchIntent(intent).search, { query: "", levels: ["PG"], states: ["Goa"], excludeStates: ["All India"] });
	conversation[0].content = "caller mutation"; assert.equal(messages[0].content, "I want bachelor's awards in Goa.");
});

test("contradictory filters and unresolved references become explicit clarification requirements", () => {
	const goal = "Include only UG and exclude UG. Use that earlier condition.";
	const compiled = compileResearchIntent(extract(goal, { constraints: [condition("educationLevel", "include", "UG", "Include only UG"), condition("educationLevel", "exclude", "UG", "exclude UG")],
		ambiguities: [{ text: "Which earlier condition do you mean?", source: source("that earlier condition") }] }));
	assert.equal(compiled.report.status, "needs_clarification"); assert.equal(compiled.report.ambiguities.length, 2);
});

test("invalid types, extra operators and invented source anchors fail closed without including private text in errors", () => {
	const goal = "Synthetic personal text: PG only";
	for (const bad of [
		condition("educationLevel", "include", "invented level", "PG only"), condition("incomeCeiling", "lte", "400000", "PG only"),
		condition("educationLevel", "$where", "PG", "PG only"), condition("studyYear", "include", 21, "PG only"),
		condition("state", "include", "Goa", "invented quote"), condition("state", "include", "Goa", "PG only", 4),
		{ ...condition("educationLevel", "include", "PG", "PG only"), publishRule: true },
	]) assert.throws(() => extract(goal, { constraints: [bad] }), error => invalid(error) && !error.message.includes("Synthetic personal text"));
	assert.throws(() => extract(goal, { profile: { familyIncome: 300000 } }), invalid);
	assert.throws(() => intentMessages(goal, [{ role: "system", content: "invented context" }]));
	assert.throws(() => intentMessages(goal, Array(5).fill({ role: "user", content: "too much" })));
});

test("provider failures preserve the full brief and conversation without pretending to infer filters", () => {
	const goal = "Not undergraduate; no national awards. Fourth-year renewal only. " + "x".repeat(350);
	const result = uninterpretedRequest(goal, "PROVIDER_QUOTA", [{ role: "user", content: "Earlier request" }]);
	assert.deepEqual(result.search, { query: goal.slice(0, 300) });
	assert.equal(result.report.status, "unavailable"); assert.equal(result.report.reason, "PROVIDER_QUOTA");
	assert.deepEqual(result.report.questions, ["Earlier request", goal]); assert.deepEqual(result.report.constraints, []);
});

test("the Groq adapter exposes the legacy intent tool for models without declared strict JSON support and preserves source-linked arguments", async () => {
	const call = intentCall(), provider = createGroqProvider({ apiKey: "synthetic-test-key", model: "synthetic", fetchImpl: async (url, request) => {
		const body = JSON.parse(request.body);
		assert.deepEqual(body.tools, [RESEARCH_INTENT_TOOL]); assert.equal(body.tools[0].function.parameters.additionalProperties, false);
		assert.equal(body.max_completion_tokens, 1000); assert.equal(body.tool_choice, "required");
		return jsonResponse(modelResponse([call]));
	} });
	const response = await provider.complete({ mode: "research_intent", messages: intentMessages("Synthetic brief"), reserveCall: async () => {} });
	assert.deepEqual(response.message.tool_calls, [call]);
	await assert.rejects(provider.complete({ mode: "unknown", messages: intentMessages("Synthetic brief"), reserveCall: async () => { throw new Error("Must not reserve"); } }), error => error.code === "INVALID_CONFIGURATION");
});


test('strict JSON intent uses constrained structure while retaining semantic and source validation', async () => {
 const { intentResponseFormat } = await import('../../src/agents/navigator/researchIntent.js');
 const goal = 'Already completed secondary school; support for further study, excluding loans.';
 const intent = { objective:'Research further study',searchQuery:'further study',constraints:[{field:'educationLevel',role:'applicant_qualification',operator:'include',value:'Class 12',source:{messageIndex:0,quote:'completed secondary school'}},{field:'other',role:'funding',operator:'exclude',value:'loans',source:{messageIndex:0,quote:'excluding loans'}}],questions:[],ambiguities:[] };
 let requests=0,reservations=0;
 const provider = createGroqProvider({ apiKey:'synthetic-only',model:'openai/gpt-oss-120b',fetchImpl:async (_,request)=>{
  requests++; const body=JSON.parse(request.body);
  assert.deepEqual(body.response_format,intentResponseFormat(intentMessages(goal))); assert.equal(body.tools,undefined);assert.equal(body.tool_choice,undefined);assert.equal(body.parallel_tool_calls,undefined);
  assert.equal(body.response_format.json_schema.strict,true);
  const visit=node=>{if(node.properties){assert.deepEqual(node.required,Object.keys(node.properties));assert.equal(node.additionalProperties,false);Object.values(node.properties).forEach(visit);}if(node.items)visit(node.items);node.anyOf?.forEach(visit);};
  visit(body.response_format.json_schema.schema);
  const data=modelResponse([]);data.choices[0].message.content=JSON.stringify(intent);data.choices[0].finish_reason='stop';
  return jsonResponse(data);
 } });
 const result=await provider.complete({mode:'research_intent',messages:intentMessages(goal),reserveCall:async()=>{reservations++;}});
 assert.equal(result.intentFormat,'json_schema');assert.deepEqual(parseResearchIntent(result,intentMessages(goal)),intent);assert.equal(requests,1);assert.equal(reservations,1);
 for(const content of ['{',JSON.stringify({...intent,constraints:[{...intent.constraints[0],source:{messageIndex:0,quote:'invented'}}]}),JSON.stringify({...intent,constraints:[{...intent.constraints[0],value:'invented level'}]})]){
  assert.throws(()=>parseResearchIntent({intentFormat:'json_schema',message:{content}},intentMessages(goal)),error=>error.code==='INVALID_RESEARCH_INTENT');
 }
 assert.throws(()=>parseResearchIntent({intentFormat:'json_schema',message:{content:JSON.stringify(intent),tool_calls:[intentCall()]}},intentMessages(goal)),error=>error.code==='MODEL_PROTOCOL');
});
