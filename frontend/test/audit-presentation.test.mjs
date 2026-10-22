import test from "node:test";
import assert from "node:assert/strict";
import { markedNameParts, auditDateTrail, auditDateLabel } from "../src/scanner/auditPresentation.js";
import { financialYear } from "../src/scanner/documentAudit.js";

test("name highlights preserve original characters and separators, without rewriting a name", () => {
  for (const name of ["A. Kumar Sharma", "  Anil–Kumar  Sharma", "సంస్కృతి శర్మ", "पूजा शर्मा", "José O’Neil"]) {
    const parts = markedNameParts(name, "Anil Kumar Sharma");
    assert.equal(parts.map(part => part.text).join(""), name);
  }
  assert.deepEqual(markedNameParts("A. Kumar Sharma", "Anil Kumar Sharma").filter(part => part.changed).map(part => part.text), ["A"]);
  assert.deepEqual(markedNameParts("Anil Sharma", "Anil Kumar Sharma").filter(part => part.changed), []);
  assert.deepEqual(markedNameParts("పూజ శర్మ", "పుజ శర్మ").filter(part => part.changed).map(part => part.text), ["పూజ"]);
});

test("exact and unknown comparisons can suppress highlights; case normalization is display-only", () => {
  assert.ok(markedNameParts("ANIL sharma", "Anil Sharma").every(part => !part.changed));
  assert.ok(markedNameParts("José O’Neil", "Jose O'Neil", false).every(part => !part.changed));
  assert.equal(markedNameParts("<img onerror=alert(1)>", "").map(part => part.text).join(""), "<img onerror=alert(1)>");
  assert.deepEqual(markedNameParts(null, null), []);
});

test("date trail orders only recorded dates and the real FY/review boundaries", () => {
  const fy = financialYear("2026-10-22");
  const fields = { issueDate: { value: "31/03/2025" }, expiryDate: { value: "2027-03-31" } };
  const original = JSON.stringify(fields);
  assert.deepEqual(auditDateTrail(fields, fy).map(({ id, date }) => [id, date]), [
    ["issue", "2025-03-31"], ["fy", "2026-04-01"], ["today", "2026-10-22"], ["expiry", "2027-03-31"],
  ]);
  assert.deepEqual(auditDateTrail(fields, fy, false).map(point => point.id), ["issue", "today", "expiry"]);
  assert.equal(JSON.stringify(fields), original);
});

test("ambiguous and invalid dates are omitted; a future issue appears after review, not before", () => {
  const fy = financialYear("2026-10-22");
  assert.deepEqual(auditDateTrail({ issueDate: { value: "2026-02-30" }, expiryDate: { value: "2025-01-01", ambiguous: true } }, fy).map(point => point.id), ["fy", "today"]);
  assert.deepEqual(auditDateTrail({ issueDate: { value: "2027-01-01" } }, fy).map(point => point.id), ["fy", "today", "issue"]);
  assert.deepEqual(auditDateTrail({}, null), []);
});

test("date labels use parsed dates without time-zone shifts or invented values", () => {
  assert.match(auditDateLabel("2026-04-01"), /^1 Apr 2026$/);
  assert.equal(auditDateLabel("01/04/2026"), auditDateLabel("2026-04-01"));
  assert.equal(auditDateLabel("2026-02-30"), "Not recorded");
  assert.equal(auditDateLabel(null), "Not recorded");
});
