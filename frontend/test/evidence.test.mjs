import test from "node:test";
import assert from "node:assert/strict";
import { evidenceQuotes, documentItems } from "../src/utils/evidencePresentation.js";
import { cleanOfficialUrl, formatEvidenceText } from "../src/utils/formatEvidence.js";

test("descriptions and generated rules cannot become quotations", () => {
	assert.deepEqual(evidenceQuotes({ description: "Generic description", rules: [{ description: "Generated explanation" }] }), []);
});
test("stored quotations keep their exact text and are unverified until checked", () => {
	const quote = '"familyIncomeMax": 300000\n';
	const data = evidenceQuotes({ provenanceQuotes: [{ quote, sourceUrl: "https://example.gov.in/docs/Guidelines.pdf", page: 2 }] });
	assert.equal(data[0].quote, quote);
	assert.equal(data[0].verified, false);
	assert.equal(formatEvidenceText(quote), quote);
	assert.equal(cleanOfficialUrl(data[0].url), "https://example.gov.in/docs/Guidelines.pdf");
});
test("empty or failed server checks never inherit a verified local fallback", () => {
	const scholarship = { provenanceQuotes: [{ quote: "Local excerpt", sourceUrl: "https://example.gov.in/" }] };
	assert.deepEqual(evidenceQuotes(scholarship, { data: [] }), []);
	const [q] = evidenceQuotes(scholarship, { data: [{ quote: "Changed excerpt", url: "https://example.gov.in/", verified: false }] });
	assert.equal(q.verified, false);
	assert.equal(evidenceQuotes({}, { data: [{ quote: "Actual excerpt", url: "https://example.gov.in/", verified: true }] })[0].verified, true);
});
test("unsafe and missing URLs cannot become source links", () => {
	for (const url of [null, "invalid", "javascript:alert(1)", "https://user:password@example.gov.in/"]) assert.equal(cleanOfficialUrl(url), null);
});
test("legacy mandatory flags become suggestions, and failed source checks downgrade cited requirements", () => {
	const evidence = { field: "requiredDocuments.INCOME_CERT", quote: "Income certificate is required", url: "https://example.gov.in/", snapshotId: "a" };
	const scholarship = { requiredDocuments: [{ name: "Identity proof", mandatory: true }, { code: "INCOME_CERT", name: "Income certificate", mandatory: true, verificationStatus: "source_cited", evidence }] };
	const docs = documentItems(scholarship);
	assert.equal(docs[0].mandatory, false);
	assert.equal(docs[1].mandatory, true);
	assert.equal(documentItems(scholarship, { data: [{ ...evidence, verified: false }] })[1].mandatory, false);
});
