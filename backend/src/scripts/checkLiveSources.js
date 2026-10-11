/** Live source audit: public URLs, in-memory storage, no database or notifications. */
import fs from "node:fs/promises";
import path from "node:path";
import { Pipeline, createDefaultFetcher } from "../pipeline/pipeline.js";
import { MemoryStore } from "../pipeline/store/memoryStore.js";
import { SOURCE_REGISTRY, enabledSources } from "../pipeline/sources.js";

const options = Object.fromEntries(process.argv.slice(2).map((arg) => {
	const index = arg.indexOf("=");
	return index < 0 ? [arg.replace(/^--/, ""), true] : [arg.slice(2, index), arg.slice(index + 1)];
}));
const followUps = Number(options["follow-ups"] ?? 3);
if (!Number.isInteger(followUps) || followUps < 0 || followUps > 60) throw new Error("--follow-ups must be an integer from 0 to 60");
const sources = enabledSources().filter((s) => !options.source || s.id === options.source);
if (!sources.length) throw new Error("No ready source matched; inspect the source registry for parser readiness");
const store = new MemoryStore();
const pipeline = new Pipeline({ store, fetcherFactory: (source) => createDefaultFetcher(source, { timeoutMs: 10000, retries: 1 }) });
const reports = await pipeline.runAll(sources.map((s) => ({ ...s, followUps: { ...s.followUps, maxPerRun: followUps } })));
const records = await store.listScholarships();
const audit = {
	checkedAt: new Date().toISOString(), mode: "live_in_memory", followUpLimitPerSource: followUps,
	reports,
	catalogue: sources.map((s) => {
		const items = records.filter((r) => r.primarySourceId === s.id);
		return { sourceId: s.id, schemes: items.length, withDeadline: items.filter((r) => r.deadline).length,
			withIncomeRule: items.filter((r) => r.eligibility?.familyIncome).length,
			withAmount: items.filter((r) => r.amount).length,
			withOfficialLink: items.filter((r) => r.officialLinks?.guidelinesUrl).length };
	}),
	unavailableSources: SOURCE_REGISTRY.filter((s) => s.ingestionStatus === "needs_adapter").map((s) => ({ id: s.id, reason: s.ingestionNote })),
};
console.log(JSON.stringify(audit, null, 2));
if (typeof options.output === "string") {
	const file = path.resolve(options.output);
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, JSON.stringify(audit, null, 2) + "\n");
}
process.exitCode = reports.some((r) => r.status === "failed" || r.status === "rejected") ? 1 : 0;
