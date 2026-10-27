import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { inspectCandidateEvidence, SOURCE_PREFLIGHT } from '../../src/agents/navigator/candidateResearch.js';
import { answerContext, applyEvidenceAnswer } from '../../src/agents/navigator/evidenceAnswer.js';
import { makeEvidence } from '../../src/pipeline/core/evidence.js';
import { savedReplayFixture, reviewedReplayAnswer, UP_ID, PRAGATI_ID, YASHASVI_ID } from '../navigatorReplayFixture.js';

test('saved investigation replay improves admission with the exact old intent and no invented private inputs', async t => {
  const fixture = savedReplayFixture(), retrieval = compileResearchIntent(fixture.original.intent).retrieval;
  const started = performance.now();
  const tools = createResearchTools({ repository: fixture.repository, retrieval, includeContext: true, now: () => new Date(fixture.now) });
  const result = await tools.execute('searchScholarships', {});
  const ids = result.schemes.slice(0, 5).map(c => c.schemeId);
  assert.ok(ids.includes(UP_ID)); assert.ok(ids.includes(PRAGATI_ID)); assert.ok(ids.includes(YASHASVI_ID));
  const unrelated = fixture.schemes.filter(s => ['Maharashtra', 'West Bengal'].includes(s.state)).map(s => s._id);
  assert.ok(ids.every(id => !unrelated.includes(id)));
  assert.ok(result.schemes.filter(s => ids.includes(s.schemeId)).every(s => s.research.policyPassages > 0));
  assert.ok(result.discovery.snapshots <= SOURCE_PREFLIGHT.snapshots);
  t.diagnostic(`Public saved-source replay: old selection had 2 other-region schemes / 4; new top five has 0 / 5. ${Math.round(performance.now() - started)} ms local retrieval; zero model calls. Historical private matching inputs were not reconstructed.`);
});

test('scoped replay delivers a complete cited audience finding, while income/admission/domicile stay unconfirmed', async () => {
  const fixture = savedReplayFixture(), retrieval = compileResearchIntent(fixture.intent).retrieval;
  const tools = createResearchTools({ repository: fixture.repository, retrieval, includeContext: true, now: () => new Date(fixture.now) });
  const search = await tools.execute('searchScholarships', {}), selections = [];
  for (const candidate of search.schemes.slice(0, 5)) {
    const read = await tools.execute('findGuidelinePassages', { schemeId: candidate.schemeId, query: 'eligibility course category income' });
    if (read.passages.length) selections.push({ schemeId: candidate.schemeId, evidenceIds: read.passages.map(p => p.id) });
  }
  const plan = await tools.execute('finishInvestigation', { selections });
  const packet = answerContext({ goal: fixture.question, intent: fixture.intent, retrieval }, plan);
  const answer = applyEvidenceAnswer(plan, packet, reviewedReplayAnswer(packet.messages));
  assert.equal(answer.answer.acceptedAssessments, 4, JSON.stringify(answer.answer.diagnostics));
  const up = answer.entries.find(e => e.schemeId === UP_ID);
  assert.equal(up.answer.conditions.find(c => c.requirementId === 'c0').status, 'supported');
  assert.ok(up.answer.conditions.find(c => c.requirementId === 'c3').status === 'unknown');
  assert.ok(answer.entries.every(e => e.matching.failedCount === 0));
  assert.ok(answer.entries.some(e => e.matching.missingFields.includes('familyIncome')));
  assert.equal(up.qualification.status, 'needs_verification');
  assert.equal(up.answer.fundingRelevance, 'unknown');
  assert.equal(answer.answer.status, 'partial');
  assert.ok(!JSON.stringify(packet.context).includes('User will click on profile'));
});

test('preflight admits a later candidate distinct source despite repeated references and >12 global snapshots', async () => {
  const schemes = [], snapshots = [];
  for (let i = 0; i < 16; i++) {
    const text = `# Grant ${i}\n\n## Eligibility\nStudents admitted to marine engineering may apply.`;
    const snapshot = { _id: (100 + i).toString(16).padStart(24, '0'), id: (100 + i).toString(16).padStart(24, '0'),
      url: `https://example.invalid/guide-${i}`, kind: 'html', text, textHash: createHash('sha256').update(text).digest('hex') };
    const evidence = makeEvidence(snapshot, `Grant ${i}`, { field: 'title' });
    snapshots.push(snapshot); schemes.push({ _id: (i + 1).toString(16).padStart(24, '0'), title: `Grant ${i}`,
      officialLinks: { guidelinesUrl: snapshot.url }, fieldEvidence: Array(15).fill(evidence) });
  }
  const plan = compileResearchIntent({ objective: 'Find funding', searchQuery: 'marine engineering', constraints: [], questions: [], ambiguities: [] }).retrieval;
  const result = await inspectCandidateEvidence(schemes, { getSnapshots: async ids => snapshots.filter(s => ids.includes(s._id)) }, plan);
  assert.equal(result.candidates.size, 16);
  assert.ok([...result.candidates.values()].every(c => c.evidenceAvailable && c.preflightComplete));
  assert.equal(result.diagnostics.snapshots, 16);
});
