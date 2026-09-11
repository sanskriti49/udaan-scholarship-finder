import mongoose from "mongoose";
import dotenv from "dotenv";
import Scholarship from "../models/Scholarship.js";
import ScholarshipVersion from "../models/ScholarshipVersion.js";

dotenv.config();

const SCHOLARSHIPS_DATA = [
	{
		slug: "aicte-pragati-girls-ug",
		title: "AICTE Pragati Scholarship Scheme for Girl Students",
		organization: "All India Council for Technical Education (AICTE)",
		sourceSite: "AICTE Official Portal",
		sourceUrl: "https://www.aicte.gov.in/schemes/students-development-schemes/Pragati/General-Instructions",
		applicationLink: "https://fellowship.aicte.gov.in/",
		sourceType: "Government",
		trustScore: 0.98,
		category: "Women",
		tags: ["Women Only", "STEM", "Merit-Based"],
		level: "UG",
		state: "All India",
		description:
			"An initiative by AICTE to provide financial assistance to meritorious young women entering degree or diploma level technical programs.",
		summary:
			"Financial grant of ₹50,000/year to empower young women pursuing technical degrees.",
		amount: {
			value: 50000,
			currency: "INR",
			period: "yearly",
			displayString: "₹50,000 / yr",
		},
		deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
		popular: true,
		verified: true,
		hasChanges: true,
		latestChangeSummary:
			"Income ceiling increased from ₹2.5L to ₹3.0L with relaxed document requirements.",
		rules: [
			{
				id: "aicte_gender",
				field: "gender",
				operator: "EQ",
				targetValue: "Female",
				isMandatory: true,
				description: "Restricted to female candidates only",
				failMessage: "Scheme is strictly reserved for female applicants",
			},
			{
				id: "aicte_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: 300000,
				isMandatory: true,
				description: "Family income ceiling of ₹3,00,000 per annum",
				failMessage: "Family annual income exceeds the ₹3,00,000 threshold",
			},
			{
				id: "aicte_education",
				field: "educationLevel",
				operator: "IN",
				targetValue: ["UG", "Diploma"],
				isMandatory: true,
				description: "Enrolled in 1st year UG Engineering/Tech or Diploma",
				failMessage: "Must be admitted to 1st year UG or Diploma level",
			},
			{
				id: "aicte_cgpa",
				field: "cgpa",
				operator: "GTE",
				targetValue: 6.5,
				isMandatory: true,
				description: "Minimum 6.5 CGPA (or 60% in Class 12)",
				failMessage: "CGPA is below the minimum required 6.5 mark",
			},
		],
		requiredDocuments: [
			{ code: "INCOME_CERT", name: "Family Income Certificate (Issued by Tehsildar)", mandatory: true },
			{ code: "ADMISSION_PROOF", name: "AICTE Institute Allotment Letter", mandatory: true },
			{ code: "MARKSHEET", name: "Class 12 / Qualifying Exam Marksheet", mandatory: true },
			{ code: "AADHAAR", name: "Aadhaar Card (Linked to Bank Account)", mandatory: true },
			{ code: "BANK_PASSBOOK", name: "Nationalized Bank Account Passbook / Cancelled Cheque", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "aicte_income",
				sourceUrl: "https://www.aicte.gov.in/schemes/students-development-schemes/Pragati/General-Instructions",
				clause: "General Instructions §3.2 — Financial Eligibility",
				quote: "Total family income from all sources should not exceed Rs. 3.00 Lakh per annum for the financial year.",
				page: 4,
			},
			{
				ruleId: "aicte_gender",
				sourceUrl: "https://www.aicte.gov.in/schemes/students-development-schemes/Pragati/General-Instructions",
				clause: "Clause 2.1 — Target Beneficiary",
				quote: "The scheme is dedicated exclusively to girl students admitted to AICTE approved technical institutions.",
				page: 2,
			},
		],
	},
	{
		slug: "aicte-swanath-ug",
		title: "AICTE Swanath Scholarship Scheme",
		organization: "All India Council for Technical Education (AICTE)",
		sourceSite: "AICTE Official Portal",
		sourceUrl: "https://www.aicte.gov.in/schemes/students-development-schemes/Swanath/General-Instructions",
		applicationLink: "https://fellowship.aicte.gov.in/",
		sourceType: "Government",
		trustScore: 0.98,
		category: "Government",
		tags: ["STEM", "Need-Based"],
		level: "UG",
		state: "All India",
		description:
			"Financial support of ₹50,000/year to provide encouragement and support towards higher education to orphans, wards of parents who died due to Covid-19, and wards of Armed Forces.",
		summary:
			"₹50,000/year grant for orphans and wards of armed forces personnel pursuing degree/diploma technical studies.",
		amount: {
			value: 50000,
			currency: "INR",
			period: "yearly",
			displayString: "₹50,000 / yr",
		},
		deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
		popular: false,
		verified: true,
		hasChanges: false,
		rules: [
			{
				id: "swanath_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: 800000,
				isMandatory: true,
				description: "Family income ceiling of ₹8,00,000 per annum",
				failMessage: "Family income exceeds statutory limit of ₹8,00,000",
			},
			{
				id: "swanath_education",
				field: "educationLevel",
				operator: "IN",
				targetValue: ["UG", "Diploma"],
				isMandatory: true,
				description: "Enrolled in recognized UG or Diploma technical program",
				failMessage: "Course level must be UG or Diploma",
			},
		],
		requiredDocuments: [
			{ code: "INCOME_CERT", name: "Family Income Certificate (Tehsildar signed)", mandatory: true },
			{ code: "ADMISSION_PROOF", name: "AICTE Institute Allotment Letter", mandatory: true },
			{ code: "MARKSHEET", name: "Class 12 / Qualifying Exam Marksheet", mandatory: true },
			{ code: "AADHAAR", name: "Aadhaar Card", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "swanath_income",
				sourceUrl: "https://www.aicte.gov.in/schemes/students-development-schemes/Swanath/General-Instructions",
				clause: "Swanath General Instructions §2",
				quote: "The family income from all sources should not exceed Rs. 8.00 Lakh per annum.",
				page: 1,
			},
		],
	},
	{
		slug: "nsp-central-sector-scheme",
		title: "Central Sector Scheme of Scholarship for College and University Students",
		organization: "Department of Higher Education, Ministry of Education",
		sourceSite: "Ministry of Education / NSP",
		sourceUrl: "https://www.education.gov.in/central-sector-scheme-scholarship-college-and-university-students",
		applicationLink: "https://scholarships.gov.in/",
		sourceType: "Government",
		trustScore: 0.95,
		category: "Merit based",
		tags: ["Merit-Based", "STEM", "EWS"],
		level: "UG",
		state: "All India",
		description:
			"Awarded to meritorious students from economically weaker sections who are in the top 20th percentile of their state Class 12 board examination.",
		summary:
			"₹20,000/year scholarship awarded to top 20th percentile Class 12 graduates.",
		amount: {
			value: 20000,
			currency: "INR",
			period: "yearly",
			displayString: "₹20,000 / yr",
		},
		deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
		popular: true,
		verified: true,
		hasChanges: true,
		latestChangeSummary:
			"Application deadline extended by 15 calendar days across all states.",
		rules: [
			{
				id: "nsp_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: 450000,
				isMandatory: true,
				description: "Gross family income must not exceed ₹4,50,000 per annum",
				failMessage: "Family income exceeds ₹4,50,000 upper ceiling",
			},
			{
				id: "nsp_education",
				field: "educationLevel",
				operator: "IN",
				targetValue: ["UG", "PG"],
				isMandatory: true,
				description: "Pursuing regular undergraduate or postgraduate degree",
				failMessage: "Education level must be UG or PG in a recognized college",
			},
			{
				id: "nsp_cgpa",
				field: "cgpa",
				operator: "GTE",
				targetValue: 7.5,
				isMandatory: true,
				description: "Top 20th percentile board score (equivalent to 7.5 CGPA / 75%)",
				failMessage: "Academic score is below the 7.5 CGPA threshold",
			},
		],
		requiredDocuments: [
			{ code: "INCOME_CERT", name: "Income Certificate from Revenue Authority", mandatory: true },
			{ code: "MARKSHEET", name: "Class 12th Board Marksheet", mandatory: true },
			{ code: "BONAFIDE_CERT", name: "College Bonafide / Enrollment Certificate", mandatory: true },
			{ code: "AADHAAR", name: "Aadhaar Card", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "nsp_income",
				sourceUrl: "https://www.education.gov.in/central-sector-scheme-scholarship-college-and-university-students",
				clause: "Ministry Guidelines §5 — Income Norms",
				quote: "Students with family income of up to Rs. 4.5 lakh per annum are eligible for the scholarship.",
				page: 3,
			},
		],
	},
	{
		slug: "tata-trust-stem-grant",
		title: "Tata Trust Medical and Engineering Undergraduate Grant",
		organization: "Tata Trusts",
		sourceSite: "Tata Trusts Official Grants",
		sourceUrl: "https://www.tatatrusts.org/our-work/education/individual-grants",
		applicationLink: "https://www.tatatrusts.org/our-work/education/individual-grants",
		sourceType: "NGO / Trust",
		trustScore: 0.90,
		category: "Need based",
		tags: ["STEM", "Need-Based"],
		level: "UG",
		state: "All India",
		description:
			"Need-cum-merit financial assistance awarded to students pursuing professional bachelor degrees in Engineering, Technology, and Medicine.",
		summary:
			"Covers 30% to 50% of annual college tuition fees for technical students.",
		amount: {
			value: 60000,
			currency: "INR",
			period: "yearly",
			displayString: "₹60,000 / yr",
		},
		deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
		popular: true,
		verified: true,
		hasChanges: true,
		latestChangeSummary:
			"Annual grant assistance increased to ₹60,000 for academic year 2026.",
		rules: [
			{
				id: "tata_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: 500000,
				isMandatory: true,
				description: "Family income must not exceed ₹5,00,000 per annum",
				failMessage: "Income is higher than ₹5,00,000 maximum ceiling",
			},
			{
				id: "tata_stream",
				field: "stream",
				operator: "IN",
				targetValue: ["Engineering", "Medical", "Technology"],
				isMandatory: true,
				description: "Enrolled in Engineering, Tech, or Medical disciplines",
				failMessage: "Program is limited to Engineering and Medical students",
			},
			{
				id: "tata_cgpa",
				field: "cgpa",
				operator: "GTE",
				targetValue: 7.0,
				isMandatory: true,
				description: "Minimum cumulative score of 7.0 CGPA",
				failMessage: "CGPA does not meet the 7.0 benchmark",
			},
		],
		requiredDocuments: [
			{ code: "INCOME_CERT", name: "Salary Slips or IT Return / Tehsildar Income Certificate", mandatory: true },
			{ code: "MARKSHEET", name: "Semester Marksheets / Class 12 Certificate", mandatory: true },
			{ code: "FEES_RECEIPT", name: "Current Academic Year College Fee Receipt", mandatory: true },
			{ code: "BANK_PASSBOOK", name: "Bank Account Details", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "tata_income",
				sourceUrl: "https://www.tatatrusts.org/our-work/education/individual-grants",
				clause: "Individual Grants Policy §2.3 — Means Assessment",
				quote: "Family annual income from all legitimate sources must not exceed Rs. 5.00 Lakhs.",
				page: 1,
			},
		],
	},
	{
		slug: "ugc-indira-gandhi-girl-child",
		title: "UGC Post-Graduate Indira Gandhi Scholarship for Single Girl Child",
		organization: "University Grants Commission (UGC)",
		sourceSite: "UGC Official Scheme Directory",
		sourceUrl: "https://www.ugc.gov.in/pdfnews/2781359_NSP-Schemes.pdf",
		applicationLink: "https://scholarships.gov.in/",
		sourceType: "Government",
		trustScore: 0.96,
		category: "Women",
		tags: ["Women Only", "Merit-Based"],
		level: "PG",
		state: "All India",
		description:
			"Designed to promote girl education and compensate for higher educational costs for single girl children pursuing master's degree courses.",
		summary:
			"₹36,200/year fellowship for single girl children enrolled in regular PG courses.",
		amount: {
			value: 36200,
			currency: "INR",
			period: "yearly",
			displayString: "₹36,200 / yr",
		},
		deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
		popular: false,
		verified: true,
		hasChanges: false,
		rules: [
			{
				id: "ugc_gender",
				field: "gender",
				operator: "EQ",
				targetValue: "Female",
				isMandatory: true,
				description: "Must be a female student (single girl child in family)",
				failMessage: "Only female candidates who are single girl child qualify",
			},
			{
				id: "ugc_level",
				field: "educationLevel",
				operator: "EQ",
				targetValue: "PG",
				isMandatory: true,
				description: "Admitted into a regular, non-distance Master's degree (PG)",
				failMessage: "Candidate must be enrolled in a regular Postgraduate (PG) degree",
			},
		],
		requiredDocuments: [
			{ code: "SINGLE_GIRL_AFFIDAVIT", name: "Affidavit of Single Girl Child (SDM / First Class Magistrate)", mandatory: true },
			{ code: "ADMISSION_PROOF", name: "University PG Admission Proof", mandatory: true },
			{ code: "MARKSHEET", name: "UG Degree Final Marksheet", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "ugc_level",
				sourceUrl: "https://www.ugc.gov.in/pdfnews/2781359_NSP-Schemes.pdf",
				clause: "Official Scheme Guidelines §1.2",
				quote: "Any single girl child of her parents pursuing a regular Master's degree in any recognized university.",
				page: 2,
			},
		],
	},
	{
		slug: "post-matric-sc-st-scholarship",
		title: "Post-Matric Scholarship for SC / ST Students",
		organization: "Ministry of Social Justice and Empowerment",
		sourceSite: "Ministry of Social Justice Official Portal",
		sourceUrl: "https://socialjustice.gov.in/schemes/post-matric-scholarship-sc",
		applicationLink: "https://scholarships.gov.in/",
		sourceType: "Government",
		trustScore: 0.94,
		category: "SC / ST / OBC",
		tags: ["SC/ST/OBC", "Need-Based"],
		level: "UG",
		state: "All India",
		description:
			"Centrally sponsored scheme providing 100% compulsory non-refundable fees reimbursement and maintenance allowance for SC/ST students.",
		summary:
			"Full tuition reimbursement + ₹13,500/year living allowance for SC/ST learners.",
		amount: {
			value: 45000,
			currency: "INR",
			period: "yearly",
			displayString: "₹45,000 / yr",
		},
		deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
		popular: true,
		verified: true,
		hasChanges: false,
		rules: [
			{
				id: "scst_caste",
				field: "casteCategory",
				operator: "IN",
				targetValue: ["SC", "ST"],
				isMandatory: true,
				description: "Restricted to candidates belonging to SC or ST communities",
				failMessage: "Candidate category must be SC or ST",
			},
			{
				id: "scst_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: 250000,
				isMandatory: true,
				description: "Parental annual income limit of ₹2,50,000",
				failMessage: "Income exceeds the statutory ₹2,50,000 ceiling",
			},
		],
		requiredDocuments: [
			{ code: "CASTE_CERT", name: "Caste Certificate issued by Competent Authority", mandatory: true },
			{ code: "INCOME_CERT", name: "Income Certificate issued by Revenue Officer", mandatory: true },
			{ code: "MARKSHEET", name: "Last Qualifying Examination Marksheet", mandatory: true },
			{ code: "AADHAAR", name: "Aadhaar Card", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "scst_income",
				sourceUrl: "https://socialjustice.gov.in/schemes/post-matric-scholarship-sc",
				clause: "Ministry Notification §3 — Means Test",
				quote: "Scholarships will be paid to the students whose parents/guardians' income does not exceed Rs. 2,50,000/- per annum.",
				page: 5,
			},
		],
	},
	{
		slug: "up-state-post-matric-scholarship",
		title: "UP State Post-Matric Scholarship and Fee Reimbursement Scheme",
		organization: "Social Welfare Department, Government of Uttar Pradesh",
		sourceSite: "UP Scholarship Official Portal",
		sourceUrl: "https://scholarship.up.gov.in/",
		applicationLink: "https://scholarship.up.gov.in/",
		sourceType: "Government",
		trustScore: 0.92,
		category: "SC / ST / OBC",
		tags: ["SC/ST/OBC", "Need-Based", "EWS"],
		level: "UG",
		state: "UP",
		description:
			"Financial support scheme for domicile students of Uttar Pradesh pursuing Post-Matriculation, Graduation, or Diploma studies in UP institutes.",
		summary:
			"Tuition fee reimbursement and maintenance allowance for UP resident students.",
		amount: {
			value: 30000,
			currency: "INR",
			period: "yearly",
			displayString: "₹30,000 / yr",
		},
		deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
		applicationOpenDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
		popular: false,
		verified: true,
		hasChanges: true,
		latestChangeSummary:
			"Mandatory biometric DigiLocker authentication enforced for UP scholarship applicants.",
		rules: [
			{
				id: "up_state",
				field: "state",
				operator: "EQ",
				targetValue: "UP",
				isMandatory: true,
				description: "Must be a permanent resident (domicile) of Uttar Pradesh",
				failMessage: "Candidate must possess Uttar Pradesh (UP) domicile certificate",
			},
			{
				id: "up_income",
				field: "familyIncome",
				operator: "LTE",
				targetValue: 200000,
				isMandatory: true,
				description: "Annual family income must not exceed ₹2,00,000 (₹2.5L for SC/ST)",
				failMessage: "Family annual income exceeds the ₹2,00,000 limit",
			},
		],
		requiredDocuments: [
			{ code: "DOMICILE_CERT", name: "UP Domicile Certificate (Niwas Praman Patra)", mandatory: true },
			{ code: "INCOME_CERT", name: "Income Certificate (Aay Praman Patra)", mandatory: true },
			{ code: "CASTE_CERT", name: "Caste Certificate (Jati Praman Patra for OBC/SC/ST)", mandatory: false },
			{ code: "AADHAAR", name: "Aadhaar Card Linked with DigiLocker", mandatory: true },
		],
		provenanceQuotes: [
			{
				ruleId: "up_state",
				sourceUrl: "https://scholarship.up.gov.in/",
				clause: "State Guidelines §1",
				quote: "The student must be a bonafide resident and domicile holder of Uttar Pradesh.",
				page: 1,
			},
		],
	},
];

async function seedDatabase() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/udaan");
		console.log("MongoDB connection established.");

		console.log("Clearing old scholarship records & dropping legacy indexes...");
		await Scholarship.deleteMany({});
		await ScholarshipVersion.deleteMany({});
		await Scholarship.collection.dropIndexes().catch(() => {});
		await Scholarship.syncIndexes().catch(() => {});

		console.log(`Inserting ${SCHOLARSHIPS_DATA.length} canonical scholarships with verified specific URLs...`);
		const inserted = await Scholarship.insertMany(SCHOLARSHIPS_DATA);
		console.log("Scholarships successfully inserted!");

		const aicteItem = inserted.find((s) => s.slug === "aicte-pragati-girls-ug");
		const nspItem = inserted.find((s) => s.slug === "nsp-central-sector-scheme");
		const tataItem = inserted.find((s) => s.slug === "tata-trust-stem-grant");

		const versions = [];

		if (aicteItem) {
			versions.push({
				scholarship: aicteItem._id,
				observedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
				changeType: "INCOME_CEILING_CHANGE",
				summary: "Income ceiling increased from ₹2.5L to ₹3.0L (+₹50,000 relaxation).",
				deltas: [
					{
						field: "familyIncome",
						oldValue: 250000,
						newValue: 300000,
						humanReadable: "Annual income ceiling relaxed from ₹2,50,000 to ₹3,00,000 per annum.",
					},
				],
				sourceSnapshotUrl: aicteItem.sourceUrl,
			});
		}

		if (nspItem) {
			versions.push({
				scholarship: nspItem._id,
				observedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
				changeType: "DEADLINE_EXTENSION",
				summary: "Application deadline extended by 15 calendar days.",
				deltas: [
					{
						field: "deadline",
						oldValue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
						newValue: nspItem.deadline,
						humanReadable: "Portal closing date extended to allow Class 12 re-evaluation students to apply.",
					},
				],
				sourceSnapshotUrl: nspItem.sourceUrl,
			});
		}

		if (tataItem) {
			versions.push({
				scholarship: tataItem._id,
				observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
				changeType: "AWARD_UPDATE",
				summary: "Grant amount enhanced from ₹50,000 to ₹60,000/year.",
				deltas: [
					{
						field: "amount.value",
						oldValue: 50000,
						newValue: 60000,
						humanReadable: "Financial assistance incremented to accommodate rising engineering tuition fees.",
					},
				],
				sourceSnapshotUrl: tataItem.sourceUrl,
			});
		}

		if (versions.length > 0) {
			await ScholarshipVersion.insertMany(versions);
			console.log(`Generated ${versions.length} historical change versions.`);
		}

		console.log("Database seeded successfully with verified, dedicated scheme URLs!");
		process.exit(0);
	} catch (err) {
		console.error("Seeding failed:", err);
		process.exit(1);
	}
}

seedDatabase();
