import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResearchIntent, compileResearchIntent, intentMessages, intentResponseFormat, RESEARCH_INTENT_RESPONSE_FORMAT } from '../../src/agents/navigator/researchIntent.js';
import { createGroqProvider } from '../../src/agents/navigator/groqProvider.js';
import { assessRetrieval, providedApplicantFields } from '../../src/agents/navigator/retrievalCoverage.js';

const brief = 'I belong to the SC category and got admitted to B.Tech. My family annual income is 5 lakhs. Am I eligible for the Top Class Education Scheme or the Post-Matric SC scholarship?';
const condition = (field, operator, value, quote, role = 'applicant_current') => ({ field, role, operator, value, source: { messageIndex: 0, quote } });
const intent = constraints => ({ objective: 'Compare eligibility for the two requested schemes',
	searchQuery: 'Top Class Education Scheme Post-Matric SC scholarship', constraints, questions: [], ambiguities: [] });
const parse = (raw, goal = brief) => parseResearchIntent({ intentFormat: 'json_schema', message: { content: JSON.stringify(raw) } }, intentMessages(goal));

test('an exact stated income is representable without weakening it into a ceiling or inventing private matching inputs', () => {
	const raw = intent([condition('category', 'include', 'SC', 'SC category'), condition('educationLevel', 'include', 'UG', 'got admitted to B.Tech'),
		condition('incomeCeiling', 'include', 500000, 'family annual income is 5 lakhs')]);
	const parsed = parse(raw), compiled = compileResearchIntent(parsed);
	assert.equal(compiled.report.status, 'interpreted');
	assert.deepEqual(parsed.constraints[2], raw.constraints[2]);
	assert.equal(compiled.retrieval.requirements.find(r => r.field === 'incomeCeiling').operator, 'include');
	assert.equal(compiled.search.familyIncome, undefined); assert.equal(compiled.search.profile, undefined);
	assert.equal(compiled.search.query, raw.searchQuery);
});

test('the proven shallow decoder envelope is retained while typed field checks remain local', () => {
	const schema = RESEARCH_INTENT_RESPONSE_FORMAT.json_schema.schema;
	const constraint = schema.properties.constraints.items;
	assert.equal(constraint.type, 'object'); assert.equal(constraint.additionalProperties, false);
	assert.equal(constraint.properties.source.type, 'object'); assert.ok(constraint.properties.field.enum.includes('incomeCeiling'));
	assert.ok(constraint.properties.operator.enum.includes('include'));
	assert.ok(constraint.properties.value.anyOf.some(option => option.type === 'number'));
	assert.equal(schema.$defs, undefined); assert.equal(constraint.anyOf, undefined);
	assert.throws(() => parse(intent([condition('incomeCeiling', 'include', 500000, '5 lakhs', 'applicant_domicile')])));
});

test('local validation still rejects unsupported values and untraceable user claims with safe diagnostics', () => {
	for (const constraints of [[condition('incomeCeiling', 'include', '500000', '5 lakhs')],
		[condition('educationLevel', 'include', 'B.Tech', 'B.Tech')], [condition('gender', 'lt', 'Female', 'SC')],
		[condition('state', 'include', 'Goa', 'invented quote')]]) {
		assert.throws(() => parse(intent(constraints)), error => {
			assert.equal(error.code, 'INVALID_RESEARCH_INTENT');
			assert.ok(error.intentDiagnostics.length > 0);
			assert.doesNotMatch(JSON.stringify(error.intentDiagnostics), /500000|invented quote|B.Tech|Female/);
			return true;
		});
	}
});

test('exact incomes, bounds and exclusions retain meaning across unfamiliar phrasing', () => {
	for (const [goal, operator, value] of [['Our household brings in 312450 annually.', 'include', 312450],
		['Household earnings stay under 312450.', 'lt', 312450], ['Annual income is not 312450.', 'exclude', 312450]]) {
		const result = parse(intent([condition('incomeCeiling', operator, value, goal)]), goal);
		assert.equal(result.constraints[0].operator, operator);
		assert.equal(result.constraints[0].value, value);
	}
});

test('exact stated income uses the complete recorded policy, preserving unknown alternatives and missing limits', () => {
	const compiled = compileResearchIntent(parse(intent([condition('incomeCeiling', 'include', 500000, '5 lakhs')])));
	const income = ceiling => ({ id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: ceiling });
	for (const [ceiling, expected] of [[499999, 'mismatch'], [500000, 'match'], [500001, 'match']]) {
		assert.equal(assessRetrieval({ rules: [income(ceiling)] }, compiled.retrieval).conditions[0].status, expected);
	}
	assert.equal(assessRetrieval({ rules: [] }, compiled.retrieval).conditions[0].status, 'unknown');
	assert.equal(assessRetrieval({ ruleTree: { type: 'OR', children: [
		{ type: 'CONDITION', ...income(499999) }, { type: 'CONDITION', id: 'alternative', field: 'gender', operator: 'EQ', targetValue: 'Female' },
	] } }, compiled.retrieval).conditions[0].status, 'unknown', 'an unverified alternative may still qualify');
	assert.deepEqual(providedApplicantFields(compiled.retrieval), ['familyIncome']);
	assert.match(compiled.retrieval.requirements[0].label, /Annual family income/);
	const bounded = compileResearchIntent(parse(intent([condition('incomeCeiling', 'lt', 500000, '5 lakhs')])));
	assert.deepEqual(providedApplicantFields(bounded.retrieval), [], 'a bound is not an exact known income');
});

test('same-role contradictory amounts ask for clarification; an applicant amount and a policy query are distinct', () => {
	const goal = 'Our income is 500000, or rather 600000; check a scholarship limit of 700000.';
	const first = condition('incomeCeiling', 'include', 500000, '500000'), second = condition('incomeCeiling', 'include', 600000, '600000');
	assert.equal(compileResearchIntent(parse(intent([first, second]), goal)).report.status, 'needs_clarification');
	assert.equal(compileResearchIntent(parse(intent([first, { ...second, role: 'scholarship' }]), goal)).report.status, 'interpreted');
});

test('source-index guidance uses actual user turns and invalid context is refused before reservation', async () => {
	const sourceIndices = messages => {
		const schema = intentResponseFormat(messages).json_schema.schema, values = [];
		const visit = node => { if (node.properties?.messageIndex) values.push(node.properties.messageIndex.description);
			Object.values(node.properties ?? {}).forEach(visit); Object.values(node.$defs ?? {}).forEach(visit);
			if (node.items) visit(node.items); node.anyOf?.forEach(visit); };
		visit(schema); return values;
	};
	assert.ok(sourceIndices([{ role: 'system', content: 'contract' }, ...intentMessages(brief)]).every(instruction => instruction.includes('Valid indices for this request: 0.')));
	assert.ok(sourceIndices(intentMessages(brief, [{ role: 'user', content: 'Earlier question' }])).every(instruction => instruction.includes('Valid indices for this request: 0, 1.')));
	let reserved = 0;
	const provider = createGroqProvider({ apiKey: 'synthetic-only', model: 'openai/gpt-oss-120b', fetchImpl: async () => { throw new Error('Must not call'); } });
	await assert.rejects(provider.complete({ mode: 'research_intent', messages: [{ role: 'system', content: 'No user turn' }], reserveCall: async () => { reserved++; } }), error => error.code === 'INVALID_RUN_INPUT');
	assert.equal(reserved, 0);
});
