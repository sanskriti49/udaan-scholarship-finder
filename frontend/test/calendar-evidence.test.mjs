import test from 'node:test';
import assert from 'node:assert/strict';
import { getScholarshipEventDates, buildEventDescription, buildGoogleCalendarUrl, buildIcsContent, downloadIcsFile } from '../src/utils/calendarExport.js';

test('unknown or invalid deadlines cannot generate fictional application deadlines', () => {
  for (const deadline of [undefined, null, '', 'not published', false, 0, '2027-02-30', '2027-04-31T18:29:00.000Z']) {
    const scholarship = { title: 'Unfamiliar research grant', deadline };
    assert.equal(getScholarshipEventDates(deadline), null);
    assert.equal(buildGoogleCalendarUrl(scholarship), null);
    assert.equal(buildIcsContent(scholarship), null);
    assert.equal(downloadIcsFile(scholarship), false, 'no browser download is attempted');
  }
});

test('calendar descriptions never invent documents, national scope, official links or verification', () => {
  const description = buildEventDescription({ title: 'New bursary' });
  assert.doesNotMatch(description, /April 1|AISHE|Aadhaar|NPCI|INCOME_CERT|verified via|scholarships\.gov\.in|All India/i);
  assert.match(description, /not recorded/i);
});

test('exports use each scheme\'s cited document requirements and recorded deadline', () => {
  const evidence = { field: 'requiredDocuments.LAB_ACCESS', snapshotId: '1'.repeat(24),
    quote: 'A laboratory access letter is required.', url: 'https://example.gov.in/guideline' };
  const scholarship = { title: 'Materials laboratory grant', organization: 'Example institute', state: 'Goa',
    applicationLink: 'https://example.gov.in/apply', deadline: '2027-02-18', requiredDocuments: [
      { code: 'LAB_ACCESS', name: 'Laboratory access letter', mandatory: true, verificationStatus: 'source_cited', evidence },
      { code: 'OTHER', name: 'Unverified passport requirement', mandatory: true },
    ] };
  const description = buildEventDescription(scholarship);
  assert.match(description, /Laboratory access letter/);
  assert.match(description, /https:\/\/example\.gov\.in\/guideline/);
  assert.doesNotMatch(description, /Unverified passport requirement|Family Income Certificate|AISHE/);
  const url = new URL(buildGoogleCalendarUrl(scholarship));
  assert.match(url.searchParams.get('dates'), /^20270218T\d{6}Z\/20270218T\d{6}Z$/);
  assert.match(buildIcsContent(scholarship), /Laboratory access letter/);
  assert.match(buildIcsContent(scholarship), /TRIGGER:-P7D/);
});
