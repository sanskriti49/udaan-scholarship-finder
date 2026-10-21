// Menu metadata only. Source detection and translation are always done by the
// provider, including languages and titles never previously seen by Udaan.
// Common destinations supported by Google's NMT API. This menu never limits
// automatic source detection. BCP-47 tags also keep names script-aware in Intl.
// https://docs.cloud.google.com/translate/docs/languages
const LANGUAGE_CODES = ["en", "as", "bn", "bho", "doi", "gu", "gom", "hi", "kn", "mai", "ml", "mni-Mtei", "mr", "ne", "or", "pa", "sa", "sd", "ta", "te", "ur"];

export function getLanguageName(code, locale = "en") {
	if (!code) return "Not detected";
	try { return new Intl.DisplayNames([locale], { type: "language" }).of(code) || code; }
	catch { return code; }
}

export const SUPPORTED_LANGUAGES = LANGUAGE_CODES.map(code => ({
	code, name: getLanguageName(code), native: getLanguageName(code, code),
}));

export function getTranslationLink(text, targetLanguage, sourceLanguage = "auto") {
	return `https://translate.google.com/?${new URLSearchParams({ sl: sourceLanguage, tl: targetLanguage, text, op: "translate" })}`;
}

export function getTranslationErrorMessage(error) {
	if (typeof error?.response?.data?.message === "string") return error.response.data.message;
	if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) return "Translation took too long. Please try again.";
	if (error?.code === "ERR_NETWORK") return "Couldn't reach the translation service. Check your connection and try again.";
	return error?.message || "Translation is unavailable. Please try again.";
}

const abortError = () => new DOMException("Translation cancelled", "AbortError");

/** Shared bounded cache; concurrent cards/dialogs share work, not cancellation. */
export function createTitleTranslator(request, { maxEntries = 100, ttlMs = 30 * 60 * 1000, now = Date.now } = {}) {
	const cache = new Map(), pending = new Map();
	return async ({ scholarshipId, title, targetLanguage = "en", sourceLanguage = "auto", signal }) => {
		if (signal?.aborted) throw abortError();
		if (!scholarshipId || typeof title !== "string" || !title.trim()) throw new Error("This scholarship title is unavailable for translation.");
		const key = JSON.stringify([scholarshipId, title, targetLanguage, sourceLanguage]);
		const cached = cache.get(key);
		if (cached && cached.expiresAt > now()) {
			cache.delete(key); cache.set(key, cached); return cached.value;
		}
		cache.delete(key);
		let entry = pending.get(key);
		if (!entry) {
			entry = { controller: new AbortController(), consumers: 0, settled: false };
			entry.promise = Promise.resolve().then(() => {
				if (entry.controller.signal.aborted) throw abortError();
				return request({ scholarshipId, targetLanguage, sourceLanguage }, entry.controller.signal);
			}).then(value => {
				if (entry.controller.signal.aborted) throw abortError();
				if (value?.originalText !== title) throw new Error("The source title has changed. Refresh this scholarship and try again.");
				if (typeof value.translatedText !== "string" || !value.translatedText.trim() || value.targetLanguage?.toLowerCase() !== targetLanguage.toLowerCase()
					|| !["translated", "same-language", "unchanged"].includes(value.status)) throw new Error("The translation could not be read. Please try again.");
				cache.set(key, { value, expiresAt: now() + ttlMs });
				while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
				return value;
			}).finally(() => {
				entry.settled = true;
				if (pending.get(key) === entry) pending.delete(key);
			});
			pending.set(key, entry);
		}
		entry.consumers++;
		return new Promise((resolve, reject) => {
			let finished = false;
			const finish = (callback, value) => {
				if (finished) return;
				finished = true;
				signal?.removeEventListener("abort", cancel);
				entry.consumers--;
				if (!entry.consumers && !entry.settled) {
					entry.controller.abort();
					if (pending.get(key) === entry) pending.delete(key);
				}
				callback(value);
			};
			const cancel = () => finish(reject, abortError());
			signal?.addEventListener("abort", cancel, { once: true });
			entry.promise.then(value => finish(resolve, value), error => finish(reject, error));
			if (signal?.aborted) cancel();
		});
	};
}
