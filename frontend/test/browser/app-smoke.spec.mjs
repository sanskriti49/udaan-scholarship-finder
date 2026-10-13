import { test, expect } from "@playwright/test";
test.setTimeout(30000);

const excerpt = "Annual family income must not exceed Rs. 300000.";
const scholarship = {
  _id: "smoke-scheme", slug: "smoke-scheme", title: "Example Scholarship", organization: "Example Education Department",
  description: "A synthetic scheme used only by automated tests.", sourceType: "Government", category: "Merit based",
  state: "All India", level: "UG", status: "open", deadline: "2030-10-31T18:29:59.999Z", amount: { value: 10000, period: "yearly" },
  sourceUrl: "https://example.gov.in/scholarships", applicationLink: "https://example.gov.in/apply",
  rules: [{ id: "income", field: "familyIncome", operator: "LTE", targetValue: 300000, description: "Generated income explanation" }],
  requiredDocuments: [{ code: "INCOME_CERT", name: "Income certificate", mandatory: true }],
};

async function mockApi(page, evidence = [{ quote: excerpt, url: scholarship.sourceUrl, field: "familyIncome", verified: true }]) {
  const evaluations = [];
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.endsWith("/evaluate")) {
      evaluations.push(request.postDataJSON());
      return route.fulfill({ json: { success: true, summary: { totalEvaluated: 0, eligibleCount: 0 }, data: { matched: [], ineligible: [], missingProfileData: [] } } });
    }
    if (url.pathname.endsWith("/evidence")) return route.fulfill({ json: { success: true, sourceUrl: scholarship.sourceUrl, data: evidence } });
    if (url.pathname.endsWith("/suggestions")) return route.fulfill({ json: { success: true, data: [] } });
    if (url.pathname.endsWith("/smoke-scheme")) return route.fulfill({ json: { success: true, data: scholarship } });
    return route.fulfill({ json: { success: true, data: [scholarship], count: 1, total: 1, recentUpdatesCount: 0 } });
  });
  return evaluations;
}

for (const width of [390, 1440]) {
  test(`homepage, scholarships, evidence, eligibility and scanner work at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading page" })).toHaveCount(0);
    await page.locator('a[href="/scholarships"]').filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { name: /Let’s find a scholarship/ })).toBeVisible();
    await page.getByRole("button", { name: scholarship.title, exact: true }).first().click();
    await page.getByRole("button", { name: "Full rules", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(excerpt, { exact: true })).toBeVisible();
    await expect(dialog.getByText("Generated income explanation", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: /Documents/ }).click();
    await expect(dialog.getByText("Preparation suggestion — not verified", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/eligibility");
    await expect(page.getByRole("button", { name: "Undergraduate", exact: true })).toBeVisible();
    await page.goto("/scanner");
    await expect(page.getByRole("button", { name: "Enter details manually", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading page" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("empty source evidence never turns generated criteria into verified quotations", async ({ page }) => {
  await mockApi(page, []);
  await page.goto("/scholarships");
  await page.getByRole("button", { name: scholarship.title, exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Stored source excerpts", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Full rules", exact: true }).click();
  await expect(page.getByRole("dialog").getByText(/No source excerpt is available/)).toBeVisible();
  await expect(page.getByRole("dialog").locator("blockquote")).toHaveCount(0);
});

test("blank numeric fields and omitted disability stay unknown in the eligibility request", async ({ page }) => {
  const evaluations = await mockApi(page);
  await page.goto("/eligibility");
  await page.getByRole("button", { name: "Undergraduate", exact: true }).click();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Female", exact: true }).click();
  await page.getByRole("button", { name: "General", exact: true }).click();
  await page.getByRole("button", { name: "National schemes only", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Check my eligibility", exact: true }).click();
  await expect.poll(() => evaluations.length).toBe(1);
  expect(evaluations[0]).toMatchObject({ familyIncome: null, cgpa: null, hasDisability: null, state: "All India" });
});
