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
  await page.goto("/scanner.html");
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
  await page.getByRole("button", { name: "Validate reviewed details" }).click();
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
  await page.getByRole("button", { name: "Validate reviewed details" }).click();
  await expect(
    page.getByText(
      "Optional; not detected. No universal AISHE requirement applies.",
    ),
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
    page.getByText("“Annual family income: Rs. 2,50,000/-”"),
  ).toBeVisible();
  expect(requests.every((r) => r.method === "GET" && !r.body)).toBeTruthy();
  expect(
    requests.every((r) => new URL(r.url).hostname === "localhost"),
  ).toBeTruthy();
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
    urls.every((url) => new URL(url).hostname === "localhost"),
  ).toBeTruthy();
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).length),
  ).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__activeWorkers)).toBe(0);
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
