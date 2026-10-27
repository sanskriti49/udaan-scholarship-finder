import { createHash, randomUUID } from "node:crypto";
import { NavigatorError, MAX_SOURCE_CHECKS } from "./contracts.js";
import { ownerSchema, runIdSchema, parseContract, startRunSchema } from "./durableContracts.js";

const OPTIONS = { maxTimeMS: 3000, writeConcern: { w: "majority" } };
const LIVE = { $gt: ["$expiresAt", "$$NOW"] };
const LEASE_LIVE = { $gt: ["$lease.until", "$$NOW"] };
const retry = () => new NavigatorError("RUN_CONFLICT", "This investigation changed. Reload its current state.");
const lost = () => new NavigatorError("LEASE_LOST", "This execution no longer owns the investigation.");
const missing = () => new NavigatorError("RUN_NOT_FOUND", "The investigation is unavailable.");
const dbFailure = () => new NavigatorError("PERSISTENCE_UNAVAILABLE", "Navigator storage is unavailable. No further model calls are allowed.");
const clone = value => structuredClone(value);
const hash = value => createHash("sha256").update(value).digest("hex");
const stable = value => value && typeof value === "object" && !Array.isArray(value)
	? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : Array.isArray(value) ? value.map(stable) : value;

/**
 * Explicitly initialized native collections; never reads MONGO_URI or connects.
 * All checkpoint/control writes share the run's lease token and CAS version.
 */
export function createMongoRunStore({ db, leaseMs = 60000, retentionDays = 7 } = {}) {
	if (!db?.collection || !Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 120000 || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 14) throw new NavigatorError("INVALID_CONFIGURATION", "Configure a database and bounded run retention and lease.");
	const runs = db.collection("navigator_runs"), quotas = db.collection("navigator_quotas"), httpLimits = db.collection("navigator_http_limits");
	let initialized = false;
	const guard = () => { if (!initialized) throw new NavigatorError("STORE_NOT_INITIALIZED", "Initialize Navigator's indexes before using durable runs."); };
	async function call(fn) { guard(); try { return await fn(); } catch (error) { if (error instanceof NavigatorError) throw error; throw dbFailure(); } }
	const owned = (ownerId, runId) => ({ _id: parseContract(runIdSchema, runId), ownerId: parseContract(ownerSchema, ownerId), $expr: LIVE });
	const fenced = lease => ({ ...owned(lease.ownerId, lease.runId), status: "running", "lease.token": lease.token, $expr: { $and: [LIVE, LEASE_LIVE] } });
	async function getOwned(ownerId, runId) {
		return call(async () => { const run = await runs.aggregate([{ $match: owned(ownerId, runId) }, { $set: { _serverNow: "$$NOW" } }], { maxTimeMS: 3000 }).next(); if (!run) throw missing(); return run; });
	}
	async function readLease(lease, includeResearchState = true) {
		return call(async () => { const run = await runs.findOne(fenced(lease), { maxTimeMS: 3000,
			...(!includeResearchState ? { projection: { checkpoints: 0, pendingCheckpointWrites: 0, plan: 0 } } : {}) }); if (!run) throw lost(); return run; });
	}
	async function mutate(lease, update) {
		return call(async () => {
			for (let attempt = 0; attempt < 8; attempt++) {
				const run = await readLease(lease);
				const patch = update(clone(run));
				if (Buffer.byteLength(JSON.stringify(patch), "utf8") > 2 * 1024 * 1024) throw new NavigatorError("CHECKPOINT_LIMIT", "The investigation reached its checkpoint size limit.");
				const result = await runs.findOneAndUpdate({ ...fenced(lease), _version: run._version }, { $set: patch, $inc: { _version: 1 }, $currentDate: { updatedAt: true } }, { ...OPTIONS, returnDocument: "after", includeResultMetadata: false });
				if (result) return result;
			}
			throw retry();
		});
	}

	return {
		leaseMs,
		// Frequent cancellation/budget checks need the same owner/lease/expiry
		// fence, without transferring serialized research checkpoints again.
		readControl: lease => readLease(lease, false),
		async initialize() {
			try {
				await runs.createIndex({ ownerId: 1, requestId: 1 }, { unique: true, name: "navigator_idempotent_start" });
				await runs.createIndex({ ownerId: 1 }, { unique: true, partialFilterExpression: { active: true }, name: "navigator_one_active_run" });
				await runs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "navigator_run_retention" });
				await runs.createIndex({ ownerId: 1, createdAt: -1 }, { name: "navigator_recent_runs" });
				await runs.createIndex({ ownerId: 1, provider: 1, model: 1, 'plan.answer.fingerprint': 1 }, { name: 'navigator_answer_cache' });
				await httpLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
				initialized = true;
			} catch { throw dbFailure(); }
		},
		getOwned, readLease, mutate,
		async findCachedAnswer(lease, fingerprint) {
			if (!/^[a-f\d]{64}$/.test(fingerprint)) throw new NavigatorError('INVALID_RUN_INPUT', 'Invalid answer cache identity.');
			const current = await readLease(lease);
			return call(async () => {
				const result = await runs.findOne({ ownerId: current.ownerId, provider: current.provider, model: current.model, status: 'completed',
					'plan.answer.version': 2, 'plan.answer.acceptedAssessments': { $gt: 0 }, 'plan.answer.fingerprint': fingerprint, $expr: LIVE },
					{ projection: { plan: 1 }, maxTimeMS: 3000 });
				return result?.plan ?? null;
			});
		},
		async listOwned(ownerId) {
			parseContract(ownerSchema, ownerId);
			return call(() => runs.aggregate([{ $match: { ownerId, $expr: LIVE } }, { $sort: { createdAt: -1 } }, { $limit: 12 },
				{ $project: { checkpoints: 0, pendingCheckpointWrites: 0, privateProfile: 0, pendingResume: 0 } }, { $set: { _serverNow: "$$NOW" } }], { maxTimeMS: 3000 }).toArray());
		},
		async forget(ownerId, runId) {
			return call(async () => { const result = await runs.deleteOne(owned(ownerId, runId), OPTIONS); if (!result.deletedCount) throw missing(); });
		},
		async consumeRequest(ownerId, kind) {
			parseContract(ownerSchema, ownerId);
			if (!["read", "write", "start"].includes(kind)) throw new NavigatorError("INVALID_RUN_INPUT", "Unknown request type.");
			return call(async () => {
				const key = `${hash(ownerId)}:${kind}`, limit = kind === "read" ? 120 : kind === "start" ? 5 : 30;
				const window = { $dateToString: { format: kind === "start" ? "%Y-%m-%dT%H" : "%Y-%m-%dT%H:%M", date: "$$NOW", timezone: "UTC" } };
				try { await httpLimits.updateOne({ _id: key }, { $setOnInsert: { window: "", count: 0 } }, { ...OPTIONS, upsert: true }); } catch (error) { if (error.code !== 11000) throw error; }
				const result = await httpLimits.findOneAndUpdate({ _id: key, $expr: { $or: [{ $ne: ["$window", window] }, { $lt: ["$count", limit] }] } },
					[{ $set: { window, count: { $add: [{ $cond: [{ $eq: ["$window", window] }, "$count", 0] }, 1] }, expiresAt: { $add: ["$$NOW", 7200000] } } }], OPTIONS);
				if (!result) {
					const clock = await httpLimits.aggregate([{ $match: { _id: key } }, { $project: { now: "$$NOW" } }], { maxTimeMS: 3000 }).next();
					if (!(clock?.now instanceof Date)) throw dbFailure();
					const resetAt = new Date(clock.now);
					if (kind === "start") resetAt.setUTCHours(resetAt.getUTCHours() + 1, 0, 0, 0);
					else resetAt.setUTCMinutes(resetAt.getUTCMinutes() + 1, 0, 0);
					const resetLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata", timeZoneName: "short" }).format(resetAt);
					const reason = kind === "start" ? "Udaan's limit of 5 new-investigation attempts per hour has been reached. This is separate from Groq's rate limits." : "Too many research requests in this minute.";
					throw new NavigatorError("REQUEST_LIMIT", `${reason} Try again after ${resetLabel}.`, { retryAfterSeconds: Math.max(1, Math.ceil((resetAt - clock.now) / 1000)) });
				}
			});
		},
		async cooldown(provider, seconds) {
			return call(async () => {
				const result = await quotas.findOneAndUpdate({ _id: provider }, [{ $set: { cooldownUntil: { $max: [{ $ifNull: ["$cooldownUntil", "$$NOW"] }, { $add: ["$$NOW", Math.min(Math.max(seconds, 1), 86400) * 1000] }] } } }], { ...OPTIONS, returnDocument: "after", includeResultMetadata: false });
				if (!(result?.cooldownUntil instanceof Date)) throw dbFailure();
				return result.cooldownUntil;
			});
		},
		async create({ ownerId, requestId, goal, profile, conversation = [], provider, model, limits, workflow = null }) {
			return call(async () => {
				parseContract(ownerSchema, ownerId);
				({ requestId, goal, profile, conversation } = parseContract(startRunSchema, { requestId, goal, profile, conversation }));
				if (typeof provider !== "string" || !/^[a-z][a-z0-9_-]{0,30}$/.test(provider) || typeof model !== "string" || !model || model.length > 150
					|| !Number.isInteger(limits?.maxModelCalls) || limits.maxModelCalls < 1 || limits.maxModelCalls > 6 || !Number.isInteger(limits?.maxToolCalls) || limits.maxToolCalls < 1 || limits.maxToolCalls > 12) throw new NavigatorError("INVALID_CONFIGURATION", "Configure a pinned model and bounded lifetime run limits.");
				if (workflow != null && !['catalogue_v1', 'adaptive_v2'].includes(workflow)) throw new NavigatorError("INVALID_CONFIGURATION", "Unknown research workflow.");
				const requestHash = hash(JSON.stringify(stable({ goal, profile, provider, model, limits, ...(workflow ? { workflow } : {}), ...(conversation.length ? { conversation } : {}) })));
				const previous = await runs.findOne({ ownerId, requestId }, { maxTimeMS: 3000 });
				if (previous) {
					if (previous.requestHash !== requestHash) throw new NavigatorError("IDEMPOTENCY_CONFLICT", "This request ID was already used for a different investigation.");
					return getOwned(ownerId, previous._id);
				}
				// TTL deletion is asynchronous. Expired runs must not retain the active slot.
				await runs.updateMany({ ownerId, active: true, $expr: { $lte: ["$expiresAt", "$$NOW"] } }, { $set: { active: false, privateProfile: {}, checkpoints: [], pendingCheckpointWrites: [], pendingResume: null, lease: null } }, OPTIONS);
				const run = { _id: randomUUID(), ownerId, requestId, requestHash, goal, conversation: clone(conversation), privateProfile: clone(profile), provider, model, limits: clone(limits), ...(workflow ? { workflow } : {}),
					status: "ready", active: true, revision: 0, _version: 0, lease: null,
					usage: { modelCalls: 0, toolCalls: 0, reportedModelCalls: 0, inputTokens: 0, outputTokens: 0, tokenUsageIncomplete: false },
					events: [], checkpoints: [], pendingCheckpointWrites: [], pendingResume: null, clarification: null, plan: null, error: null };
				try {
					return await runs.findOneAndUpdate({ _id: run._id }, [{ $replaceWith: { $mergeObjects: [{ $literal: run },
						{ createdAt: "$$NOW", updatedAt: "$$NOW", expiresAt: { $add: ["$$NOW", retentionDays * 86400000] } }] } }],
					{ ...OPTIONS, upsert: true, returnDocument: "after", includeResultMetadata: false });
				}
				catch (error) {
					if (error.code !== 11000) throw error;
					const existing = await runs.findOne({ ownerId, requestId }, { maxTimeMS: 3000 });
					if (existing?.requestHash === requestHash) return getOwned(ownerId, existing._id);
					if (existing) throw new NavigatorError("IDEMPOTENCY_CONFLICT", "This request ID was already used for a different investigation.");
					throw new NavigatorError("ACTIVE_RUN_EXISTS", "Finish or cancel the current investigation before starting another.");
				}
			});
		},
		async acquire({ ownerId, runId, revision, resume = null }) {
			return call(async () => {
				const run = await getOwned(ownerId, runId);
				if (run.revision !== revision) throw retry();
				if (["completed", "cancelled"].includes(run.status)) throw new NavigatorError("RUN_FINISHED", "This investigation has already finished.");
				if ((run.status === "awaiting_input") !== Boolean(resume)) throw new NavigatorError("CLARIFICATION_REQUIRED", "Resume a clarification with answers or an explicit skip.");
				const token = randomUUID();
				const result = await runs.findOneAndUpdate({ ...owned(ownerId, runId), revision, $expr: { $and: [LIVE, { $or: [{ $eq: ["$lease", null] }, { $lte: ["$lease.until", "$$NOW"] }] }] } }, [
					{ $set: { status: "running", lease: { token: { $literal: token }, until: { $add: ["$$NOW", leaseMs] } }, error: null, pendingCheckpointWrites: [],
						...(resume ? { privateProfile: { $literal: { ...run.privateProfile, ...resume.answers } },
							pendingResume: { $literal: { skip: resume.skip, resolvedFields: Object.keys(resume.answers) } } } : {}),
						revision: { $add: ["$revision", 1] }, _version: { $add: ["$_version", 1] }, updatedAt: "$$NOW" } },
				], { ...OPTIONS, returnDocument: "after", includeResultMetadata: false });
				if (!result) throw retry();
				return { lease: { ownerId, runId, token }, run: result };
			});
		},
		async reserveModel(lease, { globalDailyLimit, userDailyLimit, keepRemaining = 0 }) {
			return call(async () => {
				const run = await readLease(lease);
				if (![0, 1].includes(keepRemaining)) throw new NavigatorError('INVALID_CONFIGURATION', 'Invalid synthesis headroom.');
				if (keepRemaining && (userDailyLimit <= keepRemaining || globalDailyLimit <= keepRemaining || run.usage.modelCalls >= run.limits.maxModelCalls - keepRemaining)) throw new NavigatorError('RESEARCH_HEADROOM', 'Keep the remaining allowance for answering.');
				if (run.usage.modelCalls >= run.limits.maxModelCalls) throw new NavigatorError("MODEL_LIMIT", "The investigation reached its lifetime model-call budget.");
				if (!Number.isInteger(globalDailyLimit) || globalDailyLimit < 1 || globalDailyLimit > 10000 || !Number.isInteger(userDailyLimit) || userDailyLimit < 1 || userDailyLimit > globalDailyLimit) throw new NavigatorError("INVALID_CONFIGURATION", "Configure bounded daily model allowances.");
				const key = run.provider, userKey = hash(run.ownerId), day = { $dateToString: { format: "%Y-%m-%d", date: "$$NOW", timezone: "UTC" } };
				try { await quotas.updateOne({ _id: key }, { $setOnInsert: { day: "", used: 0, byUser: {} } }, { ...OPTIONS, upsert: true }); }
				catch (error) { if (error.code !== 11000) throw error; }
				const cooling = await quotas.aggregate([{ $match: { _id: key, $expr: { $gt: ["$cooldownUntil", "$$NOW"] } } },
					{ $project: { seconds: { $ceil: { $divide: [{ $subtract: ["$cooldownUntil", "$$NOW"] }, 1000] } } } }], { maxTimeMS: 3000 }).next();
				if (cooling) throw new NavigatorError("PROVIDER_QUOTA", "The model provider is cooling down. Saved progress is safe.", { retryAfterSeconds: cooling.seconds });
				const sameDay = { $eq: ["$day", day] };
				const reserved = await quotas.findOneAndUpdate({ _id: key, $expr: { $and: [{ $lte: [{ $ifNull: ["$cooldownUntil", "$$NOW"] }, "$$NOW"] }, { $or: [
					{ $ne: ["$day", day] }, { $and: [{ $lt: ["$used", globalDailyLimit - keepRemaining] }, { $lt: [{ $ifNull: [`$byUser.${userKey}`, 0] }, userDailyLimit - keepRemaining] }] },
				] }] } }, [{ $set: { day, used: { $add: [{ $cond: [sameDay, "$used", 0] }, 1] },
					byUser: { $mergeObjects: [{ $cond: [sameDay, "$byUser", {}] }, { [userKey]: { $add: [{ $cond: [sameDay, { $ifNull: [`$byUser.${userKey}`, 0] }, 0] }, 1] } }] }, updatedAt: "$$NOW" } }], { ...OPTIONS, returnDocument: "after", includeResultMetadata: false });
				if (!reserved) {
					const clock = await quotas.aggregate([{ $match: { _id: key } }, { $project: { now: "$$NOW", cooldownUntil: 1 } }], { maxTimeMS: 3000 }).next();
					if (clock.cooldownUntil > clock.now) throw new NavigatorError("PROVIDER_QUOTA", "The model provider is cooling down. Resume later.", { retryAfterSeconds: Math.ceil((clock.cooldownUntil - clock.now) / 1000) });
					if (keepRemaining) throw new NavigatorError('RESEARCH_HEADROOM', 'Keep the remaining allowance for answering.');
					throw new NavigatorError("QUOTA_EXHAUSTED", "The daily Navigator allowance is exhausted. Resume after the UTC daily reset.", { retryAfterSeconds: Math.ceil((Date.UTC(clock.now.getUTCFullYear(), clock.now.getUTCMonth(), clock.now.getUTCDate() + 1) - clock.now) / 1000) });
				}
				// Separate writes deliberately fail conservatively: never refund an ambiguous reservation.
				const charged = await runs.updateOne({ ...fenced(lease), "usage.modelCalls": { $lt: run.limits.maxModelCalls } }, { $inc: { "usage.modelCalls": 1, _version: 1 }, $set: { "usage.tokenUsageIncomplete": true }, $currentDate: { updatedAt: true } }, OPTIONS);
				if (!charged.matchedCount) { await readLease(lease); throw new NavigatorError("MODEL_LIMIT", "The investigation reached its lifetime model-call budget."); }
			});
		},
		async reserveTool(lease) {
			return call(async () => {
				const run = await readLease(lease);
				if (run.usage.toolCalls >= run.limits.maxToolCalls) throw new NavigatorError("TOOL_LIMIT", "The investigation reached its lifetime tool budget.");
				const result = await runs.updateOne({ ...fenced(lease), "usage.toolCalls": { $lt: run.limits.maxToolCalls } }, { $inc: { "usage.toolCalls": 1, _version: 1 }, $currentDate: { updatedAt: true } }, OPTIONS);
				if (!result.matchedCount) { await readLease(lease); throw new NavigatorError("TOOL_LIMIT", "The investigation reached its lifetime tool budget."); }
			});
		},
		async reserveSourceCheck(lease) {
			return call(async () => {
				const result = await runs.updateOne({ ...fenced(lease), $expr: { $and: [LIVE, LEASE_LIVE, { $lt: [{ $ifNull: ["$sourceCheckAttempts", 0] }, MAX_SOURCE_CHECKS] }] } },
					{ $inc: { sourceCheckAttempts: 1, _version: 1 }, $currentDate: { updatedAt: true } }, OPTIONS);
				if (!result.matchedCount) { await readLease(lease); throw new NavigatorError("SOURCE_CHECK_LIMIT", "This investigation used its two official-source checks. Continue with stored evidence and review current instructions manually."); }
			});
		},
		async recordUsage(lease, usage) {
			if (usage != null && (!Number.isSafeInteger(usage.inputTokens) || usage.inputTokens < 0 || !Number.isSafeInteger(usage.outputTokens) || usage.outputTokens < 0)) throw new NavigatorError("PROVIDER_RESPONSE_INVALID", "The provider returned invalid usage accounting.");
			return mutate(lease, run => ({ usage: { ...run.usage,
				inputTokens: run.usage.inputTokens + (usage?.inputTokens ?? 0), outputTokens: run.usage.outputTokens + (usage?.outputTokens ?? 0),
				reportedModelCalls: run.usage.reportedModelCalls + (usage == null ? 0 : 1),
				// A failed/ambiguous attempt remains visible even after later successful calls.
				tokenUsageIncomplete: run.usage.modelCalls !== run.usage.reportedModelCalls + (usage == null ? 0 : 1) } }));
		},
		async appendEvent(lease, type, extra = {}) {
			return mutate(lease, run => {
				if (run.events.length >= 100) throw new NavigatorError("EVENT_LIMIT", "The investigation reached its event budget.");
				return { events: [...run.events, { sequence: run.events.length + 1, type, ...extra }] };
			});
		},
		async release(lease, { status, plan = null, clarification = null, error = null }) {
			if (!["ready", "completed", "awaiting_input", "partial", "quota_exhausted", "interrupted"].includes(status)) throw new NavigatorError("INVALID_RUN_STATE", "The investigation returned an invalid execution state.");
			return mutate(lease, run => ({ status, active: !["completed", "cancelled"].includes(status), lease: null, plan, clarification, error,
				revision: run.revision + 1, ...(!error ? { pendingResume: null } : {}), ...(["completed", "cancelled"].includes(status) ? { privateProfile: {}, checkpoints: [], pendingCheckpointWrites: [], pendingResume: null } : {}) }));
		},
		async cancel(ownerId, runId) {
			return call(async () => {
				await getOwned(ownerId, runId);
				const run = await runs.findOneAndUpdate({ ...owned(ownerId, runId), status: { $nin: ["completed", "cancelled"] } }, {
					$set: { status: "cancelled", active: false, lease: null, checkpoints: [], pendingCheckpointWrites: [], privateProfile: {}, clarification: null, pendingResume: null },
					$inc: { revision: 1, _version: 1 }, $currentDate: { updatedAt: true },
				}, { ...OPTIONS, returnDocument: "after", includeResultMetadata: false });
				return run ?? getOwned(ownerId, runId);
			});
		},
	};
}
