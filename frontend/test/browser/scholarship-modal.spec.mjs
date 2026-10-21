import { test, expect } from "@playwright/test";
test.setTimeout(30000);

const scholarship = {
	_id: "modal-fixture", slug: "modal-fixture", title: "Example higher education scholarship", organization: "Example Education Department",
	description: "A synthetic scholarship used to verify the scholarship dialog. It supports students continuing their education.",
	category: "Merit based", level: "UG", state: "All India", status: "open", deadline: "2030-10-31T18:29:59.999Z",
	amount: { value: 24000, period: "yearly" }, applicationLink: "https://example.gov.in/apply", sourceUrl: "https://example.gov.in/scheme",
	rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000 }],
	requiredDocuments: [{ code: "INCOME_CERT", name: "Income certificate", mandatory: true }],
};
const excerpt = "Synthetic revised circular: annual family income must not exceed Rs. 300000.";
const version = {
	_id: "amendment", observedAt: "2026-10-20T10:00:00.000Z", changeType: "INCOME_CEILING_CHANGE", semanticCategory: "RELAXATION",
	summary: "Annual income ceiling raised from ₹2.5 lakh to ₹3 lakh.",
	deltas: [{ field: "eligibility.familyIncome", oldValue: { max: 250000, operator: "LTE" }, newValue: { max: 300000, operator: "LTE" } }],
	evidence: [{ quote: excerpt, url: "https://example.gov.in/revised.pdf", page: 2 }],
};

async function fixture(page, options = {}) {
	const requests = { history: 0, replay: [] };
	const record = { ...scholarship, ...options.scholarship };
	await page.route("**/api/**", async route => {
		const request = route.request(), url = new URL(request.url());
		if (url.pathname.endsWith("/history")) {
			requests.history++;
			if (options.failOnce && requests.history === 1) return route.fulfill({ status: 503, json: { success: false } });
			return route.fulfill({ json: { success: true, data: options.history ?? [version] } });
		}
		if (url.pathname.endsWith("/replay")) {
			requests.replay.push({ body: request.postDataJSON(), authorization: request.headers().authorization });
			return route.fulfill({ json: { success: true, historical: { status: "failed" }, current: { status: "passed" } } });
		}
		if (url.pathname.endsWith("/evidence")) return route.fulfill({ json: { success: true, data: [] } });
		if (url.pathname.endsWith("/suggestions")) return route.fulfill({ json: { success: true, data: [] } });
		return route.fulfill({ json: { success: true, data: [record], count: 1, total: 1 } });
	});
	await page.goto("/scholarships");
	const opener = page.getByRole("button", { name: record.title, exact: true }).first();
	await opener.click();
	return { requests, opener, dialog: page.getByRole("dialog", { name: record.title, exact: true }) };
}

for (const width of [390, 1440]) test(`one centered dialog exposes policy changes at ${width}px`, async ({ page }, testInfo) => {
	const errors = []; page.on("pageerror", error => errors.push(error.message));
	await page.setViewportSize({ width, height: 900 });
	const { requests, opener, dialog } = await fixture(page);
	await expect(page.getByRole("dialog")).toHaveCount(1);
	await expect(dialog.getByRole("tab")).toHaveCount(4);
	await expect(dialog.locator(".sch-notes-doodle")).toBeVisible();
	await expect(dialog.locator(".sch-notes-doodle")).toHaveAttribute("aria-hidden", "true");
	await expect(dialog.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
	await expect(dialog.getByRole("link", { name: /Apply on official site/ })).toHaveCount(1);
	await expect(dialog.getByText("Your preparation checklist", { exact: true })).toHaveCount(0);
	expect(requests.history).toBe(0);
	await expect.poll(async () => {
		const bounds = await dialog.boundingBox();
		return Math.max(Math.abs(bounds.x - (width - bounds.x - bounds.width)), Math.abs(bounds.y - (900 - bounds.y - bounds.height)));
	}).toBeLessThan(2);
	await dialog.screenshot({ path: testInfo.outputPath(`overview-${width}.png`) });
	for (const [tab, heading] of [["Eligibility", "Who can apply"], ["Documents", "Documents to prepare"]]) {
		await dialog.getByRole("tab", { name: tab, exact: true }).click();
		await expect(dialog.getByRole("heading", { name: heading, exact: true })).toBeVisible();
		await expect(dialog.getByRole("link", { name: /Apply on official site/ })).toBeInViewport();
		await dialog.screenshot({ path: testInfo.outputPath(`${tab.toLowerCase()}-${width}.png`) });
	}
	await dialog.getByRole("tab", { name: "Changes", exact: true }).click();
	await expect(dialog.getByRole("heading", { name: "What changed" })).toBeVisible();
	await expect(dialog.getByText("Up to ₹2,50,000 / year", { exact: true })).toBeVisible();
	await expect(dialog.getByText("Up to ₹3,00,000 / year", { exact: true })).toBeVisible();
	await expect(dialog.locator("del")).toContainText("2,50,000");
	await expect(dialog.locator("ins")).toContainText("3,00,000");
	await dialog.getByText("Source excerpts for this update", { exact: false }).click();
	await expect(dialog.getByText(excerpt, { exact: true })).toBeVisible();
	await expect(dialog.getByRole("link", { name: "Open source" })).toHaveAttribute("href", version.evidence[0].url);
	await expect(dialog.getByText(/Stored excerpt · Not verified/)).toBeVisible();
	await dialog.screenshot({ path: testInfo.outputPath(`changes-${width}.png`) });
	const fits = await dialog.evaluate(element => element.scrollWidth <= element.clientWidth && element.querySelector('.sch-modal-body').scrollWidth <= element.querySelector('.sch-modal-body').clientWidth);
	expect(fits).toBe(true);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(opener).toBeFocused();
	expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
	expect(errors).toEqual([]);
});

test("empty, first-observation and unavailable histories have distinct honest states", async ({ page }) => {
	const first = await fixture(page, { history: [] });
	await first.dialog.getByRole("tab", { name: "Changes" }).click();
	await expect(first.dialog.getByRole("heading", { name: "No recorded changes yet" })).toBeVisible();
	await expect(first.dialog.getByText(/does not mean the provider has never changed/)).toBeVisible();
	await page.unroute("**/api/**");
	const baseline = await fixture(page, { history: [{ ...version, changeType: "FIRST_OBSERVED", deltas: [], evidence: [] }] });
	await baseline.dialog.getByRole("tab", { name: "Changes" }).click();
	await expect(baseline.dialog.getByText(/An earlier policy was not recorded/)).toBeVisible();
	await expect(baseline.dialog.locator("del, ins")).toHaveCount(0);
});

test("history failures offer a retry instead of pretending no policies changed", async ({ page }) => {
	const { dialog } = await fixture(page, { failOnce: true });
	await dialog.getByRole("tab", { name: "Changes" }).click();
	await expect(dialog.getByRole("alert")).toContainText("couldn't load the change history");
	await expect(dialog.getByRole("heading", { name: "No recorded changes yet" })).toHaveCount(0);
	await dialog.getByRole("button", { name: "Try again" }).click();
	await expect(dialog.getByText("Up to ₹3,00,000 / year", { exact: true })).toBeVisible();
});

test("keyboard tabs, sign-in overlay, backdrop and focus restoration remain usable", async ({ page }) => {
	const { dialog, opener } = await fixture(page);
	await dialog.getByRole("tab", { name: "Overview" }).focus();
	await page.keyboard.press("ArrowRight");
	await expect(dialog.getByRole("tab", { name: "Eligibility" })).toBeFocused();
	await expect(dialog.getByRole("tab", { name: "Eligibility" })).toHaveAttribute("aria-selected", "true");
	await page.keyboard.press("End");
	await expect(dialog.getByRole("tab", { name: "Changes" })).toBeFocused();
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Sign in to save scholarships" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Sign in to save scholarships" })).toHaveCount(0);
	await expect(dialog).toBeVisible();
	await dialog.getByRole("button", { name: "Close scholarship details" }).focus();
	await page.keyboard.press("Shift+Tab");
	await expect(dialog.getByRole("link", { name: /Apply on official site/ })).toBeFocused();
	await page.mouse.click(5, 5);
	await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
});

test("historical comparison uses the configured API and authentication, with no empty guest profile", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem("token", "synthetic-replay-token");
		localStorage.setItem("user", JSON.stringify({ _id: "synthetic-user", name: "Student", email: "test@example.invalid" }));
	});
	const { dialog, requests } = await fixture(page);
	await dialog.getByRole("tab", { name: "Changes" }).click();
	await dialog.getByRole("button", { name: "Compare my eligibility at this date" }).click();
	await expect(dialog.getByText("Meets recorded criteria", { exact: true })).toBeVisible();
	await expect(dialog.getByText("Does not meet recorded criteria", { exact: true })).toBeVisible();
	expect(requests.replay).toEqual([{ body: { targetDate: version.observedAt }, authorization: "Bearer synthetic-replay-token" }]);
});

test("calendar options stay inside the mobile dialog and Escape closes the menu first", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 900 });
	const { dialog } = await fixture(page);
	const calendar = dialog.getByRole("button", { name: "Add to Calendar", exact: true });
	await calendar.click();
	const menu = dialog.getByRole("menu");
	await expect(menu.getByRole("menuitem", { name: /Apple/ })).toBeVisible();
	const menuBox = await menu.boundingBox(), body = await dialog.getByRole("tabpanel").boundingBox();
	expect(menuBox.y).toBeGreaterThanOrEqual(body.y); expect(menuBox.x).toBeGreaterThanOrEqual(0);
	await page.keyboard.press("Escape");
	await expect(menu).toHaveCount(0); await expect(dialog).toBeVisible();
	await calendar.click();
	const download = page.waitForEvent("download");
	await menu.getByRole("menuitem", { name: /Apple/ }).click();
	expect((await download).suggestedFilename()).toMatch(/\.ics$/);
});

test("long policy names leave the reading area and application action accessible on short screens", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	const title = "Post-Matric Scholarship for Students with Disabilities Pursuing Higher Education — Department of Empowerment of Persons with Disabilities";
	const { dialog } = await fixture(page, { scholarship: { title } });
	await expect(dialog.getByRole("tab")).toHaveCount(4);
	const body = await dialog.getByRole("tabpanel").boundingBox();
	expect(body.height).toBeGreaterThan(100);
	const apply = dialog.getByRole("link", { name: /Apply on official site/ });
	await expect(apply).toBeInViewport();
	await dialog.getByText("Full scholarship name", { exact: true }).click();
	await expect(dialog.getByRole("tabpanel").getByText(title, { exact: true })).toBeVisible();
	expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("clipped titles can be read on every tab and adapt when the viewport expands", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	const title = "Scholarship for Women in Engineering and Mathematical Sciences Pursuing Undergraduate Studies";
	expect(title.length).toBeLessThan(120);
	const { dialog } = await fixture(page, { scholarship: { title } });
	await expect(dialog.getByText("Full scholarship name", { exact: true })).toBeVisible();
	await dialog.getByRole("tab", { name: "Eligibility", exact: true }).click();
	await dialog.getByText("Full scholarship name", { exact: true }).click();
	await expect(dialog.getByRole("tabpanel").getByText(title, { exact: true })).toBeVisible();
	await page.setViewportSize({ width: 1440, height: 900 });
	await expect(dialog.getByText("Full scholarship name", { exact: true })).toHaveCount(0);
});
