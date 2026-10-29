import fs from 'node:fs';
import { createResearchTools } from '../src/agents/navigator/researchTools.js';
import { compileResearchIntent } from '../src/agents/navigator/researchIntent.js';
import { answerContext, applyEvidenceAnswer } from '../src/agents/navigator/evidenceAnswer.js';

export const UP_ID = '1385b34ddb800b59396c4d3e';
export const PRAGATI_ID = '6aa58e923d52461bb6eb9e9a';
export const YASHASVI_ID = '6acb5f02c4c1eab76fe8a5f9';
export function savedReplayFixture() {
  const data = JSON.parse(fs.readFileSync(new URL('fixtures/navigator-saved-replay.json', import.meta.url)));
  const source = quote => ({ messageIndex: 0, quote });
  // Reviewed semantic fixture. This is NOT a claim that a live model now
  // extracts these roles correctly. The historical output is retained separately.
  const intent = { objective: 'Find funding for the intended engineering pathway', searchQuery: 'engineering scholarships', questions: [], ambiguities: [], constraints: [
    { field: 'category', role: 'applicant_current', operator: 'include', value: 'OBC', source: source('OBC') },
    { field: 'gender', role: 'applicant_current', operator: 'include', value: 'Female', source: source('girl') },
    { field: 'educationLevel', role: 'applicant_qualification', operator: 'include', value: 'Class 12', source: source('completed Class 12') },
    { field: 'state', role: 'applicant_schooling', operator: 'include', value: 'Uttar Pradesh', source: source('in Uttar Pradesh') },
    { field: 'stream', role: 'funding', operator: 'include', value: 'engineering', source: source('engineering scholarships') },
  ] };
  const repository = { searchPublished: async () => data.schemes,
    getPublished: async ids => data.schemes.filter(scheme => ids.includes(scheme._id)),
    getSnapshots: async ids => data.snapshots.filter(snapshot => ids.includes(snapshot._id)) };
  return { ...data, now: data.capturedAt, intent, repository };
}

// Independently reviewed expected source block, not a keyword-based answer
// generator. Unknown income/admission/domicile receive no positive assertion.
export function reviewedReplayAnswer(messages) {
  const packet = JSON.parse(messages.at(-1).content), up = packet.candidates.find(c => c.schemeId === UP_ID), pragati = packet.candidates.find(c => c.schemeId === PRAGATI_ID);
  if (!up) throw new Error('The relevant UP source was omitted from the evidence packet');
  const quote = 'Students from Other Backwards Classes study in all government-aided and recognized state educational institutes (subject to budget availability). ';
  const passage = up.passages.find(p => p.quote === quote);
  if (!passage) throw new Error('The complete reviewed eligibility block was not retrieved');
  const residence = up.passages.find(p => p.quote === 'Native and under study in Uttar Pradesh.');
  const admission = pragati?.passages.find(p => p.quote.includes('The girl candidate should be admitted to First year of Degree level course'));
  if (!residence || !admission) throw new Error('The reviewed residence/admission conditions were omitted');
  return { message: { content: JSON.stringify({ assessments: [{ schemeId: UP_ID, requirementId: 'c0', status: 'supported', dependsOn: [],
    explanation: 'The saved guidance includes Other Backwards Classes students at recognised state institutions, subject to budget availability. Admission, income and location conditions still need checking.',
    evidence: [{ evidenceId: passage.id, quote, relation: 'supports' }] },
    { schemeId: UP_ID, requirementId: 'c3', status: 'unknown', dependsOn: [],
      explanation: 'The guidance requires native status and study in Uttar Pradesh. Your school location alone does not establish that you meet both requirements.',
      evidence: [{ evidenceId: residence.id, quote: residence.quote, relation: 'supports' }] },
    { schemeId: PRAGATI_ID, requirementId: 'c1', status: 'supported', dependsOn: [],
      explanation: 'The saved degree guideline includes girl candidates. This supports the gender condition, not complete eligibility or a current application window.',
      evidence: [{ evidenceId: admission.id, quote: admission.quote, relation: 'supports' }] },
    { schemeId: PRAGATI_ID, requirementId: 'c4', status: 'unknown', dependsOn: [],
      explanation: 'The saved guideline requires first-year degree admission, or second-year lateral entry, at an AICTE-approved institution. Completing Class 12 alone does not establish admission; confirm your course and the current guideline.',
      evidence: [{ evidenceId: admission.id, quote: admission.quote, relation: 'supports' }] },
  ] }) }, usage: { inputTokens: 100, outputTokens: 30 } };
}

export async function replayPlan() {
  const fixture = savedReplayFixture(), { retrieval, report } = compileResearchIntent(fixture.intent);
  const tools = createResearchTools({ repository: fixture.repository, retrieval, includeContext: true, now: () => new Date(fixture.now) });
  const search = await tools.execute('searchScholarships', {}), selections = [];
  for (const candidate of search.schemes.slice(0, 5)) {
    const read = await tools.execute('findGuidelinePassages', { schemeId: candidate.schemeId, query: 'eligibility course category income' });
    if (read.passages.length) selections.push({ schemeId: candidate.schemeId, evidenceIds: read.passages.map(p => p.id) });
  }
  const plan = { ...await tools.execute('finishInvestigation', { selections }), intent: report };
  const packet = answerContext({ goal: fixture.question, intent: fixture.intent, retrieval }, plan);
  return applyEvidenceAnswer(plan, packet, reviewedReplayAnswer(packet.messages));
}
