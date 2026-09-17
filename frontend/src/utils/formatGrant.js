/**
 * Pure, robust grant display formatter.
 * Guarantees zero `undefined`, `₹undefined`, or duplicate `/year` artifacts.
 * Only displays a grant/period when the source explicitly supports it.
 */
export function formatGrant(amount) {
	if (!amount) {
		return {
			main: "As per official guidelines",
			period: null,
			isUnpublished: true,
			details: "The grant amount is provided as per official government rules. Check the guidelines PDF or official site for exact details.",
		};
	}

	// 1. If displayString is provided from pipeline (e.g. multi-option or descriptive)
	if (amount.displayString && typeof amount.displayString === "string") {
		const str = amount.displayString.trim();
		return {
			main: str,
			period: null,
			isUnpublished: false,
			options: amount.options || [],
		};
	}

	// 2. If exact numeric value is present and valid
	if (typeof amount.value === "number" && !isNaN(amount.value) && amount.value > 0) {
		const formatted = `₹${amount.value.toLocaleString("en-IN")}`;
		let period = null;
		if (amount.period === "yearly") period = "/year";
		else if (amount.period === "monthly") period = "/month";
		else if (amount.period === "one-time") period = "(one-time)";
		else if (amount.period) period = `/${amount.period}`;

		return {
			main: formatted,
			period,
			isUnpublished: false,
			options: amount.options || [],
		};
	}

	// 3. Fallback for unquantified / variable / null values
	return {
		main: "Variable Grant",
		period: null,
		isUnpublished: true,
		details: "Subject to official guidelines and course schedule.",
	};
}
