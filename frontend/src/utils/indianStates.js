/**
 * Canonical List of all 28 Indian States, 8 Union Territories, and All-India Scope.
 * Single source of truth for Domicile selection, Rule evaluation, and Ingestion filters.
 */

export const NATIONAL_SCOPE = {
	code: "ALL_INDIA",
	value: "All India",
	label: "All India / Central Schemes",
	short: "National",
	type: "national",
};

export const INDIAN_STATES = [
	{ code: "AP", value: "Andhra Pradesh", label: "Andhra Pradesh", short: "AP", type: "state" },
	{ code: "AR", value: "Arunachal Pradesh", label: "Arunachal Pradesh", short: "AR", type: "state" },
	{ code: "AS", value: "Assam", label: "Assam", short: "AS", type: "state" },
	{ code: "BR", value: "Bihar", label: "Bihar", short: "BR", type: "state" },
	{ code: "CG", value: "Chhattisgarh", label: "Chhattisgarh", short: "CG", type: "state" },
	{ code: "GA", value: "Goa", label: "Goa", short: "GA", type: "state" },
	{ code: "GJ", value: "Gujarat", label: "Gujarat", short: "GJ", type: "state" },
	{ code: "HR", value: "Haryana", label: "Haryana", short: "HR", type: "state" },
	{ code: "HP", value: "Himachal Pradesh", label: "Himachal Pradesh", short: "HP", type: "state" },
	{ code: "JH", value: "Jharkhand", label: "Jharkhand", short: "JH", type: "state" },
	{ code: "KA", value: "Karnataka", label: "Karnataka", short: "KA", type: "state" },
	{ code: "KL", value: "Kerala", label: "Kerala", short: "KL", type: "state" },
	{ code: "MP", value: "Madhya Pradesh", label: "Madhya Pradesh", short: "MP", type: "state" },
	{ code: "MH", value: "Maharashtra", label: "Maharashtra", short: "MH", type: "state" },
	{ code: "MN", value: "Manipur", label: "Manipur", short: "MN", type: "state" },
	{ code: "ML", value: "Meghalaya", label: "Meghalaya", short: "ML", type: "state" },
	{ code: "MZ", value: "Mizoram", label: "Mizoram", short: "MZ", type: "state" },
	{ code: "NL", value: "Nagaland", label: "Nagaland", short: "NL", type: "state" },
	{ code: "OD", value: "Odisha", label: "Odisha", short: "OD", type: "state" },
	{ code: "PB", value: "Punjab", label: "Punjab", short: "PB", type: "state" },
	{ code: "RJ", value: "Rajasthan", label: "Rajasthan", short: "RJ", type: "state" },
	{ code: "SK", value: "Sikkim", label: "Sikkim", short: "SK", type: "state" },
	{ code: "TN", value: "Tamil Nadu", label: "Tamil Nadu", short: "TN", type: "state" },
	{ code: "TS", value: "Telangana", label: "Telangana", short: "TS", type: "state" },
	{ code: "TR", value: "Tripura", label: "Tripura", short: "TR", type: "state" },
	{ code: "UP", value: "Uttar Pradesh", label: "Uttar Pradesh", short: "UP", type: "state" },
	{ code: "UK", value: "Uttarakhand", label: "Uttarakhand", short: "UK", type: "state" },
	{ code: "WB", value: "West Bengal", label: "West Bengal", short: "WB", type: "state" },
];

export const UNION_TERRITORIES = [
	{ code: "AN", value: "Andaman and Nicobar Islands", label: "Andaman and Nicobar Islands", short: "AN", type: "ut" },
	{ code: "CH", value: "Chandigarh", label: "Chandigarh", short: "CH", type: "ut" },
	{ code: "DH", value: "Dadra and Nagar Haveli and Daman and Diu", label: "Dadra and Nagar Haveli and Daman and Diu", short: "DH", type: "ut" },
	{ code: "DL", value: "Delhi", label: "Delhi (NCT)", short: "DL", type: "ut" },
	{ code: "JK", value: "Jammu and Kashmir", label: "Jammu and Kashmir", short: "JK", type: "ut" },
	{ code: "LA", value: "Ladakh", label: "Ladakh", short: "LA", type: "ut" },
	{ code: "LD", value: "Lakshadweep", label: "Lakshadweep", short: "LD", type: "ut" },
	{ code: "PY", value: "Puducherry", label: "Puducherry", short: "PY", type: "ut" },
];

export const ALL_INDIAN_DOMICILES = [
	NATIONAL_SCOPE,
	...INDIAN_STATES,
	...UNION_TERRITORIES,
];

// Quick lookup mapping for aliases and lowercase canonicalization
const DOMICILE_MAP = new Map();
ALL_INDIAN_DOMICILES.forEach((item) => {
	DOMICILE_MAP.set(item.value.toLowerCase(), item);
	DOMICILE_MAP.set(item.label.toLowerCase(), item);
	DOMICILE_MAP.set(item.code.toLowerCase(), item);
	DOMICILE_MAP.set(item.short.toLowerCase(), item);
});

// Common extra aliases
DOMICILE_MAP.set("delhi ncr", DOMICILE_MAP.get("delhi"));
DOMICILE_MAP.set("nct of delhi", DOMICILE_MAP.get("delhi"));
DOMICILE_MAP.set("orissa", DOMICILE_MAP.get("odisha"));
DOMICILE_MAP.set("uttaranchal", DOMICILE_MAP.get("uttarakhand"));
DOMICILE_MAP.set("national", NATIONAL_SCOPE);
DOMICILE_MAP.set("central", NATIONAL_SCOPE);
DOMICILE_MAP.set("all", NATIONAL_SCOPE);

export function findDomicile(query) {
	if (!query) return null;
	const key = String(query).trim().toLowerCase();
	return DOMICILE_MAP.get(key) || null;
}

export function formatDomicileLabel(value) {
	const found = findDomicile(value);
	return found ? found.label : (value || "Not specified");
}
