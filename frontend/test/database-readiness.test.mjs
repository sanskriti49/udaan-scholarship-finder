import test from 'node:test';
import assert from 'node:assert/strict';
import axios, { AxiosError } from 'axios';
import { installDatabaseReadRecovery } from '../src/services/databaseReadiness.js';

function failure(config, code = 'DATABASE_INITIALIZING', status = 503, after = '1') {
  return new AxiosError('Synthetic startup response', 'ERR_BAD_RESPONSE', config, null,
    { status, headers: { 'retry-after': after }, data: { error: { code } }, config });
}
function fixture(adapter, extra = {}) {
  let clock = Date.parse('2026-10-26T10:00:00Z');
  const waits = [];
  const api = axios.create({ adapter });
  installDatabaseReadRecovery(api, { now: () => clock,
    wait: async ms => { waits.push(ms); clock += ms; }, ...extra });
  return { api, waits, advance: ms => { clock += ms; } };
}
const ok = config => ({ status: 200, data: { loaded: true }, headers: {}, config });

test('catalogue, bookmarks and unread-count GETs recover while retaining their request parameters', async () => {
  for (const url of ['/scholarships', '/bookmarks', '/notifications/unread-count']) {
    let calls = 0;
    const { api, waits } = fixture(async config => {
      calls++; assert.equal(config.url, url); assert.deepEqual(config.params, { sort: 'deadline', limit: 50 });
      assert.equal(config.headers.Authorization, 'Bearer synthetic');
      if (calls < 3) throw failure(config);
      return ok(config);
    });
    const result = await api.get(url, { params: { sort: 'deadline', limit: 50 }, headers: { Authorization: 'Bearer synthetic' } });
    assert.equal(result.data.loaded, true); assert.equal(calls, 3); assert.deepEqual(waits, [1000, 2000]);
  }
});

test('writes, research advancement and other non-GET methods are never replayed', async () => {
  for (const method of ['post', 'put', 'patch', 'delete', 'head', 'options']) {
    let calls = 0;
    const { api, waits } = fixture(async config => { calls++; throw failure(config); });
    await assert.rejects(api.request({ method, url: '/navigator/runs/fixture/advance', data: { question: 'synthetic' } }));
    assert.equal(calls, 1); assert.deepEqual(waits, []);
  }
});

test('permanent database, provider, authentication, quota and network failures are not hidden or retried', async () => {
  for (const [code, status] of [['DATABASE_UNAVAILABLE', 503], ['NAVIGATOR_INITIALIZING', 503], ['MODEL_RATE_LIMITED', 503],
    ['DATABASE_INITIALIZING', 401], ['DATABASE_INITIALIZING', 429], ['OTHER_FAILURE', 500]]) {
    let calls = 0;
    const { api, waits } = fixture(async config => { calls++; throw failure(config, code, status); });
    await assert.rejects(api.get('/scholarships'), error => error.response.status === status);
    assert.equal(calls, 1); assert.deepEqual(waits, []);
  }
  let calls = 0;
  const { api } = fixture(async config => { calls++; throw new AxiosError('Network unavailable', 'ERR_NETWORK', config); });
  await assert.rejects(api.get('/scholarships'), { code: 'ERR_NETWORK' }); assert.equal(calls, 1);
});

test('the recovery window stops at six attempts and nineteen seconds of backoff', async () => {
  let calls = 0;
  const { api, waits } = fixture(async config => { calls++; throw failure(config); });
  await assert.rejects(api.get('/scholarships'), error => error.response.data.error.code === 'DATABASE_INITIALIZING');
  assert.equal(calls, 6); assert.deepEqual(waits, [1000, 2000, 4000, 6000, 6000]);
});

test('Retry-After seconds and HTTP dates are honored; long waits are exposed without retrying early', async () => {
  for (const after of ['3', 'Mon, 26 Oct 2026 10:00:03 GMT']) {
    let calls = 0;
    const { api, waits } = fixture(async config => { if (++calls === 1) throw failure(config, undefined, undefined, after); return ok(config); });
    await api.get('/bookmarks'); assert.deepEqual(waits, [3000]);
  }
  let calls = 0;
  const { api, waits } = fixture(async config => { calls++; throw failure(config, undefined, undefined, '60'); });
  await assert.rejects(api.get('/bookmarks')); assert.equal(calls, 1); assert.deepEqual(waits, []);
});

test('elapsed request time counts toward the window and a shorter caller timeout is preserved', async () => {
  let calls = 0, f;
  f = fixture(async config => { calls++; f.advance(20000); throw failure(config); });
  await assert.rejects(f.api.get('/scholarships')); assert.equal(calls, 1); assert.deepEqual(f.waits, []);
  calls = 0;
  const limited = fixture(async config => { assert.equal(config.timeout, 700); if (++calls === 1) throw failure(config); return ok(config); });
  await limited.api.get('/bookmarks', { timeout: 700 }); assert.equal(calls, 2);
});

test('cancellation during the real backoff prevents another HTTP request', async () => {
  let calls = 0;
  const controller = new AbortController(), api = axios.create({ adapter: async config => { calls++; throw failure(config); } });
  installDatabaseReadRecovery(api);
  const pending = api.get('/scholarships', { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, error => axios.isCancel(error)); assert.equal(calls, 1);
});

test('logout or a session switch cancels queued authenticated reads without sending stale credentials', async () => {
  let token = 'first-session', calls = 0;
  const { api } = fixture(async config => { calls++; throw failure(config); }, {
    getSession: () => token, wait: async () => { token = 'different-session'; },
  });
  await assert.rejects(api.get('/bookmarks'), error => axios.isCancel(error)); assert.equal(calls, 1);
});

test('independent parallel reads retain separate finite retry budgets', async () => {
  const calls = new Map();
  const { api } = fixture(async config => {
    const count = (calls.get(config.url) || 0) + 1; calls.set(config.url, count);
    if (count < 3) throw failure(config); return ok(config);
  }, { wait: async () => {} });
  const results = await Promise.all(['/scholarships', '/bookmarks', '/notifications/unread-count'].map(url => api.get(url)));
  assert.equal(results.length, 3); assert.deepEqual([...calls.values()], [3, 3, 3]);
});
