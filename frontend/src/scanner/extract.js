export const schemas = {
  income: {
    label: "Income Certificate",
    fields: {
      documentLabel: "Document wording",
      issueDate: "Issue date",
      expiryDate: "Expiry date",
      validity: "Stated validity",
      annualIncome: "Annual family income (INR)",
      authority: "Issuing designation",
      period: "Financial year / applicable period",
    },
  },
  bonafide: {
    label: "Bonafide Certificate",
    fields: {
      documentLabel: "Enrollment / document wording",
      institution: "Institution name",
      period: "Academic year / session",
      course: "Course / degree (if stated)",
      study: "Semester / year of study",
      issueDate: "Issue date",
      aishe: "AISHE code (optional)",
      authority: "Issuing designation",
    },
  },
  caste: {
    label: "Caste / Category Certificate",
    fields: {
      documentLabel: "Category / document wording",
      casteCategory: "Category (OBC / SC / ST / EWS)",
      subCaste: "Caste / community name",
      nonCreamyLayer: "Central NCL clause / validity",
      issueDate: "Issue date",
      period: "Financial year / validity period",
      authority: "Issuing designation",
    },
  },
};
const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
export function parseDate(raw) {
  const s = String(raw)
    .trim()
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/),
    y,
    mo,
    d;
  if (m) [, y, mo, d] = m;
  else if ((m = s.match(/^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4})$/)))
    [, d, mo, y] = m;
  else if ((m = s.match(/^(\d{1,2})[\s-]+([a-z]+)[\s,-]+(\d{4})$/i))) {
    [, d, mo, y] = m;
    mo = months.indexOf(mo.slice(0, 3).toLowerCase()) + 1;
  } else return null;
  y = +y;
  mo = +mo;
  d = +d;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1900 &&
    y <= 2100 &&
    mo > 0 &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
    ? date.toISOString().slice(0, 10)
    : null;
}
export function parseMoney(raw) {
  const s = String(raw)
    .trim()
    .replace(/^(?:₹|rs\.?|inr)\s*/i, "")
    .replace(/\s*(?:\/-|only)\s*$/i, "")
    .trim();
  const m = s.match(
    /^(\d+(?:\.\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d{1,2})?)\s*(lakh|lakhs|lac|lacs|crore|crores)?$/i,
  );
  if (!m) return null;
  const n =
    Number(m[1].replaceAll(",", "")) *
    (m[2] ? (/^c/i.test(m[2]) ? 1e7 : 1e5) : 1);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function parsePeriod(raw) {
  const m = String(raw).match(/\b(20\d{2})\s*[-–/]\s*(\d{4}|\d{2})\b/);
  if (!m) return null;
  const end = m[2].length === 2 ? Number(m[1].slice(0, 2) + m[2]) : +m[2];
  return end === +m[1] + 1 ? `${m[1]}-${end}` : null;
}
const datePattern =
  /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{1,2}(?:st|nd|rd|th)?[\s-]+[A-Za-z]+[\s,-]+\d{4})\b/g;
export function emptyFields(type) {
  return Object.fromEntries(
    Object.keys(schemas[type].fields).map((k) => [
      k,
      { value: "", source: "missing", evidence: [], ambiguous: false },
    ]),
  );
}
export function editField(field, value) {
  return { ...field, value, source: "manual", ambiguous: false };
}
export function extract(type, pages) {
  const fields = emptyFields(type);
  function add(key, value, line, page) {
    if (value === null || value === undefined || value === "") return;
    const f = fields[key];
    value = String(value);
    if (f.evidence.some((e) => e.value !== value)) {
      f.ambiguous = true;
      f.value = "";
    } else if (!f.ambiguous) f.value = value;
    f.source = page.method;
    f.evidence.push({
      text: line,
      page: page.page,
      value,
      method: page.method,
    });
  }
  for (const page of pages)
    for (const original of page.text.split(/\r?\n/)) {
      const line = original.replace(/[\t ]+/g, " ").trim();
      if (!line) continue;
      // Only dates attached to an explicit label; DOB and unlabeled dates are never issue dates.
      for (const [key, label] of [
        [
          "issueDate",
          /(?:date of issue|issue date|issued on|date of issuance|जारी दिनांक|दिनांक \/ date)\s*[:-]?\s*(.*)/i,
        ],
        [
          "expiryDate",
          /(?:expiry date|expires on|valid until|valid up to|valid upto)\s*[:-]?\s*(.*)/i,
        ],
      ]) {
        if (!fields[key]) continue;
        const tail = line.match(label)?.[1];
        if (tail)
          for (const date of tail.match(datePattern) || [])
            add(key, parseDate(date), line, page);
      }
      const designation = line.match(
        /\b(?:tehsildar|tahsildar|sub[- ]divisional magistrate|district magistrate|revenue officer|deputy commissioner|SDM|principal|registrar|head of (?:the )?institution|notary(?: public)?)\b/gi,
      );
      if (designation && !/father|mother|applicant|occupation/i.test(line))
        for (const d of designation)
          add("authority", d.toLowerCase(), line, page);
      if (type === "income") {
        if (/\bincome certificate\b/i.test(line))
          add("documentLabel", "Income certificate", line, page);
        const income = line.match(
          /(?:annual (?:family income|income of (?:the )?family)|(?:family income|income of (?:the )?family) (?:per annum|annually))\s*(?:is|:|=)?\s*(.+)$/i,
        );
        if (income)
          add(
            "annualIncome",
            parseMoney(income[1].replace(/\s*\(rupees\b.*\)\s*$/i, "")),
            line,
            page,
          );
        if (/financial year|\bf\.?y\.?(?=\s|:|-)|applicable period/i.test(line))
          add("period", parsePeriod(line), line, page);
        const validity = line.match(/\b(?:valid (?:for|from)\s+|validity(?: period)?\s*:\s*)(.+)/i);
        if (validity) add("validity", validity[0], line, page);
      } else if (type === "bonafide") {
        if (
          /bona\s?fide|bonafide|currently enrolled|is a (?:regular )?student|studying in/i.test(
            line,
          )
        )
          add("documentLabel", "Bonafide / enrollment wording", line, page);
        const institution = line.match(
          /^(?:name of (?:the )?(?:institution|college|university)|institution(?: name)?|college(?: name)?|university(?: name)?)\s*:\s*(.+)$/i,
        );
        if (institution && !/father|mother|student name/i.test(institution[1]))
          add("institution", institution[1], line, page);
        else if (
          /^[A-Z][A-Za-z .,&'-]{3,100}\b(?:College|University|Institute of [A-Za-z ]+)$/i.test(
            line,
          ) &&
          !/father|mother|student|certif|studying|enrolled|principal|registrar|name|this|that/i.test(
            line,
          )
        )
          add("institution", line, line, page);
        if (/academic (?:year|session)|session/i.test(line))
          add("period", parsePeriod(line), line, page);
        const course = line.match(/^(?:course|programme|program|degree)\s*[:-]\s*(.{2,100})$/i);
        if (course) add("course", course[1], line, page);
        const study = line.match(
          /\b(?:semester|year of study)\s*[:-]?\s*(?:[1-8]|[IVX]{1,5})\b|\b(?:[1-8](?:st|nd|rd|th)?|first|second|third|fourth)\s+(?:semester|year)\b/gi,
        );
        if (study) for (const s of study) add("study", s, line, page);
        const aishe = line.match(
          /AISHE(?: code)?\s*[:-]?\s*([CUScus]-\d{3,6})\b/,
        );
        if (aishe) add("aishe", aishe[1].toUpperCase(), line, page);
      } else if (type === "caste") {
        if (/(?:caste|community|category|tribe|backward class|ews)\s+certificate/i.test(line))
          add("documentLabel", "Caste / Category certificate", line, page);
        if (/\b(?:other backward class(?:es)?|obc(?:-ncl)?)\b/i.test(line))
          add("casteCategory", "OBC", line, page);
        else if (/\bscheduled caste\b|\bSC\b(?!\w)/i.test(line))
          add("casteCategory", "SC", line, page);
        else if (/\bscheduled tribe\b|\bST\b(?!\w)/i.test(line))
          add("casteCategory", "ST", line, page);
        else if (/\b(?:economically weaker section|ews)\b/i.test(line))
          add("casteCategory", "EWS", line, page);

        const subCasteMatch = line.match(
          /(?:belongs to the\s+([A-Za-z]{2,25})\s+(?:community|caste|sub[- ]caste)|(?:community|sub[- ]caste|caste)\s*[:-]\s*([A-Za-z]{2,25}))/i,
        );
        const matchedCaste = subCasteMatch?.[1] || subCasteMatch?.[2];
        if (
          matchedCaste &&
          !/^(?:government|india|certificate|backward|section|officer|tehsildar|magistrate|scheduled|other)$/i.test(
            matchedCaste,
          )
        )
          add("subCaste", matchedCaste.trim(), line, page);

        if (/36012\/22\/93/i.test(line))
          add("nonCreamyLayer", "DoPT OM 36012/22/93 reference detected; review NCL wording", line, page);
        else if (/(?:does not belong to the persons\/sections|non[- ]creamy layer|creamy layer column 3)/i.test(line))
          add("nonCreamyLayer", "Non-Creamy Layer clause present", line, page);
        else if (/belongs to (?:the )?creamy layer/i.test(line) && !/does not/i.test(line))
          add("nonCreamyLayer", "Creamy Layer indicated", line, page);

        if (/financial year|\bf\.?y\.?(?=\s|:|-)|valid for the year|validity period/i.test(line))
          add("period", parsePeriod(line), line, page);
      }
    }
  return fields;
}
