import { test, expect } from "@playwright/test";

async function open(page) {
  await page.addInitScript(() => {
    window.__activeWorkers = 0;
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(...args) {
        super(...args);
        this.stopped = false;
        window.__activeWorkers++;
      }
      terminate() {
        if (!this.stopped) {
          this.stopped = true;
          window.__activeWorkers--;
        }
        super.terminate();
      }
    };
  });
  await page.route("**/api/scholarships?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            _id: "synthetic",
            title: "Synthetic Scholarship",
            officialLinks: { guidelinesUrl: "https://example.gov.in/test" },
          },
        ],
      },
    }),
  );
  await page.goto("/scanner");
}
function pdf(text, pages = 1) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let i = 0; i < pages; i++) {
    const stream = `BT /F1 16 Tf 40 740 Td ${text
      .split("\n")
      .map(
        (s, j) => `${j ? "0 -28 Td " : ""}(${s.replace(/[()\\]/g, "\\$&")}) Tj`,
      )
      .join("\n")} ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  return assemblePdf(objects);
}
function assemblePdf(objects) {
  let out = "%PDF-1.4\n",
    offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const start = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(out);
}
test("manual review, edit, evidence and reset at mobile width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page
    .getByLabel("Annual family income (INR)", { exact: true })
    .fill("250000");
  await page.getByLabel("Issue date", { exact: true }).fill("2030-01-01");
  await page.getByRole("button", { name: "Review next steps" }).click();
  await expect(
    page.getByText("Scholarship-specific compliance: Not verified"),
  ).toBeVisible();
  await expect(
    page.getByText("The issue date is in the future."),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/scanner-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset check" }).click();
  await expect(
    page.getByRole("button", { name: "Enter details manually" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByLabel("Document type", { exact: true })
    .selectOption("bonafide");
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page
    .getByLabel("Institution name", { exact: true })
    .fill("Synthetic College");
  await page.getByRole("button", { name: "Review next steps" }).click();
  await page.locator(".scanner-recorded > summary").click();
  await expect(
    page.getByText(
      "Optional detail not recorded. Check the original and the scheme’s requirements.",
    ).first(),
  ).toBeVisible();
});
test("searchable PDF uses native text; corrections retain evidence; privacy", async ({
  page,
}) => {
  const requests = [],
    errors = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.locator("#certificate").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: pdf(
      "INCOME CERTIFICATE\nDate of Issue: 14/01/2025\nAnnual family income: Rs. 2,50,000/-\nFinancial year: 2025-26\nTehsildar",
    ),
  });
  await expect(
    page.getByLabel("Annual family income (INR)", { exact: true }),
  ).toHaveValue("250000");
  await expect(page.getByLabel("Issue date", { exact: true })).toHaveValue(
    "2025-01-14",
  );
  await page
    .getByLabel("Annual family income (INR)", { exact: true })
    .fill("200000");
  await page
    .locator(".scanner-field")
    .filter({
      has: page.getByLabel("Annual family income (INR)", { exact: true }),
    })
    .locator("summary")
    .click();
  await expect(
    page.getByText("Annual family income: Rs. 2,50,000/-", {exact:true}),
  ).toBeVisible();
  expect(requests.every((r) => r.method === "GET" && !r.body)).toBeTruthy();
  expect(
	requests.filter((r) => new URL(r.url).hostname !== "localhost"),
  ).toEqual([]);
  expect(requests.some((r) => r.url.includes("traineddata"))).toBeFalsy();
  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      db: (await indexedDB.databases()).length,
    })),
  ).toEqual({ local: 0, session: 0, db: 0 });
  expect(errors).toEqual([]);
  await expect.poll(() => page.evaluate(() => window.__activeWorkers)).toBe(0);
});
test("real local English image OCR and asset isolation", async ({ page }) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await open(page);
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 750;
    const c = canvas.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, 1400, 750);
    c.fillStyle = "black";
    c.font = "36px Arial";
    [
      "INCOME CERTIFICATE",
      "Applicant name: Anil Kumar",
      "Date of Issue: 14/01/2025",
      "Annual family income: Rs. 250000",
      "Financial year: 2025-26",
      "Tehsildar",
    ].forEach((s, i) => c.fillText(s, 70, 90 + i * 100));
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#certificate").setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(
    page.getByLabel("Annual family income (INR)", { exact: true }),
  ).toHaveValue("250000", { timeout: 100000 });
  await expect(page.getByLabel("Issue date", { exact: true })).toHaveValue(
    "2025-01-14",
  );
  expect(
    urls.filter((url) => new URL(url).hostname !== "localhost"),
  ).toEqual([]);
  await expect(page.getByLabel("Name on this document", { exact: true })).toHaveValue("Anil Kumar");
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).length),
  ).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__activeWorkers)).toBe(0);
});

test("private auditor compares successive real PDFs without uploading or persisting names", async ({ page }, testInfo) => {
  const requests = [], errors = [];
  page.on("request", request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.setSystemTime(new Date("2026-10-22T10:00:00Z"));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await page.getByLabel("Name on your application (optional, local only)", { exact: true }).fill("Anil Kumar Sharma");
  await page.getByLabel("Document type", { exact: true }).selectOption("identity");
  await expect(page.locator(".scanner-workspace-top > span")).toHaveText("ID / Marksheet / Bank Document");
  await page.locator("#certificate").setInputFiles({ name: "private-id-sentinel.pdf", mimeType: "application/pdf", buffer: pdf("AADHAAR\nApplicant name: A. Kumar Sharma\nThis synthetic document contains no real identity information.") });
  await expect(page.getByLabel("Name on this document", { exact: true })).toHaveValue("A. Kumar Sharma");
  await expect(page.getByText("Initials and expanded names differ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep reviewed name for comparison", exact: true }).click();
  await expect(page.getByText("1 of 6 reviewed names kept in this tab", { exact: true })).toBeVisible();
  await page.getByLabel("Document type", { exact: true }).selectOption("income");
  await expect(page.locator(".scanner-workspace-top > span")).toHaveText("Income Certificate");
  await page.locator("#certificate").setInputFiles({ name: "private-income-sentinel.pdf", mimeType: "application/pdf", buffer: pdf("INCOME CERTIFICATE\nName: Anil Sharma\nIssue date: 31/03/2025\nAnnual family income: Rs. 180000\nFinancial year: 2024-25\nTehsildar") });
  await expect(page.getByLabel("Name on this document", { exact: true })).toHaveValue("Anil Sharma");
  await expect(page.getByText("Issued before the current financial year", { exact: true })).toBeVisible();
  await expect(page.getByText("A middle name part is missing", { exact: true })).toBeVisible();
  await expect(page.getByText("Compared with ID / Marksheet / Bank Document", { exact: true })).toBeVisible();
  await page.getByLabel("Name on this document", { exact: true }).fill("Vikram Mehta");
  await expect(page.getByText("Names differ substantially", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Review next steps", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download review", exact: true })).toBeEnabled();
  await page.locator(".scanner-audit").screenshot({ path: testInfo.outputPath("scanner-auditor-desktop.png"), animations: "disabled" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.locator(".scanner-audit").screenshot({ path: testInfo.outputPath("scanner-auditor-mobile.png"), animations: "disabled" });
  expect(requests.every(request => request.method === "GET" && !request.body)).toBe(true);
  expect(JSON.stringify(requests)).not.toMatch(/private-id-sentinel|private-income-sentinel|Anil%20|Vikram%20|Anil Kumar|Vikram Mehta/);
  expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, db: (await indexedDB.databases()).length }))).toEqual({ local: 0, session: 0, db: 0 });
  expect(JSON.stringify(await page.evaluate(() => history.state))).not.toMatch(/Anil|Vikram|180000/);
  await page.getByRole("button", { name: "Reset check", exact: true }).click();
  await expect(page.getByLabel("Name on your application (optional, local only)", { exact: true })).toHaveValue("");
  await expect(page.getByText("0 of 6 reviewed names kept in this tab", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("application desk offers explicit local name reuse, accessible disclosures and responsive comparisons", async ({ page }, testInfo) => {
  const requests = [];
  page.on("request", request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.clock.setSystemTime(new Date("2026-10-22T10:00:00Z"));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await page.getByRole("link", { name: "Start document review", exact: true }).click();
  await expect(page.locator("#document-workbench")).toBeFocused();
  await page.locator(".scanner-private-set").screenshot({ path: testInfo.outputPath("application-desk-empty.png"), animations: "disabled" });
  const reference = page.getByLabel("Name on your application (optional, local only)", { exact: true });
  await reference.fill("Anil Kumar Sharma");
  await page.getByRole("button", { name: "Enter details manually", exact: true }).click();
  const name = page.getByLabel("Name on this document", { exact: true });
  await name.fill("Anil Sharma");
  await page.getByLabel("Issue date", { exact: true }).fill("2025-03-31");
  await expect(page.locator(".scanner-compared-names mark")).toHaveText(["Kumar"]);
  await expect(page.locator(".scanner-compared-names > div p")).toHaveText(["Anil Sharma", "Anil Kumar Sharma"]);
  const explanation = page.locator(".audit-finding .audit-explanation").first();
  await explanation.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(explanation).toHaveJSProperty("open", true);
  await expect(explanation).toContainText("This alone does not mean the certificate has expired.");
  await page.keyboard.press("Space");
  await expect(explanation).toHaveJSProperty("open", false);
  await page.getByRole("button", { name: "Keep reviewed name for comparison", exact: true }).click();
  const use = page.getByRole("button", { name: "Use Anil Sharma for application name", exact: true });
  await expect(use).toHaveAttribute("aria-pressed", "false");
  await page.locator(".scanner-private-set").screenshot({ path: testInfo.outputPath("application-desk-desktop.png"), animations: "disabled" });
  await use.click();
  await expect(reference).toHaveValue("Anil Sharma");
  await expect(use).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Same recorded spelling", { exact: true })).toBeVisible();
  await expect(page.locator(".scanner-compared-names mark")).toHaveCount(0);
  await reference.fill("Anil Kumar Sharma");
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.locator(".scanner-private-set").screenshot({ path: testInfo.outputPath("application-desk-mobile.png"), animations: "disabled" });
  await name.fill("Anil ".repeat(38).trim());
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(requests.every(request => request.method === "GET" && !request.body)).toBe(true);
  expect(JSON.stringify(requests)).not.toMatch(/Anil|Sharma/);
  expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, db: (await indexedDB.databases()).length }))).toEqual({ local: 0, session: 0, db: 0 });
  await page.getByRole("button", { name: "Forget comparison names", exact: true }).click();
  await expect(reference).toHaveValue("");
  await expect(page.getByText("0 of 6 reviewed names kept in this tab", { exact: true })).toBeVisible();
  await expect(name).not.toHaveValue("");
});

test("comparison names survive an explicit next-document action and clear on reload and leaving", async ({ page }) => {
  await open(page);
  await page.getByLabel("Document type", { exact: true }).selectOption("identity");
  await page.getByLabel("Name on your application (optional, local only)", { exact: true }).fill("Pooja Sharma");
  await page.getByRole("button", { name: "Enter details manually", exact: true }).click();
  await page.getByLabel("Name on this document", { exact: true }).fill("Puja Sharma");
  await expect(page.getByText("Possible spelling variation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep reviewed name for comparison", exact: true }).click();
  await page.getByRole("button", { name: "Review another document", exact: true }).click();
  await expect(page.getByText("1 of 6 reviewed names kept in this tab", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("0 of 6 reviewed names kept in this tab", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name on your application (optional, local only)", { exact: true })).toHaveValue("");
  await page.getByLabel("Name on your application (optional, local only)", { exact: true }).fill("Private Declaration");
  await page.getByRole("button", { name: "Enter details manually", exact: true }).click();
  await page.getByLabel("Name on this document", { exact: true }).fill("Private Holder");
  await page.getByRole("button", { name: "Keep reviewed name for comparison", exact: true }).click();
  await page.getByRole("button", { name: "Review next steps", exact: true }).click();
  await page.locator('a[href="/scholarships"]').first().click();
  await page.waitForURL("**/scholarships");
  await page.goBack();
  await expect(page.getByText("0 of 6 reviewed names kept in this tab", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name on your application (optional, local only)", { exact: true })).toHaveValue("");
});

test("FY and format observations share India's calendar at the April boundary", async ({ page }) => {
  await page.clock.setSystemTime(new Date("2026-03-31T18:30:00Z"));
  await open(page);
  await page.getByRole("button", { name: "Enter details manually", exact: true }).click();
  await page.getByLabel("Issue date", { exact: true }).fill("2026-04-01");
  await expect(page.getByText("Issued during the current financial year", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review next steps", exact: true }).click();
  await expect(page.getByText("The issue date is in the future.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Issued during the current financial year", { exact: true })).toBeVisible();
});
test("corrupt/unsupported/over-page-limit files and cancellation never leave stale results", async ({
  page,
}) => {
  await open(page);
  await page.locator("#certificate").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a pdf"),
  });
  await expect(page.getByRole("alert")).toContainText("File content");
  await page.locator("#certificate").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 broken"),
  });
  await expect(page.getByRole("alert")).toContainText("Could not read");
  await page.locator("#certificate").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: pdf("Synthetic test", 6),
  });
  await expect(page.getByRole("alert")).toContainText("at most 5");
  await page.route("**/scanner-assets/worker.min.js", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 800;
    return c.toDataURL().split(",")[1];
  });
  await page.locator("#certificate").setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect.poll(() => page.evaluate(() => window.__activeWorkers)).toBe(1);
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await expect.poll(() => page.evaluate(() => window.__activeWorkers)).toBe(0);
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page.getByLabel("Issue date", { exact: true }).fill("2025-01-14");
  await expect(page.getByLabel("Issue date", { exact: true })).toHaveValue(
    "2025-01-14",
  );
  await page
    .getByLabel("Document type", { exact: true })
    .selectOption("bonafide");
  await expect(
    page.getByRole("button", { name: "Enter details manually" }),
  ).toBeVisible();
});

test("scanned PDF and JPEG bonafide use real OCR; failed OCR cleans up", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Document type", { exact: true })
    .selectOption("bonafide");
  const jpeg = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 1400;
      c.height = 1000;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "black";
      ctx.font = "36px Arial";
      [
        "BONAFIDE CERTIFICATE",
        "Institution: Synthetic Engineering College",
        "Academic session: 2025-26",
        "Semester: 3",
        "Date of Issue: 14/01/2025",
        "Principal",
      ].forEach((s, i) => ctx.fillText(s, 60, 90 + i * 110));
      return c.toDataURL("image/jpeg", 0.95).split(",")[1];
    }),
    "base64",
  );
  const hex = jpeg.toString("hex") + ">";
  const commands = "q 560 0 0 400 26 300 cm /Im0 Do Q";
  const scanned = assemblePdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
    `<< /Type /XObject /Subtype /Image /Width 1400 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${hex.length} >>\nstream\n${hex}\nendstream`,
  ]);
  for (const file of [
    { name: "synthetic.pdf", mimeType: "application/pdf", buffer: scanned },
    { name: "synthetic.jpg", mimeType: "image/jpeg", buffer: jpeg },
  ]) {
    await page.locator("#certificate").setInputFiles(file);
    await expect(
      page.getByLabel("Institution name", { exact: true }),
    ).toHaveValue("Synthetic Engineering College", { timeout: 90000 });
    await expect(
      page.getByLabel("Academic year / session", { exact: true }),
    ).toHaveValue("2025-2026");
    await expect
      .poll(() => page.evaluate(() => window.__activeWorkers))
      .toBe(0);
    await page.getByRole("button", { name: "Reset check" }).click();
  }
  await page.route("**/scanner-assets/eng.traineddata.gz", (route) =>
    route.abort(),
  );
  await page
    .locator("#certificate")
    .setInputFiles({
      name: "synthetic.jpg",
      mimeType: "image/jpeg",
      buffer: jpeg,
    });
  await expect(page.getByRole("alert")).toContainText("Could not read", {
    timeout: 15000,
  });
  await expect.poll(() => page.evaluate(() => window.__activeWorkers)).toBe(0);
});

test("drag-and-drop, oversized dimensions and empty text provide safe review", async ({
  page,
}) => {
  await open(page);
  await page.screenshot({
    path: "test-results/scanner-desktop.png",
    fullPage: true,
  });
  const syntheticPdf = [
    ...pdf(
      "BONAFIDE CERTIFICATE\nInstitution: Sample College\nAcademic session: 2025-26\nSemester: 2\nPrincipal",
    ),
  ];
  await page
    .getByLabel("Document type", { exact: true })
    .selectOption("bonafide");
  await expect(page.locator(".scanner-workspace-top > span")).toHaveText("Bonafide Certificate");
  const transfer = await page.evaluateHandle((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(
      new File([new Uint8Array(bytes)], "synthetic.pdf", {
        type: "application/pdf",
      }),
    );
    return dt;
  }, syntheticPdf);
  await page
    .locator(".scanner-drop")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await expect(
    page.getByLabel("Institution name", { exact: true }),
  ).toHaveValue("Sample College");
  await transfer.dispose();
  await page.getByRole("button", { name: "Reset check" }).click();
  const huge = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(huge);
  huge.writeUInt32BE(100000, 16);
  huge.writeUInt32BE(100000, 20);
  await page
    .locator("#certificate")
    .setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: huge,
    });
  await expect(page.getByRole("alert")).toContainText("too large");
  await page
    .locator("#certificate")
    .setInputFiles({
      name: "synthetic.pdf",
      mimeType: "application/pdf",
      buffer: pdf(""),
    });
  await expect(page.getByRole("alert")).toContainText("No readable text", {
    timeout: 90000,
  });
  await expect(
    page.getByLabel("Institution name", { exact: true }),
  ).toHaveValue("");
});
