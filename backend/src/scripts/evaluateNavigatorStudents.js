// Explicit evaluation entry point. Offline modes do not load credentials,
// contact providers, connect to a database, or start application services.
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { studentQuestions, loadStudentCorpus } from '../../evaluations/studentQuestions.js';
import { evaluateStudentCases } from '../../evaluations/studentRunner.js';
import { scoreStudentResult, summarizeStudentResults, responseFingerprint } from '../../evaluations/studentScoring.js';

const { values } = parseArgs({ options: { 'live-free': { type: 'boolean', default: false }, input: { type: 'string' }, reviews: { type: 'string' },
  output: { type: 'string' }, cases: { type: 'string', default: 'pilot' }, 'max-calls': { type: 'string', default: '8' }, 'reuse-intent-from': { type: 'string' }, 'min-useful-rate': { type: 'string' } } });
const ids = values.cases === 'pilot' ? studentQuestions.filter(c => c.pilot).map(c => c.id) : values.cases === 'all' ? studentQuestions.map(c => c.id) : values.cases.split(',');
const selected = ids.map(id => studentQuestions.find(c => c.id === id)), maxCalls = Number(values['max-calls']);
if (selected.some(c => !c) || new Set(ids).size !== ids.length || !/^(?:[1-9]|1[0-4])$/.test(values['max-calls'])) throw new Error('INVALID_STUDENT_EVALUATION_OPTIONS');
if (values['live-free'] && (values.input || values.reviews)) throw new Error('Separate live generation from source review.');
const threshold = values['min-useful-rate'] == null ? null : Number(values['min-useful-rate']);
if (threshold != null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1 || !values.input || !values.reviews)) throw new Error('A quality gate requires a source-reviewed report and a rate from 0 to 1.');
const corpus = loadStudentCorpus();
async function emit(report) {
  if (values.output) await fs.writeFile(values.output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, observations: report.observations?.map(r => ({ caseId: r.caseId, status: r.status, error: r.error, elapsedMs: r.elapsedMs, usage: r.usage })), reviewTemplate: undefined }, null, 2));
}
if (values.input) {
  const report = JSON.parse(await fs.readFile(values.input, 'utf8'));
  const reviews = values.reviews ? JSON.parse(await fs.readFile(values.reviews, 'utf8')) : [];
  if (!Array.isArray(reviews) || new Set(reviews.map(r => r.caseId)).size !== reviews.length) throw new Error('INVALID_REVIEW_FILE');
  const cases = (report.selectedCases ?? ids).map(id => studentQuestions.find(c => c.id === id));
  if (cases.some(c => !c) || reviews.some(r => !report.observations.some(o => o.caseId === r.caseId))) throw new Error('UNKNOWN_REVIEW_CASE');
  report.scores = report.observations.map(result => scoreStudentResult(result, cases.find(c => c.id === result.caseId), reviews.find(r => r.caseId === result.caseId)));
  report.summary = summarizeStudentResults(report.scores, cases.length);
  report.reviewedAt = new Date().toISOString();
  if (threshold != null) {
    const passed = report.summary.reviewed === report.summary.attempted && report.summary.notRun === 0
      && report.summary.usefulRateAcrossAttemptedLowerBound >= threshold && report.summary.incorrectClaims === 0 && report.summary.unsupportedClaims === 0;
    report.qualityGate = { passed, minimumUsefulRate: threshold, scope: 'This reviewed sample only; not a fresh model run or production certification.' };
    if (!passed) process.exitCode = 1;
  }
  await emit(report);
} else if (!values['live-free']) {
  await emit({ mode: 'offline_manifest', maxCalls, selectedCases: ids, corpus: { schemes: corpus.schemes.length, sources: corpus.snapshots.length, asOf: corpus.asOf, notice: corpus.notice },
    cases: selected.map(c => ({ ...c, facts: c.facts.map(id => ({ id })) })),
    measures: ['candidate relevance', 'intent retention', 'retrieved/cited/explained fact coverage', 'reviewed incorrect claims', 'useful completion', 'interactive success within 30s', 'latency', 'reported inference usage'],
    reviewPolicy: 'Source review is required for free-text correctness and usefulness. Unknown with no helpful policy explanation/next step fails. Expected answers never enter model prompts.' });
} else {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
  const [{ default: mongoose }, { readNavigatorConfig }, { createResearchProvider }, { createMongoRunStore }, { researchExecutionBudgets }, { compareWithPersistentQuotas }] = await Promise.all([
    import('mongoose'), import('../agents/navigator/config.js'), import('../agents/navigator/provider.js'), import('../agents/navigator/mongoRunStore.js'),
    import('../agents/navigator/executionBudgets.js'), import('./compareNavigatorProviders.js'),
  ]);
  const config = readNavigatorConfig(process.env);
  if (!config.enabled) throw new Error('NAVIGATOR_DISABLED');
  const reusedIntents = new Map();
  if (values['reuse-intent-from']) {
    const previous = JSON.parse(await fs.readFile(values['reuse-intent-from'], 'utf8'));
    for (const item of selected) {
      const prior = previous.observations?.find(o => o.caseId === item.id);
      if (!prior?.intent || prior.error || prior.question !== item.question || JSON.stringify(prior.conversation) !== JSON.stringify(item.conversation ?? [])
        || prior.provider !== config.provider || prior.model !== config.model) throw new Error('REUSABLE_LIVE_INTENT_REQUIRED');
      reusedIntents.set(item.id, { intent: prior.intent, fingerprint: responseFingerprint(prior) });
    }
  }
  const controller = new AbortController(), abort = () => controller.abort();
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  let client, requests = 0;
  const transport = [];
  try {
    client = new mongoose.mongo.MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 7000 }); await client.connect();
    const store = createMongoRunStore({ db: client.db(), leaseMs: researchExecutionBudgets(config).leaseMs }); await store.initialize();
    const provider = createResearchProvider({ ...config, fetchImpl: async (url, init) => {
      if (requests >= maxCalls) throw Object.assign(new Error(), { code: 'EVALUATION_LIMIT' });
      requests++; const started = performance.now(), row = { request: requests }; transport.push(row);
      try { const response = await fetch(url, init); row.httpStatus = response.status; return response; }
      finally { row.responseHeadersMs = Math.round(performance.now() - started); }
    } });
    const batches = [];
    for (const item of selected) {
      const remaining = maxCalls - requests;
      if (!remaining || controller.signal.aborted) break;
      const batch = await compareWithPersistentQuotas({ store, configs: new Map([[provider.name, config]]), providers: [provider], cases: [item], maxCalls: Math.min(remaining, 3), signal: controller.signal,
        evaluate: ({ providers, reserveCall, maxCalls, signal }) => evaluateStudentCases({ cases: [item], corpus, provider: providers[0], config, reserveCall, maxCalls, signal, reusedIntents,
          onResult: result => console.log(JSON.stringify({ caseId: result.caseId, status: result.status, error: result.error, elapsedMs: result.elapsedMs, usage: result.usage })) }) });
      batches.push(batch);
      if (batch.stopped) break;
    }
    const observations = batches.flatMap(b => b.observations), scores = batches.flatMap(b => b.scores);
    await emit({ version: 1, recordedAt: new Date().toISOString(), execution: 'live configured model; frozen-source research graph; memory checkpoints; real persistent inference quotas',
      latencyScope: 'Research core plus provider/quota persistence, excludes browser/HTTP and production checkpoint storage. Not comparable to the earlier 293-second full journey.',
      notice: corpus.notice, selectedCases: ids, maxCalls, actualRequests: requests, transport, observations, scores, reviewTemplate: batches.flatMap(b => b.reviewTemplate),
      summary: summarizeStudentResults(scores, selected.length), stopped: batches.find(b => b.stopped)?.stopped ?? (observations.length < selected.length ? 'EVALUATION_LIMIT' : null),
      notRun: ids.filter(id => !observations.some(o => o.caseId === id)) });
  } catch (error) {
    // Safe codes only; no credentials, raw provider failures or database URI.
    console.error(JSON.stringify({ stopped: /^[A-Z_]{1,60}$/.test(error.code ?? '') ? error.code : 'EVALUATION_SETUP_UNAVAILABLE', actualRequests: requests })); process.exitCode = 1;
  } finally {
    await client?.close(); process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
  }
}
