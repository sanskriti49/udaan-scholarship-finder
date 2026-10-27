import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { makeEvidence } from '../../src/pipeline/core/evidence.js';
import { researchFixture, SCHEME_ID, OTHER_ID, FIXTURE_NOW } from '../navigatorHelpers.js';
import { researchOpportunity } from '../../src/agents/navigator/candidateResearch.js';

const requirement = (field, value, role = 'funding') => ({ field, value, role, operator: 'include', source: { messageIndex: 0, quote: 'synthetic fixture' } });
const compile = constraints => compileResearchIntent({ objective: 'Fund the requested course', searchQuery: 'marine engineering', constraints, questions: [], ambiguities: [] });
const makePolicy = (id, text) => ({ _id: id, id, url: `https://example.invalid/guideline/${id}`, kind: 'html', text,
  textHash: createHash('sha256').update(text).digest('hex'), fetchedAt: FIXTURE_NOW, pages: [] });
function attachPolicy(scheme, snapshot) {
  Object.assign(scheme, { officialLinks: { guidelinesUrl: snapshot.url }, fieldEvidence: [makeEvidence(snapshot, snapshot.text, { field: 'eligibility' })] });
}

test('the intended study destination guides research ahead of schooling history without declaring a domicile mismatch', () => {
  const { retrieval } = compile([requirement('state', 'Uttar Pradesh', 'applicant_schooling'),
    requirement('state', 'Punjab', 'applicant_domicile'), requirement('state', 'Karnataka', 'funding_location')]);
  const destination = researchOpportunity({ state: 'Karnataka' }, retrieval, []);
  const schooling = researchOpportunity({ state: 'Uttar Pradesh' }, retrieval, []);
  assert.ok(destination.contextAffinity > schooling.contextAffinity);
  assert.equal(schooling.recordedMatches, 0);
  assert.equal(retrieval.requirements.filter(r => r.field === 'state').length, 3);
});

test('course-policy evidence outranks unrelated personal-attribute matches despite missing metadata and misleading title overlap', async () => {
  const fixture = researchFixture();
  const unrelated = makePolicy('bbbbbbbbbbbbbbbbbbbbbbbb', 'Eligibility\nApplicants pursuing visual arts courses may apply. OBC and Female applicants are eligible.');
  const relevant = makePolicy('cccccccccccccccccccccccc', 'Eligibility\nApplicants admitted to marine engineering degree courses may apply. Annual family income must not exceed INR 450000.');
  Object.assign(fixture.scheme, { title: 'Marine engineering awards for OBC women', state: 'All India', rules: [
    { id: 'category', field: 'casteCategory', operator: 'IN', targetValue: ['OBC'] },
    { id: 'gender', field: 'gender', operator: 'EQ', targetValue: 'Female' },
  ] });
  Object.assign(fixture.other, { title: 'Technical study bursary', state: 'All India', level: null, rules: [], eligibility: {} });
  attachPolicy(fixture.scheme, unrelated); attachPolicy(fixture.other, relevant);
  fixture.state.snapshots = [unrelated, relevant];
  const { retrieval } = compile([requirement('stream', 'marine engineering'), requirement('category', 'OBC', 'applicant_current'), requirement('gender', 'Female', 'applicant_current')]);
  const tools = createResearchTools({ repository: fixture.repository, retrieval, includeContext: true });
  const found = await tools.execute('searchScholarships', {});
  assert.equal(found.schemes[0].schemeId, OTHER_ID);
  assert.ok(found.schemes.find(item => item.schemeId === SCHEME_ID).research.recordedMatches > found.schemes[0].research.recordedMatches);
  assert.equal(found.schemes[0].research.subjectMatches, 1);
  assert.equal(found.schemes[0].research.subjectObjectives, 1, 'the duplicate subject/search expression is one objective');
  assert.equal(found.schemes.find(item => item.schemeId === SCHEME_ID).research.subjectMatches, 0);
  const read = await tools.execute('findGuidelinePassages', { schemeId: found.schemes[0].schemeId, query: 'marine engineering eligibility' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: found.schemes[0].schemeId, evidenceIds: read.passages.map(item => item.id) }] });
  assert.equal(plan.entries[0].schemeId, OTHER_ID);
  assert.match(plan.entries[0].citations.map(item => item.evidence.quote).join(' '), /marine engineering degree/);
  assert.equal(plan.entries[0].qualification.status, 'needs_verification', 'source opportunity must not become certified eligibility');
  assert.equal(plan.entries[0].retrieval.conditions.find(item => item.id === 'c0').status, 'unknown');
  assert.equal(plan.entries[0].matching.failedCount, 0);
});

test('another state cannot monopolize research over usable national policy, without being falsely excluded', async () => {
  const fixture = researchFixture();
  const otherRegion = makePolicy('bbbbbbbbbbbbbbbbbbbbbbbb', 'Eligibility\nApplicants admitted to marine engineering degree courses may apply. Female applicants are eligible.');
  const national = makePolicy('cccccccccccccccccccccccc', 'Eligibility\nFemale applicants admitted to technical degree courses may apply. Annual family income must not exceed INR 800000.');
  Object.assign(fixture.scheme, { state: 'Maharashtra', title: 'Marine engineering study fund', rules: [] });
  Object.assign(fixture.other, { state: 'All India', title: 'National technical award', rules: [] });
  attachPolicy(fixture.scheme, otherRegion); attachPolicy(fixture.other, national);
  fixture.state.snapshots = [otherRegion, national];
  const { retrieval } = compile([requirement('stream', 'marine engineering'), requirement('state', 'Odisha', 'applicant_schooling'), requirement('gender', 'Female', 'applicant_current')]);
  const found = await createResearchTools({ repository: fixture.repository, retrieval, includeContext: true }).execute('searchScholarships', {});
  assert.equal(found.schemes[0].schemeId, OTHER_ID);
  assert.ok(found.schemes[0].research.addressable.includes('c0'), 'technical education policy can be investigated despite an unfamiliar subject phrasing');
  assert.equal(found.schemes[0].research.subjectMatches, 0, 'technical study is not fabricated as exact marine-engineering support');
  assert.ok(found.schemes.some(item => item.schemeId === SCHEME_ID), 'schooling location is a research hint, not verified domicile');
  assert.ok(!found.excluded.some(item => item.schemeId === SCHEME_ID));
});
