import test from "node:test";
import assert from "node:assert/strict";
import { auditCertificate, financialYear, compareNames, auditNames, levenshtein } from "../src/scanner/documentAudit.js";
import { rememberName } from "../src/scanner/identitySession.js";
import { extract, emptyFields, editField } from "../src/scanner/extract.js";
import { eligiblePrefill } from "../src/scanner/prefill.js";

const fields = (type, values) => Object.fromEntries(Object.entries({ ...emptyFields(type), ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, source: "manual", ambiguous: false, evidence: [] }])) }));
const today = "2026-10-22";

test("FY boundary uses India time, including the instant before and after April 1", () => {
  assert.equal(financialYear(new Date("2026-03-31T18:29:59Z")).label, "FY 2025-26");
  assert.equal(financialYear(new Date("2026-03-31T18:30:00Z")).label, "FY 2026-27");
  assert.equal(financialYear("2024-02-29").start, "2023-04-01");
  assert.equal(financialYear("2026-03-31").end, "2026-03-31");
  assert.equal(financialYear("2026-02-30"), null);
  assert.equal(auditCertificate("income", {}, "invalid").findings[0].id, "audit-date");
});

test("an old issue date is a review prompt, never an automatically expired or rejected certificate", () => {
  const result = auditCertificate("income", fields("income", { issueDate: "2025-03-31" }), today);
  const finding = result.findings.find(f => f.id === "fy-issue");
  assert.equal(finding.tone, "review");
  assert.match(finding.detail, /FY 2024-25/);
  assert.match(finding.detail, /does not mean.*expired/);
  assert.ok(!result.findings.some(f => f.id === "expiry"));
});

test("assessment FY, validity FY and issue date remain separate observations", () => {
  const current = fields("ews", { issueDate: "2026-04-05", period: "2025-26", validForYear: "2026-27" });
  const result = auditCertificate("ews", current, today);
  assert.equal(result.findings.find(f => f.id === "fy-issue").tone, "note");
  assert.equal(result.findings.find(f => f.id === "validity-year").tone, "note");
  assert.equal(result.findings.find(f => f.id === "assessment-year").tone, "note");
  assert.ok(!result.findings.some(f => f.tone === "attention"));
  assert.equal(auditCertificate("ews", fields("ews", { issueDate: "2026-04-05", validForYear: "2025-26" }), today).findings.find(f => f.id === "validity-year").tone, "review");
});

test("SC/ST and a plain OBC status are not treated as FY-expiring NCL evidence", () => {
  for (const casteCategory of ["SC", "ST", "OBC"]) {
    const result = auditCertificate("caste", fields("caste", { casteCategory, issueDate: "2020-01-01" }), today);
    assert.ok(!result.findings.some(f => f.id === "fy-issue"));
  }
  const result = auditCertificate("caste", fields("caste", { casteCategory: "OBC", nonCreamyLayer: "Non-Creamy Layer clause present", issueDate: "2025-01-01" }), today);
  assert.equal(result.findings.find(f => f.id === "fy-issue").tone, "review");
  const referenceOnly = auditCertificate("caste", fields("caste", { casteCategory: "OBC", nonCreamyLayer: "DoPT OM 36012/22/93 reference detected; review NCL wording", issueDate: "2025-01-01" }), today);
  assert.ok(!referenceOnly.findings.some(f => f.id === "fy-issue"));
});

test("missing, conflicting and future issue dates are explicit, with no invented date", () => {
  for (const raw of ["", "31/02/2026"]) assert.equal(auditCertificate("income", fields("income", { issueDate: raw }), today).findings.find(f => f.id === "fy-issue").title, "Issue date needs review");
  const conflicting = fields("income", { issueDate: "2026-04-01" });
  conflicting.issueDate.ambiguous = true;
  assert.equal(auditCertificate("income", conflicting, today).findings.find(f => f.id === "fy-issue").tone, "review");
  assert.equal(auditCertificate("income", fields("income", { issueDate: "2027-01-01" }), today).findings.find(f => f.id === "fy-issue").tone, "attention");
});

test("explicit expiry includes the stated day, and conflicting dates remain visible", () => {
  const f = fields("income", { issueDate: "2026-05-01", expiryDate: today });
  assert.equal(auditCertificate("income", f, today).findings.find(f => f.id === "expiry").tone, "note");
  f.expiryDate = editField(f.expiryDate, "2026-10-21");
  assert.equal(auditCertificate("income", f, today).findings.find(f => f.id === "expiry").tone, "attention");
  f.issueDate = editField(f.issueDate, "2026-10-22");
  assert.ok(auditCertificate("income", f, today).findings.some(f => f.id === "date-order"));
});

test("relative validity requires an explicit issue-date basis and handles leap/month ends", () => {
  for (const [issueDate, validity, anniversary] of [["2024-02-29", "Valid for one year from issue", "2025-02-28"], ["2026-01-31", "Validity: 1 month from date of issue", "2026-02-28"], ["2026-10-01", "Valid for 30 days from issue date", "2026-10-31"]]) {
    const f = fields("income", { issueDate, validity });
    const finding = auditCertificate("income", f, today).findings.find(f => f.id === "relative-validity");
    assert.match(finding.detail, new RegExp(anniversary));
    assert.equal(f.expiryDate.value, "");
  }
  const uncertain = auditCertificate("income", fields("income", { issueDate: "2020-01-01", validity: "One year, subject to renewal conditions" }), today);
  assert.ok(!uncertain.findings.some(f => f.id === "relative-validity"));
  assert.ok(uncertain.findings.some(f => f.id === "validity-clause"));
});

for (const [a, b, kind] of [
  ["Sanskriti Sharma", "SANSKRITI  SHARMA", "exact"],
  ["José Kumar", "Jose Kumar", "exact"],
  ["A. Kumar", "Anil Kumar", "initials"],
  ["A. K.", "B. K.", "unknown"],
  ["Sanskriti S Sharma", "Sanskriti Sharma", "missing_parts"],
  ["Anil Kumar", "Kumar Anil", "structure"],
  ["Mary-Jane Rao", "Mary Jane Rao", "exact"],
  ["AnilKumar", "Anil Kumar", "structure"],
  ["Pooja Sharma", "Puja Sharma", "spelling"],
  ["Pooja", "Puja", "spelling"],
  ["Anil Kumar", "Sunil Kumar", "partial"],
  ["Asha Gupta", "Vikram Mehta", "different"],
  ["Ram", "Raj", "different"],
  ["अनिल कुमार", "Anil Kumar", "unknown"],
  ["ಅನಿಲ್", "अनिल", "unknown"],
  ["गीता", "गता", "different"],
  ["", "Anil", "unknown"],
  ["An1l Kumar", "Anil Kumar", "unknown"],
  ["x".repeat(201), "Name", "unknown"],
]) test(`name comparison: ${kind} for ${a.slice(0, 30)} / ${b}`, () => {
  assert.equal(compareNames(a, b).kind, kind);
  assert.equal(compareNames(b, a).kind, kind);
  assert.equal(compareNames(a, b).advisory, true);
});

test("Unicode edit distance does not split supplementary code points", () => {
  assert.equal(levenshtein("Anil", "Anil"), 0);
  assert.equal(levenshtein("Pooja", "Puja"), 2);
  assert.equal(levenshtein("𐐀", ""), 1);
});

test("holder extraction keeps evidence, rejects parent names and preserves conflicting applicant names", () => {
  const f = extract("income", [{ text: "INCOME CERTIFICATE\nFather name: Parent Kumar\nApplicant name: Anil Kumar DOB: 01/01/2004\nDate of issue: 05/04/2026", page: 1, method: "pdf" }]);
  assert.equal(f.studentName.value, "Anil Kumar");
  assert.match(f.studentName.evidence[0].text, /Applicant name/);
  const conflicting = extract("identity", [{ text: "Student name: Anil Kumar\nName: Sunil Kumar", page: 1, method: "ocr" }]);
  assert.equal(conflicting.studentName.ambiguous, true);
  assert.equal(conflicting.studentName.value, "");
  assert.equal(extract("identity", [{ text: "Father name: Anil Kumar\nInstitution name: Example College", page: 1, method: "pdf" }]).studentName.value, "");
});

test("EWS valid-for year and income-assessment year extract independently", () => {
  const f = extract("ews", [{ text: "INCOME AND ASSET CERTIFICATE\nName: Anil Kumar\nValid for the year 2026-27\nIncome assessment financial year: 2025-26\nIssue date: 05/04/2026", page: 1, method: "pdf" }]);
  assert.equal(f.validForYear.value, "2026-2027");
  assert.equal(f.period.value, "2025-2026");
  assert.equal(f.studentName.value, "Anil Kumar");
  assert.equal(f.expiryDate.value, "");
});

test("FY validity label variants never overwrite the separately stated income-assessment year", () => {
  for (const label of ["Valid for FY", "Valid for financial year", "Validity: FY", "Certificate validity year:"]) {
    const f = extract("ews", [{ text: `${label} 2026-27\nIncome assessment financial year: 2025-26`, page: 1, method: "pdf" }]);
    assert.equal(f.validForYear.value, "2026-2027", label);
    assert.equal(f.period.value, "2025-2026", label);
    assert.equal(f.period.ambiguous, false, label);
  }
});

test("private set is bounded, updatable and retains no filenames, raw text or full fields", () => {
  const field = { value: "Anil Kumar", source: "ocr", evidence: [{ text: "Private full OCR" }], filename: "private.pdf" };
  let documents = [];
  for (let i = 0; i < 8; i++) documents = rememberName(documents, { id: `id${i}`, type: "identity", field, bytes: "private bytes" });
  assert.equal(documents.length, 6);
  assert.deepEqual(Object.keys(documents[0]).sort(), ["id", "label", "name", "source"]);
  assert.doesNotMatch(JSON.stringify(documents), /Private full OCR|private\.pdf|private bytes/);
  documents = rememberName(documents, { id: "id0", type: "identity", field: { ...field, value: "A Kumar" } });
  assert.equal(documents.length, 6);
  assert.equal(documents[0].name, "A Kumar");
  assert.equal(rememberName(documents, { id: "new", type: "identity", field: { ...field, ambiguous: true } }), documents);
  assert.equal(auditNames(field, documents, "Anil Kumar", "id0").length, 6);
  assert.equal(auditNames({ ...field, ambiguous: true }, documents, "Anil Kumar")[0].kind, "unknown");
});

test("names and validity clauses are excluded from every eligibility handoff", () => {
  for (const type of ["income", "ews", "caste", "bonafide", "identity"]) {
    const prefill = eligiblePrefill(type, fields(type, { studentName: "PRIVATE SENTINEL", validity: "Private wording", annualIncome: "180000", casteCategory: "OBC" }));
    assert.doesNotMatch(JSON.stringify(prefill), /PRIVATE SENTINEL|Private wording|studentName|validity/);
  }
});
