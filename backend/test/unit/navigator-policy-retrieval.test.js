import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { findPassages, answerablePassage } from '../../src/agents/navigator/passages.js';
import { mySchemePolicyEvidence, validatedJsonPolicyEdges } from '../../src/pipeline/adapters/mySchemeEvidence.js';
import { makeEvidence, verifyEvidence } from '../../src/pipeline/core/evidence.js';

const id = '111111111111111111111111';
function document(text, { kind = 'html', url = 'https://example.invalid/guide' } = {}) {
  return { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind, sourceId: 'fixture', url, text,
    textHash: createHash('sha256').update(text).digest('hex'), pages: [], fetchedAt: new Date('2026-10-24T00:00:00Z') };
}
function boundScheme(snapshot, title = 'Technical study grant') {
  return { _id: id, title, officialLinks: { guidelinesUrl: snapshot.url }, fieldEvidence: [makeEvidence(snapshot, title, { field: 'title' })] };
}

test('policy sections outrank a portal manual with much denser query overlap', () => {
  const text = `# Technical study grant\n\n### Eligibility\n\nOnly girls entering a recognized degree course may apply. Annual family income must not exceed ₹ 250000.\n\n### Renewal policy\n\nRenewal requires promotion to the next year.\n\n### Documents required\n\nApplicants must provide admission and income certificates.\n\n## User Manuals\n\n### Profile details\n\n${'Enter gender category state engineering degree income admission scholarship eligible eligibility. '.repeat(80)}`;
  const snapshot = document(text), scheme = boundScheme(snapshot);
  const passages = findPassages(scheme, [snapshot], 'engineering income gender eligibility', { includeContext: true,
    queries: ['eligible qualification admission degree', 'annual family income', 'renewal promotion'] });
  assert.ok(passages.length >= 3 && passages.length <= 4);
  assert.ok(passages.every(answerablePassage));
  assert.ok(passages.every(p => !p.evidence.quote.includes('Enter gender')));
  assert.ok(passages.some(p => p.sectionTitle === 'Eligibility'));
  assert.ok(passages.some(p => p.policyTopics.includes('renewal')));
  for (const passage of passages) assert.equal(verifyEvidence(passage.evidence, snapshot).ok, true);
});

test('numbered PDF sections preserve the complete eligibility clause before benefits and tie-breakers', () => {
  const snapshot = document('Technical study grant\n1.0 OBJECTIVE OF THE SCHEME:\nSupport technical education.\n2.0 ELIGIBILITY FOR SCHOLARSHIP:\nThe applicant must enter a recognized degree course. Only SC and ST applicants may apply.\n3.0 AMOUNT OF SCHOLARSHIP:\nAn award of ₹ 50000 is available.\n4.0 RENEWALS:\nRenewal requires passing the previous year.\n', { kind: 'pdf' });
  const passages = findPassages(boundScheme(snapshot), [snapshot], 'category degree', { includeContext: true, queries: ['eligible category caste', 'qualification degree course', 'renewal'] });
  const eligibility = passages.find(p => p.sectionTitle === 'ELIGIBILITY FOR SCHOLARSHIP');
  assert.ok(eligibility);
  assert.match(eligibility.evidence.quote, /Only SC and ST applicants may apply\./);
  assert.ok(!eligibility.evidence.quote.includes('AMOUNT OF SCHOLARSHIP'));
  assert.ok(passages.some(p => p.sectionTitle === 'RENEWALS'));
});

test('allocation tables cannot displace eligibility or stand in for domicile restrictions', () => {
  const snapshot = document('Technical study grant\n2.0 ELIGIBILITY FOR SCHOLARSHIP:\nApplicants must be domiciled in the state where they study.\n3.0 NUMBER OF SCHOLARSHIPS:\nState-wise distribution of scholarships\nUttar Pradesh 500\nWest Bengal 400\n4.0 RENEWALS:\nRenewal requires promotion to the next year.\nAnnexure A\nState wise distribution\nUttar Pradesh 500\n', { kind: 'pdf' });
  const passages = findPassages(boundScheme(snapshot), [snapshot], 'Uttar Pradesh state domicile', { includeContext: true, queries: ['domicile resident state Uttar Pradesh', 'eligible degree course'] });
  assert.match(passages[0].evidence.quote, /Applicants must be domiciled/);
  assert.equal(passages[0].policyRole, 'eligibility');
  assert.ok(passages.every(p => p.policyRole !== 'allocation'));
  assert.equal(answerablePassage({ scope: 'linked_guideline', policyRole: 'allocation', policyTopics: ['allocation'] }), false);
});

test('a shared listing labelled as detailUrl still cannot expose another scheme eligibility', () => {
  const snapshot = document('Technical study grant\n\nOther grant\n\n### Eligibility\nOnly SC/ST applicants domiciled in another state may apply.');
  const scheme = boundScheme(snapshot);
  scheme.officialLinks = { listingUrl: snapshot.url, detailUrl: snapshot.url };
  const passages = findPassages(scheme, [snapshot], 'SC/ST eligibility', { includeContext: true });
  assert.equal(passages.length, 1);
  assert.equal(passages[0].evidence.quote, 'Technical study grant');
  assert.equal(answerablePassage(passages[0]), false);
});

test('a distinct explicit detail page can supply exact policy sections', () => {
  const snapshot = document('# Technical study grant\n\n### Eligibility\nApplicants must be admitted to a recognized technical degree course.');
  const scheme = boundScheme(snapshot);
  scheme.officialLinks = { listingUrl: 'https://example.invalid/list', detailUrl: snapshot.url };
  const passages = findPassages(scheme, [snapshot], 'eligibility technical degree', { includeContext: true });
  assert.ok(passages.some(p => p.scope === 'linked_detail' && answerablePassage(p)));
});

test('single-scheme JSON policy extraction retains exact escaped Unicode source spans and rejects another identity', () => {
  const json = { statusCode: 200, data: { slug: 'technical-grant', en: { basicDetails: { schemeName: 'Technical study grant' },
    eligibilityCriteria: { eligibilityDescription: [{ children: [{ text: 'Only SC/ST applicants may apply; income must be below ₹ 250000.\nDo not omit the restriction.' }] }] },
    schemeContent: { benefits: [{ children: [{ text: '₹ 10000 annually' }] }] } } } };
  const snapshot = document(JSON.stringify(json), { kind: 'json', url: 'https://www.myscheme.gov.in/api/apisetu/schemes?slug=technical-grant&lang=en' });
  const evidence = mySchemePolicyEvidence(snapshot, 'Technical study grant');
  assert.equal(evidence.filter(e => e.field === 'eligibility').length, 1);
  assert.ok(evidence[0].quote.includes('\\n'));
  for (const item of evidence) assert.equal(verifyEvidence(item, snapshot).ok, true);
  assert.deepEqual(validatedJsonPolicyEdges({ title: 'Technical study grant' }, snapshot, evidence[0]), { startComplete: true, endComplete: true });
  assert.equal(validatedJsonPolicyEdges({ title: 'Technical study grant' }, snapshot, { ...evidence[0], charStart: evidence[0].charStart + 5, quote: evidence[0].quote.slice(5) }), null);
  assert.equal(validatedJsonPolicyEdges({ title: 'Another grant' }, snapshot, evidence[0]), null);
  assert.deepEqual(mySchemePolicyEvidence(snapshot, 'Another grant'), []);
  assert.deepEqual(mySchemePolicyEvidence({ ...snapshot, url: snapshot.url.replace('technical-grant', 'another-grant') }, 'Technical study grant'), []);
  assert.deepEqual(mySchemePolicyEvidence({ ...snapshot, url: snapshot.url.replace('www.myscheme.gov.in', 'example.invalid') }, 'Technical study grant'), []);
});

test('rich-text JSON quotation boundaries keep a separately formatted negation with its sentence', () => {
  const json = { statusCode: 200, data: { slug: 'technical-grant', en: { basicDetails: { schemeName: 'Technical study grant' },
    eligibilityCriteria: { eligibilityDescription: [{ type: 'paragraph', children: [{ bold: true, text: 'Only ' }, { text: 'SC/ST applicants may apply.' }] }] } } } };
  const snapshot = document(JSON.stringify(json), { kind: 'json', url: 'https://www.myscheme.gov.in/api/apisetu/schemes?slug=technical-grant&lang=en' });
  const [evidence] = mySchemePolicyEvidence(snapshot, 'Technical study grant');
  assert.match(evidence.quote, /^Only /);
  assert.match(evidence.quote, /SC\/ST applicants may apply\.$/);
  assert.equal(verifyEvidence(evidence, snapshot).ok, true);
  const cropped = makeEvidence(snapshot, 'SC/ST applicants may apply.', { fromIndex: evidence.charStart });
  assert.equal(validatedJsonPolicyEdges({ title: 'Technical study grant' }, snapshot, cropped), null);
});

test('duplicate JSON keys cannot introduce ambiguous earlier policy blocks', () => {
  const snapshot = document('{"statusCode":200,"data":{"slug":"technical-grant","en":{"basicDetails":{"schemeName":"Technical study grant"},"eligibilityCriteria":{"eligibilityDescription":[{"children":[{"text":"Only SC/ST applicants may apply."}]}]},"eligibilityCriteria":{"eligibilityDescription":[{"children":[{"text":"All applicants may apply."}]}]}}}}',
    { kind: 'json', url: 'https://www.myscheme.gov.in/api/apisetu/schemes?slug=technical-grant&lang=en' });
  assert.deepEqual(mySchemePolicyEvidence(snapshot, 'Technical study grant'), []);
});

test('saved failed investigation replay now recovers real UP eligibility and rejects portal-help evidence', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/navigator-saved-replay.json', import.meta.url)));
  const up = fixture.schemes.find(s => s._id === '1385b34ddb800b59396c4d3e');
  const passages = findPassages(up, fixture.snapshots, fixture.question, { includeContext: true,
    queries: ['eligible category caste', 'eligibility qualification admission engineering', 'domicile resident Uttar Pradesh', 'annual family income'] });
  assert.ok(passages.filter(answerablePassage).length >= 3);
  const quotes = passages.filter(answerablePassage).map(p => p.evidence.quote).join('\n');
  assert.match(quotes, /Other Backwards Classes/);
  assert.match(quotes, /annual income.*2 Lakh/);
  assert.match(quotes, /Native and under study in Uttar Pradesh/);
  assert.ok(!quotes.includes('click on'));
  const maha = fixture.schemes.find(s => s.title.includes('VJNT and SBC'));
  const mahaPassages = findPassages(maha, fixture.snapshots, fixture.question, { includeContext: true, queries: ['eligible category caste', 'annual family income', 'domicile resident state'] });
  assert.ok(mahaPassages.some(p => /must be belongs to VJNT and SBC category/.test(p.evidence.quote)));
  assert.ok(mahaPassages.every(p => !p.evidence.quote.includes('User will click on profile')));
  const shared = fixture.schemes.find(s => s.title.includes('ONGC') && s.title.includes('OBC'));
  const sharedPassages = findPassages(shared, fixture.snapshots, 'SC/ST category eligibility', { includeContext: true });
  assert.ok(sharedPassages.every(p => p.scope === 'scheme_cited_excerpt'));
});
