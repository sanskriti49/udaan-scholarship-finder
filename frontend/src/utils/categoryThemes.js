export function normalizeCategoryKey(rawCategory = "") {
	const cat = String(rawCategory || "")
		.toLowerCase()
		.trim();
	if (cat.includes("merit") && (cat.includes("need") || cat.includes("mean")))
		return "need";
	if (
		cat.includes("stem") ||
		cat.includes("tech") ||
		cat.includes("engineer") ||
		cat.includes("science")
	)
		return "stem";
	if (cat.includes("women") || cat.includes("girl") || cat.includes("female"))
		return "women";
	if (
		cat.includes("sc") ||
		cat.includes("st") ||
		cat.includes("obc") ||
		cat.includes("caste") ||
		cat.includes("dalit") ||
		cat.includes("tribal")
	)
		return "scst";
	if (
		cat.includes("minority") ||
		cat.includes("inclusion") ||
		cat.includes("bridge") ||
		cat.includes("pwd") ||
		cat.includes("disab")
	)
		return "minority";
	if (
		cat.includes("need") ||
		cat.includes("mean") ||
		cat.includes("income") ||
		cat.includes("finan")
	)
		return "need";
	if (
		cat.includes("merit") ||
		cat.includes("academic") ||
		cat.includes("talent") ||
		cat.includes("rank")
	)
		return "merit";
	if (
		cat.includes("govt") ||
		cat.includes("government") ||
		cat.includes("state") ||
		cat.includes("central") ||
		cat.includes("national")
	)
		return "government";
	return "general";
}

export const CATEGORY_THEMES = {
	government: {
		key: "government",
		label: "Government & National",
		colors: {
			border: "#1B432A",
			text: "#143621",
			bg: "#F2F7F4",
			tint: "#E3ECE6",
			accent: "#2D6A4F",
			ring: "#74C69D",
			headerBg: "linear-gradient(135deg, #E9F2EC 0%, #DDEBE1 100%)",
		},
	},
	merit: {
		key: "merit",
		label: "Merit & Excellence",
		colors: {
			border: "#B45309",
			text: "#78350F",
			bg: "#FEF9EE",
			tint: "#FDF2D6",
			accent: "#D97706",
			ring: "#FBBF24",
			headerBg: "linear-gradient(135deg, #FEF7E6 0%, #FCEFC7 100%)",
		},
	},
	need: {
		key: "need",
		label: "Need-Based / Means",
		colors: {
			border: "#3F6212",
			text: "#365314",
			bg: "#F7FBEF",
			tint: "#ECF5DA",
			accent: "#65A30D",
			ring: "#A3E635",
			headerBg: "linear-gradient(135deg, #F5FBEA 0%, #E8F5D0 100%)",
		},
	},
	women: {
		key: "women",
		label: "Women & Girls",
		colors: {
			border: "#9D174D",
			text: "#831843",
			bg: "#FDF2F8",
			tint: "#FCE7F3",
			accent: "#BE185D",
			ring: "#F472B6",
			headerBg: "linear-gradient(135deg, #FDF2F8 0%, #FCE4EC 100%)",
		},
	},
	scst: {
		key: "scst",
		label: "SC / ST / OBC & Reserved",
		colors: {
			border: "#065F46",
			text: "#022C22",
			bg: "#F0FDF4",
			tint: "#DCFCE7",
			accent: "#059669",
			ring: "#34D399",
			headerBg: "linear-gradient(135deg, #EDFAF1 0%, #DCF5E3 100%)",
		},
	},
	minority: {
		key: "minority",
		label: "Minority & Inclusive Access",
		colors: {
			border: "#0F766E",
			text: "#134E4A",
			bg: "#F0FDFA",
			tint: "#CCFBF1",
			accent: "#0D9488",
			ring: "#2DD4BF",
			headerBg: "linear-gradient(135deg, #EBFBFA 0%, #D5F6F3 100%)",
		},
	},
	stem: {
		key: "stem",
		label: "STEM & Tech Grants",
		colors: {
			border: "#047857",
			text: "#064E3B",
			bg: "#F0FDF9",
			tint: "#D1FAE5",
			accent: "#10B981",
			ring: "#6EE7B7",
			headerBg: "linear-gradient(135deg, #E6FAF3 0%, #D4F6EB 100%)",
		},
	},
	general: {
		key: "general",
		label: "General Scholarship",
		colors: {
			border: "#1E293B",
			text: "#0F172A",
			bg: "#F8FAFC",
			tint: "#E2E8F0",
			accent: "#334155",
			ring: "#94A3B8",
			headerBg: "linear-gradient(135deg, #F3F6F9 0%, #E7ECF2 100%)",
		},
	},
};

export function getCategoryTheme(category) {
	const key = normalizeCategoryKey(category);
	return CATEGORY_THEMES[key] || CATEGORY_THEMES.general;
}

