
const CLAUSE_MAP = {
	familyIncomeMax: "Family Income Requirement",
	familyIncome: "Family Income Requirement",
	amountValue: "Scholarship Grant Amount",
	amount: "Scholarship Grant Amount",
	awardAmount: "Scholarship Grant Amount",
	title: "Official Scheme Name",
	schemeName: "Official Scheme Name",
	department: "Organizing Department",
	organization: "Organizing Department",
	guidelinesUrl: "Official Guidelines Document",
	guidelineUrl: "Official Guidelines Document",
	applyUrl: "Official Application Portal",
	applicationLink: "Official Application Portal",
	level: "Education & Course Level",
	category: "Category Eligibility",
	caste: "Category Eligibility",
	casteCategories: "Category Eligibility",
	gender: "Gender Eligibility",
	startDate: "Application Opening Date",
	opensAt: "Application Opening Date",
	endDate: "Application Deadline",
	closesAt: "Application Deadline",
	description: "Scheme Guidelines & Details",
	state: "State Eligibility",
};

export function formatClauseTitle(clause, field, fallbackIdx = 1) {
	if (!clause && !field) return `Guideline ${fallbackIdx}`;
	let clean = String(clause || "").trim();

	if (/^json\s*field\s*/i.test(clean)) {
		const key = clean.replace(/^json\s*field\s*/i, "").trim();
		return CLAUSE_MAP[key] || `${key.replace(/([A-Z])/g, " $1").trim()} Requirement`;
	}

	if (field && CLAUSE_MAP[field]) {
		if (/^Official Directive/i.test(clean) || /^Directive Clause/i.test(clean) || /^Official Statutory Clause/i.test(clean)) {
			return CLAUSE_MAP[field];
		}
	}

	clean = clean.replace(/Official Directive §\d+:\s*/i, "");
	clean = clean.replace(/Directive Clause §\d+:\s*/i, "");
	clean = clean.replace(/Official Statutory Clause §\d+:\s*/i, "");
	clean = clean.replace(/Gazette Notification §\d+:\s*/i, "");
	clean = clean.replace(/^Clause Section \d+:\s*/i, "");
	clean = clean.replace(/^Clause §\d+:\s*/i, "");

	return clean || (field ? CLAUSE_MAP[field] || field : `Guideline ${fallbackIdx}`);
}

export function formatEvidenceText(rawQuote, field) {
	if (!rawQuote || typeof rawQuote !== "string") return "";
	let text = rawQuote.trim();

	if (text.startsWith('""') && text.endsWith('""')) {
		text = text.slice(2, -2).trim();
	} else if (text.startsWith('"') && text.endsWith('"') && text.indexOf('":') === -1) {
		text = text.slice(1, -1).trim();
	}

	const jsonMatch = text.match(/^"([^"]+)"\s*:\s*(.+)$/);
	if (jsonMatch) {
		const key = jsonMatch[1];
		let val = jsonMatch[2].trim();
		if (val.startsWith('"') && val.endsWith('"')) {
			val = val.slice(1, -1);
		}

		if (key === "familyIncomeMax" || key === "familyIncome") {
			const num = Number(val);
			const formatted = !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : val;
			return `Annual family income must not exceed ${formatted} as specified in official scheme criteria.`;
		}

		if (key === "amountValue" || key === "amount") {
			const num = Number(val);
			const formatted = !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : val;
			return `Official scholarship grant amount is ${formatted} as specified by the issuing authority.`;
		}

		if (key === "level") {
			return `Eligible education levels: ${val}.`;
		}

		if (key === "category" || key === "caste") {
			return `Eligible applicant category: ${val}.`;
		}

		if (key === "department" || key === "organization") {
			return `Administering body: ${val}.`;
		}

		if (key === "title" || key === "schemeName") {
			return `Official Scheme: "${val}".`;
		}

		if (key === "guidelinesUrl" || key === "guidelineUrl") {
			return `Official guidelines circular: ${val}`;
		}

		if (key === "applyUrl" || key === "applicationLink") {
			return `Official online application portal: ${val}`;
		}

		if (key === "state") {
			return `Applicable state: ${val}.`;
		}

		return `${key.replace(/([A-Z])/g, " $1").trim()}: ${val}`;
	}

	return text;
}

export function cleanOfficialUrl(raw) {
	if (!raw || typeof raw !== "string") return "https://scholarships.gov.in/";
	try {
		const parsed = new URL(raw);
		if (parsed.pathname.toLowerCase().startsWith("/api/schemes")) {
			return parsed.origin + "/";
		}
		if (
			parsed.pathname.includes("2026.pdf") ||
			parsed.pathname.includes("Guidelines.pdf") ||
			parsed.pathname.startsWith("/docs/")
		) {
			return parsed.origin + "/";
		}
		return parsed.toString();
	} catch {
		return raw;
	}
}

export function isGenuinePdf(url) {
	if (!url || typeof url !== "string") return false;
	const clean = cleanOfficialUrl(url);
	const lower = clean.toLowerCase();
	if (!lower.endsWith(".pdf") && !lower.includes(".pdf?")) return false;
	if (lower.includes("not_available.pdf") || lower.includes("/null") || lower.includes("/undefined")) return false;
	return true;
}

export function formatSourceLabel(url) {
	if (!url) return "Official Portal";
	const clean = cleanOfficialUrl(url);
	try {
		const parsed = new URL(clean);
		if (isGenuinePdf(clean)) {
			const fileName = decodeURIComponent(parsed.pathname.split("/").pop());
			return fileName || "Official Guidelines PDF";
		}
		return `Official Portal (${parsed.hostname.replace(/^www\./, "")})`;
	} catch {
		return "Official Source";
	}
}

export function formatChangeNotice(summary) {
	if (!summary || typeof summary !== "string") return null;
	const trimmed = summary.trim();
	if (!trimmed) return null;

	if (/^Updated:\s*(.+)$/i.test(trimmed)) {
		const fields = trimmed.replace(/^Updated:\s*/i, "").split(",").map((f) => f.trim());
		const friendlyMap = {
			level: "Eligible course levels updated",
			amount: "Scholarship grant amount updated",
			familyIncome: "Family income criteria updated",
			closesAt: "Application deadline updated",
			deadline: "Application deadline updated",
			category: "Category eligibility updated",
			guidelinesUrl: "Official guidelines document updated",
			applicationLink: "Application portal link updated",
		};
		const friendly = fields.map((f) => friendlyMap[f] || `${f} updated`);
		return friendly.join(" • ");
	}

	return trimmed.replace(/\s*\|\s*/g, " • ");
}

export function formatFieldLabel(field) {
	if (!field) return "Eligibility Rule";
	const map = {
		familyIncomeMax: "Family Income Limit",
		familyIncome: "Family Income Limit",
		educationLevel: "Education Level",
		level: "Education Level",
		gender: "Gender",
		category: "Community / Category",
		caste: "Community / Category",
		casteCategories: "Community / Category",
		marks: "Academic Performance",
		percentage: "Academic Score",
		state: "Domicile / State",
		domicile: "Domicile / State",
		religion: "Religion / Minority Status",
		disability: "Disability Status",
	};
	if (map[field]) return map[field];
	return field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

export function formatRuleRequirement(rule) {
	if (!rule) return "";
	const { field, operator, targetValue } = rule;
	if (targetValue === undefined || targetValue === null) return "";

	const isIncome = field === "familyIncome" || field === "familyIncomeMax";
	const isAcademic = field === "marks" || field === "percentage";

	if (isIncome) {
		const num = typeof targetValue === "number" ? targetValue : Number(targetValue);
		if (!isNaN(num)) {
			const formatted = `₹${num.toLocaleString("en-IN")}`;
			if (operator === "LTE" || operator === "LE") return `Up to ${formatted} / year`;
			if (operator === "GTE" || operator === "GE") return `At least ${formatted} / year`;
			if (operator === "LT") return `Below ${formatted} / year`;
			if (operator === "GT") return `Above ${formatted} / year`;
			return `${formatted} / year`;
		}
	}

	if (isAcademic) {
		const num = typeof targetValue === "number" ? targetValue : Number(targetValue);
		if (!isNaN(num)) {
			if (operator === "GTE" || operator === "GE") return `Minimum ${num}% marks`;
			if (operator === "GT") return `More than ${num}% marks`;
			return `${num}%`;
		}
	}

	if (field === "gender") {
		if (targetValue === "Female") return "Female students";
		if (targetValue === "Male") return "Male students";
		if (targetValue === "Any") return "All students eligible";
		return `${targetValue}`;
	}

	if (field === "educationLevel" || field === "level") {
		const levelMap = {
			UG: "Undergraduate (UG)",
			PG: "Postgraduate (PG)",
			PhD: "Doctoral (PhD)",
			"Class 10": "Class 10 / Matric",
			"Class 12": "Class 12 / Higher Secondary",
			Diploma: "Diploma Courses",
		};
		if (Array.isArray(targetValue)) {
			return targetValue.map((v) => levelMap[v] || v).join(", ");
		}
		return levelMap[targetValue] || String(targetValue);
	}

	if (Array.isArray(targetValue)) {
		return targetValue.join(", ");
	}

	if (operator === "EQ") return String(targetValue);
	if (operator === "LTE" || operator === "LE") return `Up to ${targetValue}`;
	if (operator === "GTE" || operator === "GE") return `Minimum ${targetValue}`;
	if (operator === "IN") return String(targetValue);
	if (operator === "NEQ") return `Not ${targetValue}`;

	return `${operator ? `${operator} ` : ""}${targetValue}`;
}

