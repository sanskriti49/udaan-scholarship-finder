import dotenv from "dotenv";
dotenv.config();
import Redis from "ioredis";

/**
 * Redis Configuration for Udaan Backend
 *
 * Provides two segregated connection layers:
 * 1. redisClient: Singleton caching client with fail-open error handling.
 * 2. bullMqConnection: Dedicated connection configuration with maxRetriesPerRequest: null
 *    as required by BullMQ workers and queues.
 */

let isAvailable = false;
let clientInstance = null;

/**
 * Parse connection options from environment
 */
export function getRedisConfig() {
	// 1. If REDIS_URL exists (e.g. Render Key-Value), parse it
	if (process.env.REDIS_URL) {
		try {
			const parsed = new URL(process.env.REDIS_URL);
			return {
				host: parsed.hostname,
				port: parseInt(parsed.port, 10) || 6379,
				username: parsed.username
					? decodeURIComponent(parsed.username)
					: undefined,
				password: parsed.password
					? decodeURIComponent(parsed.password)
					: undefined,
				tls: parsed.protocol === "rediss:" ? {} : undefined,
			};
		} catch (err) {
			console.error("[Redis] Invalid REDIS_URL format:", err.message);
		}
	}

	// 2. Fallback: Reads your Redis Cloud variables directly
	return {
		host: process.env.REDIS_HOST || "127.0.0.1",
		port: parseInt(process.env.REDIS_PORT, 10) || 6379,
		password: process.env.REDIS_PASSWORD || undefined,
		username: process.env.REDIS_USERNAME || undefined,
		tls: process.env.REDIS_TLS === "true" ? {} : undefined,
	};
}
/**
 * Dedicated connection configuration for BullMQ
 * Note: BullMQ strictly requires maxRetriesPerRequest: null
 */
export const bullMqConnection = {
	...getRedisConfig(),
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
	retryStrategy(times) {
		if (times > 2) return null;
		return 300;
	},
};

/**
 * Singleton Redis client for Express cache middleware
 * Implements fail-open mechanics: if Redis is unavailable, requests fall through to MongoDB.
 */
export function getRedisClient() {
	if (clientInstance) {
		return clientInstance;
	}

	const rawConfig = getRedisConfig();
	const clientOptions = {
		retryStrategy(times) {
			// Stop spamming retries after 2 attempts when Redis is offline
			if (times > 2) {
				return null;
			}
			return 300;
		},
		reconnectOnError(err) {
			const targetError = "READONLY";
			if (err.message.includes(targetError)) {
				return true;
			}
			return false;
		},
		connectTimeout: 5000,
		lazyConnect: true,
		maxRetriesPerRequest: 3,
	};

	if (typeof rawConfig === "string") {
		clientInstance = new Redis(rawConfig, clientOptions);
	} else {
		clientInstance = new Redis({
			...rawConfig,
			...clientOptions,
		});
	}

	clientInstance.on("connect", () => {
		isAvailable = true;
		console.log("[Redis] Client connected successfully.");
	});

	clientInstance.on("ready", () => {
		isAvailable = true;
		console.log("[Redis] Client ready for operations.");
	});

	clientInstance.on("error", (err) => {
		isAvailable = false;
		console.warn(
			`[Redis] Connection issue (${err.code || err.message}). Operating in fail-open fallback mode.`,
		);
	});

	clientInstance.on("close", () => {
		isAvailable = false;
	});

	// Attempt non-blocking initial connection
	clientInstance.connect().catch(() => {
		isAvailable = false;
		console.warn(
			"[Redis] Initial connection unavailable. Cache layer operating in fail-open mode.",
		);
	});

	return clientInstance;
}

/**
 * Helper to inspect current connection health
 */
export function isRedisAvailable() {
	return (
		isAvailable && clientInstance !== null && clientInstance.status === "ready"
	);
}

/**
 * Gracefully close Redis client
 */
export async function closeRedisClient() {
	if (clientInstance) {
		try {
			await clientInstance.quit();
			clientInstance = null;
			isAvailable = false;
			console.log("[Redis] Client closed gracefully.");
		} catch (err) {
			console.error("[Redis] Error during client shutdown:", err.message);
		}
	}
}

export const redisClient = getRedisClient();
export default redisClient;
