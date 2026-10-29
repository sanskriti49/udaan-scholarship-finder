import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createNavigatorRouter } from '../../src/agents/navigator/http.js';
import { createNavigatorReadiness } from '../../src/agents/navigator/readiness.js';

async function endpoint(readiness, run) {
 let auth = 0;
 const app = express(); app.use('/api/navigator', createNavigatorRouter({ getRuntime: readiness.getRuntime, getReadiness: readiness.status,
  authenticate: (req, res, next) => { auth++; req.user = { _id: '1'.repeat(24) }; next(); } }));
 const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
 try { await run((path, options) => fetch(`http://127.0.0.1:${server.address().port}/api/navigator${path}`, options), () => auth); }
 finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('startup gates auth, reads and writes; one initialization serves all requests without inference', async () => {
 const readiness = createNavigatorReadiness(); let resolve, initialization = 0, reads = 0, writes = 0, quotas = 0;
 const factory = async () => { initialization++; return new Promise(r => { resolve = r; }); };
 const first = readiness.initialize(factory), second = readiness.initialize(factory); assert.equal(first, second);
 await endpoint(readiness, async (fetch, auth) => {
  assert.deepEqual(await (await fetch('/status')).json(), { available: false, state: 'initializing', retryable: true, retentionDays: 7 });
  for (const [path, options] of [['/runs'], ['/runs', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }]]) {
   const result = await fetch(path, options); assert.equal(result.status, 503); assert.equal(result.headers.get('retry-after'), '1');
   assert.equal((await result.json()).error.code, 'NAVIGATOR_INITIALIZING');
  }
  assert.equal(auth(), 0); assert.equal(reads + writes + quotas, 0); assert.equal(initialization, 1);
  resolve({ ready: () => true, store: { consumeRequest: async () => { quotas++; } }, service: { list: async () => { reads++; return []; }, start: async () => { writes++; return { fixture: true }; } } }); await first;
  assert.equal((await (await fetch('/status')).json()).state, 'ready');
  assert.equal((await fetch('/runs')).status, 200); assert.equal(reads, 1); assert.equal(writes, 0);
  assert.equal((await fetch('/runs', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })).status, 201); assert.equal(writes, 1);
 });
});

test('failed and disabled initialization are explicit non-retryable states without leaking the failure', async () => {
 for (const [factory, state, code] of [[async () => { throw new Error('PRIVATE_SECRET_STACK'); }, 'failed', 'NAVIGATOR_INITIALIZATION_FAILED'], [async () => null, 'disabled', 'NAVIGATOR_DISABLED']]) {
  const readiness = createNavigatorReadiness(); await readiness.initialize(factory);
  await endpoint(readiness, async fetch => {
   const status = await (await fetch('/status')).json(); assert.equal(status.state, state); assert.equal(status.retryable, false);
   const response = await fetch('/runs'); assert.equal(response.status, 503); assert.equal(response.headers.get('retry-after'), null);
   const body = await response.json(); assert.equal(body.error.code, code); assert.ok(!JSON.stringify(body).includes('PRIVATE'));
  });
 }
});

test('database loss after initialization remains unavailable rather than triggering initialization again', async () => {
 const readiness = createNavigatorReadiness(); let connected = true, calls = 0;
 await readiness.initialize(async () => { calls++; return { service: {}, ready: () => connected }; });
 connected = false;
 assert.deepEqual(readiness.status(), { available: false, state: 'unavailable', retryable: false, retentionDays: 7 });
 await readiness.initialize(async () => { calls++; }); assert.equal(calls, 1);
});
