import { test, expect } from "@playwright/test";
import { evaluateEligibility } from "../../../backend/src/engine/ruleEvaluator.js";

const leaf = (id, field, operator, targetValue) => ({ type: "CONDITION", id, field, operator, targetValue });
const scholarship = {
	_id: "policy-fixture", title: "Synthetic course-specific scholarship", state: "All India", level: "UG", status: "open",
	sourceUrl: "https://example.gov.in/rules", requiredDocuments: [],
	ruleTree: { type: "OR", children: [
		{ type: "AND", children: [leaf("eng", "stream", "EQ", "Engineering"), leaf("eng_marks", "percentage", "GTE", 75)] },
		{ type: "AND", children: [leaf("arts", "stream", "EQ", "Humanities"), leaf("arts_marks", "percentage", "GTE", 65)] },
	] },
};

for (const width of [390, 1440]) test(`branch-aware eligibility and grouped rules work at ${width}px`, async ({ page }, testInfo) => {
	const errors = [], submissions = [];
	page.on("pageerror", error => errors.push(error.message));
	await page.setViewportSize({ width, height: 950 });
	await page.route("**/api/**", async route => {
		const url = new URL(route.request().url());
		if (url.pathname.endsWith("/evaluate")) {
			const profile = route.request().postDataJSON(); submissions.push(profile);
			const evaluation = evaluateEligibility(profile, scholarship);
			const data = { matched: [], ineligible: [], missingProfileData: [] };
			data[evaluation.status === "passed" ? "matched" : evaluation.status === "failed" ? "ineligible" : "missingProfileData"].push({ ...scholarship, evaluation });
			return route.fulfill({ json: { success: true, summary: { totalEvaluated: 1, eligibleCount: data.matched.length, ineligibleCount: data.ineligible.length, missingInfoCount: data.missingProfileData.length }, data } });
		}
		if (url.pathname.endsWith("/evidence")) return route.fulfill({ json: { success: true, data: [] } });
		return route.fulfill({ json: { success: true, data: [] } });
	});
	await page.goto("/eligibility");
	await page.getByRole("button", { name: "Undergraduate", exact: true }).click();
	await page.getByRole("button", { name: "Humanities", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Female", exact: true }).click();
	await page.getByRole("button", { name: "General", exact: true }).click();
	await page.getByRole("button", { name: "National schemes only", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("spinbutton", { name: "Latest marks percentage (out of 100), exact value" }).fill("70");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Check my eligibility", exact: true }).click();
	await expect(page.getByRole("button", { name: "Why am I eligible?", exact: true })).toBeVisible();
	expect(submissions[0]).toMatchObject({ courseStream: "Humanities", percentage: 70, cgpa: null });
	await page.getByRole("button", { name: "Why am I eligible?", exact: true }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByRole("tab", { name: "Eligibility", exact: true })).toHaveAttribute("aria-selected", "true");
	await expect(dialog.getByText("Meet at least one of these routes", { exact: true })).toBeVisible();
	await expect(dialog.getByText("One complete route is enough. Other routes can remain incomplete.", { exact: true })).toBeVisible();
	await expect(dialog.getByText("Academic Score: Minimum 65% marks", { exact: true })).toBeVisible();
	await expect(dialog.getByText("Academic Score: Minimum 75% marks", { exact: true })).toBeVisible();
	await expect(dialog.locator("blockquote")).toHaveCount(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
	await dialog.getByText("Academic Score: Minimum 65% marks", { exact: true }).scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath(`policy-${width}.png`), fullPage: true });
	await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
	expect(errors).toEqual([]);
});
