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
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Eligibility", exact: true }).click();
    await dialog.locator("summary").filter({ hasText: "Source excerpts" }).click();
    await expect(dialog.getByText(excerpt, { exact: true })).toBeVisible();
    await expect(dialog.getByText("Generated income explanation", { exact: true })).toHaveCount(0);
    await dialog.getByRole("tab", { name: "Documents", exact: true }).click();
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
  await page.getByRole("dialog").getByRole("tab", { name: "Eligibility", exact: true }).click();
  await page.getByRole("dialog").locator("summary").filter({ hasText: "Source excerpts" }).click();
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

const impact = {
  changes: [{ ruleId: "income", previousStatus: "failed", currentStatus: "passed", oldRequirement: "Annual income ≤ ₹2,50,000", newRequirement: "Annual income ≤ ₹3,00,000", profileValue: "₹2,80,000",
    oldEvidence: { url: "https://example.gov.in/previous.pdf", quote: "Synthetic old ceiling: 250000." },
    newEvidence: { url: "https://example.gov.in/current.pdf", quote: "Synthetic new ceiling: 300000." } }],
  remainingUnknown: [{ ruleId: "manual", requirement: "Review additional official conditions" }], remainingFailed: [],
  caveat: "This checks recorded criteria against your saved profile. It does not confirm an award.",
};

async function mockAlerts(page) {
  let preferences = { instantMatch: true, deadlineAlerts: true, deadline7Days: true, deadline48Hours: true, newGrantsInState: true, weeklyDigest: true, channels: { inApp: true, email: false }, timezone: "Asia/Kolkata", minMatchScore: 70 };
  const saved = [];
  await page.addInitScript(() => {
    localStorage.setItem("token", "synthetic-test-token");
    localStorage.setItem("user", JSON.stringify({ _id: "synthetic-user", name: "Test student", email: "student@example.invalid" }));
  });
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/preferences")) {
      if (route.request().method() === "PUT") { preferences = route.request().postDataJSON(); saved.push(preferences); }
      return route.fulfill({ json: { success: true, preferences } });
    }
    if (url.pathname.endsWith("/unread-count")) return route.fulfill({ json: { success: true, unreadCount: 1 } });
    if (url.pathname.endsWith("/notifications")) return route.fulfill({ json: { success: true, unreadCount: 1, notifications: [{ _id: "synthetic-notification", type: "ELIGIBILITY_CHANGED", title: "A recorded criterion now passes", message: "Synthetic example only.", isRead: false, createdAt: "2026-10-13T00:00:00Z", data: impact }] } });
    return route.fulfill({ json: { success: true, data: [], profile: null } });
  });
  return saved;
}

for (const width of [390, 1440]) {
  test(`eligibility-change opt-in and evidence card work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const saved = await mockAlerts(page);
    await page.goto("/settings?tab=notifications");
    const toggle = page.getByRole("switch", { name: "Eligibility changes that affect me", exact: true });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await page.getByRole("button", { name: "Save alert settings", exact: true }).click();
    await expect.poll(() => saved.length).toBe(1);
    expect(saved[0].eligibilityChanges).toBe(true);
    await page.reload();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: /View notifications/ }).filter({ visible: true }).first().click();
    const dialog = page.getByRole("dialog", { name: /Your updates/ });
    await dialog.getByText("See what changed for you", { exact: true }).click();
    await expect(dialog.getByText("₹2,80,000", { exact: true })).toBeVisible();
    await expect(dialog.getByText(impact.changes[0].oldRequirement, { exact: true })).toBeVisible();
    await expect(dialog.getByText(impact.changes[0].newRequirement, { exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Updated source" })).toHaveAttribute("href", "https://example.gov.in/current.pdf");
    await expect(dialog.getByText("Review additional official conditions", { exact: true })).toBeVisible();
    await dialog.getByRole("link", { name: "Review your saved profile" }).click();
    await expect(page).toHaveURL(/\/eligibility$/);
    await expect(page.getByRole("dialog", { name: /Your updates/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
