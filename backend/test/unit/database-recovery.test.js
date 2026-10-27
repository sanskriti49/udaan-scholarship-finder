import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDatabaseConnection, databaseGate } from '../../src/config/db.js';
import { registerHealthRoutes } from '../../src/config/health.js';
import { createNavigatorReadiness } from '../../src/agents/navigator/readiness.js';
import { createNavigatorRouter } from '../../src/agents/navigator/http.js';

const uri = 'mongodb+srv://student:PRIVATE_PASSWORD@fixture.mongodb.net/test';
const quiet = { log() {}, warn() {}, error() {} };

test('startup recovers after the short retry burst, including actual Mongoose selection errors', async () => {
  let calls = 0;
  const delays = [];
  const database = createDatabaseConnection({ env: { NODE_ENV: 'production' }, logger: quiet,
    sleep: async ms => delays.push(ms), connect: async () => {
      if (++calls < 5) throw Object.assign(new Error('PRIVATE_URI_AND_REASON'), { name: 'MongooseServerSelectionError' });
      return 'connected';
    } });
  assert.equal(await database.connect(uri), 'connected');
  assert.equal(calls, 5);
  assert.deepEqual(delays, [500, 1000, 5000, 10000]);
  assert.equal(database.status().state, 'ready');
});

test('recovery is finite, backoff is capped, concurrent callers cannot replenish its budget', async () => {
  let calls = 0;
  const delays = [], logs = [];
  const database = createDatabaseConnection({ env: { NODE_ENV: 'production' },
    logger: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, text => logs.push(text)])),
    sleep: async ms => delays.push(ms), connect: async () => {
      calls++; throw Object.assign(new Error(uri), { name: 'MongooseServerSelectionError' });
    } });
  const first = database.connect(uri);
  assert.equal(first, database.connect(uri));
  await assert.rejects(first, { code: 'DATABASE_UNAVAILABLE' });
  await assert.rejects(database.connect(uri));
  assert.equal(calls, 8);
  assert.deepEqual(delays, [500, 1000, 5000, 10000, 20000, 30000, 30000]);
  assert.equal(database.status().lastFailure, 'network');
  assert.equal(database.status().retryable, false);
  assert.equal(database.status().nextRetryAt, null);
  assert.ok(logs.at(-1).includes('network; 8 connection attempts'));
  assert.ok(!JSON.stringify(logs).includes('PRIVATE'));
});

test('authentication errors inside topology descriptions are permanent and sanitized', async () => {
  let calls = 0;
  const database = createDatabaseConnection({ env: {}, logger: quiet, sleep: async () => assert.fail('authentication must not retry'),
    connect: async () => {
      calls++;
      throw { name: 'MongooseServerSelectionError', reason: { servers: new Map([['secret-host', {
        error: Object.assign(new Error(uri), { code: 18, codeName: 'AuthenticationFailed' }) }]]) } };
    } });
  await assert.rejects(database.connect(uri), { code: 'DATABASE_UNAVAILABLE' });
  assert.equal(calls, 1);
  assert.equal(database.status().lastFailure, 'authentication');
});

test('startup attempt configuration is bounded; invalid values preserve a diagnosable failed state', async () => {
  for (const count of ['', '0', '13', 'NaN', '2.5']) {
    const database = createDatabaseConnection({ env: { MONGO_STARTUP_ATTEMPTS: count }, logger: quiet,
      connect: async () => assert.fail('bad configuration reached MongoDB') });
    await assert.rejects(database.connect(uri), { code: 'DATABASE_UNAVAILABLE' });
    assert.equal(database.status().lastFailure, 'configuration');
    assert.equal(database.status().attempt, 0);
  }
  let calls = 0;
  const database = createDatabaseConnection({ env: { MONGO_STARTUP_ATTEMPTS: '2' }, logger: quiet, sleep: async () => {},
    connect: async () => { calls++; throw Object.assign(new Error(), { code: 'ECONNRESET' }); } });
  await assert.rejects(database.connect(uri)); assert.equal(calls, 2);
});

test('recovery exposes a safe next-attempt time and cancellation interrupts its backoff', async () => {
  const controller = new AbortController();
  let release, calls = 0;
  const database = createDatabaseConnection({ env: {}, logger: quiet, now: () => Date.parse('2026-10-26T10:00:00Z'),
    sleep: async (ms, signal) => {
      assert.equal(ms, 500); assert.equal(signal, controller.signal);
      assert.deepEqual(database.status(), { state: 'retrying', attempt: 1, retryable: true,
        lastFailure: 'network', nextRetryAt: '2026-10-26T10:00:00.500Z' });
      await new Promise(resolve => { release = resolve; });
    }, connect: async () => { calls++; throw Object.assign(new Error(), { name: 'MongooseServerSelectionError' }); } });
  const result = database.connect(uri, { signal: controller.signal });
  await new Promise(resolve => setImmediate(resolve));
  controller.abort(); release(); await assert.rejects(result);
  assert.equal(calls, 1); assert.equal(database.status().lastFailure, 'cancelled');
});

test('timed-out connections drain before recovery; late success cannot initialize the application', async () => {
  let resolveLate, calls = 0, closes = 0;
  const database = createDatabaseConnection({ env: {}, logger: quiet, attemptTimeoutMs: 5,
    connect: async () => { if (++calls === 1) return new Promise(resolve => { resolveLate = resolve; }); return 'current'; },
    close: async value => { assert.equal(value, 'late'); closes++; },
    sleep: async () => {
      assert.equal(calls, 1);
      resolveLate('late');
      await new Promise(resolve => setImmediate(resolve));
    } });
  assert.equal(await database.connect(uri), 'current');
  assert.equal(calls, 2); assert.equal(closes, 1);
});

test('a permanently stalled attempt never overlaps another connection or runs forever', async () => {
  let calls = 0;
  const database = createDatabaseConnection({ env: {}, logger: quiet, attemptTimeoutMs: 5,
    connect: () => { calls++; return new Promise(() => {}); }, sleep: async () => {} });
  await assert.rejects(database.connect(uri));
  assert.equal(calls, 1); assert.equal(database.status().lastFailure, 'timeout');
});

test('failed disposal of a timed-out connection prevents unsafe reconnection', async () => {
  let resolveLate, calls = 0;
  const database = createDatabaseConnection({ env: {}, logger: quiet, attemptTimeoutMs: 5,
    connect: () => { calls++; return new Promise(resolve => { resolveLate = resolve; }); },
    close: async () => { throw new Error(uri); },
    sleep: async () => { resolveLate('late'); await new Promise(resolve => setImmediate(resolve)); } });
  await assert.rejects(database.connect(uri));
  assert.equal(calls, 1); assert.equal(database.status().lastFailure, 'cleanup');
});

async function endpoint(app, run) {
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  try { await run((path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options)); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('health probes remain accurate, uncached and independent of API throttling or database operations', async () => {
  let healthy = false, throttled = 0;
  const app = express();
  registerHealthRoutes(app, () => ({ status: healthy ? 'healthy' : 'degraded' }));
  app.use('/api', (req, res) => { throttled++; res.status(429).json({}); });
  await endpoint(app, async request => {
    for (const path of ['/health', '/api/health?probe=1']) {
      const response = await request(path); assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(throttled, 0); healthy = true;
    assert.equal((await request('/api/health')).status, 200);
    assert.equal((await request('/api/scholarships')).status, 429); assert.equal(throttled, 1);
  });
});

test('HTTP research recovers after delayed database availability with exactly one application initialization', async () => {
  let release, calls = 0, bootstrap = 0, jobs = 0, runtime = 0, inference = 0, authenticated = 0, connected = false;
  const database = createDatabaseConnection({ env: {}, logger: quiet,
    connect: async () => { if (++calls <= 3) throw Object.assign(new Error(uri), { name: 'MongooseServerSelectionError' }); return true; },
    sleep: async ms => { if (ms === 5000) await new Promise(resolve => { release = resolve; }); } });
  const readiness = createNavigatorReadiness();
  const initialization = readiness.initialize(async () => {
    await database.connect(uri); connected = true; bootstrap++; jobs++; runtime++;
    return { ready: () => connected, store: { consumeRequest: async () => {} },
      service: { list: async () => [], start: async () => { inference++; return {}; } } };
  });
  const app = express();
  registerHealthRoutes(app, () => ({ status: connected ? 'healthy' : 'degraded', database: database.status() }));
  app.use('/api', databaseGate({ ready: () => connected, status: database.status }));
  app.use('/api/navigator', createNavigatorRouter({ getRuntime: readiness.getRuntime, getReadiness: readiness.status,
    authenticate: (req, res, next) => { authenticated++; req.user = { _id: '1'.repeat(24) }; next(); } }));
  await endpoint(app, async request => {
    await new Promise(resolve => setImmediate(resolve));
    for (const method of ['GET', 'POST']) {
      const response = await request('/api/navigator/runs', { method });
      assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'NAVIGATOR_INITIALIZING');
    }
    const health = await request('/api/health'); assert.equal(health.status, 503);
    assert.equal((await health.json()).database.lastFailure, 'network');
    assert.equal(bootstrap + jobs + runtime + inference + authenticated, 0);
    release(); await initialization;
    assert.equal((await request('/api/health')).status, 200);
    assert.equal((await request('/api/navigator/runs')).status, 200);
    assert.equal(bootstrap, 1); assert.equal(jobs, 1); assert.equal(runtime, 1); assert.equal(inference, 0);
    assert.equal(readiness.initialize(() => assert.fail('must not initialize twice')), initialization);
  });
});
