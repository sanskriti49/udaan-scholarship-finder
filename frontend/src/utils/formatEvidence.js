
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

export function formatEvidenceText(rawQuote) {
	return typeof rawQuote === "string" ? rawQuote : "";
}

// Preserve the actual cited path. A URL identifies a source; it is not proof of authenticity.
export function cleanOfficialUrl(raw) {
	if (!raw || typeof raw !== "string") return null;
	try {
		const parsed = new URL(raw);
		if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
		return parsed.toString();
	} catch {
		return null;
	}
}
export function isGenuinePdf(url) {
	if (!url || typeof url !== "string") return false;
	const clean = cleanOfficialUrl(url);
	if (!clean) return false;
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
		hasDisability: "Disability Status",
		casteCategory: "Community / Category",
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

	if (field === "hasDisability" || field === "disability") {
		if (typeof targetValue === "boolean") {
			return targetValue ? "Certificate required" : "Not required";
		}
	}

	if (operator === "BOOLEAN_MATCH" || typeof targetValue === "boolean") {
		return targetValue ? "Required" : "Not applicable";
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

