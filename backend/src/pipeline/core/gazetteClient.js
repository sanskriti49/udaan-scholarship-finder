import { createHash } from "node:crypto";
import { gazetteExtractionSchema } from "./gazetteContract.js";

export class GazetteError extends Error {
	constructor(code, message, { transient = true, status = null } = {}) { super(message); this.code = code; this.transient = transient; this.status = status; }
}

/** Internal raw-byte transport. The service never fetches scholarship URLs. */
export function createGazetteClient({ baseUrl = process.env.GAZETTE_SERVICE_URL || "", apiKey = process.env.GAZETTE_API_KEY || "", timeoutMs = Number(process.env.GAZETTE_TIMEOUT_MS || 90000),
	maxUploadBytes = 20 * 1024 * 1024, maxResponseBytes = 4 * 1024 * 1024, failureThreshold = 2, cooldownMs = 30000, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
	let failures = 0, openUntil = 0;
	return {
		enabled: Boolean(baseUrl),
		async extract(body, { ocrLanguages } = {}) {
			if (!baseUrl) return null;
			if (now() < openUntil) throw new GazetteError("GAZETTE_CIRCUIT_OPEN", "Document service is temporarily bypassed after repeated failures.");
			if (!Buffer.isBuffer(body) || body.length > maxUploadBytes) throw new GazetteError("GAZETTE_UPLOAD_LIMIT", "PDF exceeds the internal service upload limit.", { transient: false });
			let url;
			try {
				url = new URL("v1/extract", `${baseUrl.replace(/\/$/, "")}/`);
				if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error();
				if (ocrLanguages) {
					if (!/^[a-z]{3}(?:\+[a-z]{3}){0,7}$/.test(ocrLanguages)) throw new Error();
					url.searchParams.set("ocr_languages", ocrLanguages);
				}
			} catch { throw new GazetteError("GAZETTE_CONFIG", "Document service configuration is invalid.", { transient: false }); }
			const controller = new AbortController();
			let timer;
			const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new GazetteError("GAZETTE_TIMEOUT", "Document service exceeded its time budget.")); }, timeoutMs); });
			const digest = createHash("sha256").update(body).digest("hex");
			const request = async () => {
				const response = await fetchImpl(url, { method: "POST", redirect: "manual", body, signal: controller.signal,
					headers: { "content-type": "application/pdf", accept: "application/json", "x-document-sha256": digest, ...(apiKey ? { "x-gazette-key": apiKey } : {}) } });
				if (!response.ok) { await response.body?.cancel(); throw new GazetteError("GAZETTE_HTTP_ERROR", "Document service declined or could not process this PDF.", { status: response.status, transient: response.status >= 500 }); }
				if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new GazetteError("GAZETTE_CONTRACT_INVALID", "Document service returned an unexpected content type.");
				const reader = response.body?.getReader();
				if (!reader) throw new GazetteError("GAZETTE_CONTRACT_INVALID", "Document service returned no body.");
				const chunks = []; let size = 0;
				try {
					while (true) {
						const { value, done } = await reader.read();
						if (done) break;
						size += value.byteLength;
						if (size > maxResponseBytes) throw new GazetteError("GAZETTE_RESPONSE_LIMIT", "Document service response exceeded its size budget.");
						chunks.push(Buffer.from(value));
					}
				} finally { await reader.cancel().catch(() => {}); }
				let decoded;
				try { decoded = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new GazetteError("GAZETTE_CONTRACT_INVALID", "Document service returned invalid JSON."); }
				const parsed = gazetteExtractionSchema.safeParse(decoded);
				if (!parsed.success || parsed.data.source_sha256 !== digest || parsed.data.byte_length !== body.length) throw new GazetteError("GAZETTE_CONTRACT_INVALID", "Document extraction failed schema, provenance or geometry validation.");
				return parsed.data;
			};
			try {
				const result = await Promise.race([request(), deadline]);
				failures = 0; openUntil = 0;
				return result;
			} catch (error) {
				controller.abort();
				const safe = error instanceof GazetteError ? error : new GazetteError("GAZETTE_UNAVAILABLE", "Document service could not be reached.");
				if (safe.transient && ++failures >= failureThreshold) openUntil = now() + cooldownMs;
				if (!safe.transient) { failures = 0; openUntil = 0; }
				throw safe;
			} finally { clearTimeout(timer); }
		},
	};
}
