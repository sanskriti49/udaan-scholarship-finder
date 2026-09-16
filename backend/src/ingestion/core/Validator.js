const VALID_CATEGORIES = new Set([
	"Merit based",
	"Need based",
	"Women",
	"SC / ST / OBC",
	"Minority",
	"Sports",
	"Disability",
	"Government",
]);

const VALID_LEVELS = new Set(["Class 10", "Class 12", "UG", "PG", "PhD"]);

const VALID_RULE_FIELDS = new Set([
	"familyIncome",
	"cgpa",
	"percentage",
	"educationLevel",
	"stream",
	"gender",
	"casteCategory",
	"state",
	"hasDisability",
]);

const VALID_OPERATORS = new Set(["LTE", "GTE", "EQ", "IN", "BOOLEAN_MATCH"]);

export class Validator {
	/**
	 * Validates an extracted, normalized scholarship candidate object.
	 * Returns { isValid: boolean, errors: string[] }
	 */
	static validate(item) {
		const errors = [];

		if (!item.title || typeof item.title !== "string" || item.title.trim().length < 5) {
			errors.push("Missing or invalid title (min 5 characters)");
		}

		if (!item.organization || typeof item.organization !== "string") {
			errors.push("Missing organization name");
		}

		if (!item.sourceUrl || typeof item.sourceUrl !== "string" || !item.sourceUrl.startsWith("http")) {
			errors.push("Missing or malformed sourceUrl");
		}

		if (!item.amount || typeof item.amount.value !== "number" || item.amount.value < 0) {
			errors.push("Missing or invalid amount.value");
		}

		if (!item.deadline || isNaN(new Date(item.deadline).getTime())) {
			errors.push("Missing or invalid deadline date");
		}

		if (!item.category || !VALID_CATEGORIES.has(item.category)) {
			// Auto-correct to standard category if possible
			if (item.category && item.category.toLowerCase().includes("merit")) {
				item.category = "Merit based";
			} else if (item.category && item.category.toLowerCase().includes("need")) {
				item.category = "Need based";
			} else if (item.category && item.category.toLowerCase().includes("women")) {
				item.category = "Women";
			} else if (item.category && (item.category.toLowerCase().includes("sc") || item.category.toLowerCase().includes("st") || item.category.toLowerCase().includes("obc"))) {
				item.category = "SC / ST / OBC";
			} else {
				item.category = "Government";
			}
		}

		if (item.level && !VALID_LEVELS.has(item.level)) {
			item.level = "UG";
		}

		// Validate Rules AST
		if (!item.rules || !Array.isArray(item.rules) || item.rules.length === 0) {
			errors.push("Scholarship must specify at least one deterministic eligibility rule");
		} else {
			item.rules.forEach((rule, idx) => {
				if (!rule.field || !VALID_RULE_FIELDS.has(rule.field)) {
					errors.push(`Rule #${idx + 1} has invalid field: '${rule.field}'`);
				}
				if (!rule.operator || !VALID_OPERATORS.has(rule.operator)) {
					errors.push(`Rule #${idx + 1} has invalid operator: '${rule.operator}'`);
				}
				if (rule.targetValue === undefined || rule.targetValue === null) {
					errors.push(`Rule #${idx + 1} is missing targetValue`);
				}
			});
		}

		// Validate Required Documents
		if (!item.requiredDocuments || !Array.isArray(item.requiredDocuments) || item.requiredDocuments.length === 0) {
			errors.push("Scholarship must specify at least one required document");
		}

		// Validate Provenance Quotes if present
		if (item.provenanceQuotes && Array.isArray(item.provenanceQuotes)) {
			item.provenanceQuotes.forEach((quote, qIdx) => {
				if (!quote.clause || typeof quote.clause !== "string" || quote.clause.trim().length === 0) {
					errors.push(`Provenance quote #${qIdx + 1} missing or invalid 'clause'`);
				}
				if (!quote.quote || typeof quote.quote !== "string" || quote.quote.trim().length < 5) {
					errors.push(`Provenance quote #${qIdx + 1} missing or too short 'quote'`);
				}
				if (!quote.sourceUrl || typeof quote.sourceUrl !== "string" || !quote.sourceUrl.startsWith("http")) {
					errors.push(`Provenance quote #${qIdx + 1} has invalid or non-HTTP 'sourceUrl'`);
				}
				if (quote.page !== null && quote.page !== undefined) {
					if (typeof quote.page !== "number" || quote.page <= 0) {
						errors.push(`Provenance quote #${qIdx + 1} 'page' must be a positive number or null`);
					}
				}
				if (quote.confidenceScore !== null && quote.confidenceScore !== undefined) {
					if (typeof quote.confidenceScore !== "number" || quote.confidenceScore < 0 || quote.confidenceScore > 1) {
						errors.push(`Provenance quote #${qIdx + 1} 'confidenceScore' must be between 0 and 1`);
					}
				}
			});
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}

export default Validator;
