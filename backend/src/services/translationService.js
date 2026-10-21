import { z } from "zod";

// Language tags describe a provider capability, never a dictionary of scheme names.
const language = z.string().trim().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i).max(35);
export const translationRequestSchema = z.object({
	targetLanguage: language,
	sourceLanguage: z.union([z.literal("auto"), language]).default("auto"),
}).strict();

export class TranslationError extends Error {
	constructor(code, message, status = 503, retryable = false) {
		super(message); this.code = code; this.status = status; this.retryable = retryable;
	}
}

function decodeEntities(text) {
	const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
	return text.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (match, entity) => {
		if (entity[0] !== "#") return named[entity.toLowerCase()];
		const value = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
		return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
	});
}

/** Only public scholarship titles should reach this service. No profiles or documents. */
export function createTranslationService({
	fetchImpl = globalThis.fetch,
	apiKey = process.env.GOOGLE_TRANSLATE_API_KEY,
	provider = process.env.TRANSLATION_PROVIDER || (apiKey ? "google-cloud" : "google-public"),
	timeoutMs = 3500, retryDelayMs = 200, maxEntries = 500, maxPending = 40,
	ttlMs = 24 * 60 * 60 * 1000, now = Date.now,
} = {}) {
	const cache = new Map(), pending = new Map();

	async function request(text, targetLanguage, sourceLanguage) {
		if (provider === "disabled") throw new TranslationError("TRANSLATION_DISABLED", "Translation is currently unavailable.");
		if (!["google-cloud", "google-public"].includes(provider) || (provider === "google-cloud" && !apiKey)) {
			throw new TranslationError("TRANSLATION_CONFIGURATION", "The translation service is not configured.");
		}
		const url = new URL(provider === "google-cloud"
			? "https://translation.googleapis.com/language/translate/v2"
			: "https://translate.googleapis.com/translate_a/single");
		const options = {};
		if (provider === "google-cloud") {
			url.searchParams.set("key", apiKey);
			options.method = "POST";
			options.headers = { "Content-Type": "application/json" };
			options.body = JSON.stringify({ q: text, target: targetLanguage, format: "text",
				...(sourceLanguage === "auto" ? {} : { source: sourceLanguage }) });
		} else {
			url.search = new URLSearchParams({ client: "gtx", sl: sourceLanguage, tl: targetLanguage, dt: "t", q: text }).toString();
		}

		for (let attempt = 0; attempt < 2; attempt++) {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const response = await fetchImpl(url, { ...options, signal: controller.signal });
				if (!response.ok) {
					if (response.status === 400) throw new TranslationError("UNSUPPORTED_LANGUAGE", "This language pair could not be translated. Try selecting the source language.", 400);
					throw new TranslationError("TRANSLATION_UNAVAILABLE", "Translation is temporarily unavailable. Please try again.", 503, response.status === 429 || response.status >= 500);
				}
				const data = await response.json();
				let translatedText, detectedLanguage;
				if (provider === "google-cloud") {
					const translation = data?.data?.translations?.[0];
					translatedText = typeof translation?.translatedText === "string" ? decodeEntities(translation.translatedText) : null;
					detectedLanguage = translation?.detectedSourceLanguage;
				} else if (Array.isArray(data?.[0]) && data[0].length && data[0].every(part => Array.isArray(part) && typeof part[0] === "string")) {
					translatedText = data[0].map(part => part[0]).join("");
					detectedLanguage = data[2];
				}
				if (typeof translatedText !== "string" || !translatedText.trim() || translatedText.length > 12000) {
					throw new TranslationError("INVALID_TRANSLATION", "The translation service returned an unreadable response. Please try again.");
				}
				detectedLanguage = language.safeParse(detectedLanguage).success ? detectedLanguage : sourceLanguage === "auto" ? null : sourceLanguage;
				return { originalText: text, translatedText, sourceLanguage: detectedLanguage, targetLanguage, provider,
					status: detectedLanguage?.toLowerCase() === targetLanguage.toLowerCase() ? "same-language" : translatedText.trim() === text.trim() ? "unchanged" : "translated" };
			} catch (error) {
				const failure = error instanceof TranslationError ? error : new TranslationError(
					controller.signal.aborted ? "TRANSLATION_TIMEOUT" : "TRANSLATION_UNAVAILABLE",
					controller.signal.aborted ? "Translation took too long. Please try again." : "Translation is temporarily unavailable. Please try again.",
					503, !(error instanceof SyntaxError));
				if (!failure.retryable || attempt === 1) throw failure;
			} finally { clearTimeout(timer); }
			await new Promise(resolve => setTimeout(resolve, retryDelayMs));
		}
	}

	return async ({ text, targetLanguage, sourceLanguage = "auto" }) => {
		const input = translationRequestSchema.safeParse({ targetLanguage, sourceLanguage });
		if (!input.success || typeof text !== "string" || !text.trim() || text.length > 1500) {
			throw new TranslationError("INVALID_REQUEST", "Provide a valid scholarship title and language.", 400);
		}
		const target = input.data.targetLanguage.toLowerCase(), source = input.data.sourceLanguage.toLowerCase();
		const key = JSON.stringify([provider, text, source, target]);
		const cached = cache.get(key);
		if (cached && cached.expiresAt > now()) {
			cache.delete(key); cache.set(key, cached); return cached.value;
		}
		cache.delete(key);
		if (pending.has(key)) return pending.get(key);
		if (pending.size >= maxPending) throw new TranslationError("TRANSLATION_BUSY", "Translation is busy. Please try again shortly.");
		const task = request(text, target, source).then(value => {
			cache.set(key, { value, expiresAt: now() + ttlMs });
			while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
			return value;
		}).finally(() => pending.delete(key));
		pending.set(key, task);
		return task;
	};
}

export const translatePublicTitle = createTranslationService();
