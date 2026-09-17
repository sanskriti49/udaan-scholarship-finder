import crypto from "crypto";
import { hostMatches } from "./urls.js";
import { rootLogger } from "./logger.js";

export const USER_AGENT =
	"UdaanScholarshipBot/2.0 (+https://udaan-scholarships.vercel.app; official-source verification)";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_REDIRECTS = 5;

export class FetchError extends Error {
	constructor(code, message, details = {}) {
		super(message);
		this.name = "FetchError";
		this.code = code;
		Object.assign(this, details);
	}
}

export const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Live transport built on Node's fetch. Redirects are handled by SafeFetcher so
 * every hop is checked against the domain allowlist.
 */
export function createNodeTransport() {
	return async function nodeTransport(url, { headers, signal, maxBytes }) {
		const res = await fetch(url, { method: "GET", headers, signal, redirect: "manual" });
		const declared = Number(res.headers.get("content-length") || 0);
		if (declared && declared > maxBytes) {
			throw new FetchError("TOO_LARGE", `Response declares ${declared} bytes (limit ${maxBytes})`);
		}
		const chunks = [];
		let total = 0;
		if (res.body) {
			for await (const chunk of res.body) {
				total += chunk.length;
				if (total > maxBytes) {
					throw new FetchError("TOO_LARGE", `Response exceeded ${maxBytes} bytes`);
				}
				chunks.push(Buffer.from(chunk));
			}
		}
		return {
			status: res.status,
			headers: { get: (name) => res.headers.get(name) },
			body: Buffer.concat(chunks),
		};
	};
}

/** Parse robots.txt into disallow prefixes that apply to our user agent. */
export function parseRobots(text, agentToken = "udaanscholarshipbot") {
	const groups = [];
	let current = null;
	for (const rawLine of String(text || "").split(/\r?\n/)) {
		const line = rawLine.replace(/#.*$/, "").trim();
		if (!line) continue;
		const [keyRaw, ...rest] = line.split(":");
		const key = keyRaw.trim().toLowerCase();
		const value = rest.join(":").trim();
		if (key === "user-agent") {
			if (!current || current.rules.length > 0) {
				current = { agents: [], rules: [] };
				groups.push(current);
			}
			current.agents.push(value.toLowerCase());
		} else if (current && (key === "disallow" || key === "allow")) {
			current.rules.push({ type: key, path: value });
		}
	}
	const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && agentToken.includes(a)));
	const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
	return chosen.flatMap((g) => g.rules).filter((r) => r.path);
}

export function robotsAllows(rules, pathname) {
	let best = null;
	for (const rule of rules) {
		if (pathname.startsWith(rule.path) && (!best || rule.path.length > best.path.length)) best = rule;
	}
	return !best || best.type === "allow";
}

// Shared across fetcher instances so two sources on one host still share a budget.
const hostQueues = new Map();
const robotsCache = new Map();

export function resetHostState() {
	hostQueues.clear();
	robotsCache.clear();
}

export class SafeFetcher {
	constructor(options = {}) {
		this.allowedDomains = options.allowedDomains || [];
		this.transport = options.transport || createNodeTransport();
		this.minIntervalMs = options.minIntervalMs ?? 2000;
		this.timeoutMs = options.timeoutMs ?? 20000;
		this.retries = options.retries ?? 3;
		this.backoffBaseMs = options.backoffBaseMs ?? 1000;
		this.maxRetryAfterMs = options.maxRetryAfterMs ?? 60000;
		this.maxBytes = options.maxBytes ?? 15 * 1024 * 1024;
		this.userAgent = options.userAgent || USER_AGENT;
		this.respectRobots = options.respectRobots ?? true;
		this.sleep = options.sleep || defaultSleep;
		this.now = options.now || (() => Date.now());
		this.logger = options.logger || rootLogger.child({ component: "http" });
	}

	assertAllowed(url) {
		let parsed;
		try {
			parsed = new URL(url);
		} catch {
			throw new FetchError("INVALID_URL", `Invalid URL: ${url}`);
		}
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new FetchError("INVALID_URL", `Unsupported protocol: ${parsed.protocol}`);
		}
		if (!hostMatches(parsed.hostname, this.allowedDomains)) {
			throw new FetchError("DOMAIN_NOT_ALLOWED", `Host ${parsed.hostname} is not in the allowlist`, { url });
		}
		return parsed;
	}

	/** Serialise requests per host and enforce a minimum gap between them. */
	async throttle(host, task) {
		const previous = hostQueues.get(host) || Promise.resolve({ lastAt: null });
		const run = previous.then(async (state) => {
			const wait = state.lastAt === null ? 0 : state.lastAt + this.minIntervalMs - this.now();
			if (wait > 0) await this.sleep(wait);
			try {
				return { result: await task(), lastAt: this.now() };
			} catch (error) {
				return { error, lastAt: this.now() };
			}
		});
		hostQueues.set(
			host,
			run.then((r) => ({ lastAt: r.lastAt })),
		);
		const outcome = await run;
		if (outcome.error) throw outcome.error;
		return outcome.result;
	}

	async rawRequest(url, headers) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		try {
			return await this.transport(url, { headers, signal: controller.signal, maxBytes: this.maxBytes });
		} catch (error) {
			if (error instanceof FetchError) throw error;
			if (error.name === "AbortError") {
				throw new FetchError("TIMEOUT", `Timed out after ${this.timeoutMs}ms`, { url });
			}
			throw new FetchError(error.code === "NOT_RECORDED" ? "NOT_RECORDED" : "NETWORK", error.message, { url });
		} finally {
			clearTimeout(timer);
		}
	}

	async robotsAllowed(parsed) {
		if (!this.respectRobots) return true;
		const origin = parsed.origin;
		let entry = robotsCache.get(origin);
		if (!entry || this.now() - entry.fetchedAt > 24 * 60 * 60 * 1000) {
			let rules = [];
			try {
				const res = await this.throttle(parsed.host, () =>
					this.rawRequest(`${origin}/robots.txt`, { "User-Agent": this.userAgent }),
				);
				if (res.status === 200) rules = parseRobots(res.body.toString("utf8"));
			} catch (error) {
				// An unreachable robots.txt is treated as "no rules"; the real fetch will surface outages.
				this.logger.debug("robots.txt unavailable", { origin, error: error.message });
			}
			entry = { rules, fetchedAt: this.now() };
			robotsCache.set(origin, entry);
		}
		return robotsAllows(entry.rules, parsed.pathname);
	}

	backoffDelay(attempt, retryAfterHeader) {
		const retryAfter = Number(retryAfterHeader);
		if (Number.isFinite(retryAfter) && retryAfter > 0) {
			return Math.min(retryAfter * 1000, this.maxRetryAfterMs);
		}
		const exp = this.backoffBaseMs * 2 ** (attempt - 1);
		const jitter = Math.floor(Math.random() * this.backoffBaseMs);
		return Math.min(exp + jitter, this.maxRetryAfterMs);
	}

	/**
	 * Fetch a URL. Supports conditional requests: pass the previous etag /
	 * lastModified and a 304 is returned as { notModified: true }.
	 */
	async fetch(url, { etag, lastModified, accept } = {}) {
		const start = this.assertAllowed(url);
		if (!(await this.robotsAllowed(start))) {
			throw new FetchError("ROBOTS_DISALLOWED", `robots.txt disallows ${start.pathname}`, { url });
		}

		const headers = {
			"User-Agent": this.userAgent,
			Accept: accept || "text/html,application/xhtml+xml,application/pdf,application/json;q=0.9,*/*;q=0.5",
			"Accept-Language": "en-IN,en;q=0.9",
		};
		if (etag) headers["If-None-Match"] = etag;
		if (lastModified) headers["If-Modified-Since"] = lastModified;

		let attempt = 0;
		let lastError = null;
		while (attempt <= this.retries) {
			attempt += 1;
			try {
				let currentUrl = url;
				let response;
				for (let hop = 0; ; hop += 1) {
					const parsed = this.assertAllowed(currentUrl);
					response = await this.throttle(parsed.host, () => this.rawRequest(currentUrl, headers));
					if (response.status >= 300 && response.status < 400 && response.status !== 304) {
						const location = response.headers.get("location");
						if (!location) break;
						if (hop >= MAX_REDIRECTS) throw new FetchError("REDIRECT_LIMIT", "Too many redirects", { url });
						currentUrl = new URL(location, currentUrl).toString();
						continue;
					}
					break;
				}

				if (RETRYABLE_STATUS.has(response.status)) {
					const error = new FetchError("HTTP_STATUS", `HTTP ${response.status}`, { url, status: response.status });
					error.retryAfter = response.headers.get("retry-after");
					throw error;
				}

				const capturedAt = response.headers.get("x-captured-at");
				const fetchedAt = capturedAt ? new Date(capturedAt) : new Date(this.now());
				if (response.status === 304) {
					return { url, finalUrl: currentUrl, status: 304, notModified: true, fetchedAt, attempts: attempt };
				}
				if (response.status < 200 || response.status >= 300) {
					throw new FetchError("HTTP_STATUS", `HTTP ${response.status}`, {
						url,
						status: response.status,
						retryable: false,
					});
				}

				const body = response.body;
				return {
					url,
					finalUrl: currentUrl,
					status: response.status,
					notModified: false,
					contentType: (response.headers.get("content-type") || "").toLowerCase(),
					capturedSourceType: response.headers.get("x-captured-source-type") || null,
					etag: response.headers.get("etag"),
					lastModified: response.headers.get("last-modified"),
					body,
					byteLength: body.length,
					sha256: sha256(body),
					fetchedAt,
					attempts: attempt,
				};
			} catch (error) {
				lastError = error;
				const retryable =
					error.retryable !== false &&
					(error.code === "NETWORK" ||
						error.code === "TIMEOUT" ||
						(error.code === "HTTP_STATUS" && RETRYABLE_STATUS.has(error.status)));
				if (!retryable || attempt > this.retries) break;
				const delay = this.backoffDelay(attempt, error.retryAfter);
				this.logger.warn("fetch retry", { url, attempt, code: error.code, delayMs: delay });
				await this.sleep(delay);
			}
		}
		lastError.attempts = attempt;
		throw lastError;
	}
}

/**
 * Transport that serves previously captured official pages (see
 * test/fixtures/recorded/*). Unknown URLs fail with NOT_RECORDED, exactly like
 * an unreachable host, so failure handling is exercised too.
 */
export function createRecordedTransport(records, { overrides = {} } = {}) {
	// records: [{ url, text, sourceContentType, capturedAt }]
	const byUrl = new Map(records.map((r) => [r.url, r]));
	return async function recordedTransport(url) {
		if (overrides[url]) return overrides[url](url);
		if (new URL(url).pathname === "/robots.txt") {
			return { status: 404, headers: { get: () => null }, body: Buffer.alloc(0) };
		}
		const decoded = decodeURI(url);
		const record = byUrl.get(url) || byUrl.get(decoded);
		if (!record) {
			const error = new Error(`No recorded capture for ${url}`);
			error.code = "NOT_RECORDED";
			throw error;
		}
		return {
			status: 200,
			headers: {
				get: (name) => {
					const key = name.toLowerCase();
					if (key === "content-type") return "text/x-captured-text; charset=utf-8";
					if (key === "x-captured-source-type") return record.sourceContentType;
					if (key === "x-captured-at") return record.capturedAt || null;
					return null;
				},
			},
			body: Buffer.from(record.text, "utf8"),
		};
	};
}
