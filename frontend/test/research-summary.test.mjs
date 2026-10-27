import test from 'node:test';
import assert from 'node:assert/strict';
import { findingGroup, researchSummary } from '../src/navigator/researchSummary.js';

const entry = (id, patch = {}) => ({ schemeId: id, title: id,
  matching: { status: 'unknown', missingFields: [] },
  qualification: { status: 'needs_verification', supported: [], unresolved: [], reasons: [] }, ...patch });
const condition = (status, patch = {}) => ({ status, basis: 'source_interpretation', evidence: [{ evidenceId: 'checked-source' }], ...patch });

test('retained condition findings are separated from unresolved records and incompatible candidates', () => {
  const related = entry('A related engineering title', { citations: Array(4).fill({ evidence: { quote: 'Award amount: 50000' } }) });
  const supported = entry('A source-backed option', { answer: { conditions: [condition('supported'), condition('unknown', { evidence: [] })] } });
  const concern = entry('Mixed evidence', { answer: { concern: true, conditions: [condition('supported'), condition('contradicted')] } });
  const rejected = entry('Recorded contradiction', { matching: { status: 'failed', missingFields: [] }, answer: { conditions: [condition('supported')] } });
  const summary = researchSummary({ entries: [related, rejected, concern, supported] });
  assert.deepEqual(summary.entries.map(item => item.schemeId), [supported.schemeId, related.schemeId, concern.schemeId, rejected.schemeId]);
  assert.deepEqual(summary.counts, { promising: 1, unconfirmed: 1, concern: 1, excluded: 1 });
  assert.match(summary.message, /does not confirm that every eligibility condition is met/);
  assert.equal(findingGroup(related), 'unconfirmed');
});

test('unsupported positive prose, quotation counts and a stale optimistic summary do not promote a result', () => {
  const candidate = entry('Unsubstantiated', { answer: { conditions: [condition('supported', { evidence: [] })] } });
  const summary = researchSummary({ entries: [candidate], answer: { status: 'answered', message: 'You qualify for all scholarships.' } });
  assert.equal(summary.counts.promising, 0);
  assert.equal(summary.heading, 'A useful shortlist is still missing.');
  assert.doesNotMatch(summary.message, /You qualify/);
});

test('unknown income is a useful follow-up, not a rejection, and excluded schemes do not drive the questionnaire', () => {
  const unknown = entry('Potential option', { matching: { status: 'unknown', missingFields: ['familyIncome'] } });
  const excluded = entry('Wrong category', { matching: { status: 'failed', missingFields: ['state', 'state', 'state'] } });
  const summary = researchSummary({ entries: [excluded, unknown] });
  assert.equal(summary.nextField, 'Annual family income (₹)');
  assert.equal(findingGroup(unknown), 'unconfirmed');
  assert.equal(summary.counts.excluded, 1);
});

test('applicant details already established by validated intent are not requested again in saved findings', () => {
  const candidate = entry('Named option', { matching: { status: 'unknown', missingFields: ['familyIncome', 'casteCategory', 'state'] } });
  const summary = researchSummary({ entries: [candidate], providedFields: ['familyIncome', 'casteCategory'] });
  assert.equal(summary.nextField, 'Domicile state');
  assert.equal(researchSummary({ entries: [candidate], providedFields: ['familyIncome', 'casteCategory', 'state'] }).nextField, null);
  assert.equal(candidate.matching.missingFields.length, 3, 'the view must not change recorded matching results');
});

test('backend relevance ordering is preserved inside each presentation group and empty findings stay honest', () => {
  const first = entry('Relevant first'), second = entry('Other second');
  assert.deepEqual(researchSummary({ entries: [first, second] }).entries.map(item => item.schemeId), ['Relevant first', 'Other second']);
  const empty = researchSummary({ entries: [] });
  assert.equal(empty.heading, 'A useful shortlist is still missing.');
  assert.equal(empty.nextField, null);
  assert.equal(empty.retainedCount, 0);
});

test('a category or gender finding cannot promote an unestablished funding objective into a promising option', () => {
  const genderOnly = entry('Audience only', { answer: { fundingRelevance: 'unknown', conditions: [condition('supported')] } });
  const funding = entry('Relevant funding', { answer: { fundingRelevance: 'supported', conditions: [condition('supported')] } });
  const summary = researchSummary({ entries: [genderOnly, funding] });
  assert.equal(findingGroup(genderOnly), 'unconfirmed');
  assert.equal(findingGroup(funding), 'promising');
  assert.equal(summary.entries[0].schemeId, funding.schemeId);
});
