import { SafeFetcher, createNodeTransport } from "../../pipeline/core/http.js";
import { SOURCE_REGISTRY } from "../../pipeline/sources.js";
import { hostMatches } from "../../pipeline/core/urls.js";
import { NavigatorError, sourceCheckSchema } from "./contracts.js";
import { createOfficialAcquisition } from './officialAcquisition.js';

const cancelled = () => new NavigatorError("CANCELLED", "This source check was cancelled.");
const quietLogger = { debug() {}, warn() {} };

/** Reuse ingestion's robots, host throttle and redirect checks, without storing or parsing new content. */
export function createOfficialSourceChecker({ sources = SOURCE_REGISTRY, transport = createNodeTransport(), timeoutMs = 10000, now = () => new Date(), sleep } = {}) {
	if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) throw new NavigatorError("INVALID_CONFIGURATION", "Source checks need a bounded deadline.");
	return {
		...createOfficialAcquisition({ sources, transport, timeoutMs, now, sleep }),
		async check({ snapshot, signal, reserve }) {
			if (signal?.aborted) throw cancelled();
			const result = (status, reason) => sourceCheckSchema.parse({ snapshotId: String(snapshot._id ?? snapshot.id), url: snapshot.url, checkedAt: now().toISOString(), status, reason });
			const source = sources.find(item => item.enabled === true && item.id === snapshot.sourceId);
			let url;
			try { url = new URL(snapshot.url); } catch { return result("unavailable", "unregistered_source"); }
			const allowed = parsed => parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.port && parsed.href.length <= 2048 && hostMatches(parsed.hostname, source?.allowedDomains);
			if (!source || !allowed(url)) return result("unavailable", "unregistered_source");
			// Rendered/replayed captures are not comparable to a fresh static HTTP response.
			if (!/^[a-f\d]{64}$/.test(snapshot.sha256 ?? "") || snapshot.fetchMethod === "dynamic" || snapshot.capturedSourceType) return result("unavailable", "unsupported_snapshot");
			if (typeof reserve !== "function") throw new NavigatorError("INVALID_CONFIGURATION", "Reserve the persistent source-check allowance before fetching.");
			await reserve(); // A crash or cancelled attempt stays charged; never retry automatically.
			if (signal?.aborted) throw cancelled();
			const deadline = new AbortController(), combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
			let requests = 0, abort;
			const timer = setTimeout(() => deadline.abort(), timeoutMs);
			// This guard also runs after a queued host throttle wakes, preventing late requests.
			const boundedTransport = async (target, options) => {
				if (combined.aborted) throw cancelled();
				if (++requests > 4) throw Object.assign(new Error("Source request limit"), { code: "SOURCE_REQUEST_LIMIT" });
				return transport(target, { ...options, signal: AbortSignal.any([combined, options.signal]) });
			};
			class OfficialFetcher extends SafeFetcher {
				assertAllowed(target) {
					const parsed = super.assertAllowed(target);
					if (!allowed(parsed)) throw Object.assign(new Error("Source URL is blocked"), { code: "DOMAIN_NOT_ALLOWED" });
					return parsed;
				}
			}
			const fetcher = new OfficialFetcher({ allowedDomains: source.allowedDomains, transport: boundedTransport,
				retries: 0, timeoutMs: Math.min(timeoutMs, 5000), maxBytes: 2 * 1024 * 1024,
				minIntervalMs: Math.max(2000, source.rateLimit?.minIntervalMs ?? 2000), logger: quietLogger, ...(sleep ? { sleep } : {}) });
			const stopped = new Promise((_, reject) => {
				abort = () => reject(cancelled());
				combined.addEventListener("abort", abort, { once: true });
				if (combined.aborted) abort();
			});
			try {
				// Unconditional GET: a weak validator or an unsolicited 304 cannot establish equality.
				const response = await Promise.race([fetcher.fetch(url.href), stopped]);
				if (combined.aborted) throw cancelled();
				if (response.status !== 200 || response.notModified) return result("unavailable", "fetch_failed");
				return response.sha256 === snapshot.sha256 ? result("unchanged", "same_bytes") : result("changed", "different_bytes");
			} catch (error) {
				if (signal?.aborted) throw cancelled();
				return result("unavailable", deadline.signal.aborted || error.code === "TIMEOUT" ? "timeout" : ["DOMAIN_NOT_ALLOWED", "ROBOTS_DISALLOWED", "INVALID_URL", "REDIRECT_LIMIT"].includes(error.code) ? "blocked" : "fetch_failed");
			} finally {
				clearTimeout(timer);
				combined.removeEventListener("abort", abort);
				deadline.abort();
			}
		},
	};
}
