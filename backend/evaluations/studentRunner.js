import { createHash, randomUUID } from 'node:crypto';
import { MemorySaver } from '@langchain/langgraph';
import { createCatalogueGraph, initialCatalogueSession } from '../src/agents/navigator/catalogueWorkflow.js';
import { NavigatorError } from '../src/agents/navigator/contracts.js';
import { scoreStudentResult, summarizeStudentResults, responseFingerprint, oracleFingerprint } from './studentScoring.js';

export const studentCorpusFingerprint = corpus => createHash('sha256').update(JSON.stringify(corpus)).digest('hex');

/** Actual research graph and tools on a frozen real-source candidate pool.
 * No reference intent, expected answer or reviewer label enters the graph.
 * Checkpoint storage is in-memory: deployment/HTTP/Mongo latency is separate. */
export async function runStudentCase({ item, corpus, provider, config, signal, cachedIntent = null, reusedIntentFrom = null }) {
  const started = performance.now(), events = [];
  const run = { privateProfile: {}, limits: { maxModelCalls: Math.min(config.maxModelCalls, 2 + config.maxResearchDecisions), maxToolCalls: config.maxToolCalls },
    usage: { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, reportedModelCalls: 0, tokenUsageIncomplete: false }, events };
  const store = { async readLease() { return structuredClone(run); },
    async reserveModel(lease, { keepRemaining = 0 } = {}) {
      if (run.usage.modelCalls >= run.limits.maxModelCalls - keepRemaining) throw new NavigatorError(keepRemaining ? 'RESEARCH_HEADROOM' : 'MODEL_LIMIT', 'Evaluation run limit');
      run.usage.modelCalls++;
    }, async reserveTool() { if (run.usage.toolCalls >= run.limits.maxToolCalls) throw new NavigatorError('TOOL_LIMIT', 'Evaluation tool limit'); run.usage.toolCalls++; },
    async appendEvent(lease, type, extra) { events.push({ type, ...extra }); },
    async recordUsage(lease, usage) { if (!usage) run.usage.tokenUsageIncomplete = true; else { run.usage.inputTokens += usage.inputTokens; run.usage.outputTokens += usage.outputTokens; run.usage.reportedModelCalls++; } },
    async cooldown() {} };
  const data = structuredClone(corpus);
  const repository = { async searchPublished() { return data.schemes; }, async getPublished(ids) { return data.schemes.filter(s => ids.includes(s._id)); },
    async getSnapshots(ids) { return data.snapshots.filter(s => ids.includes(s._id)); } };
  const saver = new MemorySaver(), graphConfig = { configurable: { thread_id: randomUUID() } };
  const modelResponses = [];
  const observedProvider = { name: provider.name, model: provider.model, async complete(request) {
    const result = await provider.complete(request);
    // Evaluation questions are fictional and sources public. Retain only the
    // provider adapter's visible response, never hidden thoughts or headers.
    modelResponses.push({ mode: request.mode, message: { content: result.message?.content ?? null }, intentFormat: result.intentFormat, usage: result.usage });
    return result;
  } };
  let session = initialCatalogueSession(item.question, item.conversation ?? [], cachedIntent), error = null;
  for (let step = 0; step < 28; step++) {
    const graph = createCatalogueGraph({ store, lease: {}, provider: observedProvider, repository, signal: signal ?? new AbortController().signal, checkpointer: saver,
      allowances: {}, adaptive: true, maxResearchDecisions: config.maxResearchDecisions, maxResearchCandidates: config.maxResearchCandidates,
      answerContextChars: config.answerContextChars, now: () => new Date(corpus.asOf) });
    try { await graph.invoke(step ? null : { session }, graphConfig); }
    catch (e) { error = /^[A-Z_]{1,60}$/.test(e.code ?? '') ? e.code : 'EVALUATION_EXECUTION_FAILED'; }
    session = (await graph.getState(graphConfig)).values.session ?? session;
    const failed = events.find(e => e.type === 'model_failed');
    if (failed) error = failed.code;
    if (error || ['completed', 'awaiting_input'].includes(session.status)) break;
    if (step === 27) error = 'EVALUATION_STEP_LIMIT';
  }
  if (run.usage.modelCalls !== run.usage.reportedModelCalls) run.usage.tokenUsageIncomplete = true;
  return { caseId: item.id, question: item.question, conversation: item.conversation ?? [], provider: provider.name, model: provider.model,
    status: error ? 'failed' : session.status, error, elapsedMs: Math.round(performance.now() - started), usage: run.usage, events,
    intent: session.intent, plan: session.plan, clarification: session.clarification, modelResponses, reusedIntentFrom,
    retrievedPassages: session.context.passages.map(([, p]) => p),
    corpusFingerprint: studentCorpusFingerprint(data), corpusFingerprintVersion: 2,
    corpusVersion: corpus.version, selectedSchemeVersions: data.schemes.filter(s => session.research?.cards.some(c => c.schemeId === s._id))
      .map(s => ({ schemeId: s._id, dataHash: s.dataHash, lastVerifiedAt: s.freshness?.lastVerifiedAt })) };
}

export async function evaluateStudentCases({ cases, corpus, provider, config, reserveCall, maxCalls, signal, onResult = () => {}, reusedIntents = new Map() }) {
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 14 || typeof reserveCall !== 'function' || !cases.length) throw new Error('INVALID_EVALUATION_ALLOWANCE');
  let calls = 0, stopped = null;
  const observations = [];
  const guarded = { name: provider.name, model: provider.model, async complete(request) {
    if (calls >= maxCalls) throw new NavigatorError('EVALUATION_LIMIT', 'Approved evaluation allowance ended.');
    return provider.complete({ ...request, reserveCall: async metadata => {
      if (calls >= maxCalls) throw new NavigatorError('EVALUATION_LIMIT', 'Approved evaluation allowance ended.');
      await reserveCall(provider, metadata); calls++; await request.reserveCall(metadata);
    } });
  } };
  for (const item of cases) {
    if (signal?.aborted || calls >= maxCalls) { stopped = signal?.aborted ? 'CANCELLED' : 'EVALUATION_LIMIT'; break; }
    const reuse = reusedIntents.get(item.id);
    const result = await runStudentCase({ item, corpus, provider: guarded, config, signal, cachedIntent: reuse?.intent, reusedIntentFrom: reuse?.fingerprint });
    observations.push(result); await onResult(result);
    if (result.error && !['EVALUATION_STEP_LIMIT'].includes(result.error)) { stopped = result.error; break; }
  }
  const scores = observations.map(result => scoreStudentResult(result, cases.find(c => c.id === result.caseId)));
  return { version: 1, execution: 'live model, actual research graph, frozen real-source candidate pool, memory checkpoints, persistent provider quotas',
    notice: corpus.notice, maxCalls, reservedCalls: calls, stopped, observations, scores, summary: summarizeStudentResults(scores, cases.length),
    notRun: cases.filter(item => !observations.some(r => r.caseId === item.id)).map(c => c.id),
    reviewTemplate: observations.map(result => { const item = cases.find(c => c.id === result.caseId); return { caseId: item.id, responseFingerprint: responseFingerprint(result),
      oracleFingerprint: oracleFingerprint(item), reviewer: '', allExplanationsReviewed: false, facts: item.facts.map(id => ({ id, explained: false, supported: false, excerpt: '' })),
      unknowns: item.unknowns.map(id => ({ id, communicated: false, excerpt: '' })),
      unmetConditions: (item.unmetConditions ?? []).map(id => ({ id, communicated: false, excerpt: '' })),
      claimsChecked: 0, incorrectClaims: [], nextStep: { useful: false, excerpt: '' } }; }) };
}
