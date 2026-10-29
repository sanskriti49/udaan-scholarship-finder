// Offline by default. This module never starts the application, ingestion,
// SMTP or background workers. A live run requires explicit CLI opt-in.
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { comparisonCases, prepareComparisonCase } from '../../evaluations/navigatorCases.js';
import { comparePreparedCases } from '../agents/navigator/comparison.js';
import { researchExecutionBudgets } from '../agents/navigator/executionBudgets.js';

export function comparisonOptions(args) {
  const { values } = parseArgs({ args, options: { 'live-free': { type: 'boolean', default: false },
    cases: { type: 'string', default: 'category-exclusion' }, providers: { type: 'string', default: 'groq,gemini' },
    'max-calls': { type: 'string', default: '4' }, 'groq-model': { type: 'string' }, 'gemini-model': { type: 'string' } } });
  const ids = values.cases.split(','), names = values.providers.split(','), maxCalls = Number(values['max-calls']);
  if (new Set(ids).size !== ids.length || ids.some(id => !comparisonCases.some(c => c.id === id)) || names.length < 1 || names.length > 2
    || new Set(names).size !== names.length || names.some(name => !['groq', 'gemini'].includes(name)) || !/^\d+$/.test(values['max-calls']) || maxCalls < 1 || maxCalls > 12) throw new Error('INVALID_COMPARISON_OPTIONS');
  return { live: values['live-free'], ids, names, maxCalls, models: Object.fromEntries(names.map(name => [name, values[`${name}-model`] ?? null])) };
}

/** Separate from CLI/environment/transport setup so the exact live ledger path
 * can be exercised with disposable MongoDB and injected provider transports. */
export async function compareWithPersistentQuotas({ store, configs, providers, cases, maxCalls, signal, evaluate = comparePreparedCases }) {
  const active = new Map();
  try {
    const reservedProviders = [];
    for (const provider of providers) {
      const name = provider.name;
      const timeoutMs = configs.get(name)?.timeoutMs;
      if (timeoutMs != null && store.leaseMs < researchExecutionBudgets({ timeoutMs }).leaseMs) throw Object.assign(new Error(), { code: 'INVALID_CONFIGURATION' });
      const ownerId = name === 'groq' ? 'eeeeeeeeeeeeeeeeeeeeeeee' : 'dddddddddddddddddddddddd';
      const run = await store.create({ ownerId, requestId: randomUUID(), goal: 'Synthetic fixed-evidence provider comparison; not a student investigation.',
        profile: {}, provider: name, model: provider.model, limits: { maxModelCalls: Math.min(maxCalls, 6), maxToolCalls: 1 } });
      active.set(name, { ownerId, runId: run._id, run });
      reservedProviders.push({ name, model: provider.model, complete: async request => {
        const slot = active.get(name);
        const { lease } = await store.acquire({ ownerId, runId: run._id, revision: slot.run.revision }); slot.lease = lease;
        let succeeded = false;
        try { const response = await provider.complete(request); await store.recordUsage(lease, response.usage); succeeded = true; return response; }
        catch (error) { if (error.code === 'PROVIDER_QUOTA') await store.cooldown(name, error.retryAfterSeconds ?? 60); throw error; }
        finally { slot.run = await store.release(lease, { status: succeeded ? 'ready' : 'interrupted' }); slot.lease = null; }
      } });
    }
    return await evaluate({ cases, providers: reservedProviders, maxCalls, signal,
      reserveCall: async provider => store.reserveModel(active.get(provider.name).lease, configs.get(provider.name)) });
  } finally {
    // Delete synthetic investigations, never their conservative daily charges.
    for (const { ownerId, runId } of active.values()) await store.forget(ownerId, runId).catch(() => {});
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = comparisonOptions(args);
  const manifest = { mode: options.live ? 'live-free-opt-in' : 'offline-manifest', synthetic: true, maxCalls: options.maxCalls,
    selected: options.ids, providers: options.models, availableCases: comparisonCases.map(({ id, question, expected }) => ({ id, question, expected })),
    note: 'Fixed-evidence component comparison. No model winner is established by an offline manifest or scripted responses. Account billing and free quotas must be checked manually.' };
  if (!options.live) { console.log(JSON.stringify(manifest, null, 2)); return manifest; }
  if (options.names.some(name => !options.models[name])) throw new Error('EXPLICIT_MODELS_REQUIRED');
  // Credentials are not even loaded for an offline manifest.
  await import('dotenv/config');
  const [{ default: mongoose }, { createMongoRunStore }, { readNavigatorConfig }, { createResearchProvider }, { createDatabaseConnection }] = await Promise.all([
    import('mongoose'), import('../agents/navigator/mongoRunStore.js'), import('../agents/navigator/config.js'), import('../agents/navigator/provider.js'), import('../config/db.js'),
  ]);
  const controller = new AbortController(), abort = () => controller.abort();
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  let client;
  try {
    const configs = new Map(options.names.map(name => [name, readNavigatorConfig({ ...process.env, NAVIGATOR_ENABLED: 'true', NAVIGATOR_PROVIDER: name, NAVIGATOR_MODEL: options.models[name] })]));
    client = new mongoose.mongo.MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, maxPoolSize: 1 });
    const connection = createDatabaseConnection({ connect: () => client.connect(), close: () => client.close(), env: { NODE_ENV: 'production' }, maxAttempts: 1,
      logger: { log() {}, warn() {}, error() {} } });
    await connection.connect(process.env.MONGO_URI, { signal: controller.signal });
    const leaseMs = Math.max(...[...configs.values()].map(config => researchExecutionBudgets(config).leaseMs));
    const store = createMongoRunStore({ db: client.db(), leaseMs }); await store.initialize();
    const providers = options.names.map(name => createResearchProvider(configs.get(name)));
    const cases = await Promise.all(options.ids.map(id => prepareComparisonCase(comparisonCases.find(item => item.id === id))));
    const report = await compareWithPersistentQuotas({ store, configs, cases, providers, maxCalls: options.maxCalls, signal: controller.signal });
    const output = { ...report, execution: 'live-api-comparison', dataset: 'synthetic policies' };
    console.log(JSON.stringify(output, null, 2)); return output;
  } finally {
    await client?.close().catch(() => {});
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(JSON.stringify({ stopped: true, code: /^[A-Z_]{1,60}$/.test(error.code ?? error.message) ? (error.code ?? error.message) : 'COMPARISON_SETUP_FAILURE' })); process.exitCode = 1; });
}
