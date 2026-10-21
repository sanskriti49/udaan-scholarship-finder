import { test, expect } from "@playwright/test";
test.setTimeout(30000);

const title = "కొత్త విద్యార్థుల పరిశోధన సహాయం 2026";
const scholarship = { _id: "translation-fixture", slug: "translation-fixture", title, organization: "Example department", category: "Merit based", level: "UG", state: "All India", status: "open",
	description: "Synthetic scholarship description.", amount: { value: 24000, period: "yearly" }, deadline: "2030-10-31", sourceUrl: "https://example.gov.in/scheme", applicationLink: "https://example.gov.in/apply", rules: [], requiredDocuments: [] };

async function fixture(page, { record = scholarship, handler } = {}) {
	const calls = [], errors = [];
	page.on("pageerror", error => errors.push(error.message));
	await page.route("**/api/**", async route => {
		const url = new URL(route.request().url());
		if (url.pathname.endsWith("/translate")) {
			const payload = route.request().postDataJSON();
			calls.push(payload);
			if (handler) return handler(route, payload, calls.length);
			return route.fulfill({ json: { success: true, data: { originalText: record.title, translatedText: "New student research assistance 2026", sourceLanguage: "te", targetLanguage: payload.targetLanguage, status: "translated", provider: "google-public" } } });
		}
		if (/\/(evidence|history|suggestions)$/.test(url.pathname)) return route.fulfill({ json: { success: true, data: [] } });
		return route.fulfill({ json: { success: true, data: [record], count: 1, total: 1 } });
	});
	await page.goto("/scholarships");
	await expect(page.getByRole("button", { name: record.title, exact: true }).first()).toBeVisible();
	return { calls, errors };
}

test("any unseen title translates on demand; original and cache survive card-to-modal navigation", async ({ page }) => {
	const { calls, errors } = await fixture(page);
	expect(calls).toEqual([]);
	await page.getByRole("button", { name: "Translate title", exact: true }).first().click();
	const cardPanel = page.getByRole("region", { name: "Title translation" });
	await expect(cardPanel.getByText("New student research assistance 2026", { exact: true })).toBeVisible();
	await expect(cardPanel.getByText("Machine translation · English")).toBeVisible();
	await expect(cardPanel.getByText(/Detected: Telugu/)).toBeVisible();
	expect(calls).toEqual([{ targetLanguage: "en", sourceLanguage: "auto" }]);
	await page.getByRole("button", { name: title, exact: true }).first().click();
	const dialog = page.getByRole("dialog", { name: title, exact: true });
	await expect(dialog.getByRole("heading", { name: title, exact: true })).toBeVisible();
	await dialog.getByRole("button", { name: "Translate title", exact: true }).click();
	await expect(dialog.getByText("New student research assistance 2026", { exact: true })).toBeVisible();
	expect(calls).toHaveLength(1);
	await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
	await expect(dialog.getByText("Synthetic scholarship description.")).toBeVisible();
	expect(errors).toEqual([]);
});

test("unknown Romanized names and English titles keep translation available, including RTL output", async ({ page }) => {
	const romanized = { ...scholarship, title: "A new regional Romanized scholarship" };
	const { calls } = await fixture(page, { record: romanized, handler: async (route, payload) => route.fulfill({ json: { success: true, data: {
		originalText: romanized.title, translatedText: payload.targetLanguage === "ur" ? "طلبہ کی تحقیقی امداد" : romanized.title,
		sourceLanguage: "en", targetLanguage: payload.targetLanguage, status: payload.targetLanguage === "en" ? "same-language" : "translated",
	} } }) });
	await page.getByRole("button", { name: "Translate title", exact: true }).first().click();
	const panel = page.getByRole("region", { name: "Title translation" });
	await expect(panel.getByText("Already in English")).toBeVisible();
	await panel.getByLabel("Read in", { exact: true }).selectOption("ur");
	await expect(panel.locator('[lang="ur"][dir="auto"]')).toHaveText("طلبہ کی تحقیقی امداد");
	expect(calls[1]).toEqual({ targetLanguage: "ur", sourceLanguage: "auto" });
});

test("provider errors allow retry and an external fallback without displaying a fake meaning", async ({ page }) => {
	const { calls } = await fixture(page, { handler: async (route, payload, count) => {
		if (count === 1) return route.fulfill({ status: 503, json: { success: false, message: "Translation took too long. Please try again." } });
		return route.fulfill({ json: { success: true, data: { originalText: title, translatedText: "Research assistance", targetLanguage: payload.targetLanguage, sourceLanguage: "te", status: "translated" } } });
	} });
	await page.getByRole("button", { name: "Translate title", exact: true }).first().click();
	const panel = page.getByRole("region", { name: "Title translation" });
	await expect(panel.getByRole("alert")).toContainText("Translation took too long");
	await expect(panel.getByText(/Machine translation/)).toHaveCount(0);
	const fallback = new URL(await panel.getByRole("link", { name: "Open in Google Translate" }).getAttribute("href"));
	expect(fallback.searchParams.get("text")).toBe(title);
	await panel.getByRole("button", { name: "Try again", exact: true }).click();
	await expect(panel.getByText("Research assistance", { exact: true })).toBeVisible();
	expect(calls).toHaveLength(2);
});

test("switching languages cancels old results and manual source selection fixes ambiguous detection", async ({ page }) => {
	const { calls } = await fixture(page, { handler: async (route, payload) => {
		if (payload.targetLanguage === "hi") await new Promise(resolve => setTimeout(resolve, 350));
		await route.fulfill({ json: { success: true, data: { originalText: title,
			translatedText: payload.targetLanguage === "ml" ? "വിദ്യാർത്ഥി ഗവേഷണ സഹായം" : payload.targetLanguage === "hi" ? "Stale Hindi result" : "English title",
			targetLanguage: payload.targetLanguage, sourceLanguage: payload.sourceLanguage === "auto" ? "hi" : payload.sourceLanguage, status: "translated",
		} } }).catch(() => {});
	} });
	await page.getByRole("button", { name: "Translate title", exact: true }).first().click();
	const panel = page.getByRole("region", { name: "Title translation" });
	await expect(panel.getByText("English title", { exact: true })).toBeVisible();
	await panel.getByLabel("Read in", { exact: true }).selectOption("hi");
	await expect.poll(() => calls.length).toBe(2);
	await panel.getByLabel("Read in", { exact: true }).selectOption("ml");
	await expect(panel.getByText("വിദ്യാർത്ഥി ഗവേഷണ സഹായം", { exact: true })).toBeVisible();
	await panel.getByText("Choose the source language", { exact: true }).click();
	await panel.getByLabel("Source language", { exact: true }).selectOption("mr");
	await expect(panel.getByText(/Source: Marathi/)).toBeVisible();
	expect(calls.at(-1)).toEqual({ targetLanguage: "ml", sourceLanguage: "mr" });
	await page.waitForTimeout(400);
	await expect(panel.getByText("Stale Hindi result", { exact: true })).toHaveCount(0);
});

for (const width of [390, 1440]) test(`translation stays scrollable and keyboard accessible at ${width}px`, async ({ page }, testInfo) => {
	await page.setViewportSize({ width, height: 780 });
	const { errors } = await fixture(page);
	await page.getByRole("button", { name: title, exact: true }).first().click();
	const dialog = page.getByRole("dialog", { name: title, exact: true });
	const trigger = dialog.getByRole("button", { name: "Translate title", exact: true });
	await trigger.focus(); await page.keyboard.press("Enter");
	const panel = dialog.getByRole("region", { name: "Title translation" });
	await expect(panel.getByText("New student research assistance 2026", { exact: true })).toBeVisible();
	await panel.getByText("Choose the source language", { exact: true }).click();
	await expect(dialog.getByRole("link", { name: /Apply on official site/ })).toBeVisible();
	expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth && element.querySelector(".sch-modal-body").scrollWidth <= element.querySelector(".sch-modal-body").clientWidth)).toBe(true);
	await dialog.screenshot({ path: testInfo.outputPath(`translation-${width}.png`) });
	await trigger.click(); await expect(panel).toHaveCount(0);
	await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
	expect(errors).toEqual([]);
});

test("HTML-like translation output is rendered as text and unchanged names are explained", async ({ page }) => {
	await fixture(page, { handler: async (route, payload) => route.fulfill({ json: { success: true, data: { originalText: title,
		translatedText: payload.targetLanguage === "hi" ? title : '<script>window.translationInjected = true</script>', targetLanguage: payload.targetLanguage,
		sourceLanguage: "te", status: payload.targetLanguage === "hi" ? "unchanged" : "translated",
	} } }) });
	await page.getByRole("button", { name: "Translate title", exact: true }).first().click();
	const panel = page.getByRole("region", { name: "Title translation" });
	await expect(panel.getByText('<script>window.translationInjected = true</script>', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.translationInjected)).toBeUndefined();
	await panel.getByLabel("Read in", { exact: true }).selectOption("hi");
	await expect(panel.getByText(/Proper names may stay unchanged/)).toBeVisible();
});

test("network failures keep the source visible and offer an understandable recovery", async ({ page }) => {
	await fixture(page, { handler: route => route.abort("failed") });
	await page.getByRole("button", { name: "Translate title", exact: true }).first().click();
	const panel = page.getByRole("region", { name: "Title translation" });
	await expect(panel.getByRole("alert")).toContainText("Check your connection and try again");
	await expect(page.getByRole("button", { name: title, exact: true }).first()).toBeVisible();
	await expect(panel.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
});
