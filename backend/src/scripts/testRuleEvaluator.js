import { evaluateEligibility } from "../engine/ruleEvaluator.js";

const sampleScholarship = {
	title: "AICTE Pragati Scholarship for Girls",
	rules: [
		{
			id: "r1",
			field: "gender",
			operator: "EQ",
			targetValue: "Female",
			description: "Open to female students only",
			failMessage: "Scheme is strictly reserved for female applicants",
		},
		{
			id: "r2",
			field: "familyIncome",
			operator: "LTE",
			targetValue: 300000,
			description: "Family income ceiling of ₹3,00,000",
			failMessage: "Family income exceeds ₹3,00,000 ceiling",
		},
		{
			id: "r3",
			field: "educationLevel",
			operator: "IN",
			targetValue: ["UG", "Diploma"],
			description: "Must be admitted to 1st year UG or Diploma degree",
			failMessage: "Education level must be UG or Diploma",
		},
		{
			id: "r4",
			field: "cgpa",
			operator: "GTE",
			targetValue: 7.0,
			description: "Minimum 7.0 CGPA (or 70% aggregate)",
			failMessage: "CGPA is below 7.0 benchmark",
		},
	],
	requiredDocuments: [
		{ code: "INCOME_CERT", name: "Family Income Certificate (Tehsildar signed)" },
		{ code: "ADMISSION_PROOF", name: "College Allotment / Admission Letter" },
		{ code: "MARKSHEET", name: "Class 12th / Diploma Marksheet" },
		{ code: "AADHAAR", name: "Aadhaar Card" },
	],
	provenanceQuotes: [
		{
			ruleId: "r2",
			sourceUrl: "https://fellowship.aicte.gov.in/guidelines-2026.pdf",
			clause: "Clause 3.1",
			quote: "Total family income from all sources should not exceed Rs. 3.00 Lakh per annum.",
		},
	],
};

console.log("=== RUNNING TEST 1: Matching Profile ===");
const profilePassing = {
	gender: "Female",
	familyIncome: 220000,
	educationLevel: "UG",
	cgpa: 8.4,
	documentsHeld: ["INCOME_CERT", "ADMISSION_PROOF", "MARKSHEET"],
};

const resultPass = evaluateEligibility(profilePassing, sampleScholarship);
console.log("Eligible:", resultPass.isEligible);
console.log("Match Confidence:", resultPass.matchConfidence + "%");
console.log("Readiness Score:", resultPass.readinessScore + "%");
console.log("Missing Docs:", resultPass.documentAudit.missing.map(d => d.name));
console.log("Passed Rules Count:", resultPass.passedRules.length);

console.log("\n=== RUNNING TEST 2: Ineligible Profile (Income & Gender Exclusions) ===");
const profileFailing = {
	gender: "Male",
	familyIncome: 350000,
	educationLevel: "UG",
	cgpa: 8.0,
	documentsHeld: ["AADHAAR"],
};

const resultFail = evaluateEligibility(profileFailing, sampleScholarship);
console.log("Eligible:", resultFail.isEligible);
console.log("Failed Rules Reasons:");
resultFail.failedRules.forEach(r => console.log(" - " + r.failMessage));

if (resultPass.isEligible && !resultFail.isEligible && resultFail.failedRules.length === 2) {
	console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");
} else {
	console.error("\n❌ TESTS FAILED!");
	process.exit(1);
}
