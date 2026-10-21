import { test } from "node:test";
import assert from "node:assert/strict";
import Scholarship from "../../src/models/Scholarship.js";
import { createTranslationService, TranslationError } from "../../src/services/translationService.js";
import { createTranslationController } from "../../src/controllers/translationController.js";

const title = "కొత్త విద్యార్థుల పరిశోధన సహాయం 2026";
const publicResponse = (text = "New student research assistance 2026", source = "te") => ({ ok: true, json: async () => [[[text, title]], null, source] });
const service = options => createTranslationService({ provider: "google-public", apiKey: undefined, retryDelayMs: 0, ...options });

test("unseen Telugu, Malayalam, Urdu and mixed titles go to automatic detection verbatim", async () => {
	const inputs = [title, "പുതിയ ഗവേഷണ സഹായം", "طلبہ کی تحقیقی امداد", "Scholarship నూతన 2026", "An unfamiliar Romanized scheme name"];
	const queries = [];
	const translate = service({ fetchImpl: async url => { queries.push(new URL(url).searchParams); return publicResponse(); } });
	for (const text of inputs) assert.equal((await translate({ text, targetLanguage: "en" })).originalText, text);
	assert.deepEqual(queries.map(query => query.get("q")), inputs);
	assert.ok(queries.every(query => query.get("sl") === "auto"));
});

test("source overrides and new language tags are passed through without script guesses", async () => {
	const queries = [];
	const translate = service({ fetchImpl: async url => { queries.push(new URL(url).searchParams); return publicResponse("Research assistance", "mr"); } });
	await translate({ text: "विद्यार्थ्यांसाठी संशोधन सहाय्य", targetLanguage: "fr", sourceLanguage: "mr" });
	await translate({ text: title, targetLanguage: "zh-Hant" });
	assert.equal(queries[0].get("sl"), "mr");
	assert.equal(queries[0].get("tl"), "fr");
	assert.equal(queries[1].get("tl"), "zh-hant");
});

test("Google Cloud uses plain text, server credentials and provider auto-detection", async () => {
	let called;
	const translate = service({ provider: "google-cloud", apiKey: "test-secret", fetchImpl: async (url, options) => {
		called = { url: new URL(url), ...options };
		return { ok: true, json: async () => ({ data: { translations: [{ translatedText: "Students&#39; aid &amp; research &lt;2026&gt;", detectedSourceLanguage: "te" }] } }) };
	} });
	const result = await translate({ text: title, targetLanguage: "en" });
	assert.equal(called.url.origin, "https://translation.googleapis.com");
	assert.equal(called.url.searchParams.get("key"), "test-secret");
	assert.deepEqual(JSON.parse(called.body), { q: title, target: "en", format: "text" });
	assert.equal(result.translatedText, "Students' aid & research <2026>");
	assert.equal(result.sourceLanguage, "te");
	assert.equal(JSON.stringify(result).includes("test-secret"), false);
});

test("Google Cloud failures never silently fall back to another provider", async () => {
	let count = 0;
	const translate = service({ provider: "google-cloud", apiKey: "test", fetchImpl: async url => {
		count++; assert.equal(new URL(url).hostname, "translation.googleapis.com"); return { ok: false, status: 403 };
	} });
	await assert.rejects(translate({ text: title, targetLanguage: "en" }), { code: "TRANSLATION_UNAVAILABLE" });
	assert.equal(count, 1);
});

test("translations join all sentence segments and distinguish unchanged proper names", async () => {
	const translate = service({ fetchImpl: async () => ({ ok: true, json: async () => [[["One. ", ""], ["Two.", ""]], null, "te"] }) });
	assert.equal((await translate({ text: title, targetLanguage: "en" })).translatedText, "One. Two.");
	const unchanged = service({ fetchImpl: async () => publicResponse(title) });
	assert.equal((await unchanged({ text: title, targetLanguage: "en" })).status, "unchanged");
	const same = service({ fetchImpl: async () => publicResponse(title, "te") });
	assert.equal((await same({ text: title, targetLanguage: "te" })).status, "same-language");
});

test("concurrent requests share one successful result; exact title and language changes invalidate it", async () => {
	let count = 0;
	const translate = service({ fetchImpl: async () => { count++; return publicResponse(); } });
	const input = { text: title, targetLanguage: "en" };
	const results = await Promise.all([translate(input), translate(input), translate(input)]);
	assert.equal(count, 1); assert.deepEqual(results[0], results[2]);
	await translate(input); assert.equal(count, 1);
	await translate({ ...input, text: `${title} updated` });
	await translate({ ...input, targetLanguage: "hi" });
	await translate({ ...input, sourceLanguage: "te" });
	assert.equal(count, 4);
});

test("cache expires and evicts least recently used entries", async () => {
	let now = 0, count = 0;
	const translate = service({ maxEntries: 2, ttlMs: 10, now: () => now, fetchImpl: async () => { count++; return publicResponse(); } });
	const run = text => translate({ text, targetLanguage: "en" });
	await run("a"); await run("b"); await run("a"); await run("c"); await run("b");
	assert.equal(count, 4);
	now = 11; await run("b"); assert.equal(count, 5);
});

test("malformed responses fail explicitly and are never cached as the original title", async () => {
	let count = 0;
	const translate = service({ fetchImpl: async () => ++count === 1 ? { ok: true, json: async () => [[], null, "te"] } : publicResponse() });
	const input = { text: title, targetLanguage: "en" };
	await assert.rejects(translate(input), { code: "INVALID_TRANSLATION" });
	assert.equal((await translate(input)).status, "translated"); assert.equal(count, 2);
});

test("upstream throttling and outages get one bounded retry", async () => {
	for (const status of [429, 502]) {
		let count = 0;
		const translate = service({ fetchImpl: async () => ++count === 1 ? { ok: false, status } : publicResponse() });
		assert.equal((await translate({ text: title, targetLanguage: "en" })).status, "translated");
		assert.equal(count, 2);
	}
});

test("timeouts terminate both attempts and a later manual retry can succeed", async () => {
	let count = 0;
	const translate = service({ timeoutMs: 5, fetchImpl: async (_url, { signal }) => {
		if (++count > 2) return publicResponse();
		return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
	} });
	const input = { text: title, targetLanguage: "en" };
	await assert.rejects(translate(input), { code: "TRANSLATION_TIMEOUT" });
	assert.equal(count, 2);
	assert.equal((await translate(input)).status, "translated");
});

test("unsupported languages, disabled service and invalid input do not fall back to canned output", async () => {
	let count = 0;
	const translate = service({ fetchImpl: async () => { count++; return { ok: false, status: 400 }; } });
	await assert.rejects(translate({ text: title, targetLanguage: "zzz" }), { code: "UNSUPPORTED_LANGUAGE" });
	assert.equal(count, 1);
	await assert.rejects(translate({ text: title, targetLanguage: "https://example.com" }), { code: "INVALID_REQUEST" });
	await assert.rejects(translate({ text: "x".repeat(1501), targetLanguage: "en" }), { code: "INVALID_REQUEST" });
	await assert.rejects(service({ provider: "disabled" })({ text: title, targetLanguage: "en" }), { code: "TRANSLATION_DISABLED" });
	await assert.rejects(service({ provider: "google-cloud", apiKey: "" })({ text: title, targetLanguage: "en" }), { code: "TRANSLATION_CONFIGURATION" });
});

test("concurrency limit protects upstream calls but allows an existing in-flight request", async () => {
	let release;
	const translate = service({ maxPending: 1, fetchImpl: () => new Promise(resolve => { release = () => resolve(publicResponse()); }) });
	const first = translate({ text: title, targetLanguage: "en" });
	const same = translate({ text: title, targetLanguage: "en" });
	await assert.rejects(translate({ text: "Different title", targetLanguage: "en" }), { code: "TRANSLATION_BUSY" });
	release(); await Promise.all([first, same]);
});

async function runController(controller, body, id = "public-scheme") {
	let status = 200, output;
	const res = { status(code) { status = code; return this; }, setHeader() {}, json(value) { output = value; return this; } };
	await controller({ body, params: { id } }, res);
	return { status, output };
}

test("API accepts only languages; public title is loaded from the database", async () => {
	let received;
	const controller = createTranslationController({ loadScholarship: async () => ({ title }), translate: async input => { received = input; return { translatedText: "Test" }; } });
	assert.equal((await runController(controller, { targetLanguage: "en" })).status, 200);
	assert.deepEqual(received, { text: title, targetLanguage: "en", sourceLanguage: "auto" });
	for (const body of [{ targetLanguage: "en", title: "Private text" }, { targetLanguage: "en", profile: { name: "Student" } }, { targetLanguage: ["en"] }, {}]) {
		assert.equal((await runController(controller, body)).status, 400);
	}
});

test("API reads only published scholarship titles by slug or ID", async t => {
	const queries = [];
	t.mock.method(Scholarship, "findOne", query => { queries.push(query); return { select(fields) { assert.equal(fields, "title"); return { lean: async () => ({ title }) }; } }; });
	const controller = createTranslationController({ translate: async () => ({ translatedText: "Test" }) });
	await runController(controller, { targetLanguage: "en" });
	await runController(controller, { targetLanguage: "en" }, "507f1f77bcf86cd799439011");
	assert.deepEqual(queries, [{ slug: "public-scheme", "publication.state": "published" }, { _id: "507f1f77bcf86cd799439011", "publication.state": "published" }]);
});

test("API distinguishes missing records and sanitized provider errors", async () => {
	const absent = createTranslationController({ loadScholarship: async () => null });
	assert.equal((await runController(absent, { targetLanguage: "en" })).status, 404);
	const failed = createTranslationController({ loadScholarship: async () => ({ title }), translate: async () => { throw new Error("secret url and credentials"); } });
	const result = await runController(failed, { targetLanguage: "en" });
	assert.equal(result.status, 503); assert.equal(JSON.stringify(result).includes("secret"), false);
	const unsupported = createTranslationController({ loadScholarship: async () => ({ title }), translate: async () => { throw new TranslationError("UNSUPPORTED_LANGUAGE", "Choose another language", 400); } });
	assert.equal((await runController(unsupported, { targetLanguage: "zzz" })).status, 400);
});
