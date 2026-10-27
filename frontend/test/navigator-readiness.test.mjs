import test from 'node:test';
import assert from 'node:assert/strict';
import { initialNavigatorRead, waitForReadiness } from '../src/services/navigatorReadiness.js';
const initializing = (after = '1') => ({ response: { status: 503, headers: { 'retry-after': after }, data: { error: { code: 'NAVIGATOR_INITIALIZING' } } } });
test('initial GET retries initialization only, respects bounded backoff, and succeeds without writing', async () => {
 let calls = 0; const waits = [];
 const value = await initialNavigatorRead(async () => { calls++; if (calls < 3) throw initializing(); return 'saved findings'; }, undefined, async ms => { waits.push(ms); });
 assert.equal(value, 'saved findings'); assert.equal(calls, 3); assert.deepEqual(waits, [1000, 1000]);
});
test('initialization retries stop at three attempts; permanent, unrelated and long-wait errors are not retried', async () => {
 let calls = 0;
 await assert.rejects(initialNavigatorRead(async () => { calls++; throw initializing(); }, undefined, async () => {})); assert.equal(calls, 3);
 for (const error of [{ response: { status: 503, data: { error: { code: 'NAVIGATOR_INITIALIZATION_FAILED' } } } }, { response: { status: 401 } }, { response: { status: 429 } }, { code: 'ECONNABORTED' }, initializing('20')]) {
  calls = 0; await assert.rejects(initialNavigatorRead(async () => { calls++; throw error; }, undefined, async () => {})); assert.equal(calls, 1);
 }
});
test('cancellation during backoff prevents the next read and cleans the wait', async () => {
 const controller = new AbortController(); let calls = 0;
 const pending = initialNavigatorRead(async () => { calls++; throw initializing(); }, controller.signal);
 setTimeout(() => controller.abort(), 10); await assert.rejects(pending, error => error.name === 'AbortError'); assert.equal(calls, 1);
 await assert.rejects(waitForReadiness(1, controller.signal), error => error.name === 'AbortError');
});
test('a status read can wait for initializing to become ready, without any research operation', async () => {
 let calls = 0;
 const result = await initialNavigatorRead(async () => ({ available: ++calls > 1, state: calls > 1 ? 'ready' : 'initializing', retryable: calls === 1 }), undefined, async () => {});
 assert.equal(result.available, true); assert.equal(calls, 2);
});

test('HTTP-date waits are honored when bounded and long server waits are left for explicit recovery', async () => {
 const original = Date.now; Date.now = () => Date.parse('2026-10-24T08:00:00Z');
 try {
  let calls = 0; const waits = [];
  const value = await initialNavigatorRead(async () => { if (++calls === 1) throw initializing('Sat, 24 Oct 2026 08:00:01 GMT'); return 'ready'; }, undefined, async ms => waits.push(ms));
  assert.equal(value, 'ready'); assert.deepEqual(waits, [1000]);
  calls = 0; await assert.rejects(initialNavigatorRead(async () => { calls++; throw initializing('Sat, 24 Oct 2026 08:01:00 GMT'); }, undefined, async () => {})); assert.equal(calls, 1);
 } finally { Date.now = original; }
});
