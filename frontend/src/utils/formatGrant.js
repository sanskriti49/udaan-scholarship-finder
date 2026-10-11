const inr = (value) => `₹${value.toLocaleString("en-IN")}`;
const periods = { yearly: "/year", monthly: "/month", "one-time": "(one-time)", total: "total" };

export function formatGrant(amount) {
	if (!amount) {
		return {
			main: "Amount not published",
			period: null,
			isUnpublished: true,
			details: "Check the official guidelines or programme website for award details.",
		};
	}

	const options = (amount.options || []).filter((o) => Number.isFinite(o.value) && o.value > 0);
	if (options.length > 1) {
		const samePeriod = options.every((o) => o.period === options[0].period && o.months === options[0].months);
		const values = options.map((o) => o.value);
		return {
			main: samePeriod ? `${inr(Math.min(...values))} – ${inr(Math.max(...values))}` : "See award details",
			period: samePeriod ? periods[options[0].period] || null : null,
			isUnpublished: false,
			isNarrative: !samePeriod,
			details: samePeriod ? `Varies by course/year.${options[0].months ? ` Paid for ${options[0].months} months a year.` : ""} Check your rate in the official guidelines.` : amount.displayString || "Rates and payment periods vary. Check the official guidelines.",
			options,
		};
	}

	if (amount.displayString && typeof amount.displayString === "string") {
		const str = amount.displayString.trim();
		const range = str.match(/^(₹[\d,]+)\s*[–-]\s*(₹[\d,]+)\s+per\s+(month|year)\b\s*(.*)$/i);
		if (range) return {
			main: `${range[1]} – ${range[2]}`, period: range[3].toLowerCase() === "month" ? "/month" : "/year",
			isUnpublished: false, details: range[4] || "Check the official guidelines for your rate.", options,
		};
		const simple = str.match(/^(₹[\d,]+)\s+per\s+(month|year)(?:\s+for\s+(\d+)\s+months\s+a\s+year)?$/i);
		if (simple) return {
			main: simple[1], period: simple[2].toLowerCase() === "month" ? "/month" : "/year",
			isUnpublished: false, details: simple[3] ? `Paid for ${simple[3]} months a year.` : null, options,
		};
		return {
			main: str.length > 72 ? "See award details" : str,
			period: null,
			isUnpublished: false,
			isNarrative: true,
			details: str.length > 72 ? str : null,
			options,
		};
	}

	if (Number.isFinite(amount.value) && amount.value > 0) {
		const formatted = `₹${amount.value.toLocaleString("en-IN")}`;
		let period = null;
		if (periods[amount.period]) period = periods[amount.period];
		else if (amount.period) period = `/${amount.period}`;

		return {
			main: formatted,
			period,
			isUnpublished: false,
			options: amount.options || [],
		};
	}

	return {
		main: "Variable Grant",
		period: null,
		isUnpublished: true,
		details: "Subject to official guidelines and course schedule.",
	};
}
