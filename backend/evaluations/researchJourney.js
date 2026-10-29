import { randomUUID } from 'node:crypto';
import { NavigatorMongoCheckpointer } from '../src/agents/navigator/mongoCheckpointer.js';
import { studentFindings, studentCondition } from '../../frontend/src/navigator/studentFindings.js';

// Evaluation input and independent expectations, never imported by the app.
export const PRAGATI_JOURNEY = {
  id: 'pragati-degree-real-catalogue',
  goal: 'I am a girl admitted to the first year of B.Tech at an AICTE-approved college. My annual family income is 500000 rupees. Does AICTE Pragati (Technical Degree) cover my situation, and what other conditions must I meet?',
  expectedSchemeId: '6aa58e923d52461bb6eb9e9a',
  expectedIncome: 500000,
};

/** A completed graph is not proof of a useful answer. These stages are separate
 * so a failure cannot be hidden by a successful status or an unrelated citation. */
export function inspectJourney(run, session, journey) {
  // Completion deliberately erases checkpoints. The persisted public intent
  // report retains the validated requirements, without restoring private state.
  const interpreted = session?.retrieval ?? run.plan?.intent;
  const requirements = interpreted?.requirements ?? [];
  const entry = run.plan?.entries.find(e => e.schemeId === journey.expectedSchemeId);
  const selectedIds = run.plan?.entries.map(e => e.schemeId) ?? session?.selections?.map(s => s.schemeId) ?? [];
  const income = requirements.find(r => r.field === 'incomeCeiling' && r.role === 'applicant_current' && r.operator === 'include' && r.value === journey.expectedIncome);
  const findings = entry ? studentFindings(entry) : null;
  const incomeAnswer = entry?.answer?.conditions.find(c => c.requirementId === income?.id);
  const passages = entry?.citations ?? session?.context?.passages.map(([, p]) => p).filter(p => p.schemeId === journey.expectedSchemeId) ?? [];
  const policy = passages.filter(c => c.scope === 'linked_guideline' && /2\.0 ELIGIBILITY FOR SCHOLARSHIP/u.test(c.evidence.quote));
  const citedAnswer = incomeAnswer?.status === 'supported'
    && incomeAnswer.evidence.some(proof => policy.some(p => p.id === proof.evidenceId && p.evidence.quote.includes(proof.quote)));
  const stages = {
    interpretation: Boolean((session?.intent || run.plan?.intent?.status === 'interpreted') && income && interpreted.targets?.some(t => /pragati/iu.test(t.name))),
    candidateSelection: Boolean(selectedIds.includes(journey.expectedSchemeId) && selectedIds.every(id => id === journey.expectedSchemeId)),
    policyRetrieval: policy.some(p => /8 lakh/u.test(p.evidence.quote) && /First year/u.test(p.evidence.quote)),
    citedAnswer: Boolean(citedAnswer && findings?.hasFindings),
  };
  return { success: run.status === 'completed' && Object.values(stages).every(Boolean), stages,
    firstUnverifiedStage: Object.keys(stages).find(key => !stages[key]) ?? null,
    intent: session?.intent ?? run.plan?.intent ?? null,
    clarification: run.clarification ?? null,
    candidateOrder: (session?.research?.cards ?? []).map(c => ({ schemeId: c.schemeId, title: c.title, qualification: c.qualification?.status })),
    studentFindings: entry ? entry.answer?.conditions.map(c => ({ label: studentCondition(c, requirements), status: c.status, explanation: c.explanation, evidence: c.evidence })) : [],
  };
}

/** Actual persisted application service: no injected gold intent, candidate,
 * passage or answer. A failed call, ambiguity or interrupted write is not retried. */
export async function runResearchJourney({ runtime, ownerId, journey, signal, onStep = () => {}, maxAdvances = 28 }) {
  if (!Number.isInteger(maxAdvances) || maxAdvances < 1 || maxAdvances > 32) throw new Error('Bound the diagnostic advancement count.');
  let run;
  const started = performance.now(), steps = [];
  try {
    run = await runtime.service.start(ownerId, { requestId: randomUUID(), goal: journey.goal, profile: {} });
    for (let i = 0; i < maxAdvances && run.status === 'ready' && !signal?.aborted; i++) {
      const before = performance.now();
      run = await runtime.service.advance(ownerId, { runId: run.runId, revision: run.revision }, { signal });
      const step = { advancement: i + 1, status: run.status, elapsedMs: Math.round(performance.now() - before),
        modelCalls: run.usage.modelCalls, toolCalls: run.usage.toolCalls,
        latestEvent: run.events.at(-1) ?? null, error: run.error?.code ?? null };
      steps.push(step); onStep(step);
      if (run.events.some(e => e.type === 'model_failed' || e.type === 'answer_failed') || run.error) break;
    }
    const stored = await runtime.store.getOwned(ownerId, run.runId);
    const decoder = new NavigatorMongoCheckpointer({ store: runtime.store, lease: { ownerId, runId: run.runId } });
    const checkpoint = stored.checkpoints?.[0];
    const session = checkpoint ? (await decoder.decode(checkpoint.checkpoint))?.channel_values?.session : null;
    return { version: 1, recordedAt: new Date().toISOString(), case: journey.id,
      provider: runtime.provider, model: runtime.model, question: journey.goal,
      ...inspectJourney(run, session, journey), steps, elapsedMs: Math.round(performance.now() - started),
      usage: run.usage, limits: run.limits, status: run.status, error: run.error,
      // Synthetic input and public scholarship sources only. No raw provider
      // output, thought text, student accounts, private profile or lease data.
      plan: run.plan, cleanup: 'temporary run removed; quota charges retained' };
  } finally {
    if (run) await runtime.service.forget(ownerId, run.runId);
  }
}
