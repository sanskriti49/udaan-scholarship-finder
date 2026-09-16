import { getRedisClient, isRedisAvailable } from "../config/redis.js";

/**
 * In-memory token bucket / sliding window fallback when Redis is offline
 */
const memoryStore = new Map();

// Periodic cleanup of stale in-memory entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, record] of memoryStore.entries()) {
		if (record.resetTime <= now) {
			memoryStore.delete(key);
		}
	}
}, 5 * 60 * 1000).unref();

/**
 * Creates an Express rate-limiting middleware.
 * Uses Redis atomic INCR + EXPIRE if available, falling back to local memory.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (e.g. 15 * 60 * 1000)
 * @param {number} options.max - Max permitted requests within window
 * @param {string} options.keyPrefix - Prefix namespace for keys (e.g. 'auth', 'api')
 * @param {string} [options.message] - Custom rejection message
 */
export function rateLimiter({
	windowMs = 15 * 60 * 1000,
	max = 100,
	keyPrefix = "global",
	message = "Too many requests. Please try again later.",
} = {}) {
	const windowSeconds = Math.ceil(windowMs / 1000);

	return async (req, res, next) => {
		// Preflight OPTIONS requests should never be rate-limited
		if (req.method === "OPTIONS") {
			return next();
		}

		// Identify client IP (respecting reverse proxies like Vercel/Render)
		const ip =
			req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
			req.socket?.remoteAddress ||
			"unknown-ip";

		const key = `ratelimit:${keyPrefix}:${ip}`;

		try {
			if (isRedisAvailable()) {
				const redis = getRedisClient();
				const multi = redis.multi();
				multi.incr(key);
				multi.ttl(key);
				const results = await multi.exec();

				const count = results[0][1];
				let ttl = results[1][1];

				// Set expiration on the first hit
				if (count === 1 || ttl < 0) {
					await redis.expire(key, windowSeconds);
					ttl = windowSeconds;
				}

				res.setHeader("X-RateLimit-Limit", max);
				res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
				res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds));

				if (count > max) {
					res.setHeader("Retry-After", ttl > 0 ? ttl : windowSeconds);
					return res.status(429).json({
						success: false,
						message,
						retryAfter: ttl > 0 ? ttl : windowSeconds,
					});
				}

				return next();
			}
		} catch (err) {
			console.warn(`[RateLimiter] Redis error (${err.message}). Falling back to memory store.`);
		}

		// In-Memory Fallback
		const now = Date.now();
		let record = memoryStore.get(key);

		if (!record || record.resetTime <= now) {
			record = { count: 1, resetTime: now + windowMs };
			memoryStore.set(key, record);
		} else {
			record.count += 1;
		}

		const remaining = Math.max(0, max - record.count);
		const ttlSeconds = Math.ceil((record.resetTime - now) / 1000);

		res.setHeader("X-RateLimit-Limit", max);
		res.setHeader("X-RateLimit-Remaining", remaining);
		res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

		if (record.count > max) {
			res.setHeader("Retry-After", ttlSeconds);
			return res.status(429).json({
				success: false,
				message,
				retryAfter: ttlSeconds,
			});
		}

		next();
	};
}

// Preconfigured limiters
export const authLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, // 20 attempts per 15 minutes
	keyPrefix: "auth",
	message: "Too many login/registration attempts from this IP. Please try again after 15 minutes.",
});

export const apiLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 300,
	keyPrefix: "api",
	message: "Request limit exceeded. Please slow down.",
});
