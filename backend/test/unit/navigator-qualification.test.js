import test from 'node:test';
import assert from 'node:assert/strict';
import { compileResearchIntent, validateResearchIntent, intentMessages } from '../../src/agents/navigator/researchIntent.js';
import { assessRetrieval, evidenceQueries } from '../../src/agents/navigator/retrievalCoverage.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { researchFixture, SCHEME_ID, OTHER_ID } from '../navigatorHelpers.js';
const condition = (field, value, role = 'funding', operator = 'include') => ({ field, value, role, operator, source: { messageIndex: 0, quote: 'synthetic' } });
const compile = (constraints, searchQuery = '') => compileResearchIntent({ objective: 'Find support', searchQuery, constraints, questions: [], ambiguities: [] });
const categoryRule = targetValue => ({ id: 'category', field: 'casteCategory', operator: 'IN', targetValue });
async function finish(tools, id = SCHEME_ID) {
  const read = await tools.execute('findGuidelinePassages', { schemeId: id, query: 'income' });
  return (await tools.execute('finishInvestigation', { selections: [{ schemeId: id, evidenceIds: read.passages.map(p => p.id) }] })).entries[0];
}

test('roles distinguish previous qualifications, current enrollment and the funded course, without replacing private inputs', async () => {
  const constraints = [condition('educationLevel', 'PG', 'applicant_qualification'), condition('educationLevel', 'PhD', 'applicant_current'), condition('educationLevel', 'Diploma')];
  const { search, report, retrieval } = compile(constraints);
  assert.equal(report.status, 'interpreted'); assert.deepEqual(search.levels, ['Diploma']);
  const f = researchFixture(); f.scheme.level = 'Diploma'; f.scheme.rules = [{ id: 'degree', field: 'educationLevel', operator: 'EQ', targetValue: 'Diploma' }];
  const profile = { educationLevel: 'PhD' };
  const tools = createResearchTools({ repository: f.repository, profile, retrieval, includeContext: true });
  const found = await tools.execute('searchScholarships', search);
  assert.ok(found.schemes.some(s => s.schemeId === SCHEME_ID));
  const entry = await finish(tools);
  assert.equal(entry.qualification.status, 'needs_verification'); assert.equal(entry.matching.status, 'unknown');
  assert.equal(profile.educationLevel, 'PhD');
  assert.ok(entry.qualification.unresolved.some(text => text.includes('Current enrollment')));
});

test('genuine same-role contradiction stops search compilation; ambiguity is a concise question', () => {
  const compiled = compile([condition('educationLevel', 'PG'), condition('educationLevel', 'Diploma')]);
  assert.equal(compiled.report.status, 'needs_clarification');
  assert.match(compiled.report.ambiguities[0], /Which course level/);
  assert.doesNotMatch(compiled.report.ambiguities[0], /educationLevel|constraints/);
  assert.equal(compile([condition('educationLevel', 'PG', 'applicant_qualification'), condition('educationLevel', 'UG', 'applicant_qualification')]).report.status, 'interpreted');
  assert.equal(compile([condition('category', 'OBC'), condition('category', 'OBC', 'funding', 'exclude')]).report.status, 'needs_clarification');
});

test('unfamiliar paraphrase and follow-up retain semantic roles and source anchors', () => {
  const old = 'I already hold a masters degree in ocean sciences.';
  const goal = 'Support a short technical diploma, not my prior degree; keep the maritime subject.';
  const intent = validateResearchIntent({ objective: 'Fund maritime technical study', searchQuery: 'maritime technical study',
    constraints: [{ ...condition('educationLevel', 'PG', 'applicant_qualification'), source: { messageIndex: 0, quote: 'masters degree' } },
      { ...condition('educationLevel', 'Diploma'), source: { messageIndex: 1, quote: 'short technical diploma' } }], questions: [], ambiguities: [] }, intentMessages(goal, [{ role: 'user', content: old }]));
  const compiled = compileResearchIntent(intent);
  assert.equal(compiled.report.status, 'interpreted'); assert.deepEqual(compiled.search.levels, ['Diploma']);
  assert.equal(compiled.retrieval.requirements[0].source.messageIndex, 0);
});

test('category contradiction is excluded before inspection, even when lexical relevance is stronger', async () => {
  const f = researchFixture(); f.scheme.title = 'Engineering engineering engineering'; f.scheme.rules = [categoryRule(['SC', 'ST'])];
  f.other.title = 'Engineering support'; f.other.rules = [categoryRule(['OBC'])];
  const { retrieval } = compile([condition('category', 'OBC')], 'engineering');
  const tools = createResearchTools({ repository: f.repository, retrieval, includeContext: true });
  const found = await tools.execute('searchScholarships', {});
  assert.deepEqual(found.schemes.map(s => s.schemeId), [OTHER_ID]);
  assert.equal(found.excluded[0].qualification.status, 'excluded');
  assert.match(found.excluded[0].qualification.reasons.join(' '), /Category: OBC.*SC, ST/);
});

test('whole-policy logic preserves OR alternatives and unknown branches instead of rejecting a failed leaf', () => {
  const { retrieval } = compile([condition('category', 'OBC')]);
  const tree = { type: 'OR', children: [{ type: 'CONDITION', ...categoryRule(['SC']) }, { type: 'CONDITION', id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 100000 }] };
  assert.equal(assessRetrieval({ ruleTree: tree }, retrieval).status, 'unknown');
  tree.type = 'AND'; assert.equal(assessRetrieval({ ruleTree: tree }, retrieval).status, 'mismatch');
  assert.equal(assessRetrieval({}, retrieval).status, 'unknown');
});

test('failed deterministic matching is excluded at discovery and finalization explains the required condition', async () => {
  const f = researchFixture(), { retrieval } = compile([]);
  const tools = createResearchTools({ repository: f.repository, profile: { familyIncome: 500000 }, retrieval, includeContext: true });
  const found = await tools.execute('searchScholarships', {});
  assert.equal(found.schemes.length, 0); assert.equal(found.excluded.length, 2);
  const entry = await finish(tools);
  assert.equal(entry.qualification.status, 'excluded');
  assert.match(entry.qualification.reasons.join(' '), /Annual family income/);
  assert.doesNotMatch(JSON.stringify(entry.qualification), /500000/);
});

test('supported structured request, missing metadata and absent source support remain distinct final outcomes', async () => {
  const f = researchFixture(), { retrieval } = compile([condition('educationLevel', 'UG')]);
  f.scheme.level = 'UG';
  let entry = await finish(createResearchTools({ repository: f.repository, profile: { familyIncome: 0 }, retrieval, includeContext: true }));
  assert.equal(entry.qualification.status, 'supported'); assert.ok(entry.citations.length);
  f.scheme.level = null;
  entry = await finish(createResearchTools({ repository: f.repository, profile: { familyIncome: 0 }, retrieval, includeContext: true }));
  assert.equal(entry.qualification.status, 'needs_verification');
  assert.ok(entry.qualification.unresolved.includes('Confirm: Education level: UG'));
});

test('pending requirements drive passage selection before identity and already resolved conditions', () => {
  const { retrieval } = compile([condition('educationLevel', 'UG'), condition('other', 'transport allowance'), condition('applicationType', 'renewal')], 'named award');
  const queries = evidenceQueries({ level: 'UG', currentCycle: { applicationType: 'renewal' } }, retrieval);
  assert.match(queries[0], /transport allowance/);
  assert.ok(!queries.some(query => query.includes('renewal') || query.includes('UG')));
  assert.equal(new Set(queries).size, queries.length);
});

test('bounded candidate qualification promotes relevant candidates beyond an initial eight rejected records', async () => {
  const f = researchFixture(), { retrieval } = compile([condition('category', 'OBC')], 'engineering');
  const rejected = Array.from({ length: 10 }, (_, i) => ({ ...f.scheme, _id: (i + 10).toString(16).padStart(24, '0'), rules: [categoryRule(['SC'])] }));
  f.other.rules = [categoryRule(['OBC'])]; f.other.title = 'Engineering award';
  f.state.schemes = [...rejected, f.other]; let requested;
  const tools = createResearchTools({ repository: { ...f.repository, searchPublished: async args => { requested = args.limit; return f.state.schemes; } }, retrieval });
  const result = await tools.execute('searchScholarships', {});
  assert.equal(requested, 48); assert.deepEqual(result.schemes.map(s => s.schemeId), [OTHER_ID]);
  assert.ok(result.excluded.length <= 8);
});


test('unfamiliar course and category wording is not a confirmed mismatch from text inequality', () => {
  const stream = compile([condition('stream', 'marine science')]).retrieval;
  assert.equal(assessRetrieval({ rules: [{ id: 'course', field: 'stream', operator: 'EQ', targetValue: 'oceanography' }] }, stream).status, 'unknown');
  const category = compile([condition('category', 'Other Backward Classes')]).retrieval;
  assert.equal(assessRetrieval({ rules: [categoryRule(['OBC'])] }, category).status, 'unknown');
  const known = compile([condition('category', 'OBC')]).retrieval;
  const partial = { rules: [categoryRule(['OBC']), { id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 300000 }] };
  assert.equal(assessRetrieval(partial, known).status, 'match');
});


test('unrelated passing rules never establish a missing category restriction', () => {
  const { retrieval } = compile([condition('category', 'OBC')]);
  assert.equal(assessRetrieval({ rules: [{ id: 'unrestricted_income', field: 'familyIncome', operator: 'EQ', targetValue: 'Any' }] }, retrieval).status, 'unknown');
});


test('explicit category exclusions reject established restrictions without excluding broad or unknown audiences', () => {
  const { retrieval } = compile([condition('category', 'SC', 'funding', 'exclude')]);
  assert.equal(assessRetrieval({ rules: [categoryRule(['SC'])] }, retrieval).status, 'mismatch');
  assert.equal(assessRetrieval({ rules: [categoryRule(['OBC'])] }, retrieval).status, 'match');
  assert.equal(assessRetrieval({ rules: [categoryRule(['Any'])] }, retrieval).status, 'unknown');
  assert.equal(assessRetrieval({}, retrieval).status, 'unknown');
  assert.equal(assessRetrieval({ rules: [categoryRule(['SC'])] }, compile([condition('category', 'Any')]).retrieval).status, 'unknown');
  assert.equal(assessRetrieval({ ruleTree: { type: 'OR', children: [{ type: 'CONDITION', ...categoryRule(['SC']) }, { type: 'CONDITION', id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 300000 }] } }, retrieval).status, 'unknown');
});
