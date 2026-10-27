import { createHash } from 'node:crypto';
import { makeEvidence } from '../src/pipeline/core/evidence.js';
import { compileResearchIntent } from '../src/agents/navigator/researchIntent.js';
import { createResearchTools } from '../src/agents/navigator/researchTools.js';
import { answerContext } from '../src/agents/navigator/evidenceAnswer.js';

// Evaluation-only synthetic policies. These are never imported by the server,
// ingested into the catalogue or offered as real scholarship recommendations.
const at = new Date('2026-10-26T10:00:00Z'), schemeId = '123456789012345678901234', snapshotId = 'abcdefabcdefabcdefabcdef';
const c = (field, value, quote, role = 'funding', operator = 'include', messageIndex = 0) => ({ field, value, role, operator, source: { messageIndex, quote } });
const q = (text, quote) => ({ text, source: { messageIndex: 0, quote } });

export const comparisonCases = [
  { id: 'category-exclusion', question: 'I am OBC. Can this scholarship support me?',
    constraints: [c('category', 'OBC', 'OBC', 'applicant_current')],
    clauses: ['Only applicants belonging to SC or ST categories may apply.'], expected: ['contradicted'] },
  { id: 'missing-income', question: 'I belong to SC. My income is not available. Is the income condition satisfied?',
    constraints: [c('category', 'SC', 'SC', 'applicant_current')], questions: [q('Is the income condition satisfied?', 'Is the income condition satisfied?')],
    clauses: ['Applicants belonging to SC may apply.', 'Annual family income must not exceed Rs 250000.'],
    rules: [{ id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 250000 }], expected: ['supported', 'unknown'] },
  { id: 'failed-income-rule', question: 'My annual family income is 500000. Can I apply?',
    constraints: [c('incomeCeiling', 500000, '500000', 'applicant_current')],
    clauses: ['Annual family income must not exceed Rs 250000.'], profile: { familyIncome: 500000 },
    rules: [{ id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 250000 }], excluded: true, expected: ['contradicted'] },
  { id: 'renewal-year', question: 'Can I renew this award in my fourth year?',
    constraints: [c('applicationType', 'renewal', 'renew', 'investigate'), c('studyYear', 4, 'fourth year', 'applicant_current')],
    clauses: ['Renewal applications are accepted after satisfactory academic progress. The permitted renewal years are not specified in this guidance.'], expected: ['supported', 'unknown'] },
  { id: 'negated-course', question: 'Find postgraduate scholarships, not undergraduate scholarships.',
    constraints: [c('educationLevel', 'PG', 'postgraduate'), c('educationLevel', 'UG', 'not undergraduate', 'funding', 'exclude')],
    clauses: ['Only postgraduate students may apply. Undergraduate students are not eligible.'], expected: ['supported', 'supported'] },
  { id: 'followup', conversation: [{ role: 'user', content: 'I want undergraduate scholarships for hostel costs.' }],
    question: 'Postgraduate instead. Keep the hostel costs requirement.',
    constraints: [c('educationLevel', 'PG', 'Postgraduate', 'funding', 'include', 1), c('other', 'hostel costs', 'hostel costs', 'funding', 'include', 0)],
    clauses: ['Only postgraduate students may apply.', 'The scholarship covers hostel accommodation expenses.'], expected: ['supported', 'supported'], proofs: [0, 1] },
  { id: 'qualification-versus-course', question: 'I am enrolled in a PhD and want funding for a diploma course.',
    constraints: [c('educationLevel', 'PhD', 'enrolled in a PhD', 'applicant_current'), c('educationLevel', 'Diploma', 'diploma course')],
    clauses: ['The award funds diploma courses. The guidance does not specify whether concurrent enrollment in another course is allowed.'], expected: ['unknown', 'supported'] },
  { id: 'old-guidance', question: 'I am OBC. Does this guidance establish current eligibility?',
    constraints: [c('category', 'OBC', 'OBC', 'applicant_current')],
    clauses: ['Applicants belonging to OBC may apply. This guidance was published for a previous academic year.'], stale: true, expected: ['unknown'] },
  { id: 'missing-policy', question: 'I am EWS. Is this award open to my category?',
    constraints: [c('category', 'EWS', 'EWS', 'applicant_current')],
    clauses: ['The scholarship benefit is Rs 10000 per year.'], field: 'amount', expected: ['unknown'] },
];

export async function prepareComparisonCase(item) {
  const conversation = item.conversation ?? [], intent = { objective: 'Investigate the requested scholarship conditions', searchQuery: '',
    constraints: structuredClone(item.constraints), questions: structuredClone(item.questions ?? []), ambiguities: [] };
  const snapshot = { _id: snapshotId, id: snapshotId, sourceId: 'synthetic_comparison', kind: 'html', url: 'https://example.invalid/evaluation-guideline',
    text: item.clauses.join('\n\n'), fetchedAt: at, pages: [] };
  snapshot.textHash = createHash('sha256').update(snapshot.text).digest('hex');
  const scheme = { _id: schemeId, title: 'Synthetic comparison scholarship — not a real opportunity', organization: 'Synthetic issuer',
    publication: { state: 'published' }, applicationLink: 'https://example.invalid/apply', officialLinks: {},
    currentCycle: { academicYear: '2026-27', applicationType: 'both', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-11-30T00:00:00Z', evidence: [] },
    freshness: { lastVerifiedAt: item.stale ? new Date('2024-01-01T00:00:00Z') : at, staleAfterHours: 72 },
    fieldEvidence: [makeEvidence(snapshot, snapshot.text, { field: item.field ?? 'eligibility' })], rules: item.rules ?? [], requiredDocuments: [] };
  const repository = { async searchPublished() { return [scheme]; }, async getPublished(ids) { return ids.includes(schemeId) ? [scheme] : []; },
    async getSnapshots(ids) { return ids.includes(snapshotId) ? [snapshot] : []; } };
  const { retrieval, report } = compileResearchIntent(intent);
  const tools = createResearchTools({ repository, profile: item.profile ?? {}, retrieval, includeContext: true, now: () => at });
  const discovery = await tools.execute('searchScholarships', {});
  const recordedExclusion = discovery.excluded?.some(card => card.schemeId === schemeId) ?? false;
  const found = recordedExclusion ? { passages: [] } : await tools.execute('findGuidelinePassages', { schemeId, query: item.question });
  const plan = await tools.execute('finishInvestigation', { selections: found.passages.length ? [{ schemeId, evidenceIds: found.passages.map(p => p.id) }] : [] });
  plan.intent = report;
  const session = { goal: item.question, conversation, intent, retrieval };
  return { item, intent, session, plan, recordedExclusion, packet: answerContext(session, plan), schemeId };
}
