import { test } from "node:test";
import assert from "node:assert/strict";
import { createTitleTranslator, SUPPORTED_LANGUAGES, getLanguageName, getTranslationLink, getTranslationErrorMessage } from "../src/utils/translator.js";
import { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_DOMICILES, findDomicile } from "../src/utils/indianStates.js";

test("indianStates: contains exactly 28 states and 8 union territories", () => {
	assert.equal(INDIAN_STATES.length, 28); assert.equal(UNION_TERRITORIES.length, 8); assert.equal(ALL_INDIAN_DOMICILES.length, 37);
});
test("indianStates: findDomicile resolves state names, codes, and aliases", () => {
	assert.equal(findDomicile("AP").value, "Andhra Pradesh"); assert.equal(findDomicile("Telangana").code, "TS");
	assert.equal(findDomicile("Delhi NCR").value, "Delhi"); assert.equal(findDomicile("Orissa").value, "Odisha"); assert.equal(findDomicile("National").value, "All India");
});

const title = "కొత్త విద్యార్థుల పరిశోధన సహాయం 2026";
const input = { scholarshipId: "public-scheme", title, targetLanguage: "en" };
const result = (overrides = {}) => ({ originalText: title, translatedText: "New student research assistance 2026", targetLanguage: "en", sourceLanguage: "te", status: "translated", ...overrides });

test("language names come from Intl metadata; no provider language is inferred from a scheme name", () => {
	assert.ok(SUPPORTED_LANGUAGES.some(language => language.code === "ml"));
	assert.equal(getLanguageName("mr"), "Marathi"); assert.equal(getLanguageName(null), "Not detected");
	assert.equal(getLanguageName("not a tag"), "not a tag");
});

test("unseen and Romanized titles always call the provider; only languages and ID leave the client", async () => {
	let received;
	const translate = createTitleTranslator(async payload => { received = payload; return result(); });
	assert.equal((await translate(input)).sourceLanguage, "te");
	assert.deepEqual(received, { scholarshipId: "public-scheme", targetLanguage: "en", sourceLanguage: "auto" });
	const otherTitle = "A brand new Romanized title";
	const other = createTitleTranslator(async () => result({ originalText: otherTitle }));
	assert.equal((await other({ ...input, title: otherTitle })).status, "translated");
});

test("concurrent consumers and repeat translations share one request", async () => {
	let count = 0;
	const translate = createTitleTranslator(async () => { count++; return result(); });
	await Promise.all([translate(input), translate(input), translate(input)]);
	await translate(input); assert.equal(count, 1);
});

test("failed or stale responses do not become cached fake translations", async () => {
	for (const failure of [null, result({ originalText: "Old source title" }), result({ translatedText: "" }), result({ targetLanguage: "hi" }), result({ status: "unknown" })]) {
		let count = 0;
		const translate = createTitleTranslator(async () => ++count === 1 ? failure : result());
		await assert.rejects(translate(input));
		assert.equal((await translate(input)).status, "translated"); assert.equal(count, 2);
	}
});

test("transport failures can be retried without refreshing the page", async () => {
	let count = 0;
	const translate = createTitleTranslator(async () => { if (++count === 1) throw new Error("offline"); return result(); });
	await assert.rejects(translate(input), /offline/);
	await translate(input); assert.equal(count, 2);
});

test("exact source text, source override and target each participate in the cache key", async () => {
	let count = 0, next = result();
	const translate = createTitleTranslator(async () => { count++; return next; });
	await translate(input);
	next = result({ originalText: `${title} updated` }); await translate({ ...input, title: next.originalText });
	next = result(); await translate({ ...input, sourceLanguage: "te" });
	next = result({ targetLanguage: "hi" }); await translate({ ...input, targetLanguage: "hi" });
	assert.equal(count, 4);
});

test("cache is bounded and expires", async () => {
	let now = 0, count = 0;
	const translate = createTitleTranslator(async () => { count++; return result(); }, { maxEntries: 1, ttlMs: 10, now: () => now });
	await translate(input); await translate({ ...input, scholarshipId: "other" }); await translate(input);
	assert.equal(count, 3); now = 11; await translate(input); assert.equal(count, 4);
});

test("aborting one subscriber preserves another subscriber's translation", async () => {
	let release, transportSignal;
	const translate = createTitleTranslator((_payload, signal) => { transportSignal = signal; return new Promise(resolve => { release = () => resolve(result()); }); });
	const controller = new AbortController();
	const first = translate({ ...input, signal: controller.signal });
	const second = translate(input);
	await Promise.resolve(); controller.abort();
	await assert.rejects(first, { name: "AbortError" }); assert.equal(transportSignal.aborted, false);
	release(); assert.equal((await second).status, "translated");
});

test("aborting all consumers cancels upstream and allows an immediate fresh request", async () => {
	let count = 0, transportSignal, release;
	const translate = createTitleTranslator((_payload, signal) => {
		count++; if (count > 1) return result();
		transportSignal = signal; return new Promise(resolve => { release = () => resolve(result()); });
	});
	const controller = new AbortController();
	const first = translate({ ...input, signal: controller.signal });
	await Promise.resolve(); controller.abort(); await assert.rejects(first, { name: "AbortError" });
	assert.equal(transportSignal.aborted, true);
	await translate(input); assert.equal(count, 2);
	release(); await Promise.resolve();
	await translate(input); assert.equal(count, 2);
});

test("an already aborted request performs no translation", async () => {
	let called = false;
	const controller = new AbortController(); controller.abort();
	await assert.rejects(createTitleTranslator(async () => { called = true; })({ ...input, signal: controller.signal }), { name: "AbortError" });
	assert.equal(called, false);
});

test("external fallback safely encodes arbitrary titles and selected languages", () => {
	const text = "தமிழ் & Urdu? #2026";
	const url = new URL(getTranslationLink(text, "ml", "auto"));
	assert.equal(url.origin, "https://translate.google.com"); assert.equal(url.searchParams.get("text"), text);
	assert.equal(url.searchParams.get("tl"), "ml"); assert.equal(url.searchParams.get("sl"), "auto");
});

test("network and timeout errors have useful recovery messages", () => {
	assert.match(getTranslationErrorMessage({ code: "ERR_NETWORK", message: "Network Error" }), /Check your connection/);
	assert.match(getTranslationErrorMessage({ code: "ECONNABORTED", message: "timeout of 12000ms exceeded" }), /took too long/);
	assert.equal(getTranslationErrorMessage({ response: { data: { message: "Please try another language" } } }), "Please try another language");
	assert.match(getTranslationErrorMessage(null), /unavailable/);
});
