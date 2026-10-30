import { STATE_ALIASES } from "./stateVocabulary.js";

// Spelling aliases only. Subcategories such as OBC-NCL remain distinct because
// treating them as OBC in both directions would weaken recorded requirements.
const aliases = {
	casteCategory: {
		"scheduled caste": "sc", "scheduled castes": "sc",
		"scheduled tribe": "st", "scheduled tribes": "st",
		"other backward class": "obc", "other backward classes": "obc",
		"economically weaker section": "ews", "economically weaker sections": "ews",
		"unreserved": "general", "ur": "general",
	},
	educationLevel: {
		"undergraduate": "ug", "under graduate": "ug",
		"postgraduate": "pg", "post graduate": "pg", "ph.d.": "phd", "ph.d": "phd",
	},
};

export function normalizeCriterionValue(field, value) {
	const text = String(value).trim().toLowerCase().replace(/\s+/g, " ");
	const vocabulary = field === "state" ? STATE_ALIASES : aliases[field];
	return vocabulary && Object.hasOwn(vocabulary, text) ? vocabulary[text] : text;
}
