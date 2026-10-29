// Offline by default. Run --live-free only after approving the printed allowance.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PRAGATI_JOURNEY, runResearchJourney } from '../../evaluations/researchJourney.js';

const args = process.argv.slice(2);
const cap = args.find(arg => /^--max-requests=[1-3]$/.test(arg));
const maxRequests = cap ? Number(cap.split('=')[1]) : 3;
if (args.some(arg => arg !== '--live-free' && arg !== cap)) throw new Error('Use --live-free and an optional --max-requests=1..3; model and budgets come from backend configuration.');
if (!args.includes('--live-free')) {
  console.log(JSON.stringify({ mode: 'offline_manifest', ...PRAGATI_JOURNEY, maxRequests, instructions: 'After approval: npm run check:navigator:live -- --live-free. Uses the configured model and real catalogue; stops on failure. No automatic retry or model switch.' }, null, 2));
} else {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
  const { default: mongoose } = await import('mongoose');
  const { initializeNavigator } = await import('../agents/navigator/runtime.js');
  const { NavigatorError } = await import('../agents/navigator/contracts.js');
  const transport = [];
  let requests = 0;
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  try {
    if (!process.env.MONGO_URI) throw new Error('Missing database configuration.');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false });
    const runtime = await initializeNavigator({ connection: mongoose.connection,
      env: { ...process.env, NAVIGATOR_MAX_MODEL_CALLS: String(Math.min(maxRequests, Number(process.env.NAVIGATOR_MAX_MODEL_CALLS ?? 6))) },
      fetchImpl: async (url, init) => {
        if (requests >= maxRequests || controller.signal.aborted) throw new NavigatorError('QUOTA_EXHAUSTED', 'The approved live-check allowance has ended.');
        requests++;
        const body = JSON.parse(init.body);
        const properties = body.generationConfig?.responseJsonSchema?.properties;
        const mode = properties?.constraints ? 'intent' : properties?.assessments ? 'answer' : 'decision';
        const started = performance.now(), row = { request: requests, mode };
        transport.push(row);
        try {
          const response = await fetch(url, { ...init, signal: AbortSignal.any([init.signal, controller.signal]) });
          row.httpStatus = response.status;
          return response;
        } finally { row.responseHeadersMs = Math.round(performance.now() - started); }
      } });
    if (!runtime) throw new Error('Navigator is disabled.');
    const ownerId = createHash('sha256').update('navigator-real-journey-diagnostic-v1').digest('hex').slice(0, 24);
    const report = await runResearchJourney({ runtime, ownerId, journey: PRAGATI_JOURNEY, signal: controller.signal,
      onStep: step => console.log(JSON.stringify(step)) });
    report.transport = transport;
    report.actualRequests = requests;
    const path = new URL(`../../evaluations/results/${new Date().toISOString().replaceAll(':', '-')}-real-journey.json`, import.meta.url);
    await fs.mkdir(new URL('.', path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ success: report.success, stages: report.stages, actualRequests: requests, receipt: fileURLToPath(path) }, null, 2));
    if (!report.success) process.exitCode = 1;
  } catch (error) {
    // Never log raw DB/provider errors, headers, credentials or model thoughts.
    console.error(JSON.stringify({ stopped: error instanceof NavigatorError ? error.code : 'SETUP_UNAVAILABLE', actualRequests: requests, transport }));
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', stop);
    await mongoose.disconnect();
  }
}
