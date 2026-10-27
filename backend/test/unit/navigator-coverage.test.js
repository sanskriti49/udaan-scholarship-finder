import test from 'node:test';
import assert from 'node:assert/strict';
import { compileResearchIntent, validateResearchIntent, intentMessages } from '../../src/agents/navigator/researchIntent.js';
import { assessRetrieval } from '../../src/agents/navigator/retrievalCoverage.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { findPassages } from '../../src/agents/navigator/passages.js';
import { researchFixture, SCHEME_ID } from '../navigatorHelpers.js';
import { makeEvidence } from '../../src/pipeline/core/evidence.js';
import { createHash } from 'node:crypto';

const condition = (field, operator, value) => ({ field, operator, value, source: { messageIndex: 0, quote: 'synthetic' } });
const compile = constraints => compileResearchIntent({ objective: 'Find support', searchQuery: '', constraints, questions: [], ambiguities: [] });

test('missing metadata is unknown, recorded contradictions exclude, and neither becomes eligibility', async () => {
  assert.equal(assessRetrieval({}, compile([]).retrieval).status, 'unknown');
  const fixture = researchFixture();
  const { retrieval } = compile([condition('educationLevel', 'include', 'UG'), condition('state', 'exclude', 'All India')]);
  assert.equal(assessRetrieval(fixture.scheme, retrieval).status, 'unknown');
  fixture.scheme.level = 'PG';
  assert.equal(assessRetrieval(fixture.scheme, retrieval).status, 'mismatch');
  fixture.scheme.level = 'UG'; fixture.scheme.state = 'All India';
  assert.equal(assessRetrieval(fixture.scheme, retrieval).status, 'mismatch');
  fixture.scheme.state = 'Goa';
  assert.equal(assessRetrieval(fixture.scheme, retrieval).status, 'match');
  fixture.scheme.level = null;
  const tools = createResearchTools({ repository: fixture.repository, retrieval });
  const search = await tools.execute('searchScholarships', {});
  assert.equal(search.schemes[0].retrieval.status, 'unknown');
  fixture.scheme.state = 'All India';
  const excluded = await tools.execute('searchScholarships', {});
  assert.ok(!excluded.schemes.some(item => item.schemeId === SCHEME_ID));
  assert.equal(excluded.excluded[0].retrieval.status, 'mismatch');
});

test('state aliases share evaluator vocabulary and contradictions resolve before searching', () => {
  const compiled = compile([condition('state', 'include', 'Uttar Pradesh')]);
  assert.equal(assessRetrieval({ state: 'UP' }, compiled.retrieval).status, 'match');
  assert.equal(compile([condition('state', 'include', 'UP'), condition('state', 'exclude', 'Uttar Pradesh')]).report.status, 'needs_clarification');
  assert.equal(compile([condition('applicationType', 'include', 'renewal'), condition('applicationType', 'exclude', 'renewal')]).report.status, 'needs_clarification');
  assert.equal(compile([condition('studyYear', 'gte', 5), condition('studyYear', 'lte', 3)]).report.status, 'needs_clarification');
  assert.equal(assessRetrieval({ level: ['UG', 'PG'] }, compile([condition('educationLevel', 'include', 'UG')]).retrieval).status, 'unknown');
});

test('follow-up funding purpose and unfamiliar semantic concepts reach search and every source requirement', async () => {
  const conversation = [{ role: 'user', content: 'Help cover digs and subsistence while studying.' }];
  const goal = 'Keep that purpose, but renewals only for 2026-27 in year four.';
  const constraints = [
    { ...condition('other', 'include', 'boarding maintenance allowance'), source: { messageIndex: 0, quote: 'digs and subsistence' } },
    ...[condition('applicationType', 'include', 'renewal'), condition('academicYear', 'include', '2026-27'), condition('studyYear', 'include', 4)].map(item => ({ ...item, source: { messageIndex: 1, quote: goal } })),
  ];
  const intent = validateResearchIntent({ objective: 'Research accommodation funding', searchQuery: '', constraints, questions: [{ text: 'Can existing support continue?', source: { messageIndex: 1, quote: goal } }], ambiguities: [] }, intentMessages(goal, conversation));
  const compiled = compileResearchIntent(intent);
  assert.ok(compiled.retrieval.discovery.includes('boarding maintenance allowance'));
  assert.equal(compiled.retrieval.requirements.length, 5);
  assert.ok(compiled.retrieval.queries.some(query => query.includes('renewal')));
  assert.ok(compiled.retrieval.queries.some(query => query.includes('2026-27')));
  const fixture = researchFixture({ linkedPdf: true });
  fixture.scheme.currentCycle.applicationType = 'renewal';
  let input;
  const tools = createResearchTools({ repository: { ...fixture.repository, searchPublished: async args => { input = args; return [fixture.scheme]; } }, retrieval: compiled.retrieval, includeContext: true });
  await tools.execute('searchScholarships', compiled.search);
  assert.deepEqual(input.retrieval, compiled.retrieval);
  const read = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'unrelated latest message' });
  assert.ok(read.passages.some(item => item.evidence.quote === fixture.hostel));
  const conditionCheck = read.retrieval.conditions.find(item => item.id === 'c0');
  assert.equal(conditionCheck.status, 'unknown'); assert.ok(conditionCheck.evidenceIds.length);
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: read.passages.map(item => item.id) }] });
  assert.equal(plan.entries[0].retrieval.status, 'unknown');
  assert.equal(plan.entries[0].matching.status, 'unknown');
});

test('positive and excluded topics never become asserted matches from lexical evidence', () => {
  const { retrieval } = compile([condition('other', 'exclude', 'loans'), condition('other', 'include', 'maintenance'), condition('other', 'include', 'transport')]);
  assert.deepEqual(retrieval.discovery, ['maintenance', 'transport']);
  const result = assessRetrieval({}, retrieval, [{ id: 'evidence', evidence: { quote: 'Loans are available for transport and maintenance.' } }]);
  assert.equal(result.status, 'unknown'); assert.ok(result.conditions.every(item => item.status === 'unknown'));
});

test('source selection diversifies across questions while keeping exact snapshot proofs', () => {
  const fixture = researchFixture({ linkedPdf: true });
  const first = 'Maintenance boarding allowance. '.repeat(40), last = 'Renewal requires annual progress review.';
  fixture.snapshot.text = `${first}\n${last}`; fixture.snapshot.pages = [{ page: 1, start: 0 }, { page: 2, start: first.length + 1 }];
  fixture.snapshot.textHash = createHash('sha256').update(fixture.snapshot.text).digest('hex');
  fixture.scheme.fieldEvidence = [makeEvidence(fixture.snapshot, last)];
  const found = findPassages(fixture.scheme, [fixture.snapshot], 'ignored', { queries: ['maintenance boarding', 'renewal progress review'] });
  assert.ok(found.some(item => item.evidence.quote === last)); assert.ok(found.length <= 4);
  assert.ok(found.every(item => fixture.snapshot.text.slice(item.evidence.charStart, item.evidence.charEnd) === item.evidence.quote));
});

test('cycle conflicts and absent renewal clauses remain unknown; recorded exclusions remain enforced', () => {
  const { retrieval } = compile([condition('applicationType', 'include', 'renewal'), condition('academicYear', 'exclude', '2025-26')]);
  assert.equal(assessRetrieval({ currentCycle: { applicationType: 'fresh', academicYear: '2026-27' } }, retrieval).status, 'mismatch');
  assert.equal(assessRetrieval({ currentCycle: { applicationType: 'renewal', academicYear: '2025-26' } }, retrieval).status, 'mismatch');
  assert.equal(assessRetrieval({ currentCycle: { applicationType: 'renewal', academicYear: '2025-26', hasConflict: true } }, retrieval).status, 'unknown');
  assert.equal(assessRetrieval({ currentCycle: { applicationType: 'general' } }, retrieval).status, 'unknown');
});
