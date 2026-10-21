import { test, expect } from "@playwright/test";
test.setTimeout(30000);

const reported = [
	{ title: "Scholarship for Higher Education (SHE)", amount: { value: 80000, currency: "INR", period: "yearly", displayString: "₹80,000 per year" } },
	{ title: "ONGC Scholarship to Meritorious SC/ST Category students 2026-27 scheme", amount: { value: 48000, currency: "INR", period: "yearly", displayString: "₹48,000 per year" } },
	{ title: "Swami Vivekananda Merit-cum-Means Scholarship", amount: { value: null, currency: "INR", period: "monthly", displayString: "₹1,000–₹8,000 per month depending on course (see official rates)" } },
];
const quotation = "Synthetic stored quotation used to test exact source text preservation.";
const evidence = { quote: quotation, url: "https://example.gov.in/award.pdf", page: 2 };
const noop = amount => ({ _id: "noop", observedAt: "2026-10-21T13:20:45.232Z", changeType: "AWARD_UPDATE", summary: "Award amount updated.",
	deltas: [{ field: "amount", oldValue: { ...amount, months: null, options: [] }, newValue: amount }], evidence: [evidence, { ...evidence }] });

async function fixture(page, record, history) {
	const errors = []; page.on("pageerror", error => errors.push(error.message));
	const scholarship = { _id: "policy-diff-fixture", category: "Merit based", level: "UG", state: "All India", status: "open", organization: "Fixture department",
		deadline: "2030-10-31", description: "Synthetic listing for policy-history regressions.", applicationLink: "https://example.gov.in/apply", rules: [], requiredDocuments: [], hasChanges: true, latestChangeSummary: "Award amount updated.", ...record };
	await page.unroute("**/api/**");
	await page.route("**/api/**", async route => {
		const url = new URL(route.request().url());
		if (url.pathname.endsWith("/history")) return route.fulfill({ json: { success: true, data: history } });
		if (/\/(evidence|suggestions)$/.test(url.pathname)) return route.fulfill({ json: { success: true, data: [] } });
		return route.fulfill({ json: { success: true, data: [scholarship], count: 1, total: 1 } });
	});
	await page.goto("/scholarships");
	await page.getByRole("button", { name: scholarship.title, exact: true }).first().click();
	const dialog = page.getByRole("dialog", { name: scholarship.title, exact: true });
	await dialog.getByRole("tab", { name: "Changes", exact: true }).click();
	return { dialog, errors };
}

async function distinctRows(dialog) {
	for (const row of await dialog.locator(".sch-diff-row").all()) {
		const before = await row.locator(".sch-diff-before p").innerText(), after = await row.locator(".sch-diff-after p").innerText();
		expect(before.replace(/\s+/g, " ").trim()).not.toBe(after.replace(/\s+/g, " ").trim());
	}
}

for (const width of [390, 1440]) test(`reported identical awards become a quiet unchanged history at ${width}px`, async ({ page }, testInfo) => {
	await page.setViewportSize({ width, height: 900 });
	for (const [index, record] of reported.entries()) {
		const history = [0, 1, 2].map(number => ({ ...noop(record.amount), _id: `noop-${number}` }));
		history.push({ _id: "initial", changeType: "FIRST_OBSERVED", observedAt: "2026-10-11", summary: "First observed", deltas: [] });
		const { dialog, errors } = await fixture(page, record, history);
		await expect(dialog.getByRole("heading", { name: "No changed terms recorded", exact: true })).toBeVisible();
		await expect(dialog.locator("del, ins")).toHaveCount(0);
		await expect(dialog.getByText("Award amount updated.", { exact: true })).toHaveCount(0);
		await expect(dialog.getByRole("link", { name: /Add a profile to compare/ })).toHaveCount(0);
		await expect(dialog.getByText("3 unchanged records", { exact: true })).toBeVisible();
		if (index === 0) await dialog.screenshot({ path: testInfo.outputPath(`unchanged-${width}.png`) });
		await dialog.getByText("3 unchanged records", { exact: true }).click();
		const entry = dialog.locator(".sch-routine-entry").first();
		await entry.getByText("Source excerpts for this update", { exact: false }).click();
		await expect(entry.locator("blockquote")).toHaveText(quotation);
		await expect(entry.locator("blockquote")).toHaveCount(1);
		await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
		await expect(dialog.getByText("Award amount updated.", { exact: true })).toHaveCount(0);
		expect(errors).toEqual([]);
	}
});

test("a genuine link change survives a mixed record with no false award summary", async ({ page }) => {
	const version = { ...noop(reported[2].amount), evidence: [{ ...evidence, field: "amount" }], deltas: [...noop(reported[2].amount).deltas, { field: "applicationLink", oldValue: "https://old.gov.in/", newValue: "https://new.gov.in/apply" }] };
	const { dialog } = await fixture(page, reported[2], [version]);
	await expect(dialog.getByText("Application website updated.", { exact: true })).toBeVisible();
	await expect(dialog.getByText("1 changed detail", { exact: false })).toBeVisible();
	await expect(dialog.locator(".sch-diff-row")).toHaveCount(1);
	await expect(dialog.getByRole("heading", { name: "Award amount", exact: true })).toHaveCount(0);
	await expect(dialog.getByText(/No matching source excerpt was saved/)).toBeVisible();
	await expect(dialog.locator("blockquote")).toHaveCount(0);
	await distinctRows(dialog);
});

test("date-only changes explain the deadline and academic year without eligibility messaging", async ({ page }, testInfo) => {
	for (const extension of [true, false]) {
		const version = { _id: "dates", changeType: extension ? "DEADLINE_EXTENSION" : "DEADLINE_SHORTENED", semanticCategory: extension ? "RELAXATION" : "RESTRICTION", academicYear: "2026-27", observedAt: "2026-10-21", summary: "AY 2026-27: closesAt changed", deltas: [
			{ field: "closesAt", oldValue: extension ? "2026-10-31T18:29:59.999Z" : "2026-11-15T18:29:59.999Z", newValue: extension ? "2026-11-15T18:29:59.999Z" : "2026-10-31T18:29:59.999Z" },
			{ field: "instituteVerificationUntil", oldValue: "2026-11-20", newValue: "2026-11-25" },
		] };
		const { dialog } = await fixture(page, reported[0], [version]);
		await expect(dialog.getByText(extension ? "Deadline extended" : "Deadline moved earlier", { exact: true })).toBeVisible();
		await expect(dialog.getByText("Academic year 2026-27", { exact: true })).toBeVisible();
		await expect(dialog.getByText(/It contains no eligibility changes/)).toBeVisible();
		await expect(dialog.getByText(/Eligibility expanded|Eligibility narrowed/)).toHaveCount(0);
		await expect(dialog.getByRole("link", { name: /Add a profile/ })).toHaveCount(0);
		await distinctRows(dialog);
		if (extension) await dialog.screenshot({ path: testInfo.outputPath("deadline-extension.png") });
	}
});

test("identical descriptions cannot hide a changed award value, period, duration or rate", async ({ page }) => {
	const before = { ...reported[0].amount, months: 10, options: [{ value: 1000, period: "monthly" }] };
	const after = { ...before, value: 90000, period: "total", months: 12, options: [{ value: 1500, period: "monthly" }] };
	const { dialog } = await fixture(page, reported[0], [{ changeType: "AWARD_UPDATE", semanticCategory: "RELAXATION", observedAt: "2026-10-21", deltas: [{ field: "amount", oldValue: before, newValue: after }] }]);
	await expect(dialog.getByText("Award terms updated", { exact: true })).toBeVisible();
	await expect(dialog.locator(".sch-diff-after p")).toContainText("₹90,000 over the full duration for 12 months");
	await expect(dialog.locator(".sch-diff-after p")).toContainText("₹1,500 per month");
	await expect(dialog.getByText("Eligibility expanded", { exact: true })).toHaveCount(0);
	await distinctRows(dialog);
});

test("same-day deadline-time changes remain distinguishable and existing projected no-ops stay grouped", async ({ page }) => {
	const { dialog } = await fixture(page, reported[0], [
		{ changeType: "CYCLE_DATES_CHANGED", observedAt: "2026-10-21", deltas: [{ field: "closesAt", oldValue: "2026-10-31T11:30:00.000Z", newValue: "2026-10-31T18:29:59.999Z" }] },
		{ changeType: "AWARD_UPDATE", routineRefresh: true, unchangedFields: ["amount"], observedAt: "2026-10-20", deltas: [] },
	]);
	await expect(dialog.getByText("Deadline extended", { exact: true })).toBeVisible();
	await expect(dialog.locator(".sch-diff-before p")).toContainText("5:00:00.000");
	await expect(dialog.locator(".sch-diff-after p")).toContainText("11:59:59.999");
	await expect(dialog.getByText("1 unchanged record", { exact: true })).toBeVisible();
	await distinctRows(dialog);
});

test("newly recorded facts, new cycles and incomplete histories are not dismissed as unchanged", async ({ page }) => {
	const { dialog } = await fixture(page, reported[0], [
		{ _id: "new-detail", changeType: "FIELD_UPDATED", observedAt: "2026-10-21", deltas: [{ field: "level", oldValue: null, newValue: "UG" }] },
		{ _id: "cycle", changeType: "NEW_CYCLE", academicYear: "2026-27", observedAt: "2026-10-20", summary: "New application window recorded", deltas: [] },
		{ _id: "unknown", changeType: "CRITERIA_MODIFIED", observedAt: "2026-10-19", summary: "An older record has no structured comparison", deltas: [{}] },
	]);
	await expect(dialog.getByText("Details newly recorded", { exact: true })).toBeVisible();
	await expect(dialog.getByText(/does not establish when the provider changed/)).toBeVisible();
	await expect(dialog.getByText("New application cycle", { exact: true })).toBeVisible();
	await expect(dialog.getByText(/unchanged record/)).toHaveCount(0);
	await distinctRows(dialog);
});

test("empty optional URLs are grouped as unchanged instead of an identical blank comparison", async ({ page }) => {
	const { dialog } = await fixture(page, reported[0], [{ changeType: "LINK_UPDATED", observedAt: "2026-10-21", summary: "Guidelines updated", deltas: [{ field: "officialLinks.guidelinesUrl", oldValue: null, newValue: "" }] }]);
	await expect(dialog.getByRole("heading", { name: "No changed terms recorded", exact: true })).toBeVisible();
	await expect(dialog.locator("del, ins")).toHaveCount(0);
	await expect(dialog.getByText("1 unchanged record", { exact: true })).toBeVisible();
});
