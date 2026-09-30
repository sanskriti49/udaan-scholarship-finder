import crypto from "crypto";
import { getRedisClient, isRedisAvailable } from "../config/redis.js";

/**
 * In-memory fallback lock table when Redis is unreachable
 */
const memoryLockStore = new Map();

// Periodic cleanup of stale in-memory locks
setInterval(() => {
	const now = Date.now();
	for (const [key, lock] of memoryLockStore.entries()) {
		if (lock.expiresAt <= now) {
			memoryLockStore.delete(key);
		}
	}
}, 30 * 1000).unref();

const LUA_RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * Attempt to acquire a distributed lock
 *
 * @param {string} lockKey - Unique identifier for the lock (e.g. 'lock:crawler:run')
 * @param {number} [ttlSeconds=300] - Expiration safety timeout in seconds
 * @returns {Promise<string|null>} Lock token if acquired, or null if lock is already held
 */
export async function acquireLock(lockKey, ttlSeconds = 300) {
	const token = crypto.randomBytes(16).toString("hex") + ":" + Date.now();

	if (isRedisAvailable()) {
		try {
			const redis = getRedisClient();
			// SET key token NX EX ttl
			const result = await redis.set(lockKey, token, "EX", ttlSeconds, "NX");
			if (result === "OK") {
				return token;
			}
			return null;
		} catch (err) {
			console.warn(`[DistributedLock] Redis lock error (${err.message}). Falling back to memory lock.`);
		}
	}

	// In-Memory Fallback
	const now = Date.now();
	const existing = memoryLockStore.get(lockKey);
	if (existing && existing.expiresAt > now) {
		return null; // Lock already held
	}

	memoryLockStore.set(lockKey, {
		token,
		expiresAt: now + ttlSeconds * 1000,
	});
	return token;
}

/**
 * Safely release a distributed lock only if the token matches
 *
 * @param {string} lockKey
 * @param {string} token
 * @returns {Promise<boolean>} True if successfully released, false otherwise
 */
export async function releaseLock(lockKey, token) {
	if (!token) return false;

	if (isRedisAvailable()) {
		try {
			const redis = getRedisClient();
			const result = await redis.eval(LUA_RELEASE_SCRIPT, 1, lockKey, token);
			return result === 1;
		} catch (err) {
			console.warn(`[DistributedLock] Redis release error: ${err.message}`);
		}
	}

	// In-Memory Fallback
	const existing = memoryLockStore.get(lockKey);
	if (existing && existing.token === token) {
		memoryLockStore.delete(lockKey);
		return true;
	}
	return false;
}

/**
 * Helper to run an async task wrapped within a distributed lock.
 * If another instance is running, cleanly skips without collision.
 *
 * @param {string} lockKey
 * @param {number} ttlSeconds
 * @param {Function} taskFn
 * @returns {Promise<{ executed: boolean, result?: any, skipped?: boolean }>}
 */
export async function withDistributedLock(lockKey, ttlSeconds, taskFn) {
	const token = await acquireLock(lockKey, ttlSeconds);
	if (!token) {
		console.log(`[DistributedLock] Lock '${lockKey}' is currently held by another worker instance. Skipping task.`);
		return { executed: false, skipped: true };
	}

	try {
		const result = await taskFn();
		return { executed: true, result };
	} finally {
		await releaseLock(lockKey, token);
	}
}
