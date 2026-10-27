// Opt-in diagnostic. Synthetic requests only; production quota reservations are retained.
// Run from backend: node src/scripts/evaluateNavigatorIntent.js --live-free
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { readNavigatorConfig } from '../agents/navigator/config.js';
import { createMongoRunStore } from '../agents/navigator/mongoRunStore.js';
import { createGroqProvider } from '../agents/navigator/groqProvider.js';
import { INTENT_PROMPT, intentMessages, parseResearchIntent, compileResearchIntent, researchIntentSchema } from '../agents/navigator/researchIntent.js';

export const cases = [
  { id: 'negation', goal: "I'm pursuing a master's, not a bachelor's. Find Maharashtra schemes only; exclude national schemes. My family earns less than four and a half lakh rupees a year.", conversation: [],
    expected: 'PG included; UG and All India excluded; Maharashtra included; income ceiling 450000 retained, never a private profile input.' },
  { id: 'renewal', goal: 'Can someone already receiving AICTE Pragati renew it in the fourth year of an engineering degree? I am asking about continuing an existing award, not applying for the first time.', conversation: [],
    expected: 'Pragati identified; renewal and fourth year preserved; question retained; no eligibility assertion.' },
  { id: 'followup', conversation: [{ role: 'user', content: 'Find national undergraduate scholarships for hostel expenses.' }],
    goal: "Actually, exclude nationwide schemes. Only Maharashtra now, and postgraduate rather than undergraduate. Keep the hostel requirement. Don't assume I already live in a hostel.",
    expected: 'Latest PG/Maharashtra restrictions replace UG/national; national excluded; hostel topic retained without asserting residence.' },
];

if (!process.argv.includes('--live-free')) {
  console.log(JSON.stringify({ mode: 'offline-manifest', cases }, null, 2));
} else {
  const results = []; let store, run, lease;
  const ownerId = 'eeeeeeeeeeeeeeeeeeeeeeee';
  try {
    const config = readNavigatorConfig(process.env);
    if (!config.enabled || config.model !== 'openai/gpt-oss-120b') throw new Error('CONFIGURATION');
    try { await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false }); }
    catch (error) {
      if (error.syscall !== 'querySrv' || error.code !== 'ECONNREFUSED') throw error;
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false });
    }
    store = createMongoRunStore({ db: mongoose.connection.db });
    await store.initialize(); // Idempotent existing index setup; no catalogue mutations.
    for (const item of cases) {
      let transport = null;
      const provider = createGroqProvider({ ...config, fetchImpl: async (...args) => {
        const response = await fetch(...args);
        const body = await response.clone().json().catch(() => null);
        transport = { httpStatus: response.status, finishReason: body?.choices?.[0]?.finish_reason ?? null,
          usage: body?.usage ?? null,
          remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
          remainingRequests: response.headers.get('x-ratelimit-remaining-requests') };
        return response;
      } });
      run = await store.create({ ownerId, requestId: randomUUID(), goal: item.goal, conversation: item.conversation, profile: {},
        provider: config.provider, model: config.model, limits: { maxModelCalls: 1, maxToolCalls: 1 } });
      ({ lease } = await store.acquire({ ownerId, runId: run._id, revision: run.revision }));
      const started = performance.now();
      const result = { id: item.id, expected: item.expected };
      try {
        const messages = intentMessages(item.goal, item.conversation);
        const response = await provider.complete({ mode: 'research_intent', messages: [{ role: 'system', content: INTENT_PROMPT }, ...messages],
          reserveCall: () => store.reserveModel(lease, config) });
        await store.recordUsage(lease, response.usage);
        // Synthetic inputs only. Record validation categories, never hidden reasoning or raw provider bodies.
        try {
          const raw = JSON.parse(response.message.tool_calls?.[0]?.function.arguments ?? 'null');
          const validated = researchIntentSchema.safeParse(raw);
          result.validation = validated.success ? { schema: 'valid', anchorsValid: [...validated.data.constraints, ...validated.data.questions, ...validated.data.ambiguities]
            .every(value => messages[value.source.messageIndex]?.content.includes(value.source.quote)) }
            : { schema: 'invalid', issues: validated.error.issues.map(issue => ({ path: issue.path, code: issue.code })) };
        } catch { result.validation = { schema: 'unreadable' }; }
        result.intent = parseResearchIntent(response, messages);
        result.compiled = compileResearchIntent(result.intent);
        result.schemaValid = true;
      } catch (error) {
        result.error = /^[A-Z_]+$/.test(error.code ?? '') ? error.code : 'DIAGNOSTIC_FAILURE';
        if (error.code === 'PROVIDER_QUOTA') await store.cooldown(config.provider, error.retryAfterSeconds ?? 60);
      }
      result.latencyMs = Math.round(performance.now() - started); result.transport = transport;
      results.push(result); console.log(JSON.stringify(result));
      await store.forget(ownerId, run._id); run = null;
      if (result.error === 'PROVIDER_QUOTA' || result.error === 'QUOTA_EXHAUSTED' || result.error === 'PROVIDER_AUTH') break;
      // No retries. Space requests to avoid spending the TPM allowance in a burst.
      if (results.length < cases.length) await new Promise(resolve => setTimeout(resolve, 60000));
    }
  } catch (error) {
    console.error(JSON.stringify({ stopped: true, code: /^[A-Z_]+$/.test(error.code ?? '') ? error.code : 'DIAGNOSTIC_SETUP_FAILURE' })); process.exitCode = 1;
  } finally {
    if (run && store) await store.forget(ownerId, run._id).catch(() => {});
    await mongoose.disconnect();
    await writeFile(new URL('../../../navigator-intent-evaluation.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), synthetic: true, maxCalls: 3, results }, null, 2));
  }
}
