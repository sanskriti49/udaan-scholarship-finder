// Explicit, one-shot evaluation for this task's approved THREE-attempt ceiling.
// Reuses the production Gemini adapter, graph and persistent quota reservations.
import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { readNavigatorConfig } from '../src/agents/navigator/config.js';
import { createGeminiProvider } from '../src/agents/navigator/geminiProvider.js';
import { createMongoRunStore } from '../src/agents/navigator/mongoRunStore.js';
import { researchExecutionBudgets } from '../src/agents/navigator/executionBudgets.js';
import { compareWithPersistentQuotas } from '../src/scripts/compareNavigatorProviders.js';
import { evaluateStudentCases } from './studentRunner.js';
import { studentQuestions, loadStudentCorpus } from './studentQuestions.js';

if (!process.argv.includes('--approved-three-attempts')) throw new Error('Explicit live opt-in required.');
const receiptPath = new URL('./results/2026-10-30-gemini-usefulness-receipt.json', import.meta.url);
// Exclusive creation refuses a second execution; do not remove/reset this ledger.
const handle = await fs.open(receiptPath, 'wx');
await handle.close();
const receipt = { approvedMaximum: 3, attempts: [], startedAt: new Date().toISOString(), provider: 'gemini', noRetries: true,
  scope: 'Fictional student, frozen public source captures, actual graph, memory checkpoints, isolated local persistent quotas; no portal or production DB access.' };
const save = () => fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
await save();
let client, mode;
try {
  dotenv.config({ quiet: true });
  const config = readNavigatorConfig(process.env);
  if (!config.enabled || config.provider !== 'gemini') throw Object.assign(new Error(), { code: 'CONFIGURED_GEMINI_REQUIRED' });
  receipt.model = config.model;
  const item = studentQuestions.find(q => q.id === 'renewal-fourth-year');
  receipt.question = item.question;
  client = new mongoose.mongo.MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  const db = client.db('navigator_usefulness_eval_20261030');
  const store = createMongoRunStore({ db, leaseMs: researchExecutionBudgets(config).leaseMs });
  await store.initialize();
  const adapter = createGeminiProvider({ ...config, fetchImpl: async (url, options) => {
    if (receipt.attempts.length >= 3) throw Object.assign(new Error(), { code: 'EVALUATION_LIMIT' });
    if (url !== `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`) throw new Error('Unapproved endpoint');
    const attempt = { number: receipt.attempts.length + 1, mode, startedAt: new Date().toISOString() };
    receipt.attempts.push(attempt); await save(); // Count BEFORE every transport invocation, including failures.
    const started = performance.now();
    try {
      const response = await fetch(url, options);
      attempt.httpStatus = response.status;
      // Visible usage metadata only; never persist credentials or hidden thoughts.
      try { const data = await response.clone().json(); attempt.usageMetadata = data.usageMetadata ?? null; } catch { /* Adapter reports bounded response failures. */ }
      return response;
    } catch { attempt.transportFailed = true; throw Object.assign(new Error(), { code: 'EVALUATION_TRANSPORT_FAILURE' }); }
    finally { attempt.elapsedMs = Math.round(performance.now() - started); await save(); }
  } });
  const provider = { name: adapter.name, model: adapter.model, complete: request => { mode = request.mode; return adapter.complete(request); } };
  const evaluationConfig = { ...config, maxModelCalls: 2, maxResearchDecisions: 0 };
  const result = await compareWithPersistentQuotas({ store, configs: new Map([['gemini', config]]), providers: [provider], cases: [item], maxCalls: 3,
    evaluate: ({ providers, reserveCall, maxCalls, signal }) => evaluateStudentCases({ cases: [item], corpus: loadStudentCorpus(), provider: providers[0], config: evaluationConfig, reserveCall, maxCalls, signal }) });
  receipt.status = result.observations[0]?.status; receipt.error = result.observations[0]?.error ?? result.stopped;
  receipt.actualAttemptCount = receipt.attempts.length;
  receipt.cost = 'No monetary billing information returned by the API; token counts are not a cost estimate.';
  await fs.writeFile(new URL('./results/2026-10-30-gemini-usefulness-observation.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  // Preserve daily charges in this dedicated local evaluation DB; synthetic runs are removed by the existing harness.
  receipt.quotaUsage = (await db.collection('navigator_quotas').find({}, { projection: { _id: 1, used: 1 } }).toArray());
} catch (error) {
  receipt.error = /^[A-Z_]{1,60}$/.test(error.code ?? '') ? error.code : 'EVALUATION_SETUP_FAILED';
} finally {
  receipt.actualAttemptCount = receipt.attempts.length;
  receipt.finishedAt = new Date().toISOString(); await save();
  await client?.close();
}
console.log(JSON.stringify(receipt, null, 2));
