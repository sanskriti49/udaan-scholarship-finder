import { redisClient, isRedisAvailable } from "../config/redis.js";

/**
 * Cache Middleware for Express
 *
 * Implements a fail-open, deterministic response caching layer for high-read endpoints.
 *
 * @param {Object} [options]
 * @param {number} [options.ttl=1800] - Cache time-to-live in seconds (default: 30 minutes)
 * @param {string} [options.prefix="udaan:cache:scholarships"] - Key namespace prefix
 */
export function cacheMiddleware(options = {}) {
	const ttl = options.ttl || parseInt(process.env.CACHE_TTL_SECONDS, 10) || 1800;
	const prefix = options.prefix || "udaan:cache:scholarships";

	return async (req, res, next) => {
		// Only cache idempotent GET requests
		if (req.method !== "GET") {
			return next();
		}

		// Fail-open guard: if Redis is not currently ready, bypass cache seamlessly
		if (!isRedisAvailable()) {
			res.setHeader("X-Cache", "BYPASS");
			return next();
		}

		const cacheKey = buildDeterministicCacheKey(prefix, req);

		try {
			const cachedPayload = await redisClient.get(cacheKey);

			if (cachedPayload) {
				res.setHeader("X-Cache", "HIT");
				res.setHeader("Content-Type", "application/json");
				return res.send(cachedPayload);
			}

			// Cache Miss: Monkey-patch res.json to capture response
			res.setHeader("X-Cache", "MISS");
			const originalJson = res.json.bind(res);

			res.json = (body) => {
				// Only cache successful 200 responses
				if (res.statusCode === 200 && body) {
					try {
						const serialized = JSON.stringify(body);
						redisClient.set(cacheKey, serialized, "EX", ttl).catch((err) => {
							console.warn(`[Cache] Failed writing key '${cacheKey}':`, err.message);
						});
					} catch (serializeErr) {
						console.warn("[Cache] Serialization error on write:", serializeErr.message);
					}
				}
				return originalJson(body);
			};

			next();
		} catch (err) {
			// Fail-open: catch any unexpected Redis error and continue to controller
			console.warn("[Cache] Read failure, falling back to database:", err.message);
			res.setHeader("X-Cache", "BYPASS");
			next();
		}
	};
}

/**
 * Build deterministic cache key with sorted query parameters
 * Ensures '?state=Delhi&category=STEM' and '?category=STEM&state=Delhi' share one cache entry.
 */
export function buildDeterministicCacheKey(prefix, req) {
	const path = `${req.baseUrl || ""}${req.path || ""}`.replace(/\/+/g, "/");
	const queryKeys = Object.keys(req.query || {}).sort();

	const queryString = queryKeys
		.map((key) => {
			const val = req.query[key];
			return `${encodeURIComponent(key)}=${encodeURIComponent(String(val).trim().toLowerCase())}`;
		})
		.join("&");

	return queryString ? `${prefix}:${path}?${queryString}` : `${prefix}:${path}`;
}

/**
 * Invalidate cache matching a pattern safely using SCAN
 * Avoids blocking Redis server compared to synchronous KEYS command.
 *
 * @param {string} [pattern="udaan:cache:scholarships:*"]
 */
export async function clearScholarshipCache(pattern = "udaan:cache:scholarships:*") {
	if (!isRedisAvailable()) {
		return 0;
	}

	try {
		let cursor = "0";
		let totalDeleted = 0;

		do {
			const [nextCursor, keys] = await redisClient.scan(
				cursor,
				"MATCH",
				pattern,
				"COUNT",
				100,
			);
			cursor = nextCursor;

			if (keys.length > 0) {
				const deleted = await redisClient.del(...keys);
				totalDeleted += deleted;
			}
		} while (cursor !== "0");

		if (totalDeleted > 0) {
			console.log(`[Cache] Cleared ${totalDeleted} keys matching '${pattern}'.`);
		}
		return totalDeleted;
	} catch (err) {
		console.warn(`[Cache] Error clearing keys with pattern '${pattern}':`, err.message);
		return 0;
	}
}

export default cacheMiddleware;
