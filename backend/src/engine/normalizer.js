/**
 * Normalization utilities for Udaan Ingestion Pipeline
 * Converts heterogeneous and unstructured text expressions into normalized, typed schemas.
 */

export function parseIncomeLimit(rawText) {
	if (!rawText) return null;
	const cleaned = String(rawText).toLowerCase().replace(/,/g, "");

	// Matches "2.5 lakh", "2.5l", "2.50 lac", "3 lakh"
	const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/i);
	if (lakhMatch) {
		return Math.round(parseFloat(lakhMatch[1]) * 100000);
	}

	// Matches "rs. 250000", "inr 300000", "200000"
	const directMatch = cleaned.match(/(?:rs\.?|inr|₹)?\s*(\d{5,7})/i);
	if (directMatch) {
		return parseInt(directMatch[1], 10);
	}

	return null;
}

export function parseAcademicThreshold(rawText) {
	if (!rawText) return null;
	const cleaned = String(rawText).toLowerCase();

	const cgpaMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:cgpa|gpa)/i);
	if (cgpaMatch) {
		return { type: "CGPA", value: parseFloat(cgpaMatch[1]), max: 10.0 };
	}

	const pctMatch = cleaned.match(/(\d{2}(?:\.\d+)?)\s*%/);
	if (pctMatch) {
		return { type: "PERCENTAGE", value: parseFloat(pctMatch[1]), max: 100.0 };
	}

	return null;
}

export function parseAwardAmount(rawText) {
	if (!rawText) return { value: 0, period: "yearly", displayString: "Variable" };
	const cleaned = String(rawText).toLowerCase().replace(/,/g, "");

	let period = "yearly";
	if (cleaned.includes("month") || cleaned.includes("/pm") || cleaned.includes("p.m.")) {
		period = "monthly";
	} else if (cleaned.includes("one-time") || cleaned.includes("single")) {
		period = "one-time";
	}

	const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
	if (lakhMatch) {
		const val = Math.round(parseFloat(lakhMatch[1]) * 100000);
		return {
			value: val,
			period,
			displayString: `₹${val.toLocaleString("en-IN")} / ${period === "monthly" ? "mo" : "yr"}`,
		};
	}

	const match = cleaned.match(/(?:rs\.?|inr|₹)?\s*(\d{4,7})/i);
	if (match) {
		const val = parseInt(match[1], 10);
		return {
			value: val,
			period,
			displayString: `₹${val.toLocaleString("en-IN")} / ${period === "monthly" ? "mo" : "yr"}`,
		};
	}

	return { value: 0, period: "yearly", displayString: "Variable Grant" };
}

export function inferDegreeLevel(text) {
	if (!text) return "UG";
	const lower = String(text).toLowerCase();
	if (lower.includes("post graduate") || lower.includes("pg ") || lower.includes("m.tech") || lower.includes("master"))
		return "PG";
	if (lower.includes("phd") || lower.includes("doctoral") || lower.includes("research fellowship"))
		return "PhD";
	if (lower.includes("diploma") || lower.includes("polytechnic"))
		return "UG";
	if (lower.includes("class 12") || lower.includes("12th") || lower.includes("intermediate"))
		return "Class 12";
	if (lower.includes("class 10") || lower.includes("10th") || lower.includes("matric"))
		return "Class 10";
	return "UG";
}

export function inferTargetGender(text) {
	if (!text) return "Any";
	const lower = String(text).toLowerCase();
	if (lower.includes("girl") || lower.includes("women") || lower.includes("female")) {
		return "Female";
	}
	return "Any";
}
