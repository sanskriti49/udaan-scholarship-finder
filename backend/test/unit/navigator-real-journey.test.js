import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { cachedAnswerResponse } from '../../src/agents/navigator/evidenceAnswer.js';
import { memoryJourney } from '../adaptiveFixture.js';
import { inspectJourney, PRAGATI_JOURNEY, runResearchJourney } from '../../evaluations/researchJourney.js';

const recorded = JSON.parse(readFileSync(new URL('../fixtures/navigator-pragati-live-journey.json', import.meta.url)));

test('real successful findings remain verifiable after completion erases private checkpoints', () => {
  const result = inspectJourney({ status: 'completed', plan: recorded.plan }, null, PRAGATI_JOURNEY);
  assert.equal(result.success, true); assert.ok(Object.values(result.stages).every(Boolean));
  const income = result.studentFindings.find(f => f.label === 'Family income: ₹5,00,000');
  assert.equal(income.status, 'supported'); assert.match(income.explanation, /8 lakh/);
  assert.ok(income.evidence[0].span.charEnd > income.evidence[0].span.charStart);
});

test('recorded live intent and accepted answer replay through discovery and source validation without network inference', async () => {
  const { scheme, snapshots } = structuredClone(recorded.catalogue);
  // Completed runs retain a validated intent report, rather than the raw model
  // payload. Reconstruct that accepted contract for a repeatable graph replay.
  const constraints = recorded.plan.intent.requirements.filter(r => r.field !== 'question').map(({ id, label, stage, ...r }) => r);
  const intent = { objective: 'Evaluate the requested scheme against stated conditions', searchQuery: 'AICTE Pragati',
    constraints: [...constraints, ...recorded.plan.intent.targets.map(t => ({ field: 'scheme', role: 'investigate', operator: t.operator, value: t.name, source: t.source }))],
    questions: recorded.plan.intent.requirements.filter(r => r.field === 'question').map(({ text, source }) => ({ text, source })), ambiguities: [] };
  const calls = [];
  const provider = { name: recorded.provider, model: recorded.model, async complete({ mode }) {
    calls.push(mode);
    if (mode === 'research_intent') return { intentFormat: 'json_schema', message: { content: JSON.stringify(intent) } };
    assert.equal(mode, 'evidence_answer'); return cachedAnswerResponse(recorded.plan);
  } };
  const repository = { async searchPublished() { return [scheme]; }, async getPublished(ids) { return ids.includes(scheme._id) ? [scheme] : []; },
    async getSnapshots(ids) { return snapshots.filter(s => ids.includes(s._id)); } };
  const result = await memoryJourney({ goal: recorded.question, repository }, { provider, tools: 8, now: () => new Date(recorded.capturedAt) });
  assert.equal(result.session.status, 'completed'); assert.deepEqual(calls, ['research_intent', 'evidence_answer']);
  const plan = result.session.plan;
  assert.deepEqual(plan.entries.map(e => e.schemeId), [PRAGATI_JOURNEY.expectedSchemeId]);
  assert.equal(plan.answer.acceptedAssessments, 5); assert.equal(plan.answer.rejectedAssessments, 0);
  assert.equal(plan.entries[0].qualification.status, 'needs_verification'); // No whole-scholarship guarantee.
  for (const c of plan.entries[0].answer.conditions) {
    assert.equal(c.status, 'supported');
    for (const proof of c.evidence) {
      const citation = plan.entries[0].citations.find(p => p.id === proof.evidenceId);
      const snapshot = snapshots.find(s => s._id === String(citation.evidence.snapshotId));
      assert.equal(snapshot.text.slice(proof.span.charStart, proof.span.charEnd), proof.quote);
    }
  }
});

test('a completed graph with unrelated or uncited results never passes the real-journey check', () => {
  const result = inspectJourney({ status: 'completed', plan: { entries: [] } }, { intent: {}, retrieval: { requirements: [] } }, PRAGATI_JOURNEY);
  assert.equal(result.success, false); assert.equal(result.firstUnverifiedStage, 'interpretation');
  assert.equal(result.stages.citedAnswer, false);
});

test('live diagnostic stops after one failed attempt, deletes only its run and never retries or skips clarification', async () => {
  for (const status of ['partial', 'awaiting_input', 'interrupted', 'ready']) {
    let advances = 0, starts = 0;
    const forgotten = [];
    const runtime = { provider: 'gemini', model: 'configured-model', service: {
      async start(owner, input) { starts++; assert.deepEqual(input.profile, {}); return { runId: 'owned-run', revision: 0, status: 'ready' }; },
      async advance(owner, input) {
        advances++; assert.deepEqual(input, { runId: 'owned-run', revision: 0 });
        return { runId: 'owned-run', status, usage: { modelCalls: 1, toolCalls: 0 }, events: [{ type: 'model_failed', code: 'PROVIDER_UNAVAILABLE' }] };
      },
      async forget(owner, id) { forgotten.push([owner, id]); },
    }, store: { async getOwned() { return { checkpoints: [] }; } } };
    const report = await runResearchJourney({ runtime, ownerId: 'diagnostic-owner', journey: PRAGATI_JOURNEY });
    assert.equal(report.success, false); assert.equal(report.steps.length, 1);
    assert.equal(advances, 1); assert.equal(starts, 1); assert.deepEqual(forgotten, [['diagnostic-owner', 'owned-run']]);
  }
});

test('ambiguous advancement failures are not repeated and temporary-run cleanup still runs', async () => {
  let calls = 0, forgotten = 0;
  const runtime = { service: {
    async start() { return { runId: 'owned-run', revision: 0, status: 'ready' }; },
    async advance() { calls++; throw new Error('Interrupted response'); },
    async forget() { forgotten++; },
  } };
  await assert.rejects(runResearchJourney({ runtime, ownerId: 'owner', journey: PRAGATI_JOURNEY }), /Interrupted response/);
  assert.equal(calls, 1); assert.equal(forgotten, 1);
});

test('the command defaults to an offline manifest even with deliberately unusable configuration', () => {
  const output = execFileSync(process.execPath, ['src/scripts/checkNavigatorLive.js'], { cwd: new URL('../../', import.meta.url),
    env: { ...process.env, MONGO_URI: 'must-not-be-opened', GEMINI_API_KEY: 'must-not-be-used' }, encoding: 'utf8' });
  const manifest = JSON.parse(output);
  assert.equal(manifest.mode, 'offline_manifest'); assert.equal(manifest.maxRequests, 3);
  assert.doesNotMatch(output, /must-not-be/);
});
