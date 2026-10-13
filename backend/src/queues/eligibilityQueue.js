import { reminderQueue } from "./reminderQueue.js";
import { getRedisClient, isRedisAvailable } from "../config/redis.js";
import { enqueueEligibilityJob } from "../jobs/enqueueEligibilityChange.js";

let recovery = null;
let nextProbeAt = 0;
async function queueAvailable() {
	if (isRedisAvailable()) return true;
	if (recovery) return recovery;
	if (Date.now() < nextProbeAt) return false;
	nextProbeAt = Date.now() + 60000;
	recovery = (async () => {
		const client = getRedisClient();
		if (client.status === "end" || client.status === "wait") await client.connect();
		return isRedisAvailable();
	})().catch(() => false).finally(() => { recovery = null; });
	return recovery;
}

export async function enqueueEligibilityChange(data, { queue = reminderQueue, available = queueAvailable } = {}) {
	const ready = await available();
	return enqueueEligibilityJob(data, { queue, available: () => ready });
}
