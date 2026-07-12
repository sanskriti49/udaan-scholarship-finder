import { chromium } from "playwright";

function inferLevel(text) {
  const lower = text.toLowerCase();
  if (lower.includes("pg ") || lower.includes("post graduate")) return "PG";
  if (
    lower.includes("ug ") ||
    lower.includes("under graduate") ||
    lower.includes("degree")
  )
    return "UG";
  if (
    lower.includes("phd") ||
    lower.includes("research") ||
    lower.includes("fellowship")
  )
    return "PhD";
  return "UG";
}

function inferCategoryAndTags(title, desc) {
  const text = (title + " " + desc).toLowerCase();
  const result = { category: "Government", tags: [] };

  if (text.includes("girl") || text.includes("women")) {
    result.category = "Women";
    result.tags.push("Women Only");
  } else if (text.includes("sc/st") || text.includes("scheduled")) {
    result.category = "SC / ST / OBC";
    result.tags.push("SC/ST/OBC");
  } else if (text.includes("minority")) {
    result.category = "Minority";
    result.tags.push("Minority");
  } else if (text.includes("north eastern")) {
    result.tags.push("Need-Based");
  } else {
    result.category = "Merit based";
    result.tags.push("Merit-Based");
  }
  return result;
}

async function scrapeUGC() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const structuredData = [];

  try {
    const baseUrl = "https://www.ugc.gov.in";
    await page.goto(`${baseUrl}/Home/student_Corner`, {
      waitUntil: "networkidle",
    });

    await page.click("#v-pills-2022-tab");
    await page.waitForSelector("#v-pills-2022 a");

    const scholarshipLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("#v-pills-2022 a"));
      return links.map((link) => link.getAttribute("href")).filter(Boolean);
    });

    for (const relativeUrl of scholarshipLinks) {
      const detailUrl = `${baseUrl}${relativeUrl}`;
      await page.goto(detailUrl, { waitUntil: "domcontentloaded" });

      const extracted = await page.evaluate(() => {
        const getVal = (label) => {
          const spans = Array.from(document.querySelectorAll("span"));
          const targetSpan = spans.find((s) =>
            s.textContent.trim().includes(label),
          );
          if (targetSpan) {
            const col3 = targetSpan.closest(".col-md-3");
            return col3?.nextElementSibling?.textContent.trim() || "";
          }
          return "";
        };

        return {
          title: getVal("Name of the Scheme"),
          objective: getVal("Objective of Scheme"),
          eligibilityText: getVal("Eligibility"),
          slots: getVal("Slots"),
          financialAssistance: getVal("Financial Assistance"),
          remark: getVal("Remark"),
        };
      });

      if (!extracted.title) continue;

      let amountValue = 0;
      const amountMatch =
        extracted.financialAssistance.match(/Rs\.?\s*(\d+,?\d*)/i);
      if (amountMatch) {
        amountValue = parseInt(amountMatch[1].replace(/,/g, ""), 10);
      }

      const { category, tags } = inferCategoryAndTags(
        extracted.title,
        extracted.objective,
      );
      const level = inferLevel(
        extracted.title + " " + extracted.eligibilityText,
      );

      structuredData.push({
        sourceUrl: detailUrl,
        applicationLink: baseUrl,
        sourceSite: "University Grants Commission (UGC)",
        lastScrapedAt: new Date(),

        title: extracted.title,
        organization: "University Grants Commission (UGC)",
        description: extracted.objective || extracted.title,
        summary: (extracted.objective || extracted.title).substring(0, 120),

        amount: {
          value: amountValue,
          currency: "INR",
          period: extracted.financialAssistance.toLowerCase().includes("month")
            ? "monthly"
            : "yearly",
          displayString: extracted.financialAssistance || "Variable",
        },

        deadline: new Date(new Date().getFullYear(), 11, 31),

        category,
        tags,
        level,
        state: extracted.title.includes("North Eastern")
          ? "North Eastern Region"
          : "All India",
        sourceType: "Government",

        eligibility: {
          gender: extracted.title.toLowerCase().includes("girl")
            ? "Female"
            : "Any",
          casteCategories: [],
          eligibleStreams: [],
          eligibleLevels: [level],
          disabilityRequired: false,
        },

        popular: true,
        verified: true,
        rawData: extracted,
      });
    }

    console.log(JSON.stringify(structuredData, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
}

scrapeUGC();
