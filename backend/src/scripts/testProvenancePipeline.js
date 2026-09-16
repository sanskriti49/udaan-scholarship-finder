import { ProvenanceExtractor } from "../ingestion/core/ProvenanceExtractor.js";
import { Validator } from "../ingestion/core/Validator.js";
import { evaluateEligibility } from "../engine/ruleEvaluator.js";

async function runProvenanceTestSuite() {
	console.log("================================================================================");
	console.log("             UDAAN PROVENANCE & CITATION PIPELINE TEST SUITE                    ");
	console.log("================================================================================\n");

	let passedTests = 0;
	let totalTests = 0;

	function assert(desc, condition, details = "") {
		totalTests++;
		if (condition) {
			console.log(`  [PASS] Test ${totalTests}: ${desc}`);
			passedTests++;
		} else {
			console.error(`  [FAIL] Test ${totalTests}: ${desc} ${details ? `-> ${details}` : ""}`);
		}
	}

	// ---------------------------------------------------------------------------
	// SUITE 1: Strict Schema Validation & Sanitization
	// ---------------------------------------------------------------------------
	console.log("\n--- Suite 1: Strict Provenance Quote Schema Validation ---");

	const validQuote = {
		clause: "Official Guidelines §3.2: Financial Eligibility",
		quote: "Total family income from all sources should not exceed Rs. 3.00 Lakh per annum.",
		sourceUrl: "https://www.aicte.gov.in/schemes/pragati/guidelines.pdf",
		page: 3,
		textFragment: "Total family income from all sources",
		confidenceScore: 0.96,
	};

	const resValid = ProvenanceExtractor.validateProvenanceQuote(validQuote);
	assert("Valid quote conforms to strict schema", resValid.isValid && resValid.quote !== null);
	assert("Retains exact page number (3)", resValid.quote?.page === 3);
	assert("Retains exact confidenceScore (0.96)", resValid.quote?.confidenceScore === 0.96);
	assert("Retains textFragment", resValid.quote?.textFragment === "Total family income from all sources");

	// Malformed quotes rejection
	const badQuotes = [
		{ quote: "Missing clause", sourceUrl: "https://example.com/doc.pdf" },
		{ clause: "Valid Clause", sourceUrl: "https://example.com/doc.pdf" }, // missing quote
		{ clause: "Clause", quote: "Valid quote content here", sourceUrl: "javascript:alert(1)" }, // unsafe URL
		{ clause: "Clause", quote: "Valid quote content here", sourceUrl: "not-a-url" }, // malformed URL
		{ clause: "Clause", quote: "Valid quote content here", sourceUrl: "https://example.com", page: -5 }, // negative page
		{ clause: "Clause", quote: "Valid quote content here", sourceUrl: "https://example.com", confidenceScore: 1.8 }, // score > 1
	];

	for (const bq of badQuotes) {
		const resBad = ProvenanceExtractor.validateProvenanceQuote(bq);
		assert(`Rejects invalid quote (${JSON.stringify(bq).slice(0, 45)}...)`, !resBad.isValid);
	}

	// ---------------------------------------------------------------------------
	// SUITE 2: Text Fragment Generation
	// ---------------------------------------------------------------------------
	console.log("\n--- Suite 2: Chrome Text Fragment Generation ---");

	const longQuote = "Candidates belonging to SC/ST pursuing higher postgraduate education in recognized Indian institutions.";
	const fragment = ProvenanceExtractor.generateTextFragment(longQuote);
	assert("Generates clean distinctive text fragment", typeof fragment === "string" && fragment.length > 10);
	assert("Fragment contains words from quote", fragment.includes("Candidates") && fragment.includes("belonging"));

	// ---------------------------------------------------------------------------
	// SUITE 3: HTML Extraction with Direct PDF Circular Resolution
	// ---------------------------------------------------------------------------
	console.log("\n--- Suite 3: Cheerio HTML Extraction & Attachment Resolution ---");

	const sampleHtml = `
		<section>
			<h2>Official Scholarship Gazette Directives</h2>
			<a href="/circulars/2026/notice_452.pdf">Download Official Gazette Notification (PDF)</a>
			<div class="guidelines-content">
				<p>Directive §1.1: Students having annual family income not exceeding Rs. 4.5 lakh per annum qualify for full tuition waiver.</p>
				<p>Directive §2.3: Applicants must maintain a minimum undergraduate academic score of 7.5 CGPA in engineering stream.</p>
			</div>
		</section>
	`;

	const extractedQuotes = ProvenanceExtractor.extractFromHtml(sampleHtml, {
		pageUrl: "https://www.ugc.gov.in/notices/view",
		baseUrl: "https://www.ugc.gov.in",
	});

	assert("Extracted quotes from HTML document", extractedQuotes.length >= 2);
	assert(
		"Resolved direct PDF circular attachment as sourceUrl",
		extractedQuotes[0]?.sourceUrl === "https://www.ugc.gov.in/circulars/2026/notice_452.pdf"
	);
	assert("Has textFragment generated for Chrome highlighting", Boolean(extractedQuotes[0]?.textFragment));
	assert("Has calculated confidence score >= 0.8", extractedQuotes[0]?.confidenceScore >= 0.8);

	// ---------------------------------------------------------------------------
	// SUITE 4: Ingestion Validator Integration
	// ---------------------------------------------------------------------------
	console.log("\n--- Suite 4: Validator Schema Enforcement ---");

	const testItem = {
		title: "UGC Post-Graduate Indira Gandhi Scholarship",
		organization: "University Grants Commission",
		sourceUrl: "https://www.ugc.gov.in/pdfnews/2781359_NSP-Schemes.pdf",
		amount: { value: 36200 },
		deadline: new Date("2026-11-30"),
		category: "Women",
		rules: [
			{ field: "gender", operator: "EQ", targetValue: "Female" },
		],
		requiredDocuments: [{ code: "AADHAAR", name: "Aadhaar Card" }],
		provenanceQuotes: [
			{
				clause: "Official Scheme Guidelines §1.2",
				quote: "Any single girl child of her parents pursuing a regular Master's degree in any recognized university.",
				sourceUrl: "https://www.ugc.gov.in/pdfnews/2781359_NSP-Schemes.pdf",
				page: 2,
				confidenceScore: 0.95,
			},
		],
	};

	const vResult = Validator.validate(testItem);
	assert("Item with strict provenanceQuotes passes validation", vResult.isValid);

	// Invalidate quote
	testItem.provenanceQuotes[0].sourceUrl = "javascript:alert(1)";
	const vResultInvalid = Validator.validate(testItem);
	assert("Item with unsafe provenance quote sourceUrl is quarantined", !vResultInvalid.isValid);

	// ---------------------------------------------------------------------------
	// SUITE 5: Rule Evaluator Provenance Fidelity (No Fabricated Fallbacks)
	// ---------------------------------------------------------------------------
	console.log("\n--- Suite 5: Rule Evaluator Provenance Fidelity ---");

	const testScholarshipWithQuotes = {
		title: "AICTE Pragati Scheme",
		rules: [
			{ id: "r_income", field: "familyIncome", operator: "LTE", targetValue: 300000 },
		],
		provenanceQuotes: [
			{
				ruleId: "r_income",
				clause: "Directive §3.2",
				quote: "Total family income from all sources should not exceed Rs. 3.00 Lakh per annum.",
				sourceUrl: "https://www.aicte.gov.in/schemes/pragati/guidelines.pdf",
				page: 3,
				textFragment: "Total family income from all sources",
				confidenceScore: 0.96,
			},
		],
	};

	const evalResult1 = evaluateEligibility({ familyIncome: 200000 }, testScholarshipWithQuotes);
	const passedRule = evalResult1.passedRules[0];
	assert("Passed rule retains verified citation", passedRule?.citation !== null);
	assert("Citation retains exact sourceUrl (PDF)", passedRule?.citation?.sourceUrl === "https://www.aicte.gov.in/schemes/pragati/guidelines.pdf");
	assert("Citation retains exact page number (3)", passedRule?.citation?.page === 3);
	assert("Citation retains textFragment", passedRule?.citation?.textFragment === "Total family income from all sources");

	// When provenanceQuotes is completely empty:
	const testScholarshipWithoutQuotes = {
		title: "Unverified Scheme",
		rules: [
			{ id: "r_unverified", field: "familyIncome", operator: "LTE", targetValue: 250000 },
		],
		provenanceQuotes: [], // No quotes extracted yet
	};

	const evalResult2 = evaluateEligibility({ familyIncome: 200000 }, testScholarshipWithoutQuotes);
	const unverifiedRule = evalResult2.passedRules[0];
	assert(
		"Rule evaluator does NOT fabricate fake scholarships.gov.in citation when quotes are empty",
		unverifiedRule?.citation === null
	);

	// ---------------------------------------------------------------------------
	// Summary
	// ---------------------------------------------------------------------------
	console.log("\n================================================================================");
	console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
	console.log("================================================================================\n");

	if (passedTests === totalTests) {
		console.log(">> ALL PROVENANCE PIPELINE TESTS PASSED SUCCESSFULLY! <<\n");
		process.exit(0);
	} else {
		console.error(">> SOME TESTS FAILED <<\n");
		process.exit(1);
	}
}

runProvenanceTestSuite().catch((err) => {
	console.error("Fatal error in test suite:", err);
	process.exit(1);
});
