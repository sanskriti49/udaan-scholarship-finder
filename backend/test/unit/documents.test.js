import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { htmlToText, toDocument } from "../../src/pipeline/core/documents.js";
import { nspSchemeListAdapter } from "../../src/pipeline/adapters/nspSchemeList.js";
import { guidelinePdfAdapter } from "../../src/pipeline/adapters/guidelinePdf.js";
import { makeEvidence, verifyEvidence } from "../../src/pipeline/core/evidence.js";
import { sha256 } from "../../src/pipeline/core/http.js";
import { NSP } from "../helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// SYNTHETIC markup modelled on the structure observed on the NSP listing.
// It exercises the live-HTML code path; it is not a copy of the real page.
const SYNTHETIC_NSP_HTML = `<!doctype html><html><body>
<script>var x = "Scheme Open from : 01-01-1999";</script>
<header><a href="/home"><img src="/logo.svg"></a><h6><b>Academic Year 2026-27</b></h6></header>
<ul><li><a href="/ApplicationForm/">Apply For Scholarship</a></li></ul>
<section>
  <h5>Schemes On NSP</h5>
  <div class="ministry"><span>Ministry of Testing</span></div>
  <div class="card">
    <img src="/public/MinistryImages/testing.png">
    <h6>Example Scholarship For Girl Students ( Technical Degree) (Merit Based Scheme)</h6>
    <p>Scheme Open from : 01-06-2026 Student Application Open till : 31-10-2026 Defective Application Verification Open till:15-11-2026 Institute Verification Open till:15-11-2026 DNO/SNO/MNO Verification Open till:30-11-2026</p>
    <p><a href="/public/schemeGuidelines/Example Guide.pdf">Specifications</a> <a href="https://evil.example/faq.pdf">FAQ</a></p>
  </div>
  <div class="card">
    <img src="/public/MinistryImages/testing.png">
    <h6>Another Scholarship Scheme (Welfare Based Scheme)</h6>
    <p>Scheme Open from (for Renewal): 01-06-2026 Student Application Open till (for Renewal): 31-02-2026 Institute Verification Open till (for Renewal):15-10-2026</p>
    <p><a href="/null">Specifications</a></p>
  </div>
</section></body></html>`;

function snapshotFor(doc, url) {
	return { id: "a".repeat(24), sourceId: "t", url, fetchedAt: new Date(), sha256: "x", textHash: doc.textHash ?? sha256(doc.text), text: doc.text, pages: doc.pages };
}

test("HTML is normalised to the same shape as captured text and parsed by the NSP adapter", async () => {
	const url = "https://scholarships.gov.in/All-Scholarships";
	const doc = await toDocument({ url, finalUrl: url, contentType: "text/html", body: Buffer.from(SYNTHETIC_NSP_HTML) });
	assert.equal(doc.kind, "html");
	assert.ok(!doc.text.includes("01-01-1999"), "script content is dropped");
	assert.match(doc.text, /\[Apply For Scholarship\]\(https:\/\/scholarships\.gov\.in\/ApplicationForm\/\)/);

	const out = nspSchemeListAdapter.extract(doc, snapshotFor(doc, url), { source: { ...NSP, minExpectedSchemes: 1 } });
	assert.equal(out.pageFacts.academicYear, "2026-27");
	assert.equal(out.records.length, 2);

	const [first, second] = out.records;
	assert.equal(first.fields.organization, "Ministry of Testing");
	assert.equal(first.fields.level, "UG");
	assert.equal(first.fields.gender, "Female");
	assert.equal(first.links.guidelinesUrl, "https://scholarships.gov.in/public/schemeGuidelines/Example%20Guide.pdf");
	assert.equal(first.links.faqUrl, null, "off-domain FAQ link is not stored");
	assert.ok(first.issues.some((i) => i.code === "official_link_invalid" && i.details.reason === "domain_not_allowed"));
	assert.equal(first.cycles[0].applicationType, "general");
	assert.equal(first.cycles[0].closesAt.toISOString(), "2026-10-31T18:29:59.999Z");

	assert.equal(second.cycles.length, 0, "31-02-2026 is not a real date: no cycle recorded");
	assert.ok(second.issues.some((i) => i.code === "unparseable_date" && i.severity === "blocking"));
	assert.ok(second.issues.some((i) => i.details?.reason === "placeholder_url"));

	for (const r of out.records) {
		for (const e of r.evidence) assert.ok(verifyEvidence(e, snapshotFor(doc, url)).ok, `${e.field}: ${e.quote}`);
	}
});

test("a page without the scheme section is rejected, not parsed as zero schemes", async () => {
	const url = "https://scholarships.gov.in/All-Scholarships";
	const doc = await toDocument({ url, contentType: "text/html", body: Buffer.from("<html><body><h6>Academic Year 2026-27</h6><p>Service unavailable</p></body></html>") });
	const out = nspSchemeListAdapter.extract(doc, snapshotFor(doc, url), { source: NSP });
	assert.equal(out.records.length, 0);
	assert.equal(out.issues[0].code, "page_structure_changed");
});

test("real PDF bytes: text extracted per page and citations carry page numbers (synthetic PDF)", async () => {
	const url = "https://scholarships.gov.in/public/schemeGuidelines/synthetic.pdf";
	const body = fs.readFileSync(path.join(here, "../fixtures/synthetic/two-page-guideline.pdf"));
	const doc = await toDocument({ url, contentType: "application/pdf", body });
	assert.equal(doc.kind, "pdf");
	assert.equal(doc.pages.length, 2);
	const snap = snapshotFor(doc, url);
	const out = guidelinePdfAdapter.extract({ ...doc, quality: { ocrSuspect: false } }, snap, { linkedSchemeKeys: ["k"], academicYear: "2026-27" });
	assert.equal(out.facts.familyIncome.max, 600000);
	assert.equal(out.facts.familyIncome.evidence[0].page, 1);
	assert.equal(out.facts.amount.value, 30000);
	assert.equal(out.facts.amount.evidence[0].page, 2);
	assert.ok(verifyEvidence(out.facts.amount.evidence[0], snap).ok);
});

test("evidence verification detects tampering and wrong snapshots", () => {
	const snap = { id: "b".repeat(24), url: "https://scholarships.gov.in/x", textHash: "h1", text: "Family income upto Rs. 4.5 lakh per annum." };
	const ev = makeEvidence(snap, "Rs. 4.5 lakh", { field: "familyIncome" });
	assert.ok(verifyEvidence(ev, snap).ok);
	assert.equal(verifyEvidence({ ...ev, quote: "Rs. 8 lakh" }, snap).reason, "quote_not_at_offset");
	assert.equal(verifyEvidence(ev, { ...snap, textHash: "h2" }).reason, "text_hash_mismatch");
	assert.equal(verifyEvidence(ev, { ...snap, url: "https://scholarships.gov.in/y" }).reason, "url_mismatch");
	assert.equal(makeEvidence(snap, "Rs. 9 lakh"), null, "unlocatable quotes produce no evidence");
});

test("whitespace-tolerant quote location stores the exact matched text", () => {
	const snap = { id: "c".repeat(24), url: "u", textHash: "h", text: "should not be more than\nRs. 8 lakh per annum" };
	const ev = makeEvidence(snap, "should not be more than Rs. 8 lakh");
	assert.equal(ev.quote, "should not be more than\nRs. 8 lakh");
	assert.ok(verifyEvidence(ev, snap).ok);
});

test("buildRequiredDocuments generates statutory baseline and criteria-derived documents", async () => {
	const { buildRequiredDocuments } = await import("../../src/pipeline/core/requiredDocuments.js");

	// Baseline scheme
	const baseline = buildRequiredDocuments({}, { fields: { title: "National Merit Scholarship" } });
	const baselineCodes = baseline.map((d) => d.code);
	assert.ok(baselineCodes.includes("AADHAAR"));
	assert.ok(baselineCodes.includes("MARKSHEET"));
	assert.ok(baselineCodes.includes("BONAFIDE_CERT"));
	assert.ok(baselineCodes.includes("ADMISSION_PROOF"));
	assert.ok(baselineCodes.includes("BANK_PASSBOOK"));
	assert.ok(!baselineCodes.includes("INCOME_CERT"));
	assert.ok(!baselineCodes.includes("CASTE_CERT"));

	// Means-tested, SC/ST, girl student scheme in UP
	const specialized = buildRequiredDocuments(
		{
			familyIncome: { max: 250000 },
			casteGroups: ["SC", "ST"],
			gender: "Female",
			disabilityRequired: true,
			minDisabilityPercent: { value: 40 },
		},
		{ fields: { title: "UP Post-Matric Scholarship for Girls with Disabilities", tags: ["SC/ST", "Need based"] } },
		{},
		"Uttar Pradesh",
	);
	const specializedCodes = specialized.map((d) => d.code);
	assert.ok(specializedCodes.includes("INCOME_CERT"));
	assert.ok(specializedCodes.includes("CASTE_CERT"));
	assert.ok(specializedCodes.includes("DISABILITY_CERT"));
	assert.ok(specializedCodes.includes("DOMICILE_CERT"));
	assert.ok(specializedCodes.includes("AFFIDAVIT_FEMALE"));
});

test("ruleEvaluator matches student held documents using code aliases", async () => {
	const { evaluateEligibility } = await import("../../src/engine/ruleEvaluator.js");

	const scholarship = {
		schemeKey: "test:scheme:1",
		rules: [],
		requiredDocuments: [
			{ code: "AADHAAR", name: "Aadhaar Card" },
			{ code: "ADMISSION_PROOF", name: "Admission Proof" },
			{ code: "INCOME_CERT", name: "Income Certificate" },
		],
	};

	// Student holds COLLEGE_ID (alias for ADMISSION_PROOF) and AADHAAR
	const studentProfile = {
		familyIncome: 200000,
		gender: "Any",
		documentsHeld: ["COLLEGE_ID", "AADHAAR"],
	};

	const result = evaluateEligibility(studentProfile, scholarship);
	assert.ok(result);
	assert.equal(result.documentAudit.total, 3);
	assert.equal(result.documentAudit.heldCount, 2);
	assert.equal(result.documentAudit.missingCount, 1);
	assert.equal(result.documentAudit.missing[0].code, "INCOME_CERT");
	assert.equal(result.documentAudit.percentage, 67);
});

