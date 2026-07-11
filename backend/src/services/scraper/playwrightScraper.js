import { chromium } from "playwright";

async function scrapeAllMinistries() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating to National Scholarship Portal...");
    await page.goto("https://scholarships.gov.in/All-Scholarships", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Use the specific class for the accordions to avoid navbar toggles
    const accordionButtons = await page
      .locator("button.accordion-button")
      .all();
    console.log(
      `Found ${accordionButtons.length} potential dropdowns. Processing...`,
    );

    for (let i = 0; i < accordionButtons.length; i++) {
      const btn = accordionButtons[i];

      // 1. Only proceed if the button is actually visible on the screen
      if (await btn.isVisible()) {
        const ministryName = (await btn.innerText()).trim();

        // Skip empty text or known non-ministry nav items
        if (!ministryName || ministryName.includes("Students")) continue;

        console.log(`\n--- Expanding: ${ministryName} ---`);

        try {
          // Click the button (with a short timeout so it doesn't hang if it gets stuck)
          await btn.click({ timeout: 5000 });

          // Get the target panel ID
          const targetSelector = await btn.getAttribute("data-bs-target");

          if (targetSelector) {
            const expandedPanel = page.locator(targetSelector);

            // Wait for the panel to expand
            await expandedPanel.waitFor({ state: "visible", timeout: 5000 });

            // Extract text
            const panelText = await expandedPanel.innerText();
            console.log(panelText);
          }
        } catch (clickError) {
          console.log(
            `[!] Skipped "${ministryName}" - Could not expand or read data.`,
          );
        }
      }
    }

    console.log("\n✅ Finished scraping all available sections!");
  } catch (error) {
    console.error("Fatal error during scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeAllMinistries();
