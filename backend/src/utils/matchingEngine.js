export function calculateMatchScore(student, scholarship) {
	const elig = scholarship.eligibility || {};
	const highlights = [];

	// education
	if (
		elig.eligibilityLevels &&
		elig.eligibilityLevels.length > 0 &&
		student.educationLevel
	) {
		if (!elig.educationLevels.includes(student.educationLevel)) {
			return {
				score: 0,
				eligible: false,
				reasons: ["Education level does not match requirement"],
			};
		}
	}
	// gender
	if (elig.gender && elig.gender != "Any" && student.gender) {
		if (elig.gender.toLowerCase() != student.gender.toLowerCase()) {
			return {
				score: 0,
				eligible: false,
				reasons: [`Restricted to ${elig.gender} candidates only`],
			};
		}
	}
	// disability
	if (elig.disabilityRequired === true && !student.hasDisability) {
		return {
			score: 0,
			eligible: false,
			reasons: ["Requires applicant to have a documented disability"],
		};
	}
	// family income limit
	if (elig.familyIncome && elig.familyIncome.max && student.income) {
		if (student.income > elig.familyIncome.max) {
			return {
				score: 0,
				eligible: false,
				reasons: ["Family income exceeds the maximum allowed ceiling"],
			};
		}
	}
	// state-based
	if (scholarship.state && scholarship.state !== "All India" && student.state) {
		if (scholarship.state.toLowerCase() !== student.state.toLowerCase()) {
			return {
				score: 0,
				eligible: false,
				reasons: [`Restricted to residents of ${scholarship.state}`],
			};
		}
	}

	// academic score has 40% weightage
	let academicScore = 0.8;
	const minCGPA = elig.minCGPA || 6.5;

	if (student.cgpa) {
		if (student.cgpa >= minCGPA) {
			academicScore =
				0.8 + ((student.cgpa - minCGPA) / (10.0 - minCGPA || 1)) * 0.2;
			academicScore = Math.min(1.0, academicScore);
			highlights.push(
				`High academic fit (${student.cgpa} CGPA meets the ${minCGPA} requirement)`,
			);
		} else {
			academicScore = 0.4;
		}
	}

	// financial need score 30%
	let financialScore = 0.7;
	if (elig.familyIncome?.max && student.income) {
		const maxInc = elig.familyIncome.max;
		// lower income relative to ceiling mwans higher need score
		const ratio = Math.max(0, 1 - student.income / maxInc);
		financialScore = 0.5 + ratio * 0.5; // ranges from 0.5 to 1.0
		const pctBelow = Math.round(ratio * 100);
		if (pctBelow > 20) {
			highlights.push(
				`High financial priority (Income is ${pctBelow}% below maximum limit)`,
			);
		}
	}

	// geographic factor 20% weight
	let geoScore = 0.8;
	if (scholarship.state && student.state) {
		if (scholarship.state.toLowerCase() === student.state.toLowerCase()) {
			geoScore = 1.0;
			highlights.push(`Local state priority for ${student.state}`);
		} else if (scholarship.state === "All India") {
			geoScore = 0.85;
		}
	}

	// demographic based 10% weight
	let demographicScore = 0.7;
	if (
		elig.casteCategories &&
		elig.casteCategories.length > 0 &&
		student.caste_category
	) {
		if (elig.casteCategories.includes(student.caste_category)) {
			demographicScore = 1.0;
			highlights.push(
				`Eligible under ${student.caste_category} category quota`,
			);
		}
	}

	const totalScore =
		(academicScore * 0.4 +
			financialScore * 0.3 +
			geoScore * 0.2 +
			demographicScore * 0.1) *
		100;

	return {
		score: Math.round(totalScore),
		eligible: true,
		highlights:
			highlights.length > 0
				? highlights
				: ["Eligible based on general criteria"],
	};
}
