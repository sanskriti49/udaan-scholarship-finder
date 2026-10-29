import { createHash } from 'node:crypto';
import { researchFixture, SCHEME_ID, FIXTURE_NOW } from './navigatorHelpers.js';
import { makeEvidence } from '../src/pipeline/core/evidence.js';
import { compileResearchIntent } from '../src/agents/navigator/researchIntent.js';
import { createResearchTools } from '../src/agents/navigator/researchTools.js';
import { answerContext, applyEvidenceAnswer } from '../src/agents/navigator/evidenceAnswer.js';

export function policyFixture() {
  const fixture = researchFixture({ linkedPdf: true });
  const renewal = 'Existing award holders may renew for fourth-year study if they maintain satisfactory academic progress.';
  const combined = 'Full-time degree students who are women, belong to OBC, and are domiciled in Goa may apply.';
  fixture.snapshot.text = [
    '# Synthetic policy for retrieval tests',
    '## Degree exclusions\nPart-time degree enrolment is not accepted.',
    '## Gender exclusions\nMale candidates cannot apply.',
    '## Category exclusions\nApplicants outside the listed categories cannot apply.',
    '## Residence exclusions\nApplicants without required domicile documents cannot apply.',
    `## Eligibility\n${combined}`, `## Renewal\n${renewal}`,
  ].join('\n\n');
  fixture.snapshot.pages = [];
  fixture.snapshot.textHash = createHash('sha256').update(fixture.snapshot.text).digest('hex');
  fixture.scheme.fieldEvidence = [makeEvidence(fixture.snapshot, fixture.snapshot.text, { field: 'eligibility' })];
  fixture.scheme.rules = [];
  fixture.scheme.currentCycle.applicationType = null;
  fixture.state.schemes = [fixture.scheme];
  const fields = [['educationLevel', 'UG', 'funding'], ['gender', 'Female', 'applicant_current'],
    ['category', 'OBC', 'applicant_current'], ['state', 'Goa', 'applicant_domicile'], ['applicationType', 'renewal', 'investigate']];
  const intent = { objective: 'Find a degree award and investigate renewal', searchQuery: '', questions: [], ambiguities: [],
    constraints: fields.map(([field, value, role]) => ({ field, value, role, operator: 'include', source: { messageIndex: 0, quote: 'synthetic fixture' } })) };
  const { retrieval } = compileResearchIntent(intent);
  return { ...fixture, intent, retrieval, renewal, combined };
}

// Reviewed synthetic assessment for end-to-end UI checks, not a live-model claim.
export async function renewalPlanFixture({ now = () => FIXTURE_NOW } = {}) {
 const f = policyFixture();
 const tools = createResearchTools({ repository: f.repository, retrieval: f.retrieval, includeContext: true, now });
 const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'degree award' });
 const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
 const session = { goal: 'Find degree funding and renewal options.', intent: f.intent, retrieval: f.retrieval, conversation: [] };
 const packet = answerContext(session, plan);
 const passage = packet.context.candidates[0].passages.find(p => p.quote.includes(f.renewal));
 return applyEvidenceAnswer(plan, packet, { message: { content: JSON.stringify({ assessments: [{ schemeId: SCHEME_ID, requirementId: 'c4', status: 'supported',
  explanation: 'Renewal is available to existing award holders, subject to academic progress. This does not confirm your award status or the remaining conditions.',
  evidence: [{ evidenceId: passage.id, quote: f.renewal, relation: 'supports' }], dependsOn: [] }] }) } });
}
