import { test, expect } from "@playwright/test";
import { rankDiscovery } from "../../../backend/src/engine/discoveryRanking.js";
import { scholarships, student, now } from "../../../backend/test/fixtures/discovery.js";

for (const width of [390, 1440]) test(`discovery explains compatibility and preserves browsing, filters and pages at ${width}px`, async ({ page }, testInfo) => {
	await page.setViewportSize({ width, height: 900 });
	await page.addInitScript(() => {
		localStorage.setItem("token", "fixture-token");
		localStorage.setItem("user", JSON.stringify({ _id: "fixture-user", name: "Example Student", role: "student" }));
	});
	const catalogueRequests = [];
	const errors = []; page.on("pageerror", error => errors.push(error.message));
	await page.route("**/api/**", async route => {
		const request = route.request(), url = new URL(request.url());
		if (/\/scholarships(\/discover)?$/.test(url.pathname)) {
			catalogueRequests.push({ method: request.method(), search: url.search, body: request.postDataJSON() });
			const personalized = request.method() === "POST";
			const filters = Object.fromEntries(url.searchParams);
			const filtered = scholarships.filter(item => !filters.search || item.title.toLowerCase().includes(filters.search.toLowerCase()));
			const ranked = rankDiscovery(filtered, { ...filters, profile: personalized ? student : {}, page: Number(filters.page || 1), limit: 2, now });
			return route.fulfill({ json: { success: true, ...ranked, count: ranked.data.length, recentUpdatesCount: 0 } });
		}
		return route.fulfill({ json: { success: true, data: [], unreadCount: 0, count: 0 } });
	});
	await page.goto("/scholarships?status=all");
	const cards = page.locator("article.sk-card");
	await expect(cards).toHaveCount(2);
	await expect(cards.first()).toContainText("Engineering Merit UP");
	await expect(cards.first()).toContainText("Potentially eligible");
	await expect(cards.first()).toContainText("Matches your recorded domicile, education level, course.");
	await expect(cards.first()).toContainText("not official confirmation");
	await expect(page.getByText("Page 1 of 3")).toBeVisible();
	await page.getByRole("button", { name: "Next page", exact: true }).click();
	await expect(page.getByText("Page 2 of 3")).toBeVisible();
	await expect(cards.first()).toContainText("Needs verification");
	await expect(cards.first()).toContainText("Application dates need verification");
	await expect(cards.nth(1)).toContainText("Known mismatch");
	await expect(cards.nth(1)).toContainText("domicile does not meet");
	await cards.nth(1).screenshot({ path: testInfo.outputPath(`mismatch-${width}.png`) });
	await page.getByRole("checkbox", { name: "Use my saved eligibility profile" }).uncheck();
	await expect(page.getByText("Page 1 of 3")).toBeVisible();
	await expect(cards.first()).toContainText("Engineering Merit Maharashtra");
	await expect(cards.first()).toContainText("Needs verification");
	await page.getByRole("combobox").last().selectOption("amount_high");
	await expect.poll(() => catalogueRequests.at(-1)?.search).toContain("sort=amount_high");
	expect(catalogueRequests.some(request => request.method === "POST" && JSON.stringify(request.body) === "{}")).toBe(true);
	expect(catalogueRequests.at(-1).method).toBe("GET");
	expect(catalogueRequests.every(request => !/income|casteCategory|familyIncome/.test(request.search))).toBe(true);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	expect(errors).toEqual([]);
});

test("candidate limit explains how to recover without implying a connection failure", async ({ page }) => {
	await page.route("**/api/**", route => {
		const path = new URL(route.request().url()).pathname;
		return path.endsWith("/scholarships")
			? route.fulfill({ status: 503, json: { success: false, code: "DISCOVERY_CANDIDATE_LIMIT" } })
			: route.fulfill({ json: { success: true, data: [], count: 0 } });
	});
	await page.goto("/scholarships");
	await expect(page.getByRole("heading", { name: "Too many schemes to rank safely. Narrow your search or filters." })).toBeVisible();
	await expect(page.getByText("The scholarship service couldn't be reached right now.")).toHaveCount(0);
});
