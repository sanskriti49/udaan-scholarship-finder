import { parseDate, parseMoney, parsePeriod, schemas } from "./extract.js";

// Certificate requirements need source excerpts, not inferred catalogue metadata.
// Keep production decisions disabled until cycle-scoped rules are reviewed.
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
      else if (!String(f.value).trim())
        issue =
          ["aishe", "course", "expiryDate", "validity", "nonCreamyLayer", "subCaste"].includes(key)
            ? "Optional detail not recorded. Check the original and the scheme’s requirements."
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


      return {
        id: key,
        field: key,
        label,
        optional: ["aishe", "course", "expiryDate", "validity", "nonCreamyLayer", "subCaste"].includes(key),
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


  return {
    results,
    schemeVerified: applicable.length > 0,
  };
}
