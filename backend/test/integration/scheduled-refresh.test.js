import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { PipelineScheduler } from '../../src/pipeline/scheduler.js';
import { closeRedisClient } from '../../src/config/redis.js';
import { computeStatus } from '../../src/pipeline/core/status.js';
import { makeHarness, KEYS, LISTING_URL, failing, NSP, textResponse, listingText } from '../helpers.js';

after(closeRedisClient);
test('scheduled source refresh persists cadence, preserves good evidence on failure, and verifies only successful recovery', async () => {
	let now = new Date('2026-09-17T08:00:00Z'), attempts = 0;
	const harness = makeHarness({ now }), logger = { info() {}, warn() {}, error() {} };
	const create = () => new PipelineScheduler({ env: {}, sources: () => [NSP], now: () => now, logger,
		loadStates: async () => [await harness.store.getSourceState(NSP.id)].filter(Boolean),
		lock: async (_, __, task) => ({ executed: true, result: await task() }),
		run: async ({ sourceId }) => { attempts++; assert.equal(sourceId, NSP.id); return [await harness.run()]; } });
	await create().triggerNow('startup', { dueOnly: true });
	const before = await harness.store.getScholarship(KEYS.csss), success = await harness.store.getSourceState(NSP.id);
	assert.equal(before.publication.state, 'published'); assert.equal(attempts, 1);
	await create().triggerNow('restart', { dueOnly: true }); assert.equal(attempts, 1);
	now = new Date(+now + 4 * 86400000); harness.setNow(now);
	harness.setOverrides({ [LISTING_URL]: failing('ECONNRESET') });
	await create().triggerNow('interval', { dueOnly: true }); assert.equal(attempts, 2);
	const afterFailure = await harness.store.getScholarship(KEYS.csss), failed = await harness.store.getSourceState(NSP.id);
	assert.equal(failed.lastStatus, 'failed'); assert.equal(failed.consecutiveFailures, 1);
	assert.deepEqual(failed.lastSuccessAt, success.lastSuccessAt);
	assert.equal(afterFailure.dataHash, before.dataHash); assert.equal(afterFailure.publication.state, 'published');
	assert.deepEqual(afterFailure.freshness.lastVerifiedAt, before.freshness.lastVerifiedAt);
	assert.deepEqual(afterFailure.fieldEvidence, before.fieldEvidence);
	assert.equal(computeStatus(afterFailure, now).stale, true);
	await create().triggerNow('restart', { dueOnly: true }); assert.equal(attempts, 2);
	now = new Date(+now + 16 * 60000); harness.setNow(now); harness.setOverrides({});
	await create().triggerNow('interval', { dueOnly: true }); assert.equal(attempts, 3);
	assert.equal(computeStatus(await harness.store.getScholarship(KEYS.csss), now).stale, true,
		'replaying an old capture is not fresh official verification');
	now = new Date(+now + 86400000); harness.setNow(now);
	// A newer synthetic official capture, not a fresh timestamp on the old replay.
	harness.setOverrides({ [LISTING_URL]: textResponse(listingText, 'text/html', now.toISOString()) });
	await create().triggerNow('interval', { dueOnly: true }); assert.equal(attempts, 4);
	const recovered = await harness.store.getScholarship(KEYS.csss);
	assert.equal((await harness.store.getSourceState(NSP.id)).lastStatus, 'success');
	assert.equal(computeStatus(recovered, now).stale, false);
	assert.equal(recovered.dataHash, before.dataHash);
});
