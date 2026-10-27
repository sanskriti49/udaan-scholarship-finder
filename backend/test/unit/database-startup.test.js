import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDatabaseConnection, databaseGate } from '../../src/config/db.js';
import { createNavigatorReadiness } from '../../src/agents/navigator/readiness.js';
import { createNavigatorRouter } from '../../src/agents/navigator/http.js';

const uri = 'mongodb+srv://test:PRIVATE_PASSWORD@fixture.mongodb.net/test';
const failure = (code = 'ESERVFAIL', syscall = 'querySrv') => Object.assign(new Error('PRIVATE_CONNECTION_STRING'), { code, syscall });
function fixture(connect, env = {}) {
  const messages = [], resolvers = [], waits = [];
  const connection = createDatabaseConnection({ connect, env, maxAttempts: 3,
    logger: Object.fromEntries(['log', 'warn', 'error'].map(key => [key, message => messages.push(message)])),
    dnsApi: { getServers: () => ['192.0.2.1'], setServers: servers => resolvers.push(servers) },
    sleep: async delay => waits.push(delay) });
  return { connection, messages, resolvers, waits };
}

for (const code of ['ESERVFAIL', 'ECONNREFUSED', 'ETIMEOUT', 'EAI_AGAIN']) test(`temporary SRV ${code} recovers once without duplicate initialization`, async () => {
  let attempts = 0;
  const f = fixture(async (_, options) => { assert.equal(options.serverSelectionTimeoutMS, 5000); if (++attempts === 1) throw failure(code); return 'connected'; });
  const first = f.connection.connect(uri); assert.equal(first, f.connection.connect(uri));
  assert.equal(await first, 'connected'); assert.equal(attempts, 2); assert.deepEqual(f.waits, [500]);
  assert.deepEqual(f.resolvers, [['1.1.1.1', '8.8.8.8']]); assert.equal(f.connection.status().state, 'ready');
  assert.ok(!JSON.stringify(f.messages).includes('PRIVATE'));
});

test('TXT failure and wrapped DNS causes recover; production/private hosts keep their own DNS', async () => {
  for (const [input, env] of [[uri, { NODE_ENV: 'production' }], ['mongodb+srv://private.internal/test', {}]]) {
    let calls = 0; const f = fixture(async () => { if (++calls === 1) throw Object.assign(new Error(), { cause: failure('ESERVFAIL', 'queryTxt') }); return true; }, env);
    await f.connection.connect(input); assert.equal(calls, 2); assert.deepEqual(f.resolvers, []);
  }
});

test('exhausted recovery restores DNS, fails safely, and cannot be restarted by incoming callers', async () => {
  let calls = 0; const f = fixture(async () => { calls++; throw failure(); });
  await assert.rejects(f.connection.connect(uri), error => error.code === 'DATABASE_UNAVAILABLE' && !error.message.includes('PRIVATE'));
  await assert.rejects(f.connection.connect(uri)); assert.equal(calls, 3); assert.deepEqual(f.waits, [500, 1000]);
  assert.deepEqual(f.resolvers.at(-1), ['192.0.2.1']); assert.deepEqual(f.connection.status(), { state: 'failed', attempt: 3, retryable: false, lastFailure: 'dns', nextRetryAt: null });
});

test('bad credentials, invalid URIs and permanent DNS errors are not repeatedly attempted', async () => {
  for (const error of [Object.assign(new Error(), { code: 18 }), Object.assign(new Error(), { name: 'MongoParseError' }), failure('ENOTFOUND')]) {
    let calls = 0; const f = fixture(async () => { calls++; throw error; });
    await assert.rejects(f.connection.connect(uri)); assert.equal(calls, 1); assert.deepEqual(f.waits, []);
  }
  const f = fixture(async () => assert.fail('invalid URI reached driver'));
  await assert.rejects(f.connection.connect('PRIVATE_INVALID_URI')); assert.deepEqual(f.resolvers, []);
});

test('explicit resolver config is validated and multi-host Mongo URIs remain supported', async () => {
  let calls = 0; const f = fixture(async input => { calls++; assert.match(input, /^mongodb:/); return true; });
  await f.connection.connect('mongodb://host-one:27017,host-two:27017/test?replicaSet=demo'); assert.equal(calls, 1);
  const invalid = fixture(async () => assert.fail(), { MONGO_DNS_SERVERS: 'https://example.invalid' });
  await assert.rejects(invalid.connection.connect(uri));
});

test('cancellation during backoff stops retries and never starts application initialization', async () => {
  const controller = new AbortController(); let calls = 0;
  const f = createDatabaseConnection({ connect: async () => { calls++; throw failure(); }, env: { NODE_ENV: 'production' },
    logger: { log() {}, warn() {}, error() {} }, sleep: async () => controller.abort() });
  await assert.rejects(f.connect(uri, { signal: controller.signal })); assert.equal(calls, 1);
});

test('a stalled SRV connection has a wall deadline; no overlapping attempt or late initialization is allowed', async () => {
  let resolve, calls = 0, closed = 0;
  const connection = createDatabaseConnection({ connect: () => { calls++; return new Promise(r => { resolve = r; }); }, close: async () => { closed++; },
    maxAttempts: 1, attemptTimeoutMs: 10, env: { NODE_ENV: 'production' }, logger: { log() {}, warn() {}, error() {} } });
  await assert.rejects(connection.connect(uri), error => error.code === 'DATABASE_UNAVAILABLE');
  assert.equal(calls, 1); assert.equal(connection.status().state, 'failed');
  resolve({}); await new Promise(r => setImmediate(r)); assert.equal(closed, 1); assert.equal(connection.status().state, 'failed');
});

test('a busy DNS resolver does not abort otherwise recoverable startup or leak its error', async () => {
 let calls = 0;const messages=[];
 const connection=createDatabaseConnection({connect:async()=>{if(++calls===1)throw failure();return true;},env:{},sleep:async()=>{},
  dnsApi:{getServers:()=>['192.0.2.1'],setServers:()=>{throw new Error('PRIVATE_DNS_CONTEXT');}},
  logger:{log:message=>messages.push(message),warn:message=>messages.push(message),error:message=>messages.push(message)}});
 assert.equal(await connection.connect(uri),true);assert.equal(calls,2);assert.ok(!JSON.stringify(messages).includes('PRIVATE'));
});

test('HTTP stays reachable during DNS recovery: reads/writes are gated, no auth/inference runs, then service becomes ready', async () => {
  let release, attempts = 0, operations = 0, auth = 0, inference = 0;
  const f = fixture(async () => { if (++attempts === 1) throw failure(); return new Promise(resolve => { release = resolve; }); });
  const readiness = createNavigatorReadiness(); let connected = false;
  const startup = readiness.initialize(async () => { await f.connection.connect(uri); connected = true; return {
    ready: () => connected, store: { consumeRequest: async () => {} }, service: { list: async () => [], start: async () => { inference++; } } }; });
  const app = express(); app.use('/api', databaseGate({ ready: () => connected, status: f.connection.status }));
  app.get('/api/health', (req, res) => res.json({ connected }));
  app.all('/api/scholarships', (req, res) => { operations++; res.json({}); });
  app.use('/api/navigator', createNavigatorRouter({ getRuntime: readiness.getRuntime, getReadiness: readiness.status,
    authenticate: (req, res, next) => { auth++; req.user = { _id: '1'.repeat(24) }; next(); } }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
  try {
    assert.equal((await request('/api/health')).status, 200);
    for (const method of ['GET', 'POST']) {
      const ordinary = await request('/api/scholarships', { method }); assert.equal(ordinary.status, 503);
      const research = await request('/api/navigator/runs', { method }); assert.equal(research.status, 503);
      assert.equal((await research.json()).error.code, 'NAVIGATOR_INITIALIZING');
    }
    assert.equal(operations + auth + inference, 0); release(true); await startup;
    assert.equal((await request('/api/navigator/runs')).status, 200); assert.equal(auth, 1); assert.equal(inference, 0);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
