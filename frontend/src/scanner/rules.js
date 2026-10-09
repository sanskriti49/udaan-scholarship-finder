import { parseDate, parseMoney, parsePeriod, schemas } from "./extract.js";

// Deliberately empty by default: synthetic or manual overrides.
// Scheme-specific compliance evaluates directly against loaded scholarship criteria.
export const verifiedRules = [];

export function safeSource(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}

export function validRule(r, scholarshipId, type) {
  return (
    Boolean(r) &&
    r.verified === true &&
    r.scholarshipId === scholarshipId &&
    r.documentType === type &&
    Boolean(r.id) &&
    Boolean(r.excerpt?.trim()) &&
    Boolean(safeSource(r.sourceUrl)) &&
    Boolean(parseDate(r.verifiedAt)) &&
    Boolean(schemas[type]?.fields?.[r.field]) &&
    ["eq", "lte", "gte", "includes", "present"].includes(r.operator) &&
    (r.operator === "present" || r.expected !== undefined)
  );
}

export function evaluate(
  type,
  fields,
  scholarshipOrId,
  rules = verifiedRules,
  today = new Date().toISOString().slice(0, 10),
) {
  const scholarship =
    typeof scholarshipOrId === "object" && scholarshipOrId !== null
      ? scholarshipOrId
      : null;
  const scholarshipId = scholarship ? scholarship.id : scholarshipOrId;

  const results = Object.entries(schemas[type]?.fields || {}).map(
    ([key, label]) => {
      const f = fields[key] || { value: "", ambiguous: false, evidence: [] };
      let issue = "";
      if (f.ambiguous) issue = "Conflicting evidence was found.";
      else if (!f.value)
        issue =
          key === "aishe"
            ? "Optional; not detected. No universal AISHE requirement applies."
            : key === "nonCreamyLayer"
              ? "Not detected. Central schemes require Non-Creamy Layer wording."
              : "No reliable value was identified.";
      else if (/Date$/.test(key) && !parseDate(f.value))
        issue = "Use a real date in YYYY-MM-DD or Indian day/month/year format.";
      else if (key === "annualIncome" && parseMoney(f.value) === null)
        issue =
          "Enter a numeric annual family income; do not substitute monthly or individual income.";
      else if (key === "period" && !parsePeriod(f.value))
        issue = "Review the year range (for example 2024-2025).";
      else if (key === "issueDate" && parseDate(f.value) > today)
        issue = "The issue date is in the future.";
      else if (key === "expiryDate" && parseDate(f.value) < today)
        issue = "The stated expiry date has passed.";
      else if (
        key === "expiryDate" &&
        parseDate(fields.issueDate?.value) &&
        parseDate(f.value) < parseDate(fields.issueDate.value)
      )
        issue = "Expiry precedes the issue date.";
      else if (key === "authority" && /\bnotary\b/i.test(f.value))
        issue =
          "Document indicates Notary attestation. Scholarship portals (NSP and state portals) strictly reject notarized affidavits in place of revenue certificates.";
      else if (
        key === "nonCreamyLayer" &&
        /creamy layer indicated/i.test(f.value)
      )
        issue =
          "Document indicates Creamy Layer status. OBC scholarship quotas strictly require Non-Creamy Layer (NCL) status.";

      return {
        id: key,
        field: key,
        label,
        state: issue
          ? f.value && !f.ambiguous
            ? "Needs attention"
            : "Manual review required"
          : "Not verified",
        interpretation:
          issue ||
          "Value recorded for review. This alone does not establish scholarship compliance.",
        next: issue
          ? "Compare with the original certificate and correct the field if necessary."
          : "Compare this detail with the current official guidelines.",
      };
    },
  );

  const schemeChecks = [];

  if (scholarship) {
    // 1. Mandatory Document Checklist
    if (
      Array.isArray(scholarship.requiredDocuments) &&
      scholarship.requiredDocuments.length > 0
    ) {
      const pattern = {
        income: /income/i,
        bonafide: /bona\s?fide|enrollment|study|institution/i,
        caste: /caste|community|category|social|reservation|tribe|ews/i,
      }[type];
      const docListed = scholarship.requiredDocuments.some((d) =>
        pattern?.test(d),
      );
      schemeChecks.push({
        id: `scheme-required-doc-${scholarship.id}`,
        field: "documentLabel",
        label: "Required Document Checklist",
        state: docListed ? "Looks good" : "Manual review required",
        interpretation: docListed
          ? `${schemas[type].label} is explicitly listed in ${scholarship.title}'s required documents.`
          : `${schemas[type].label} is not explicitly listed in ${scholarship.title}'s published required documents (${scholarship.requiredDocuments.join(", ")}).`,
        next: docListed
          ? "Ensure all pages and official seals are clearly legible."
          : "Verify whether this certificate is needed for your specific category or quota.",
      });
    }

    // 2. Statutory Family Income Ceiling
    if (type === "income" && scholarship.eligibility?.familyIncome?.max) {
      const max = scholarship.eligibility.familyIncome.max;
      const parsed = parseMoney(fields.annualIncome?.value);
      const missing =
        !fields.annualIncome?.value ||
        fields.annualIncome?.ambiguous ||
        parsed === null;
      const pass = !missing && parsed <= max;
      schemeChecks.push({
        id: `scheme-income-ceiling-${scholarship.id}`,
        field: "annualIncome",
        label: "Statutory Family Income Ceiling",
        state: missing
          ? "Manual review required"
          : pass
            ? "Looks good"
            : "Needs attention",
        interpretation: missing
          ? `Scheme specifies a maximum family income ceiling of ₹${max.toLocaleString("en-IN")}. Document value could not be reliably verified.`
          : pass
            ? `Extracted income of ₹${parsed.toLocaleString("en-IN")} is within the official ceiling of ₹${max.toLocaleString("en-IN")}.`
            : `Extracted income of ₹${parsed.toLocaleString("en-IN")} exceeds the maximum eligible ceiling of ₹${max.toLocaleString("en-IN")}.`,
        next: missing
          ? "Enter your annual family income manually to verify compliance."
          : pass
            ? "Ensure this matches the exact figure in your scholarship application."
            : "Applications with income exceeding the ceiling are automatically rejected by portal verification algorithms.",
      });
    }

    // 3. Academic Year & Financial Year Boundary (April 1 Rule)
    if (scholarship.currentCycle?.academicYear) {
      const cycleMatch = scholarship.currentCycle.academicYear.match(/^(\d{4})/);
      const cycleStart = cycleMatch ? parseInt(cycleMatch[1], 10) : null;
      if (cycleStart && type === "income") {
        const issue = parseDate(fields.issueDate?.value);
        const fyCutoff = `${cycleStart}-04-01`;
        const missing =
          !fields.issueDate?.value || fields.issueDate?.ambiguous || !issue;
        const pass = !missing && issue >= fyCutoff;
        schemeChecks.push({
          id: `scheme-cycle-fy-${scholarship.id}`,
          field: "issueDate",
          label: "Financial Year Validity (April 1 Rule)",
          state: missing
            ? "Manual review required"
            : pass
              ? "Looks good"
              : "Needs attention",
          interpretation: missing
            ? `Scheme cycle is ${scholarship.currentCycle.academicYear}. Indian portals require income certificates issued on or after April 1, ${cycleStart} (active FY ${cycleStart}-${cycleStart + 1}).`
            : pass
              ? `Certificate issued on ${issue} satisfies the active financial year window (on or after ${fyCutoff}).`
              : `Certificate was issued on ${issue}, before the active financial year cut-off (${fyCutoff}). Prior financial year certificates are frequently rejected on portal verification.`,
          next: missing
            ? "Enter the certificate issue date manually to verify financial year validity."
            : pass
              ? "Confirm that your state portal does not mandate a shorter 6-month validity window."
              : `Obtain a fresh income certificate issued after April 1, ${cycleStart} for the ${scholarship.currentCycle.academicYear} cycle.`,
        });
      }

      // Bonafide Session Match
      if (type === "bonafide") {
        const cyclePeriod = parsePeriod(scholarship.currentCycle.academicYear);
        const certPeriod = parsePeriod(fields.period?.value);
        const missing =
          !fields.period?.value || fields.period?.ambiguous || !certPeriod;
        const pass = !missing && cyclePeriod && certPeriod === cyclePeriod;
        schemeChecks.push({
          id: `scheme-bonafide-session-${scholarship.id}`,
          field: "period",
          label: "Academic Session Alignment",
          state: missing
            ? "Manual review required"
            : pass
              ? "Looks good"
              : "Needs attention",
          interpretation: missing
            ? `Active scholarship cycle is ${scholarship.currentCycle.academicYear}. Academic session could not be verified from the document.`
            : pass
              ? `Bonafide academic session (${fields.period.value}) matches the active scholarship cycle (${scholarship.currentCycle.academicYear}).`
              : `Bonafide academic session (${fields.period.value}) does not match the active application cycle (${scholarship.currentCycle.academicYear}).`,
          next: missing
            ? "Enter your academic session manually to verify alignment."
            : pass
              ? "Ensure the certificate contains the institute's official seal and signature."
              : `Institute verification officers will reject an outdated bonafide. Request an updated certificate for session ${scholarship.currentCycle.academicYear}.`,
        });
      }
    }

    // 4. Caste Category & Central OBC-NCL Check
    if (type === "caste") {
      if (
        Array.isArray(scholarship.eligibility?.casteCategories) &&
        scholarship.eligibility.casteCategories.length > 0
      ) {
        const catVal = fields.casteCategory?.value?.trim();
        const missing = !catVal || fields.casteCategory?.ambiguous;
        const pass =
          !missing &&
          scholarship.eligibility.casteCategories.some(
            (c) =>
              c.toLowerCase() === catVal.toLowerCase() ||
              (catVal.toUpperCase() === "OBC" &&
                c.toUpperCase().includes("OBC")),
          );
        schemeChecks.push({
          id: `scheme-caste-category-${scholarship.id}`,
          field: "casteCategory",
          label: "Eligible Category Verification",
          state: missing
            ? "Manual review required"
            : pass
              ? "Looks good"
              : "Needs attention",
          interpretation: missing
            ? `Scheme requires category in: ${scholarship.eligibility.casteCategories.join(", ")}. Category could not be identified.`
            : pass
              ? `Category "${catVal}" is eligible under this scheme (${scholarship.eligibility.casteCategories.join(", ")}).`
              : `Category "${catVal}" is not listed among eligible categories (${scholarship.eligibility.casteCategories.join(", ")}).`,
          next: missing
            ? "Select or enter your category manually to check compliance."
            : pass
              ? "Ensure the category on your application form matches this certificate."
              : "Verify eligibility guidelines to confirm if other reservation quotas apply.",
        });
      }

      if (
        (fields.casteCategory?.value === "OBC" ||
          fields.nonCreamyLayer?.value) &&
        (scholarship.state === "All India" ||
          scholarship.sourceType === "Government")
      ) {
        const hasCentralClause =
          fields.nonCreamyLayer?.value?.includes("36012/22/93") ||
          fields.nonCreamyLayer?.value?.includes("Non-Creamy Layer");
        schemeChecks.push({
          id: `scheme-caste-central-ncl-${scholarship.id}`,
          field: "nonCreamyLayer",
          label: "Central Portal OBC-NCL Clause",
          state: hasCentralClause ? "Looks good" : "Needs attention",
          interpretation: hasCentralClause
            ? "Central OBC Non-Creamy Layer resolution clause detected, meeting National Scholarship Portal (NSP) standards."
            : "Central/All India schemes require Central Government format OBC-NCL (citing DoPT OM 36012/22/93). State-list OBC certificates are rejected on Central portals.",
          next: hasCentralClause
            ? "Verify that the certificate was issued within the prescribed validity period."
            : "Obtain a Central format OBC-NCL certificate citing Central List gazette notifications from the Tehsildar / SDM office.",
        });
      }
    }
  }

  const applicable = rules.filter((r) => validRule(r, scholarshipId, type));
  for (const r of applicable) {
    const f = fields[r.field] || { value: "", ambiguous: false };
    const normalize = (value) =>
      /Date$/.test(r.field)
        ? parseDate(value)
        : r.field === "annualIncome"
          ? parseMoney(value)
          : r.field === "period"
            ? parsePeriod(value)
            : String(value ?? "").trim().toLowerCase();
    const actual = normalize(f.value),
      expected = normalize(r.expected ?? "");
    const missing =
      !f.value ||
      f.ambiguous ||
      actual === null ||
      (r.operator !== "present" && expected === null);
    const pass =
      !missing &&
      {
        present: true,
        eq: actual === expected,
        lte: actual <= expected,
        gte: actual >= expected,
        includes: String(actual).includes(String(expected)),
      }[r.operator];
    results.push({
      id: r.id,
      field: r.field,
      label: schemas[type].fields[r.field],
      rule: r,
      state: missing
        ? "Manual review required"
        : pass
          ? "Looks good"
          : "Needs attention",
      interpretation: missing
        ? "Insufficient evidence to evaluate this requirement."
        : pass
          ? "The reviewed value appears to satisfy this verified requirement."
          : "The reviewed value differs from this requirement.",
      next: "Check the source, applicable cycle and original certificate before applying.",
    });
  }

  // Append scheme criteria checks
  for (const check of schemeChecks) {
    results.push(check);
  }

  return {
    results,
    schemeVerified: applicable.length > 0 || schemeChecks.length > 0,
  };
}
