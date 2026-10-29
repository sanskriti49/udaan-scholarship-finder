import test from 'node:test';
import assert from 'node:assert/strict';
import { compileResearchIntent, validateResearchIntent, intentMessages, RESEARCH_INTENT_RESPONSE_FORMAT, INTENT_PROMPT } from '../../src/agents/navigator/researchIntent.js';
import { assessRetrieval, discoveryFilters, evidenceQueries } from '../../src/agents/navigator/retrievalCoverage.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { researchFixture, SCHEME_ID } from '../navigatorHelpers.js';
import { evaluateResearchEligibility, researchEligibilityRules } from '../../src/agents/navigator/researchEligibility.js';
import { evaluateEligibility } from '../../src/engine/ruleEvaluator.js';

const condition = (field, value, role, quote, operator = 'include') => ({ field, value, role, operator, source: { messageIndex: 0, quote } });
const compile = (goal, constraints, searchQuery = '') => compileResearchIntent(validateResearchIntent({
  objective: 'Research funding for the requested course', searchQuery, constraints, questions: [], ambiguities: [],
}, intentMessages(goal)));
const rule = (id, field, targetValue, operator = 'EQ') => ({ id, field, operator, targetValue });

test('earned qualifications and future funded study survive discovery without asserting enrollment or income', async () => {
  const goal = 'I finished secondary school in Assam and hope to study naval architecture in Kerala. I am an OBC woman.';
  const compiled = compile(goal, [
    condition('educationLevel', 'Class 12', 'applicant_qualification', 'finished secondary school'),
    condition('state', 'Assam', 'applicant_schooling', 'secondary school in Assam'),
    condition('stream', 'naval architecture', 'funding', 'study naval architecture'),
    condition('state', 'Kerala', 'funding_location', 'study naval architecture in Kerala'),
    condition('category', 'OBC', 'applicant_current', 'an OBC woman'),
    condition('gender', 'Female', 'applicant_current', 'woman'),
  ], 'naval architecture');
  assert.deepEqual(compiled.search, { query: 'naval architecture' });
  assert.equal(compiled.report.status, 'interpreted');
  assert.deepEqual(discoveryFilters(compiled.retrieval), []);
  const fixture = researchFixture();
  fixture.scheme.level = 'UG'; fixture.scheme.state = 'Kerala';
  fixture.scheme.rules = [rule('income', 'familyIncome', 450000, 'LTE'), rule('category', 'casteCategory', ['OBC'], 'IN'), rule('gender', 'gender', 'Female')];
  const tools = createResearchTools({ repository: fixture.repository, retrieval: compiled.retrieval, includeContext: true });
  const search = await tools.execute('searchScholarships', compiled.search);
  assert.ok(search.schemes.some(item => item.schemeId === SCHEME_ID));
  const read = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'eligibility conditions' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: read.passages.map(item => item.id) }] });
  const entry = plan.entries[0];
  assert.equal(entry.matching.status, 'unknown');
  assert.equal(entry.matching.failedCount, 0);
  assert.ok(entry.matching.missingFields.includes('familyIncome'));
  assert.equal(entry.qualification.status, 'needs_verification');
  assert.ok(entry.retrieval.conditions.filter(item => ['c4', 'c5'].includes(item.id)).every(item => item.status === 'match'));
  assert.equal(entry.retrieval.conditions.find(item => item.id === 'c0').status, 'unknown');
  assert.equal(entry.retrieval.conditions.find(item => item.id === 'c1').status, 'unknown');
  assert.doesNotMatch(entry.qualification.reasons.join(' '), /income/i);
});

test('domicile, schooling and intended location are separate constraints and source queries', () => {
  const goal = 'Domiciled in Odisha, schooled in Jharkhand, looking to study in Tamil Nadu; only national schemes.';
  const compiled = compile(goal, [
    condition('state', 'Odisha', 'applicant_domicile', 'Domiciled in Odisha'),
    condition('state', 'Jharkhand', 'applicant_schooling', 'schooled in Jharkhand'),
    condition('state', 'Tamil Nadu', 'funding_location', 'study in Tamil Nadu'),
    condition('state', 'All India', 'funding', 'only national schemes'),
  ]);
  assert.equal(compiled.report.status, 'interpreted');
  assert.deepEqual(compiled.search.states, ['All India']);
  assert.equal(discoveryFilters(compiled.retrieval).length, 1);
  const explicit = { state: 'All India', rules: [rule('domicile', 'state', 'Odisha')] };
  assert.equal(assessRetrieval(explicit, compiled.retrieval).conditions.find(item => item.id === 'c0').status, 'match');
  assert.equal(assessRetrieval({ state: 'Odisha' }, compiled.retrieval).conditions.find(item => item.id === 'c0').status, 'unknown');
  assert.equal(assessRetrieval({ rules: [rule('domicile', 'state', 'Punjab')] }, compiled.retrieval).conditions.find(item => item.id === 'c0').status, 'mismatch');
  const queries = evidenceQueries(explicit, compiled.retrieval);
  assert.ok(queries.some(query => query.includes('school qualifying examination') && query.includes('Jharkhand')));
  assert.ok(queries.some(query => query.includes('institution college study location') && query.includes('Tamil Nadu')));
});

test('unclassified place context is not transformed into jurisdiction or domicile', () => {
  const goal = 'I am in Himachal Pradesh and considering a research masters.';
  const { search, retrieval } = compile(goal, [condition('state', 'Himachal Pradesh', 'applicant_current', 'in Himachal Pradesh'), condition('educationLevel', 'PG', 'funding', 'research masters')]);
  assert.equal(search.states, undefined);
  assert.equal(assessRetrieval({ state: 'Goa', level: 'PG', rules: [rule('domicile', 'state', 'Goa')] }, retrieval).conditions[0].status, 'unknown');
  assert.match(INTENT_PROMPT, /Bare or unclear place context/);
});

test('explicit applicant gender restrictions prune incompatibility but keep conditional unknown alternatives', async () => {
  const goal = 'I am a woman seeking training funding.';
  const { retrieval } = compile(goal, [condition('gender', 'Female', 'applicant_current', 'woman')]);
  const fixture = researchFixture();
  fixture.scheme.rules = [rule('gender', 'gender', 'Male')];
  const tools = createResearchTools({ repository: fixture.repository, retrieval });
  const result = await tools.execute('searchScholarships', {});
  assert.ok(!result.schemes.some(item => item.schemeId === SCHEME_ID));
  assert.ok(result.excluded.some(item => item.schemeId === SCHEME_ID));
  const alternative = { ruleTree: { type: 'OR', children: [
    { type: 'CONDITION', ...rule('gender', 'gender', 'Male') },
    { type: 'CONDITION', ...rule('income', 'familyIncome', 100000, 'LTE') },
  ] } };
  assert.equal(assessRetrieval(alternative, retrieval).status, 'unknown');
});

test('new state roles are schema-validated and prior context is retained without source rewriting', () => {
  const conversation = [{ role: 'user', content: 'My permanent domicile is Rajasthan; I completed school in Gujarat.' }];
  const goal = 'Keep those details, but fund a diploma in Sikkim rather than my earlier degree.';
  const constraints = [
    { ...condition('state', 'Rajasthan', 'applicant_domicile', 'permanent domicile is Rajasthan'), source: { messageIndex: 0, quote: 'permanent domicile is Rajasthan' } },
    { ...condition('state', 'Gujarat', 'applicant_schooling', 'school in Gujarat'), source: { messageIndex: 0, quote: 'school in Gujarat' } },
    { ...condition('educationLevel', 'Diploma', 'funding', 'fund a diploma'), source: { messageIndex: 1, quote: 'fund a diploma' } },
    { ...condition('state', 'Sikkim', 'funding_location', 'in Sikkim'), source: { messageIndex: 1, quote: 'in Sikkim' } },
  ];
  const intent = { objective: 'Fund the intended diploma', searchQuery: '', constraints, questions: [], ambiguities: [] };
  const parsed = validateResearchIntent(intent, intentMessages(goal, conversation));
  const compiled = compileResearchIntent(parsed);
  assert.deepEqual(compiled.search, { query: '', levels: ['Diploma'] });
  assert.equal(compiled.report.status, 'interpreted');
  assert.equal(compiled.retrieval.requirements[0].source.messageIndex, 0);
  assert.throws(() => validateResearchIntent({ ...intent, constraints: [{ ...constraints[0], field: 'educationLevel', value: 'PG' }] }, intentMessages(goal, conversation)), /invalid intent data/);
  const wire = RESEARCH_INTENT_RESPONSE_FORMAT.json_schema.schema.properties.constraints.items;
  assert.ok(wire.properties.role.enum.includes('applicant_schooling'));
  assert.ok(wire.properties.field.enum.includes('gender'));
});

test('research does not turn another jurisdiction into a domicile rejection, while explicit policy still excludes', async () => {
  const fixture = researchFixture();
  Object.assign(fixture.scheme, { state: 'West Bengal', level: null, rules: [], eligibility: {} });
  const { retrieval } = compile('I have Uttar Pradesh domicile.', [condition('state', 'Uttar Pradesh', 'applicant_domicile', 'Uttar Pradesh domicile')]);
  const profile = { state: 'Uttar Pradesh' };
  const tools = createResearchTools({ repository: fixture.repository, profile, retrieval, includeContext: true });
  const found = await tools.execute('searchScholarships', {});
  assert.ok(found.schemes.some(item => item.schemeId === SCHEME_ID));
  assert.ok(!found.excluded.some(item => item.schemeId === SCHEME_ID));
  const read = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'domicile eligibility' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: read.passages.map(item => item.id) }] });
  assert.equal(plan.entries[0].matching.status, 'unknown');
  assert.equal(plan.entries[0].matching.failedCount, 0);
  assert.equal(plan.entries[0].qualification.status, 'needs_verification');
  // Both public matching and research now require an actual domicile policy.
  assert.equal(evaluateEligibility(profile, fixture.scheme).status, 'unknown');
  assert.equal(evaluateEligibility(profile, fixture.scheme).failedRules.length, 0);
  fixture.scheme.rules = [rule('domicile', 'state', 'West Bengal')];
  const explicit = await createResearchTools({ repository: fixture.repository, profile, retrieval }).execute('searchScholarships', {});
  assert.ok(explicit.excluded.some(item => item.schemeId === SCHEME_ID));
  assert.equal(explicit.excluded.find(item => item.schemeId === SCHEME_ID).retrieval.conditions[0].status, 'mismatch');
});

test('research policy projection preserves financial fallbacks, unknown income and whole-policy alternatives', () => {
  const scheme = { state: 'West Bengal', eligibility: { familyIncome: { max: 100000 } } };
  const before = structuredClone(scheme);
  assert.deepEqual(researchEligibilityRules(scheme).map(item => item.field), ['familyIncome']);
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh' }, scheme).status, 'unknown');
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh', familyIncome: 50000 }, scheme).status, 'passed');
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh', familyIncome: 200000 }, scheme).status, 'failed');
  assert.deepEqual(scheme, before);
  scheme.ruleTree = { type: 'OR', children: [
    { type: 'CONDITION', ...rule('domicile', 'state', 'West Bengal') },
    { type: 'CONDITION', ...rule('income', 'familyIncome', 100000, 'LTE') },
  ] };
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh' }, scheme).status, 'unknown');
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh', familyIncome: 50000 }, scheme).status, 'passed');
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh', familyIncome: 200000 }, scheme).status, 'failed');
  scheme.ruleTree.type = 'AND';
  assert.equal(evaluateResearchEligibility({ state: 'Uttar Pradesh', familyIncome: 50000 }, scheme).status, 'failed');
});
