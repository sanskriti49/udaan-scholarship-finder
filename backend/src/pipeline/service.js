import { Pipeline } from "./pipeline.js";
import { MongoStore } from "./store/mongoStore.js";
import { enabledSources, getSource } from "./sources.js";
import { SafeFetcher, createRecordedTransport } from "./core/http.js";
import { loadRecordings } from "./recordings.js";
import { rootLogger } from "./core/logger.js";

/**
 * Production wiring: Mongo store, notification hook and cache invalidation.
 * Imports of notification/cache modules are lazy so tests and CLI dry runs do
 * not open Redis/BullMQ connections.
 */

const DEADLINE_CHANGES = new Set(["DEADLINE_EXTENSION", "DEADLINE_SHORTENED", "CYCLE_DATES_CHANGED"]);

async function notifyDeadlineChange({ record, changeType, summary, deltas }) {
	if (!DEADLINE_CHANGES.has(changeType) || !deltas?.some((d) => d.field === "closesAt")) return;
	const { notificationService } = await import("../services/notificationService.js");
	await notificationService.onScholarshipIngested({ ...record, _id: record.id }, false, {
		hasChanges: true,
		changeType,
		summary: `Official application deadline changed. ${summary}`,
		deltas,
	});
}

export function createPipeline({ replay = false, notify = !replay, store = new MongoStore() } = {}) {
	let fetcherFactory;
	if (replay) {
		const { records } = loadRecordings();
		const transport = createRecordedTransport(records);
		fetcherFactory = (source) =>
			new SafeFetcher({ allowedDomains: source.allowedDomains, transport, minIntervalMs: 0 });
	}
	return new Pipeline({
		store,
		...(fetcherFactory ? { fetcherFactory } : {}),
		onDataChange: notify ? notifyDeadlineChange : null,
	});
}

export async function runPipeline({ sourceId, replay = false } = {}) {
	const pipeline = createPipeline({ replay });
	const sources = sourceId ? [getSource(sourceId)].filter(Boolean) : enabledSources();
	if (sourceId && sources.length === 0) throw new Error(`Unknown source '${sourceId}'`);
	const reports = await pipeline.runAll(sources);
	await pipeline.refreshStatuses();
	try {
		const { clearScholarshipCache } = await import("../middlewares/cacheMiddleware.js");
		await clearScholarshipCache();
	} catch (error) {
		rootLogger.warn("cache invalidation failed", { error: error.message });
	}
	return reports;
}

export async function refreshStatuses() {
	return createPipeline({ notify: false }).refreshStatuses();
}
