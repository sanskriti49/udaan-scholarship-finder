import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { PipelineScheduler } from '../../src/pipeline/scheduler.js';
import { readRefreshPolicy, dueSources } from '../../src/pipeline/refreshPolicy.js';
import { closeRedisClient } from '../../src/config/redis.js';

after(closeRedisClient);
const NOW = new Date('2026-10-25T08:00:00Z'), MINUTE = 60000, DAY = 86400000;
const quiet = { info() {}, warn() {}, error() {} };
const sources = ['first', 'second', 'third'].map((id, priority) => ({ id, priority, enabled: true }));
function fixture(extra = {}) {
	const state = new Map(), calls = [], timers = [], cleared = new Set();
	let now = new Date(NOW);
	const timer = (fn, ms) => { const handle = { fn, ms, unref() {} }; timers.push(handle); return handle; };
	const options = { env: {}, sources: () => sources, logger: quiet, now: () => now,
		loadStates: async () => [...state.values()],
		lock: async (_, __, task) => ({ executed: true, result: await task() }),
		run: async args => { calls.push(args); state.set(args.sourceId, { sourceId: args.sourceId, lastAttemptAt: now, lastStatus: 'success' }); return [{ sourceId: args.sourceId, pages: ['internal'], status: 'success' }]; },
		refresh: async () => {}, timers: { setTimeout: timer, setInterval: timer, clearTimeout: handle => cleared.add(handle), clearInterval: handle => cleared.add(handle) }, ...extra };
	return { options, state, calls, timers, cleared, create: () => new PipelineScheduler(options), setNow: value => { now = new Date(value); } };
}

test('refresh configuration has bounded cadence, polling and batch sizes; disabling is explicit', () => {
	const policy = readRefreshPolicy({});
	assert.equal(policy.intervalMs, DAY);
	assert.equal(policy.checkIntervalMs, 15 * MINUTE);
	assert.equal(policy.maxSourcesPerRun, 2);
	for (const env of [{ ENABLE_CRAWLER: 'yes' }, { CRAWLER_INTERVAL_MS: '0' }, { CRAWLER_CHECK_INTERVAL_MS: '1' }, { CRAWLER_MAX_SOURCES_PER_RUN: '999' }, { CRAWLER_INTERVAL_MS: 'NaN' }]) assert.throws(() => readRefreshPolicy(env));
	const f = fixture({ env: { ENABLE_CRAWLER: 'false' } }), scheduler = f.create();
	scheduler.start(); assert.equal(f.timers.length, 0); assert.equal(scheduler.active, false);
});

test('due selection uses persisted attempts, caps batches, and does not starve new sources behind retries', () => {
	const policy = readRefreshPolicy({}), states = [{ sourceId: 'first', lastAttemptAt: NOW, lastStatus: 'success' },
		{ sourceId: 'second', lastAttemptAt: new Date(+NOW - 5 * MINUTE), lastStatus: 'failed', consecutiveFailures: 1 }];
	assert.deepEqual(dueSources(sources, states, NOW, policy).map(source => source.id), ['third']);
	assert.deepEqual(dueSources(sources, states, new Date(+NOW + 11 * MINUTE), policy).map(source => source.id), ['third', 'second']);
	assert.equal(dueSources([...sources, { id: 'disabled', enabled: false }], [], NOW, policy).length, 2);
	const prolonged = [{ sourceId: 'first', lastAttemptAt: NOW, lastStatus: 'failed', consecutiveFailures: 999 }];
	assert.deepEqual(dueSources([sources[0]], prolonged, new Date(+NOW + DAY - 1), policy), []);
	assert.equal(dueSources([sources[0]], prolonged, new Date(+NOW + DAY), policy).length, 1);
});

test('startup is delayed and idempotent; later checks and reconstruction resume only due sources', async () => {
	const f = fixture(), scheduler = f.create(); scheduler.start(); scheduler.start();
	assert.equal(f.calls.length, 0); assert.equal(f.timers.length, 3); assert.equal(f.timers[0].ms, 10000);
	await f.timers[0].fn();
	assert.deepEqual(f.calls.map(call => call.sourceId), ['first', 'second']);
	assert.ok(f.calls.every(call => call.notify === false), 'startup catch-up does not send change alerts');
	assert.ok(scheduler.getStatus().lastExecution.reports.every(report => !report.pages));
	const rebuilt = f.create(); await rebuilt.triggerNow('restart', { dueOnly: true });
	assert.deepEqual(f.calls.map(call => call.sourceId), ['first', 'second', 'third']);
	await rebuilt.triggerNow('interval', { dueOnly: true }); assert.equal(f.calls.length, 3);
	f.setNow(+NOW + DAY); await rebuilt.triggerNow('interval', { dueOnly: true }); assert.equal(f.calls.length, 5);
	scheduler.stop(); assert.equal(f.cleared.size, 3); await f.timers[0].fn(); assert.equal(f.calls.length, 5);
});

test('in-process overlaps and distributed lock contention cannot duplicate refresh work', async () => {
	let release, calls = 0;
	const f = fixture({ run: async () => { calls++; await new Promise(resolve => { release = resolve; }); return []; } });
	const scheduler = f.create(), first = scheduler.triggerNow('admin');
	assert.equal(calls, 1); assert.equal((await scheduler.triggerNow('admin')).executed, false);
	release(); await first; assert.equal(scheduler.running, false);
	const locked = fixture({ lock: async () => ({ executed: false, skipped: true }), loadStates: async () => { throw new Error('Must not query'); } });
	assert.equal((await locked.create().triggerNow('interval', { dueOnly: true })).executed, false);
	assert.equal(locked.calls.length, 0);
});

test('database failures are recoverable, reset the in-process guard, and do not claim a successful refresh', async () => {
	let broken = true;
	const f = fixture({ loadStates: async () => { if (broken) throw new Error('synthetic unavailable database'); return []; } }), scheduler = f.create();
	await assert.rejects(scheduler.triggerNow('startup', { dueOnly: true }));
	assert.equal(f.calls.length, 0); assert.equal(scheduler.running, false); assert.equal(scheduler.executionCount, 0);
	assert.ok(scheduler.lastExecution.error); broken = false;
	await scheduler.triggerNow('interval', { dueOnly: true }); assert.equal(f.calls.length, 2);
});

test('stopping finishes the current source but starts no additional automatic source', async () => {
	let scheduler, count = 0;
	const f = fixture({ run: async ({ sourceId }) => { count++; scheduler.stop(); return [{ sourceId, status: 'success' }]; } });
	scheduler = f.create(); await scheduler.triggerNow('startup', { dueOnly: true });
	assert.equal(count, 1); assert.equal((await scheduler.triggerNow('interval', { dueOnly: true })).executed, false);
});

test('explicit admin source refresh remains available when automatic crawling is disabled', async () => {
	const f = fixture({ env: { ENABLE_CRAWLER: 'false' } });
	await f.create().triggerNow('admin', { sourceId: 'third', notify: false });
	assert.deepEqual(f.calls, [{ sourceId: 'third', notify: false }]);
});
