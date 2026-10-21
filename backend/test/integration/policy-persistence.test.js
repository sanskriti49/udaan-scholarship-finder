import { test } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { makeHarness, KEYS } from "../helpers.js";
import { MemoryStore } from "../../src/pipeline/store/memoryStore.js";

class MongoAmountDefaultsStore extends MemoryStore {
	async saveScholarship(record) {
		const amount = record.amount ? new Scholarship({ amount: record.amount }).toObject().amount : null;
		return super.saveScholarship({ ...record, amount });
	}
}

test("repeated full crawls after actual Mongoose defaulting create no fake updates or notifications", async () => {
	const events = [];
	const harness = makeHarness({ store: new MongoAmountDefaultsStore(), onDataChange: async event => events.push(event) });
	await harness.run();
	const count = harness.store.versions.length;
	const run = await harness.run();
	assert.equal(run.status, "success"); assert.equal(run.counts.updated, 0); assert.equal(run.counts.dataChanged, 0);
	assert.equal(harness.store.versions.length, count); assert.equal(events.length, 0);
});

test("a normal unchanged refresh repairs a false change badge while preserving every stored history entry", async () => {
	const harness = makeHarness({ store: new MongoAmountDefaultsStore() });
	await harness.run();
	const stored = await harness.store.getScholarship(KEYS.pragatiDegree);
	const incoming = { ...stored.amount };
	if (incoming.months == null) delete incoming.months;
	if (!incoming.options?.length) delete incoming.options;
	await harness.store.addVersion({ schemeKey: stored.schemeKey, changeType: "AWARD_UPDATE", summary: "Official values changed: amount", observedAt: new Date(), deltas: [{ field: "amount", oldValue: stored.amount, newValue: incoming }] });
	await harness.store.saveScholarship({ ...stored, hasChanges: true, latestChangeSummary: "Scholarship grant amount updated" });
	const history = await harness.store.listVersions(stored.schemeKey);
	await harness.run();
	const after = await harness.store.getScholarship(stored.schemeKey);
	assert.equal(after.hasChanges, false); assert.equal(after.latestChangeSummary, null);
	assert.deepEqual(await harness.store.listVersions(stored.schemeKey), history);
});
