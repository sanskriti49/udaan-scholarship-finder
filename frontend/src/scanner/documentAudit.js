import { parseDate, parsePeriod } from "./extract.js";

// Pure, bounded computations. No network, storage, analytics or account access.
export const MAX_COMPARISON_DOCUMENTS = 6;
export function indiaDate(now = new Date()) {
  if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return parseDate(now);
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function financialYear(now = new Date()) {
  const today = indiaDate(now);
  if (!today) return null;
  const start = Number(today.slice(0, 4)) - (today.slice(5) < "04-01" ? 1 : 0);
  return { today, label: `FY ${start}-${String(start + 1).slice(-2)}`, period: `${start}-${start + 1}`, start: `${start}-04-01`, end: `${start + 1}-03-31` };
}
const value = (fields, key) => fields[key]?.ambiguous ? "" : String(fields[key]?.value || "").trim();
const item = (id, tone, title, detail, next, fields = []) => ({ id, tone, title, detail, next, fields });

function relativeAnniversary(issue, clause) {
  // No inferred duration unless both the duration AND its issue-date basis are explicit.
  const match = clause.match(/^(?:validity(?: period)?\s*:\s*)?(?:valid\s+)?(?:for\s+)?(one|two|three|six|twelve|\d{1,2})\s+(day|month|year)s?\s+from\s+(?:the\s+)?(?:date of issue|issue date|issue|issuance)\.?$/i);
  if (!match) return null;
  const amount = ({ one: 1, two: 2, three: 3, six: 6, twelve: 12 })[match[1].toLowerCase()] || Number(match[1]);
  if (!(amount >= 1 && amount <= 60)) return null;
  const [year, month, day] = issue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (match[2].toLowerCase() === "day") date.setUTCDate(day + amount);
  else {
    const target = month - 1 + amount * (match[2].toLowerCase() === "year" ? 12 : 1);
    const last = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    date.setUTCFullYear(year, target, Math.min(day, last));
  }
  return date.toISOString().slice(0, 10);
}

export function auditCertificate(type, fields, now = new Date()) {
  const fy = financialYear(now), findings = [];
  if (!fy) return { fy: null, findings: [item("audit-date", "review", "Check date unavailable", "The review date could not be read.", "Check your device clock.")] };
  const issue = parseDate(value(fields, "issueDate"));
  const expiry = parseDate(value(fields, "expiryDate"));
  const validYear = parsePeriod(value(fields, "validForYear"));
  const category = value(fields, "casteCategory").toUpperCase();
  const ncl = /non[- ]creamy|\bobc[- ]ncl\b/i.test([category, value(fields, "documentLabel"), value(fields, "nonCreamyLayer")].join(" "));
  const fyRelevant = type === "income" || type === "ews" || type === "caste" && (category === "EWS" || /^OBC(?:[- ]NCL)?$/.test(category) && ncl);
  if (issue && expiry && expiry < issue) findings.push(item("date-order", "attention", "Dates conflict", "The stated expiry precedes the issue date.", "Correct OCR or confirm both dates against the original.", ["issueDate", "expiryDate"]));
  if (expiry) findings.push(item("expiry", expiry < fy.today ? "attention" : "note", expiry < fy.today ? "Stated expiry has passed" : "Stated expiry date recorded", `The document states ${expiry}. A recorded date does not establish portal acceptance.`, "Check renewal instructions and the provider's current requirements.", ["expiryDate"]));
  const validity = value(fields, "validity");
  const anniversary = issue && issue <= fy.today && !expiry ? relativeAnniversary(issue, validity) : null;
  if (anniversary) findings.push(item("relative-validity", anniversary <= fy.today ? "attention" : "note", anniversary <= fy.today ? "Stated validity period needs review" : "Stated validity period recorded", `The issue-date period reaches its anniversary on ${anniversary}. Inclusive end-date wording can differ.`, "Confirm the exact last valid date with the issuer; no expiry date has been substituted.", ["issueDate", "validity"]));
  else if (validity && !expiry && !validYear) findings.push(item("validity-clause", "review", "Validity wording needs interpretation", "A validity clause was recorded, but an exact end date was not established.", "Read the clause in the original and check the provider's rules.", ["validity"]));
  if (!fyRelevant) {
    if (type === "caste") findings.push(item("fy-scope", "note", "Category status is separate from FY proof", "An older category-certificate issue date alone does not establish expiry. An OBC label alone does not establish current NCL validity.", "Check whether separate income, EWS or NCL evidence is requested.", ["casteCategory", "nonCreamyLayer"]));
    return { fy, findings };
  }
  if (!issue) findings.push(item("fy-issue", "review", "Issue date needs review", "The issue date is missing, ambiguous or unreadable, so FY freshness was not checked.", "Read the issue date, not the birth date or income year, and correct the field.", ["issueDate"]));
  else if (issue > fy.today) findings.push(item("fy-issue", "attention", "Issue date is in the future", `The recorded issue date ${issue} is after today's India date ${fy.today}.`, "Correct the date before relying on this observation.", ["issueDate"]));
  else if (issue < fy.start) findings.push(item("fy-issue", "review", "Issued before the current financial year", `Issue date ${issue} belongs to ${financialYear(issue).label}; ${fy.label} began on ${fy.start}. This alone does not mean the certificate has expired.`, "Check whether this application requires a certificate issued in the current FY; request a fresh copy if it does.", ["issueDate"]));
  else findings.push(item("fy-issue", "note", "Issued during the current financial year", `Issue date ${issue} falls in ${fy.label}. This is a date observation, not a validity decision.`, "Still check the stated validity and the portal's certificate instructions.", ["issueDate"]));
  if (validYear) findings.push(item("validity-year", validYear === fy.period ? "note" : "review", validYear === fy.period ? "Current FY stated as validity year" : "Stated validity year differs", `The certificate explicitly states ${validYear}; the review is for ${fy.label}.`, "Check the application cycle and certificate's exact validity wording.", ["validForYear"]));
  const assessed = parsePeriod(value(fields, "period"));
  if (assessed && assessed !== fy.period) findings.push(item("assessment-year", "note", "Income year is separate from certificate validity", `The recorded income/applicable period is ${assessed}. A previous income year is not, by itself, an expired certificate.`, "Use the issue date and explicit validity clause for freshness review.", ["period"]));
  return { fy, findings };
}

function nameParts(raw) {
  if (typeof raw !== "string" || raw.length > 200 || /[^\p{L}\p{M}\s.'’\-\u200B-\u200D\uFEFF]/u.test(raw)) return null;
  // Remove Latin accents only; Indic vowel marks remain part of the name.
  const normalized = raw.normalize("NFKD").replace(/(\p{Script=Latin})\p{M}+/gu, "$1").replace(/[\u200B-\u200D\uFEFF]/g, "").toLowerCase();
  const tokens = normalized.match(/[\p{L}\p{M}]+/gu) || [];
  return tokens.length && tokens.length <= 12 ? tokens : null;
}
export function levenshtein(a, b) {
  const left = Array.from(a), right = Array.from(b);
  let row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (left[i] === right[j] ? 0 : 1)));
    row = next;
  }
  return row[right.length];
}
const initial = token => /^\p{L}\p{M}*$/u.test(token);
const aligned = (a, b) => a === b || initial(a) && b.startsWith(a) || initial(b) && a.startsWith(b);
const phonetic = token => /^[a-z]{4,}$/.test(token) ? token[0] + token.slice(1).replace(/[aeiouy]/g, "").replace(/(.)\1+/g, "$1") : null;
const comparison = (kind, title, detail) => ({ kind, title, detail, advisory: true });
const scripts = ["Latin", "Devanagari", "Bengali", "Gurmukhi", "Gujarati", "Oriya", "Tamil", "Telugu", "Kannada", "Malayalam", "Arabic", "Cyrillic", "Greek", "Han", "Hangul"].map(script => new RegExp(`\\p{Script=${script}}`, "u"));
const scriptOf = tokens => scripts.map((pattern, index) => pattern.test(tokens.join("")) ? index : -1).filter(index => index !== -1);

export function compareNames(left, right) {
  const a = nameParts(left), b = nameParts(right);
  if (!a || !b) return comparison("unknown", "Name needs review", "Enter a readable holder name. Numbers, missing text and unresolved OCR cannot establish a comparison.");
  if (a.join(" ") === b.join(" ")) return comparison("exact", "Same recorded spelling", "Names agree after case, punctuation and Latin-accent normalization. This does not verify identity.");
  if (a.join("") === b.join("")) return comparison("structure", "Spacing or punctuation differs", "The same letters are split differently. Check the exact spelling requested by the portal.");
  if ([...a].sort().join(" ") === [...b].sort().join(" ")) return comparison("structure", "Name order differs", "The same name parts appear in a different order. Confirm the provider's required order.");
  if (a.length === b.length && a.every((token, i) => aligned(token, b[i]))) return comparison("initials", "Initials and expanded names differ", "An initial may stand for a longer name, but initials alone cannot establish identity. Confirm the expansion against the original.");
  if (a.every(initial) || b.every(initial)) return comparison("unknown", "Initials alone need confirmation", "There is not enough full-name text for a reliable comparison. Confirm what the initials stand for.");
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let cursor = 0;
  for (const token of long) if (token === short[cursor]) cursor++;
  if (short.length >= 2 && cursor === short.length && a[0] === b[0] && a.at(-1) === b.at(-1)) return comparison("missing_parts", "A middle name part is missing", "The outer name parts agree, but one document has additional middle parts. Check whether the application must use the full name.");
  const scriptA = scriptOf(a), scriptB = scriptOf(b);
  if (scriptA.length !== 1 || scriptB.length !== 1 || scriptA[0] !== scriptB[0]) return comparison("unknown", "Different scripts need manual comparison", "No transliteration was attempted. Compare these names yourself or ask the issuer to confirm the spelling.");
  if (a.length === b.length && a.every((token, i) => token === b[i] || Math.min(Array.from(token).length, Array.from(b[i]).length) >= 4 && (levenshtein(token, b[i]) <= Math.max(1, Math.floor(Math.max(token.length, b[i].length) * .2)) || phonetic(token) && phonetic(token) === phonetic(b[i]))))
    return comparison("spelling", "Possible spelling variation", "Some letters or vowel spellings differ. This can reflect a typo or transliteration, and may also be a different person. Confirm before applying.");
  if (a.some(token => !initial(token) && b.includes(token))) return comparison("partial", "Only some name parts agree", "A shared name part is insufficient to confirm consistency. Compare the full holder names with your application.");
  return comparison("different", "Names differ substantially", "These recorded names have no reliable structural match. First check OCR, the document owner and the name on your application; contact the issuer if needed.");
}

export function auditNames(field, documents = [], declaredName = "", currentId = null) {
  const current = field?.ambiguous ? "" : field?.value || "";
  const references = [...(declaredName.trim() ? [{ id: "declared", label: "Name on your application", name: declaredName }] : []), ...documents.filter(doc => doc.id !== currentId).slice(0, MAX_COMPARISON_DOCUMENTS)];
  return references.map(ref => ({ id: ref.id, label: ref.label, name: ref.name, ...compareNames(current, ref.name) }));
}
