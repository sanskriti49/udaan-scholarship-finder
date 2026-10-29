import test from 'node:test';
import assert from 'node:assert/strict';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { matchingProfile } from '../../src/agents/navigator/candidateQualification.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { researchFixture, SCHEME_ID } from '../navigatorHelpers.js';

const requirement = (field, value, role) => ({ field, value, role, operator: 'include', source: { messageIndex: 0, quote: 'synthetic fixture' } });
const planFor = constraints => compileResearchIntent({ objective: 'Research the requested funding', searchQuery: '', constraints, questions: [], ambiguities: [] }).retrieval;

test('a completed qualification in selected inputs cannot reject an unestablished funded-course level', async () => {
  const fixture = researchFixture();
  fixture.scheme.level = 'UG';
  fixture.scheme.rules = [
    { id: 'course', field: 'educationLevel', operator: 'EQ', targetValue: 'UG' },
    { id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 450000 },
  ];
  const retrieval = planFor([requirement('educationLevel', 'Class 12', 'applicant_qualification'), requirement('stream', 'engineering', 'funding')]);
  const profile = { educationLevel: 'Class 12' };
  const tools = createResearchTools({ repository: fixture.repository, retrieval, profile, includeContext: true });
  const found = await tools.execute('searchScholarships', {});
  assert.ok(found.schemes.some(item => item.schemeId === SCHEME_ID), 'the undergraduate candidate needs admission evidence, not rejection from the completed qualification');
  assert.ok(!found.excluded.some(item => item.schemeId === SCHEME_ID));
  const read = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'course admission eligibility' });
  const result = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: read.passages.map(item => item.id) }] });
  assert.equal(result.entries[0].matching.status, 'unknown');
  assert.equal(result.entries[0].matching.failedCount, 0);
  assert.ok(result.entries[0].matching.missingFields.includes('educationLevel'));
  assert.ok(result.entries[0].matching.missingFields.includes('familyIncome'));
  assert.equal(result.entries[0].qualification.status, 'needs_verification');
  assert.deepEqual(profile, { educationLevel: 'Class 12' });
});

test('course-context masking is role-driven across unfamiliar subjects, without inferring a target level', () => {
  const profile = { educationLevel: 'PG', stream: 'marine biology', familyIncome: 100000 };
  const retrieval = planFor([
    requirement('educationLevel', 'PG', 'applicant_qualification'), requirement('stream', 'marine biology', 'applicant_qualification'),
    requirement('other', 'apprenticeship training bursary', 'funding'),
  ]);
  assert.deepEqual(matchingProfile(profile, retrieval), { educationLevel: null, stream: null, familyIncome: 100000 });
  assert.equal(retrieval.requirements.some(item => item.field === 'educationLevel' && item.role === 'funding'), false);
  assert.deepEqual(profile, { educationLevel: 'PG', stream: 'marine biology', familyIncome: 100000 });
});

test('known current enrollment is preserved when it also matches a prior qualification, and unrelated inputs stay untouched', () => {
  const profile = { educationLevel: 'Diploma', stream: 'agriculture' };
  const retrieval = planFor([
    requirement('educationLevel', 'Diploma', 'applicant_qualification'), requirement('educationLevel', 'Diploma', 'applicant_current'),
    requirement('other', 'equipment costs', 'funding'),
  ]);
  assert.deepEqual(matchingProfile(profile, retrieval), profile);
  assert.deepEqual(matchingProfile(profile, planFor([requirement('educationLevel', 'PG', 'applicant_qualification'), requirement('stream', 'astronomy', 'funding')])), profile);
  assert.deepEqual(matchingProfile(profile, planFor([requirement('educationLevel', 'Diploma', 'applicant_qualification')])), profile);
});

test('masking an ambiguous course field never hides an independent financial contradiction or changes policy logic', async () => {
  const fixture = researchFixture();
  const level = { type: 'CONDITION', id: 'course', field: 'educationLevel', operator: 'EQ', targetValue: 'UG' };
  const income = { type: 'CONDITION', id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 450000 };
  fixture.scheme.ruleTree = { type: 'AND', children: [level, income] };
  const retrieval = planFor([requirement('educationLevel', 'Class 12', 'applicant_qualification'), requirement('stream', 'biomedical design', 'funding')]);
  const profile = { educationLevel: 'Class 12', familyIncome: 600000 };
  const and = await createResearchTools({ repository: fixture.repository, profile, retrieval }).execute('evaluateMatches', { schemeIds: [SCHEME_ID] });
  assert.equal(and.matches[0].status, 'failed');
  assert.equal(and.matches[0].failedCount, 1);
  assert.match(and.matches[0].reasons.excluded.join(' '), /income/i);
  assert.doesNotMatch(and.matches[0].reasons.excluded.join(' '), /degree/i);
  fixture.scheme.ruleTree.type = 'OR';
  const or = await createResearchTools({ repository: fixture.repository, profile, retrieval }).execute('evaluateMatches', { schemeIds: [SCHEME_ID] });
  assert.equal(or.matches[0].status, 'unknown');
  assert.equal(or.matches[0].failedCount, 0);
});
