import { normalizeDigits } from "./text.js";

export const schemas = {
  income: {
    label: "Income Certificate",
    fields: {
      documentLabel: "Document wording",
      studentName: "Name on this document",
      issueDate: "Issue date",
      expiryDate: "Expiry date",
      validity: "Stated validity",
      validForYear: "Certificate valid for FY (if stated)",
      annualIncome: "Annual family income (INR)",
      authority: "Issuing designation",
      period: "Financial year / applicable period",
    },
  },
  bonafide: {
    label: "Bonafide Certificate",
    fields: {
      documentLabel: "Enrollment / document wording",
      studentName: "Name on this document",
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
      studentName: "Name on this document",
      casteCategory: "Category (OBC / SC / ST / EWS)",
      subCaste: "Caste / community name",
      nonCreamyLayer: "Central NCL clause / validity",
      issueDate: "Issue date",
      expiryDate: "Expiry date",
      validity: "Stated validity",
      validForYear: "Certificate valid for FY (if stated)",
      period: "Financial year / validity period",
      authority: "Issuing designation",
    },
  },
  ews: {
    label: "EWS / Income and Asset Certificate",
    fields: {
      documentLabel: "Document wording",
      studentName: "Name on this document",
      issueDate: "Issue date",
      expiryDate: "Expiry date",
      validity: "Stated validity",
      validForYear: "Certificate valid for FY (if stated)",
      period: "Income assessment financial year",
      authority: "Issuing designation",
    },
  },
  identity: {
    label: "ID / Marksheet / Bank Document",
    fields: {
      documentLabel: "Document wording",
      studentName: "Name on this document",
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
  const s = normalizeDigits(raw)
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
  const s = normalizeDigits(raw)
    .trim()
    .replace(/^(?:₹|rs\.?|inr|रु\.?|रूपये|रुपये|रुपए)\s*/i, "")
    .replace(/(?:\s*(?:\/-|only|मात्र|रूपये|रुपये|रुपए))+\s*$/i, "")
    .replace(/लाख/g, "lakh").replace(/करोड़/g, "crore")
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
  const m = normalizeDigits(raw).match(/\b(20\d{2})\s*[-–/]\s*(\d{4}|\d{2})\b/);
  if (!m) return null;
  const end = m[2].length === 2 ? Number(m[1].slice(0, 2) + m[2]) : +m[2];
  return end === +m[1] + 1 ? `${m[1]}-${end}` : null;
}
const datePattern =
  /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{1,2}(?:st|nd|rd|th)?[\s-]+[A-Za-z]+[\s,-]+\d{4})\b/g;
// Join only explicit standalone labels with their next line. PDF text layers and
// OCR often place a label and its value on separate lines; preserve both as evidence.
const standaloneLabel = /^(?:(?:(?:student|applicant|candidate|beneficiary|holder|account holder)(?:'s)?\s+)?(?:full\s+)?name|name of (?:the )?(?:student|applicant|candidate|beneficiary|account holder)|date of issue|issue date|issued on|expiry date|valid until|annual family income|financial year|academic (?:year|session)|institution(?: name)?|course|(?:आवेदक|विद्यार्थी|छात्र|छात्रा|अभ्यर्थी|लाभार्थी|प्रमाण\s*पत्र\s*धारक)\s*(?:का|की)?\s*नाम|नाम|जारी (?:दिनांक|तिथि)|निर्गमन तिथि|समाप्ति तिथि|परिवार की (?:कुल )?वार्षिक आय|वार्षिक पारिवारिक आय|पारिवारिक वार्षिक आय|वित्तीय वर्ष|शैक्षणिक (?:वर्ष|सत्र)|संस्थान का नाम|पाठ्यक्रम)\s*[:=：-]?$/iu;
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
  function add(key, value, original, page) {
    if (!fields[key]) return;
    if (value === null || value === undefined || value === "") return;
    const f = fields[key];
    value = String(value);
    if (f.evidence.some(e => e.value === value && e.text === original && e.page === page.page)) return;
    if (f.evidence.some((e) => e.value !== value)) {
      f.ambiguous = true;
      f.value = "";
    } else if (!f.ambiguous) f.value = value;
    f.source = page.method;
    f.evidence.push({
      text: original,
      page: page.page,
      value,
      method: page.method,
    });
  }
  for (const page of pages) {
    const lines = page.text.split(/\r?\n/).map(line => line.replace(/[\t ]+/g, " ").trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index++) {
      let original = lines[index], prepared = original;
      if (standaloneLabel.test(original) && lines[index + 1] && !standaloneLabel.test(lines[index + 1]) && !/[:=：]|^(?:father|mother|पिता|माता|जन्म)|certificate|प्रमाण\s*पत्र/iu.test(lines[index + 1])) {
        const next = lines[++index];
        prepared = `${original.replace(/\s*[:=：-]?$/, "")}: ${next}`;
        original += `\n${next}`;
      }
      const line = normalizeDigits(prepared).replace(/：/g, ":");
      if (!line) continue;
      // Hindi labels are parsed without translating personal names or guessing
      // unlabeled identities. Parent names and DOB are deliberately excluded.
      const hindiName = line.match(/(?:^|[/|])\s*(?:(?:आवेदक|विद्यार्थी|छात्र|छात्रा|अभ्यर्थी|लाभार्थी|प्रमाण\s*पत्र\s*धारक)\s*(?:का|की)?\s*)?नाम\s*[:=]\s*(.+)$/u);
      if (hindiName) {
        const name = hindiName[1].split(/\s+(?:पुत्र|पुत्री|पत्नी|पिता|माता|जन्म\s*तिथि|s\/o|d\/o|w\/o)(?:\s|:)/iu)[0].trim();
        if (name.length <= 200) add("studentName", name, original, page);
      }
      for (const [key, label] of [
        ["issueDate", /(?:जारी करने की (?:तिथि|तारीख)|जारी करने का दिनांक|जारी (?:दिनांक|तिथि)|निर्गमन (?:तिथि|दिनांक))\s*[:-]?\s*(.*)/u],
        ["expiryDate", /(?:समाप्ति (?:तिथि|दिनांक)|वैधता की अंतिम तिथि|वैधता समाप्ति|वैध (?:तक|तिथि))\s*[:-]?\s*(.*)/u],
      ]) {
        const tail = line.match(label)?.[1];
        for (const date of tail?.match(datePattern) || []) add(key, parseDate(date), original, page);
      }
      const hindiValidityYear = /(?:के लिए वैध|हेतु मान्य|वैधता).*?(?:वित्तीय वर्ष|वर्ष)/u.test(line);
      if (hindiValidityYear) add("validForYear", parsePeriod(line), original, page);
      const hindiValidity = line.match(/(?:^|\s)वैधता\s*[:=]\s*(.+)/u);
      if (hindiValidity) add("validity", hindiValidity[0].trim(), original, page);
      const authority = line.match(/तहसीलदार|नायब तहसीलदार|उप[ -]?जिलाधिकारी|जिलाधिकारी|राजस्व अधिकारी|प्राचार्य|कुलसचिव/u);
      if (authority && !/पिता|माता|व्यवसाय|आवेदक/u.test(line)) {
        const designations = { "तहसीलदार": "tehsildar", "जिलाधिकारी": "district magistrate", "राजस्व अधिकारी": "revenue officer", "प्राचार्य": "principal", "कुलसचिव": "registrar" };
        add("authority", designations[authority[0]] || authority[0], original, page);
      }
      if (type === "income") {
        if (/आय प्रमाण\s*पत्र/u.test(line)) add("documentLabel", "Income certificate", original, page);
        const income = line.match(/(?:परिवार की (?:कुल )?वार्षिक आय|वार्षिक पारिवारिक आय|पारिवारिक वार्षिक आय)\s*(?:है|:|=|;)?\s*(.+)$/u);
        if (income) add("annualIncome", parseMoney(income[1].replace(/\s*\([^)]*\)\s*$/u, "")), original, page);
      }
      if (["income", "ews", "caste"].includes(type) && !hindiValidityYear && /वित्तीय वर्ष|वित्त वर्ष|आय निर्धारण वर्ष/u.test(line))
        add("period", parsePeriod(line), original, page);
      if (type === "ews" && /आय और (?:परि)?संपत्ति प्रमाण\s*पत्र|आर्थिक रूप से कमजोर/u.test(line))
        add("documentLabel", "EWS / Income and Asset certificate", original, page);
      if (type === "caste") {
        if (/जाति प्रमाण\s*पत्र/u.test(line)) add("documentLabel", "Caste / Category certificate", original, page);
        const category = /अन्य पिछड़[ाे] वर्ग/u.test(line) ? "OBC" : /अनुसूचित जाति/u.test(line) ? "SC" : /अनुसूचित जनजाति/u.test(line) ? "ST" : /आर्थिक रूप से कमजोर/u.test(line) ? "EWS" : null;
        add("casteCategory", category, original, page);
        const subCaste = line.match(/^(?:उपजाति|समुदाय|जाति)\s*[:=]\s*([^:;]{2,80})$/u);
        if (subCaste && !/प्रमाण|अनुसूचित|पिछड़/u.test(subCaste[1])) add("subCaste", subCaste[1], original, page);
        if (/नॉन[ -]?क्रीमी[ -]?लेयर|गैर[ -]?क्रीमी[ -]?लेयर/u.test(line))
          add("nonCreamyLayer", "Non-Creamy Layer clause present", original, page);
      }
      if (type === "bonafide") {
        if (/बोनाफाइड|बोनाफाईड|अध्ययनरत प्रमाण\s*पत्र/u.test(line)) add("documentLabel", "Bonafide / enrollment wording", original, page);
        const institution = line.match(/^(?:संस्थान|विद्यालय|महाविद्यालय|विश्वविद्यालय)(?: का नाम)?\s*[:=]\s*(.+)$/u);
        if (institution) add("institution", institution[1], original, page);
        if (/शैक्षणिक (?:वर्ष|सत्र)|शैक्षिक सत्र/u.test(line)) add("period", parsePeriod(line), original, page);
        const course = line.match(/^(?:पाठ्यक्रम|डिग्री)\s*[:=]\s*(.{2,100})$/u);
        if (course) add("course", course[1], original, page);
        const study = line.match(/^(?:सेमेस्टर|अध्ययन का वर्ष)\s*[:=]\s*(.{1,80})$/u);
        if (study) add("study", study[0], original, page);
      }
      if (type === "identity" && /आधार|अंक[ -]?पत्र|अंकतालिका|बैंक पासबुक/u.test(line))
        add("documentLabel", line.match(/आधार|अंक[ -]?पत्र|अंकतालिका|बैंक पासबुक/u)[0], original, page);
      // Explicit holder/student labels only. Parent, issuer and institution
      // names are never guessed as the applicant's identity.
      const named = line.match(/^(?:(?:(?:student|applicant|candidate|beneficiary|holder|account holder)(?:'s)?\s+(?:full\s+)?name)|(?:name of (?:the )?(?:student|applicant|candidate|beneficiary|account holder))|(?:full name)|name)\s*[:=]\s*(.+)$/iu);
      if (named) {
        const name = named[1].split(/[,;]?\s+(?:s\/o|d\/o|w\/o|son of|daughter of|father(?:'s)? name|mother(?:'s)? name|dob\b|date of birth)/iu)[0].trim();
        if (name.length <= 200) add("studentName", name, original, page);
      }
      if (fields.validity) {
        const validity = line.match(/\b(?:valid (?:for|from)\s+|validity(?: period)?\s*:\s*)(.+)/i);
        if (validity) add("validity", validity[0], original, page);
      }
      const validityYearLine = /\b(?:valid for (?:the )?(?:financial year|f\.?y\.?|year)|(?:certificate )?validity(?: period)?\s*[:=-]?\s*(?:for\s+)?(?:the )?(?:financial year|f\.?y\.?|year))(?=\s|:)/i.test(line);
      if (validityYearLine)
        add("validForYear", parsePeriod(line), original, page);
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
            add(key, parseDate(date), original, page);
      }
      const designation = line.match(
        /\b(?:tehsildar|tahsildar|sub[- ]divisional magistrate|district magistrate|revenue officer|deputy commissioner|SDM|principal|registrar|head of (?:the )?institution|notary(?: public)?)\b/gi,
      );
      if (designation && !/father|mother|applicant|occupation/i.test(line))
        for (const d of designation)
          add("authority", d.toLowerCase(), original, page);
      if (type === "income") {
        if (/\bincome certificate\b/i.test(line))
          add("documentLabel", "Income certificate", original, page);
        const income = line.match(
          /(?:annual (?:family income|income of (?:the )?family)|(?:family income|income of (?:the )?family) (?:per annum|annually))\s*(?:is|:|=|;)?\s*(.+)$/i,
        );
        if (income)
          add(
            "annualIncome",
            parseMoney(income[1].replace(/\s*\(rupees\b.*\)\s*$/i, "")),
            original,
            page,
          );
        if (!validityYearLine && /financial year|\bf\.?y\.?(?=\s|:|-)|applicable period/i.test(line))
          add("period", parsePeriod(line), original, page);
      } else if (type === "ews") {
        if (/\bews\b|economically weaker section|income (?:and|&) asset certificate/i.test(line))
          add("documentLabel", "EWS / Income and Asset certificate", original, page);
        if (!validityYearLine && /financial year|\bf\.?y\.?(?=\s|:|-)|income (?:assessment|earned)/i.test(line))
          add("period", parsePeriod(line), original, page);
      } else if (type === "identity") {
        const kind = line.match(/\b(?:aadhaar|aadhar|pan card|passport|marksheet|mark sheet|statement of marks|bank passbook|pass book|bank statement)\b/i);
        if (kind) add("documentLabel", kind[0], original, page);
      } else if (type === "bonafide") {
        if (
          /bona\s?fide|bonafide|currently enrolled|is a (?:regular )?student|studying in/i.test(
            line,
          )
        )
          add("documentLabel", "Bonafide / enrollment wording", original, page);
        const institution = line.match(
          /^(?:name of (?:the )?(?:institution|college|university)|institution(?: name)?|college(?: name)?|university(?: name)?)\s*:\s*(.+)$/i,
        );
        if (institution && !/father|mother|student name/i.test(institution[1]))
          add("institution", institution[1], original, page);
        else if (
          /^[A-Z][A-Za-z .,&'-]{3,100}\b(?:College|University|Institute of [A-Za-z ]+)$/i.test(
            line,
          ) &&
          !/father|mother|student|certif|studying|enrolled|principal|registrar|name|this|that/i.test(
            line,
          )
        )
          add("institution", line, original, page);
        if (/academic (?:year|session)|session/i.test(line))
          add("period", parsePeriod(line), original, page);
        const course = line.match(/^(?:course|programme|program|degree)\s*[:-]\s*(.{2,100})$/i);
        if (course) add("course", course[1], original, page);
        const study = line.match(
          /\b(?:semester|year of study)\s*[:-]?\s*(?:[1-8]|[IVX]{1,5})\b|\b(?:[1-8](?:st|nd|rd|th)?|first|second|third|fourth)\s+(?:semester|year)\b/gi,
        );
        if (study) for (const s of study) add("study", s, original, page);
        const aishe = line.match(
          /AISHE(?: code)?\s*[:-]?\s*([CUScus]-\d{3,6})\b/,
        );
        if (aishe) add("aishe", aishe[1].toUpperCase(), original, page);
      } else if (type === "caste") {
        if (/(?:caste|community|category|tribe|backward class|ews)\s+certificate/i.test(line))
          add("documentLabel", "Caste / Category certificate", original, page);
        if (/\b(?:other backward class(?:es)?|obc(?:-ncl)?)\b/i.test(line))
          add("casteCategory", "OBC", original, page);
        else if (/\bscheduled caste\b|\bSC\b(?!\w)/i.test(line))
          add("casteCategory", "SC", original, page);
        else if (/\bscheduled tribe\b|\bST\b(?!\w)/i.test(line))
          add("casteCategory", "ST", original, page);
        else if (/\b(?:economically weaker section|ews)\b/i.test(line))
          add("casteCategory", "EWS", original, page);

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
          add("subCaste", matchedCaste.trim(), original, page);

        if (/36012\/22\/93/i.test(line))
          add("nonCreamyLayer", "DoPT OM 36012/22/93 reference detected; review NCL wording", original, page);
        else if (/(?:does not belong to the persons\/sections|non[- ]creamy layer|creamy layer column 3)/i.test(line))
          add("nonCreamyLayer", "Non-Creamy Layer clause present", original, page);
        else if (/belongs to (?:the )?creamy layer/i.test(line) && !/does not/i.test(line))
          add("nonCreamyLayer", "Creamy Layer indicated", original, page);

        if (!validityYearLine && /financial year|\bf\.?y\.?(?=\s|:|-)|valid for the year|validity period/i.test(line))
          add("period", parsePeriod(line), original, page);
      }
    }
  }
  return fields;
}
