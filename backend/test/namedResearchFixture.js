import { readFileSync } from 'node:fs';
import { admissionIntent, admissionBrief } from './admissionIntentFixture.js';
import { compileResearchIntent } from '../src/agents/navigator/researchIntent.js';
import { createResearchTools } from '../src/agents/navigator/researchTools.js';
import { answerContext, applyEvidenceAnswer } from '../src/agents/navigator/evidenceAnswer.js';
import { providedApplicantFields } from '../src/agents/navigator/retrievalCoverage.js';
export const captured = JSON.parse(readFileSync(new URL('./fixtures/navigator-named-source-replay.json', import.meta.url), 'utf8'));
export const TOP_CLASS_SC = '6aa58e923d52461bb6eb9f0c';
export const POST_MATRIC_REGIONAL = '6acb5ecec4c1eab76fe8a509';
export function namedResearchFixture() {
  const state = structuredClone(captured);
  // Replay the previous irrelevant selections as discovery distractors, never
  // as synthetic eligibility evidence or expected real-world recommendations.
  state.schemes.push(...captured.previousSelection.map((title, index) => ({ _id: String(index + 1).repeat(24), title, officialTitle: title,
    publication: { state: 'published' }, rules: [], fieldEvidence: [] })));
  return { ...state, state, repository: {
    async searchPublished() { return state.schemes; },
    async getPublished(ids) { return state.schemes.filter(scheme => ids.includes(scheme._id)); },
    async getSnapshots(ids) { return state.snapshots.filter(snapshot => ids.includes(snapshot._id)); },
  } };
}

/** Human-reviewed unknown interpretation; real retrieval and validation, no live
 * model. It must not certify a course merely from a prescribed-course clause. */
export async function namedReplayPlan() {
  const f = namedResearchFixture(), { retrieval, report } = compileResearchIntent(admissionIntent);
  const tools = createResearchTools({ repository: f.repository, retrieval, includeContext: true, now: () => new Date(f.now) });
  const search = await tools.execute('searchScholarships', {});
  const read = await tools.execute('findGuidelinePassages', { schemeId: TOP_CLASS_SC, query: 'eligibility' });
  let plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: TOP_CLASS_SC, evidenceIds: read.passages.map(p => p.id) }] });
  plan = { ...plan, intent: report, providedFields: providedApplicantFields(report),
    targets: search.targets.map(target => ({ ...target, status: target.candidateIds.includes(TOP_CLASS_SC) ? 'reviewed' : target.status })),
    coverage: { reviewed: [{ schemeId: TOP_CLASS_SC, title: plan.entries[0].title, ...read.retrieval, qualification: read.qualification, examined: true }],
      excluded: search.excluded.map(card => ({ ...card, ...card.retrieval, examined: false })), deferred: [] } };
  const packet = answerContext({ goal: admissionBrief, retrieval }, plan), clause = packet.context.candidates[0].passages.find(p => p.quote.includes('notified institutions') && p.quote.includes('allocated to the institution'));
  return applyEvidenceAnswer(plan, packet, { message: { content: JSON.stringify({ assessments: [{ schemeId: TOP_CLASS_SC, requirementId: 'c1', status: 'unknown', dependsOn: [],
    explanation: 'The saved guideline requires admission to a prescribed course at a notified institution, with an available scholarship slot. B.Tech admission alone does not establish those conditions; confirm your institution and course against the current guideline.',
    evidence: [{ evidenceId: clause.id, quote: clause.quote, relation: 'supports' }] }] }) } });
}
