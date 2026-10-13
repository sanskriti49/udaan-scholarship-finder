import assert from "node:assert/strict";
import { Pipeline } from "../pipeline/pipeline.js";
import { MemoryStore } from "../pipeline/store/memoryStore.js";
import { makeEvidence } from "../pipeline/core/evidence.js";
import { processEligibilityChange } from "../workers/processEligibilityChange.js";

// Offline demonstration: synthetic official text, in-memory storage, no email/API calls.
const store = new MemoryStore(), events = [], inbox = new Map();
const pipeline = new Pipeline({ store, onDataChange: async event => {
	if (event.changeType === "ELIGIBILITY_RULES_CHANGED") events.push(event);
} });
async function observe(limit) {
	const text = `SYNTHETIC DEMO ONLY. Annual income must not exceed Rs. ${limit}.`;
	const source = await store.saveSnapshot({ url: "https://example.gov.in/synthetic-demo", text, textHash: text, fetchedAt: new Date() });
	const evidence = makeEvidence(source, text, { field: "familyIncome" });
	await pipeline.upsert({ id: "demo" }, { schemeKey: "synthetic-demo", title: "Synthetic demo scholarship", fieldEvidence: [evidence],
		rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: limit }],
		provenanceQuotes: [{ ruleId: "income", snapshotId: source.id, sourceUrl: source.url, quote: text }],
		eligibility: { familyIncome: { max: limit, operator: "LTE" } }, cycles: [], requiredDocuments: [],
		dataQuality: { unknownFields: ["eligibility"] } }, { at: new Date(), blocking: false, runId: "offline-demo" });
}
await observe(250000); await observe(300000);
const event = events[0];
const dependencies = {
	Scholarship: { findById: () => ({ lean: () => store.getScholarship("synthetic-demo") }) },
	EligibilityRuleVersion: { findById: id => ({ lean: () => store.getEligibilityVersion(id) }), updateOne: async () => {} },
	SourceSnapshot: { findById: id => ({ lean: () => store.getSnapshot(id) }) },
	Bookmark: { find: () => ({ lean: () => ({ cursor: async function* () { yield { user: "demo-student" }; } }) }), exists: async () => true },
	UserProfile: { findOne: () => ({ lean: async () => ({ familyIncome: 280000 }) }) },
	notificationService: { getPreferences: async () => ({ eligibilityChanges: true, channels: { inApp: true, email: false } }),
		createNotification: async (user, payload) => {
			if (inbox.has(payload.dedupKey)) return null;
			inbox.set(payload.dedupKey, payload); return { _id: "synthetic-notification" };
		} },
};
const job = { data: { scholarshipId: event.record.id, previousVersionId: event.previousVersionId, currentVersionId: event.currentVersionId } };
const first = await processEligibilityChange(job, dependencies), repeated = await processEligibilityChange(job, dependencies);
assert.equal(first.dispatched, 1); assert.equal(repeated.dispatched, 0); assert.equal(inbox.size, 1);
console.log("SYNTHETIC OFFLINE DEMO — these are not real scholarship rules.\n");
console.log([...inbox.values()][0].message);
console.log(`\nSource-backed rule versions stored: ${store.eligibilityVersions.size}`);
console.log(`First event: ${first.dispatched} inbox alert; repeated event: ${repeated.dispatched} new alerts.`);
console.log("No MongoDB, Redis, portal request or email delivery was used.");
