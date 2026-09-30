import { formatFieldLabel, formatRuleRequirement } from "./formatEvidence";

export const DAY = 864e5;
export const lakh = (n) => `₹${(n / 1e5).toFixed(n % 1e5 ? 1 : 0)}L`;

/* Days-left, urgency tone and how "full" the countdown meter is (60-day window). */
export function deadlineInfo(deadline, status) {
	if (status === "closed") return { tone: "closed", text: "Closed", days: null, pct: 100 };
	if (!deadline)
		return {
			tone: "quiet",
			text: status === "upcoming" ? "Opening soon" : "No fixed date",
			days: null,
			pct: 0,
		};
	const days = Math.ceil((new Date(deadline) - Date.now()) / DAY);
	if (days < 0) return { tone: "closed", text: "Closed", days, pct: 100 };
	const date = new Date(deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
	return {
		days,
		date,
		text: days === 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : `${days} days left`,
		tone: days <= 7 ? "urgent" : days <= 21 ? "soon" : "calm",
		pct: Math.max(6, Math.min(100, 100 - (days / 60) * 100)),
	};
}

/* Short, student-readable eligibility highlights built only from the scheme's own rules. */
export function whyItFits(s, max = 3) {
	const out = [];
	const add = (t) => t && out.length < max && !out.includes(t) && out.push(t);
	for (const r of s.rules || []) {
		const req = formatRuleRequirement(r);
		if (req) add(`${formatFieldLabel(r.field)}: ${req}`);
		else if (r.description && r.description.length < 70) add(r.description);
	}
	const e = s.eligibility || {};
	if (e.familyIncome?.max) add(`Family income up to ${lakh(e.familyIncome.max)} a year`);
	if (e.gender === "Female") add("Open to girls and women");
	if (e.casteCategories?.length) add(`For ${e.casteCategories.join(" / ")} students`);
	if (e.minCGPA) add(`Minimum CGPA ${e.minCGPA}`);
	if (e.disabilityRequired) add("For students with a disability certificate");
	if (s.level) add(`For ${s.level} students`);
	if (s.state && s.state !== "All India") add(`Residents of ${s.state}`);
	return out;
}

