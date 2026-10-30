// Only canonicalize values whose database spelling is known. Free text, IDs and
// unknown parameters retain their case and whitespace in the cache identity.
const enumValues = {
	level: ["All", "Class 10", "Class 12", "UG", "PG", "PhD", "Diploma"],
	category: ["All", "Government", "STEM", "Women", "SC / ST / OBC", "Need based", "Welfare based", "Minority", "Merit based"],
	sourceType: ["All", "Government", "Institution", "NGO / Trust", "Corporate", "Corporate CSR"],
	state: [
		"All", "All India",
		"AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PB", "RJ", "SK", "TN", "TS", "TR", "UP", "UK", "WB",
		"AN", "CH", "DH", "DL", "JK", "LA", "LD", "PY",
		"Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
		"Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Delhi NCR", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
	],
	status: ["all", "active", "upcoming", "open", "closing_soon", "closed", "unknown"],
	sort: ["deadline", "amount_high", "amount_low", "newest", "relevance", "trust"],
	hasChanges: ["true", "false"],
};
const enums = new Map(Object.entries(enumValues).map(([key, values]) =>
	[key, new Map(values.map(value => [value.toLowerCase(), value]))]));
const multiSelect = new Set(["level", "category", "sourceType", "state", "status"]);

export function canonicalizeCatalogueQuery(query = {}) {
	return Object.fromEntries(Object.entries(query).map(([key, value]) => {
		const whitelist = enums.get(key);
		if (!whitelist) return [key, value];
		const normalize = v => typeof v === "string" ? (whitelist.get(v.trim().toLowerCase()) ?? v) : v;
		if (!multiSelect.has(key)) return [key, normalize(value)];
		const values = (Array.isArray(value) ? value : [value]).flatMap(v => typeof v === "string" ? v.split(",") : [v]);
		// These filters are unordered OR sets in the catalogue controller.
		if (values.every(v => typeof v === "string")) return [key, [...new Set(values.map(normalize))].sort().join(",")];
		return [key, value];
	}));
}

// Type tags prevent repeated parameters, comma values and nested objects from
// accidentally sharing an identity when their controller behavior differs.
export function serializeQueryValue(value) {
	if (typeof value === "string") return value.startsWith("~") ? `~${value}` : value;
	const stable = v => Array.isArray(v) ? ["array", v.map(stable)] : v && typeof v === "object"
		? ["object", Object.keys(v).sort().map(key => [key, stable(v[key])])]
		: [typeof v, v];
	return `~${JSON.stringify(stable(value))}`;
}
