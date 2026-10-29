import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseDate,
  parseMoney,
  parsePeriod,
  extract,
  editField,
  emptyFields,
} from "../src/scanner/extract.js";
import { evaluate, validRule } from "../src/scanner/rules.js";
import { validateFile } from "../src/scanner/process.js";
import { readableText } from "../src/scanner/text.js";
const page = (text) => [{ text, page: 2, method: "ocr" }];
test("Indian dates are strict and never use JS date guessing", () => {
  for (const date of [
    "14/01/2025",
    "14.01.2025",
    "14-01-2025",
    "14 January 2025",
    "14th Jan 2025",
    "2025-01-14",
  ])
    assert.equal(parseDate(date), "2025-01-14");
  for (const date of ["31/02/2025", "01/13/2025", "02/03/25", "nonsense"])
    assert.equal(parseDate(date), null);
  assert.equal(parseDate("29/02/2024"), "2024-02-29");
});
test("Indian currency and year ranges", () => {
  for (const amount of ["Rs. 2,50,000/-", "INR 250,000", "₹250000", "2.5 lakh"])
    assert.equal(parseMoney(amount), 250000);
  assert.equal(parseMoney("1 crore"), 10000000);
  for (const amount of ["12,34", "2 lakh 50 thousand", "-100", "100 per month"])
    assert.equal(parseMoney(amount), null);
  assert.equal(parsePeriod("FY 2025-26"), "2025-2026");
  assert.equal(parsePeriod("Session 2025/2026"), "2025-2026");
  assert.equal(parsePeriod("2025-2027"), null);
  assert.equal(
    extract("income", page("Annual family income: 2 lakh 50 thousand"))
      .annualIncome.value,
    "",
  );
  assert.equal(
    extract("income", page("Annual family income: 100000 to 200000"))
      .annualIncome.value,
    "",
  );
});

test("Hindi and mixed-language certificates retain source evidence and parse Devanagari numerals", () => {
  const f = extract("income", page("आय प्रमाण पत्र\nआवेदक का नाम: अनिल कुमार\nपिता का नाम: रमेश कुमार\nजन्म तिथि: ०१/०१/२००४\nजारी दिनांक: १४/०१/२०२५\nपरिवार की वार्षिक आय: रु. २,५०,०००/-\nवित्तीय वर्ष: २०२५-२६\nसमाप्ति तिथि: ३१/०३/२०२६\nतहसीलदार"));
  assert.equal(f.studentName.value, "अनिल कुमार");
  assert.equal(f.issueDate.value, "2025-01-14");
  assert.equal(f.expiryDate.value, "2026-03-31");
  assert.equal(f.annualIncome.value, "250000");
  assert.equal(f.period.value, "2025-2026");
  assert.equal(f.authority.value, "tehsildar");
  assert.equal(f.issueDate.evidence[0].text, "जारी दिनांक: १४/०१/२०२५");
  assert.equal(parseMoney("२.५ लाख रुपये मात्र"), 250000);
  assert.equal(parseDate("३१/०२/२०२५"), null);
  const mixed = extract("income", page("Applicant name / आवेदक का नाम: अनिल कुमार\nAnnual family income: २,५०,०००/-\nDate of Issue: १४/०१/२०२५"));
  assert.equal(mixed.studentName.value, "अनिल कुमार");
  assert.equal(mixed.annualIncome.value, "250000");
  assert.equal(mixed.annualIncome.evidence[0].text, "Annual family income: २,५०,०००/-");
  const punctuation = extract("income", page("परिवार की वार्षिक आय; रु. २,५०,०००/-"));
  assert.equal(punctuation.annualIncome.value, "250000");
  assert.equal(punctuation.annualIncome.evidence[0].text, "परिवार की वार्षिक आय; रु. २,५०,०००/-");
});

test("split labels are recovered without treating parents or a birth date as student/issue details", () => {
  const f = extract("income", page("आवेदक का नाम\nअनिल कुमार\nजारी दिनांक:\n१४/०१/२०२५\nAnnual family income\nRs. 250000"));
  assert.equal(f.studentName.value, "अनिल कुमार");
  assert.equal(f.studentName.evidence[0].text, "आवेदक का नाम\nअनिल कुमार");
  assert.equal(f.issueDate.value, "2025-01-14");
  assert.equal(f.annualIncome.value, "250000");
  const unknown = extract("income", page("Name\nFather name: Ramesh Kumar\nजन्म तिथि: ०१/०१/२००४\nमासिक पारिवारिक आय: २००००\nवार्षिक आय: २०००००"));
  assert.equal(unknown.studentName.value, "");
  assert.equal(unknown.issueDate.value, "");
  assert.equal(unknown.annualIncome.value, "");
  const conflicting = extract("income", page("आवेदक का नाम: अनिल कुमार\nआवेदक का नाम: सुनील कुमार"));
  assert.equal(conflicting.studentName.ambiguous, true);
});

test("Hindi categories, study labels and explicit validity FY remain separate", () => {
  const caste = extract("caste", page("जाति प्रमाण पत्र\nअन्य पिछड़ा वर्ग\nजाति: यादव\nगैर-क्रीमी लेयर\nवित्तीय वर्ष: २०२४-२५\nवैधता वित्तीय वर्ष: २०२५-२६"));
  assert.equal(caste.casteCategory.value, "OBC");
  assert.equal(caste.subCaste.value, "यादव");
  assert.equal(caste.period.value, "2024-2025");
  assert.equal(caste.validForYear.value, "2025-2026");
  assert.equal(caste.expiryDate.value, "");
  const study = extract("bonafide", page("अध्ययनरत प्रमाण पत्र\nसंस्थान का नाम: उदाहरण महाविद्यालय\nशैक्षणिक सत्र: २०२५-२६\nपाठ्यक्रम: B.Tech\nसेमेस्टर: ३"));
  assert.equal(study.institution.value, "उदाहरण महाविद्यालय");
  assert.equal(study.period.value, "2025-2026");
  assert.equal(study.course.value, "B.Tech");
});

test("native Hindi PDF text is usable; broken font mappings fall back to OCR", () => {
  assert.equal(readableText("आय प्रमाण पत्र आवेदक का नाम परिवार की वार्षिक आय वित्तीय वर्ष तहसीलदार"), true);
  assert.equal(readableText("Scanner watermark"), false);
  assert.equal(readableText("आय प्रमाण पत्र आवेदक का नाम परिवार की वार्षिक आय" + "\uFFFD".repeat(15)), false);
});
test("income extraction distinguishes issue, birth and expiry dates", () => {
  const f = extract(
    "income",
    page(
      "INCOME CERTIFICATE\nDOB: 01/01/2004\nDate of Issue: 14/01/2025\nValid until: 31/03/2026\nAnnual family income: Rs. 2,50,000/-\nFinancial year: 2025-26\nTehsildar",
    ),
  );
  assert.equal(f.issueDate.value, "2025-01-14");
  assert.equal(f.expiryDate.value, "2026-03-31");
  assert.equal(f.annualIncome.value, "250000");
  assert.equal(f.period.value, "2025-2026");
  assert.equal(f.issueDate.evidence[0].text, "Date of Issue: 14/01/2025");
  assert.equal(f.issueDate.evidence[0].page, 2);
  assert.equal(
    extract("income", page("Date: 14/01/2025\nMonthly family income: 20000"))
      .issueDate.value,
    "",
  );
  assert.equal(
    extract("income", page("Annual income: 200000")).annualIncome.value,
    "",
  );
});
test("ambiguous values require review; manual edits retain original evidence", () => {
  const f = extract(
    "income",
    page("Issue date: 01/02/2025\nIssue date: 02/02/2025"),
  ).issueDate;
  assert.equal(f.ambiguous, true);
  assert.equal(f.value, "");
  const edited = editField(f, "2025-02-01");
  assert.equal(edited.source, "manual");
  assert.equal(edited.ambiguous, false);
  assert.equal(edited.evidence.length, 2);
});
test('explicit FY and validity labels do not manufacture an expiry date', () => {
  const f = extract('income', page('FY 2025-26\nValidity: One year from issue'));
  assert.equal(f.period.value, '2025-2026');
  assert.equal(f.validity.value, 'Validity: One year from issue');
  assert.equal(f.expiryDate.value, '');
});
test("bonafide extracts session, study and optional AISHE without confusing names", () => {
  const f = extract(
    "bonafide",
    page(
      "BONAFIDE CERTIFICATE\nThis is a regular student\nStudent name: Synthetic Student\nFather name: Example College\nInstitution: Sample Engineering College\nAcademic session: 2025-26\n3rd semester\nIssue date: 10 September 2025\nAISHE code: C-12345\nPrincipal",
    ),
  );
  assert.equal(f.institution.value, "Sample Engineering College");
  assert.equal(f.period.value, "2025-2026");
  assert.equal(f.study.value, "3rd semester");
  assert.equal(f.aishe.value, "C-12345");
  assert.equal(f.documentLabel.ambiguous, false);
  const result = evaluate("bonafide", emptyFields("bonafide"), "unknown");
  assert.equal(result.schemeVerified, false);
  assert.ok(!result.results.some((r) => r.state === "Looks good"));
});
// Synthetic rules exercise the engine only; these are never shipped as scholarship requirements.
const rule = {
  id: "synthetic-1",
  scholarshipId: "synthetic",
  documentType: "income",
  field: "annualIncome",
  operator: "lte",
  expected: 250000,
  sourceUrl: "https://example.gov.in/synthetic-test",
  excerpt:
    "SYNTHETIC TEST ONLY: Annual family income must not exceed INR 250000.",
  verifiedAt: "2026-01-01",
  verified: true,
};
test("provenance gate, verified pass/mismatch and incomplete evidence", () => {
  const f = emptyFields("income");
  f.annualIncome = editField(f.annualIncome, "200000");
  assert.equal(
    evaluate("income", f, "synthetic", [rule]).results.at(-1).state,
    "Looks good",
  );
  f.annualIncome.value = "300000";
  assert.equal(
    evaluate("income", f, "synthetic", [rule]).results.at(-1).state,
    "Needs attention",
  );
  f.annualIncome.ambiguous = true;
  assert.equal(
    evaluate("income", f, "synthetic", [rule]).results.at(-1).state,
    "Manual review required",
  );
  for (const change of [
    { excerpt: "" },
    { sourceUrl: "javascript:alert(1)" },
    { verified: false },
    { verifiedAt: "invalid" },
    { scholarshipId: "other" },
    { operator: "invented" },
  ])
    assert.ok(!validRule({ ...rule, ...change }, "synthetic", "income"));
  assert.equal(
    evaluate("income", f, "synthetic", [{ ...rule, excerpt: "" }])
      .schemeVerified,
    false,
  );
});
test("general dates and invalid manual values never fabricate compliance", () => {
  const f = emptyFields("income");
  f.issueDate = editField(f.issueDate, "2030-01-01");
  f.annualIncome = editField(f.annualIncome, "NaN");
  const r = evaluate("income", f, null, [], "2026-01-01");
  assert.equal(
    r.results.find((x) => x.field === "issueDate").state,
    "Needs attention",
  );
  assert.equal(
    r.results.find((x) => x.field === "annualIncome").state,
    "Needs attention",
  );
});
test("file signatures, extension and size are checked", async () => {
  assert.equal(
    await validateFile(new File(["%PDF-1.7 fake"], "synthetic.pdf")),
    "pdf",
  );
  await assert.rejects(
    validateFile(new File(["%PDF-1.7 fake"], "synthetic.png")),
  );
  await assert.rejects(validateFile(new File(["bad"], "synthetic.pdf")));
  await assert.rejects(validateFile(new File([], "synthetic.pdf")));
  await assert.rejects(validateFile({ size: 11 * 1024 * 1024 }));
});
test("scanner contains no persistence, API upload, or console logging sinks", async () => {
  for (const name of [
    "process.js",
    "extract.js",
    "rules.js",
    "useScanner.js",
    "Scanner.jsx",
    "scholarships.js",
    "documentAudit.js",
    "identitySession.js",
    "PreSubmissionAudit.jsx",
    "auditPresentation.js",
    "text.js",
  ]) {
    const code = await readFile(
      new URL(`../src/scanner/${name}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      code,
      /localStorage|sessionStorage|indexedDB|console\.|sendBeacon|FormData|method:\s*['"]POST/,
    );
  }
  const processCode = await readFile(
    new URL("../src/scanner/process.js", import.meta.url),
    "utf8",
  );
  assert.match(processCode, /cacheMethod: ["']none["']/);
  assert.match(processCode, /workerBlobURL: false/);
});

test("caste extraction detects OBC, Central DoPT OM 36012/22/93 clause, subcaste and authority", () => {
  const f = extract(
    "caste",
    page(
      "COMMUNITY AND CASTE CERTIFICATE\nThis is to certify that Candidate belongs to the Yadav community which is recognized as Other Backward Class\nOM No. 36012/22/93-Estt.(SCT)\nIssue date: 15/05/2024\nFinancial year: 2024-25\nTehsildar",
    ),
  );
  assert.equal(f.casteCategory.value, "OBC");
  assert.equal(f.subCaste.value, "Yadav");
  assert.match(f.nonCreamyLayer.value, /36012\/22\/93/);
  assert.equal(f.issueDate.value, "2024-05-15");
  assert.equal(f.period.value, "2024-2025");
  assert.equal(f.authority.value, "tehsildar");
});

test("catalogue metadata cannot manufacture certificate compliance", () => {
 const scheme = {id:'synthetic',currentCycle:{academicYear:'2025-26'},state:'All India',sourceType:'Government',eligibility:{familyIncome:{max:250000},casteCategories:['OBC']},requiredDocuments:['Income Certificate']};
 const f=emptyFields('income');f.annualIncome=editField(f.annualIncome,'180000');f.issueDate=editField(f.issueDate,'2024-02-10');
 const result=evaluate('income',f,scheme);
 assert.equal(result.schemeVerified,false);
 assert.ok(!result.results.some(item=>item.state==='Looks good'));
 assert.ok(!result.results.some(item=>/April 1|cut-off|reject/i.test(item.interpretation)));
 const caste=emptyFields('caste');caste.casteCategory=editField(caste.casteCategory,'OBC');
 assert.ok(!evaluate('caste',caste,scheme).results.some(item=>/require Non-Creamy|rejected/i.test(item.interpretation)));
 f.authority=editField(f.authority,'notary public');
 assert.equal(evaluate('income',f,scheme).results.find(item=>item.field==='authority').state,'Not verified');
});
test('explicit labelled course wording has evidence and can support a degree prefill',()=>{
 const fields=extract('bonafide',page('BONAFIDE CERTIFICATE\nCourse: B.Tech in Computer Science\nSemester: 3'));
 assert.equal(fields.course.value,'B.Tech in Computer Science');assert.equal(fields.course.evidence[0].page,2);
});
