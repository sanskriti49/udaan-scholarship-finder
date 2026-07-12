import { chromium } from "playwright";

function inferLevel(text) {
  const lower = text.toLowerCase();
  if (
    lower.includes("post graduate") ||
    lower.includes("pg ") ||
    lower.includes("m.tech")
  )
    return "PG";
  if (
    lower.includes("degree/diploma") ||
    lower.includes("under graduate") ||
    lower.includes("ug ")
  )
    return "UG";
  if (lower.includes("phd") || lower.includes("research")) return "PhD";
  return "UG";
}

function inferCategoryAndTags(title) {
  const lower = title.toLowerCase();
  const result = { category: "Government", tags: [] };

  if (
    lower.includes("pragati") ||
    lower.includes("girl") ||
    lower.includes("women")
  ) {
    result.category = "Women";
    result.tags.push("Women Only", "Merit-Based");
  } else if (
    lower.includes("saksham") ||
    lower.includes("specially abled") ||
    lower.includes("disability")
  ) {
    result.category = "Disability";
    result.tags.push("Disability", "Differently Abled");
  } else if (lower.includes("sc/st") || lower.includes("obc")) {
    result.category = "SC / ST / OBC";
    result.tags.push("SC/ST/OBC");
  } else {
    result.category = "Merit based";
    result.tags.push("Merit-Based");
  }

  result.tags.push("STEM");
  return result;
}

async function scrapeAICTE() {
  console.log("Launching browser to scrape AICTE...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://fellowship.aicte.gov.in/", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log("Page loaded. Extracting schemes based on DOM structure...");

    const rawSchemes = await page.evaluate(() => {
      const results = [];
      const headings = document.querySelectorAll("h3");

      headings.forEach((h3) => {
        const aTag = h3.querySelector("a");
        if (!aTag) return;

        const title = aTag.textContent.trim();
        const sourceUrl = aTag.href;

        const nextSibling = h3.nextElementSibling;
        let description = "";
        let moreDetailsUrl = "";

        if (nextSibling && nextSibling.tagName.toLowerCase() === "p") {
          const detailsLink = nextSibling.querySelector("a");
          if (detailsLink) {
            moreDetailsUrl = detailsLink.href;
          }

          description = nextSibling.textContent.replace(/[""]/g, "").trim();
        }

        if (title && description) {
          results.push({ title, sourceUrl, description, moreDetailsUrl });
        }
      });

      return results;
    });

    console.log(
      `Successfully extracted ${rawSchemes.length} raw schemes. Mapping to database schema...`,
    );

    const structuredData = rawSchemes.map((item) => {
      const combinedText = item.title + " " + item.description;

      let amountValue = 0;
      const amountMatch = item.description.match(/Rs\.?\s*(\d+,?\d*)/i);
      if (amountMatch) {
        amountValue = parseInt(amountMatch[1].replace(/,/g, ""), 10);
      }

      const { category, tags } = inferCategoryAndTags(item.title);
      const level = inferLevel(combinedText);

      return {
        sourceUrl:
          item.moreDetailsUrl ||
          item.sourceUrl ||
          `https://fellowship.aicte.gov.in/#${encodeURIComponent(item.title)}`,
        applicationLink: "https://fellowship.aicte.gov.in/",
        sourceSite: "AICTE",
        lastScrapedAt: new Date(),

        title: item.title,
        organization: "All India Council for Technical Education (AICTE)",
        description: item.description,
        summary: item.description.substring(0, 120) + "...",

        amount: {
          value: amountValue,
          currency: "INR",
          period: item.description.toLowerCase().includes("per annum")
            ? "yearly"
            : "yearly",
          displayString:
            amountValue > 0
              ? `₹${amountValue.toLocaleString("en-IN")} / yr`
              : "Variable",
        },

        deadline: new Date(new Date().getFullYear(), 11, 31),

        category: category,
        tags: tags,
        level: level,
        state: item.title.includes("JAMMU & KASHMIR")
          ? "J&K and Ladakh"
          : "All India",
        sourceType: "Government",

        eligibility: {
          gender: item.title.toLowerCase().includes("girl") ? "Female" : "Any",
          casteCategories: [],
          eligibleStreams: ["Engineering", "Technology", "Diploma"],
          eligibleLevels: [level],
          disabilityRequired: item.title
            .toLowerCase()
            .includes("specially abled"),
        },

        popular: true,
        verified: true,
        rawData: item,
      };
    });

    console.log("\n=== Final Formatted Data Ready for MongoDB ===");
    console.log(JSON.stringify(structuredData, null, 2));
  } catch (error) {
    console.error("An error occurred during scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeAICTE();
