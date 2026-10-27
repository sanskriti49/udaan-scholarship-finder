import { createHash } from 'node:crypto';
import { researchFixture, SCHEME_ID, FIXTURE_NOW } from './navigatorHelpers.js';
import { makeEvidence } from '../src/pipeline/core/evidence.js';
import { compileResearchIntent } from '../src/agents/navigator/researchIntent.js';
import { createResearchTools } from '../src/agents/navigator/researchTools.js';
import { answerContext, applyEvidenceAnswer } from '../src/agents/navigator/evidenceAnswer.js';

// Synthetic source and scripted interpretation for UI/contract acceptance, not model accuracy.
export async function answerPlanFixture({ invalidRenewal = false } = {}) {
  const fixture = researchFixture();
  const qualification = 'Applicants who have completed Class 12 may apply for a first diploma course.';
  const category = 'This scheme is exclusively for students belonging to SC or ST categories.';
  const renewal = 'Renewal requires satisfactory progress; the permitted years are not specified here.';
  fixture.snapshot.text = [qualification, category, renewal].join('\n'); fixture.snapshot.pages = [];
  fixture.snapshot.textHash = createHash('sha256').update(fixture.snapshot.text).digest('hex');
  fixture.scheme.fieldEvidence = [makeEvidence(fixture.snapshot, fixture.snapshot.text, { field: 'eligibility' })];
  fixture.scheme.rules = []; fixture.state.schemes = [fixture.scheme];
  const intent = { objective: 'Check qualification and renewal', searchQuery: '', ambiguities: [], questions: [], constraints: [
    { field: 'educationLevel', role: 'applicant_qualification', value: 'Class 12', operator: 'include', source: { messageIndex: 0, quote: 'Class 12' } },
    { field: 'category', role: 'applicant_current', value: 'OBC', operator: 'include', source: { messageIndex: 0, quote: 'OBC' } },
    { field: 'studyYear', role: 'investigate', value: 4, operator: 'include', source: { messageIndex: 0, quote: 'fourth year' } },
  ] };
  const { retrieval, report } = compileResearchIntent(intent);
  const tools = createResearchTools({ repository: fixture.repository, retrieval, includeContext: true, now: () => FIXTURE_NOW });
  const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'eligibility renewal' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
  plan.intent = report;
  const session = { goal: 'I completed Class 12, am OBC, and want to know about fourth year renewal.', intent, retrieval, conversation: [] };
  const evidenceId = found.passages[0].id;
  return applyEvidenceAnswer(plan, answerContext(session, plan), { message: { content: JSON.stringify({ assessments: [
    { schemeId: SCHEME_ID, requirementId: 'c0', status: 'supported', explanation: 'The guideline accepts Class 12 completion for a first diploma course. This does not settle the other conditions.', evidence: [{ evidenceId, quote: qualification, relation: 'supports' }] },
    { schemeId: SCHEME_ID, requirementId: 'c1', status: 'contradicted', explanation: 'The guideline restricts this scheme to SC or ST categories, so it appears incompatible with the OBC condition.', evidence: [{ evidenceId, quote: category, relation: 'contradicts' }] },
    { schemeId: SCHEME_ID, requirementId: 'c2', status: invalidRenewal ? 'supported' : 'unknown', explanation: invalidRenewal ? 'PRIVATE_UNSUPPORTED_RENEWAL_GUARANTEE' : 'The guideline discusses renewal but does not establish whether fourth-year renewal is allowed. Confirm the permitted renewal years with the provider.', evidence: [{ evidenceId, quote: invalidRenewal ? 'Renewal is guaranteed for every year.' : renewal, relation: 'supports' }] },
  ] }) } });
}
