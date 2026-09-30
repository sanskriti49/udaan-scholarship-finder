/**
 * Scholarship pipeline CLI.
 *
 *   node src/scripts/runPipeline.js                  live crawl of all enabled sources → MongoDB
 *   node src/scripts/runPipeline.js --source=<id>    one source
 *   node src/scripts/runPipeline.js --replay         use recorded official captures instead of the network
 *   node src/scripts/runPipeline.js --dry-run        in-memory store, prints what would be stored (no DB needed)
 *
 * Exit code is non-zero if any source failed or was rejected.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { createPipeline, runPipeline } from "../pipeline/service.js";
import { MemoryStore } from "../pipeline/store/memoryStore.js";
import { enabledSources, getSource } from "../pipeline/sources.js";
import { runMigrations } from "../migrations/runner.js";

const args = Object.fromEntries(
	process.argv.slice(2).map((a) => {
		const [k, v] = a.replace(/^--/, "").split("=");
		return [k, v ?? true];
	}),
);

function printReport(reports) {
	for (const r of reports) {
		console.log(`\n${r.sourceId}: ${r.status}`);
		console.log(JSON.stringify(r.counts, null, 2));
		for (const p of r.pages || []) {
			const tag = p.error ? `ERROR ${p.error.code}` : p.notModified ? "304" : p.pageChanged ? "changed" : "unchanged";
			console.log(`  [${tag}] ${p.role || ""} ${p.url}`);
		}
		for (const e of r.errors || []) console.log(`  ! ${e.code}: ${e.message}`);
	}
}

async function main() {
	const sources = args.source ? [getSource(args.source)].filter(Boolean) : enabledSources();
	if (!sources.length) throw new Error(`Unknown source ${args.source}`);

	if (args["dry-run"]) {
		const store = new MemoryStore();
		const pipeline = createPipeline({ replay: Boolean(args.replay), notify: false, store });
		const reports = await pipeline.runAll(sources);
		printReport(reports);
		console.log("\nstatus        deadline    amount                           title");
		for (const s of await store.listScholarships()) {
			console.log(
				`${(s.status + (s.stale ? "*" : "")).padEnd(13)} ${(s.deadline ? s.deadline.toISOString().slice(0, 10) : "unknown").padEnd(11)} ${(s.amount?.displayString || "not published").slice(0, 32).padEnd(32)} ${s.title}`,
			);
		}
		const issues = await store.listIssues({ status: "open" });
		console.log(`\nopen issues: ${issues.length}`);
		for (const i of issues.filter((x) => x.severity !== "info")) console.log(`  [${i.severity}] ${i.code} ${i.schemeKey || ""}\n      ${i.message}`);
		return reports;
	}

	await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/udaan");
	await runMigrations();
	const reports = await runPipeline({ sourceId: args.source, replay: Boolean(args.replay) });
	printReport(reports);
	await mongoose.disconnect();
	return reports;
}

main()
	.then((reports) => {
		const bad = reports.some((r) => r.status === "failed" || r.status === "rejected");
		process.exit(bad ? 1 : 0);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
