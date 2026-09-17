import { makeEvidence } from "../core/evidence.js";
import {
	consolidate,
	extractAmounts,
	extractIncomeLimits,
	extractMinDisabilityPercent,
} from "../core/extract.js";

/**
 * Extracts award amount, income ceiling and disability threshold from an
 * official guideline document.
 *
 * Safety rules:
 *  - If the document text looks like noisy OCR, no numbers are extracted.
 *  - If one document is linked by several schemes (e.g. one DEPwD PDF for
 *    pre-matric, post-matric and top-class), its numbers are NOT attached to
 *    any of them, because we cannot tell which figure belongs to which scheme.
 *  - If a document states several different income limits, none is used.
 *  - Implausible values are withheld and flagged.
 */

const PLAUSIBLE = {
	yearly: [1000, 500000],
	monthly: [100, 100000],
	income: [50000, 5000000],
};

function inRange(value, [lo, hi]) {
	return value >= lo && value <= hi;
}

function formatInr(value) {
	return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function amountDisplay(amount) {
	if (!amount) return null;
	const per = { yearly: "per year", monthly: "per month" };
	if (amount.options?.length > 1) {
		const values = amount.options.map((o) => `${formatInr(o.value)} ${per[o.period]}`);
		return `${values.join(" or ")} depending on course/year (see official guidelines)`;
	}
	const months = amount.months ? ` for ${amount.months} months a year` : "";
	return `${formatInr(amount.value)} ${per[amount.period]}${months}`;
}

export const guidelinePdfAdapter = {
	id: "guidelinePdf",

	extract(doc, snapshot, ctx) {
		const issues = [];
		const facts = {};
		const linkedBy = ctx.linkedSchemeKeys || [];

		if (doc.documentDate?.year && !doc.documentDate.openEnded && ctx.academicYear) {
			const ayStart = Number(ctx.academicYear.slice(0, 4));
			if (ayStart - doc.documentDate.year >= 3) {
				issues.push({
					code: "guideline_document_old",
					severity: "warning",
					message: `The official guideline document is dated ${doc.documentDate.label}; NSP links it as the current specification for AY ${ctx.academicYear}. Figures may have been revised since.`,
				});
			}
		}

		if (doc.quality.ocrSuspect) {
			issues.push({
				code: "ocr_low_quality",
				severity: "warning",
				message: `Guideline text looks like noisy OCR (${doc.quality.reasons.join(", ")}); amounts and income limits were not extracted automatically.`,
			});
			return { facts, issues };
		}
		if (linkedBy.length > 1) {
			issues.push({
				code: "shared_guideline_document",
				severity: "info",
				message: `This guideline document is shared by ${linkedBy.length} schemes; figures were not attributed to any single scheme.`,
			});
			return { facts, issues };
		}

		// Amount
		const amountCandidates = extractAmounts(doc.text);
		const amounts = consolidate(amountCandidates, (c) => JSON.stringify([c.value, c.period, c.months]));
		const plausible = amounts.distinct.filter((c) => inRange(c.value, PLAUSIBLE[c.period]));
		if (plausible.length !== amounts.distinct.length) {
			issues.push({
				code: "implausible_amount",
				severity: "warning",
				message: "An amount in the guidelines was outside the plausible range and was withheld.",
			});
		}
		if (plausible.length > 0) {
			const options = plausible.map((c) => ({ value: c.value, period: c.period, months: c.months }));
			const evidence = plausible
				.map((c) => makeEvidence(snapshot, c.quote, { field: "amount", locator: "amount clause", fromIndex: c.index }))
				.filter(Boolean);
			if (evidence.length === plausible.length) {
				const single = plausible.length === 1 ? plausible[0] : null;
				facts.amount = {
					value: single ? single.value : null,
					period: single ? single.period : null,
					months: single ? single.months : null,
					currency: "INR",
					options,
					evidence,
				};
				facts.amount.displayString = amountDisplay(facts.amount);
			}
		}

		// Income ceiling
		const incomes = consolidate(extractIncomeLimits(doc.text), (c) => JSON.stringify([c.value, c.operator]));
		if (incomes.conflicting) {
			issues.push({
				code: "income_limit_ambiguous",
				severity: "warning",
				message: `Guidelines mention ${incomes.distinct.length} different income limits; none was used.`,
				details: { values: incomes.distinct.map((c) => c.value) },
			});
		} else if (incomes.agreed) {
			const c = incomes.agreed;
			if (!inRange(c.value, PLAUSIBLE.income)) {
				issues.push({ code: "implausible_income_limit", severity: "warning", message: `Income limit ${c.value} withheld.` });
			} else {
				const evidence = makeEvidence(snapshot, c.quote, { field: "familyIncome", locator: "eligibility clause", fromIndex: c.index });
				if (evidence) facts.familyIncome = { max: c.value, operator: c.operator, evidence: [evidence] };
			}
		}

		// Disability threshold
		const disability = consolidate(extractMinDisabilityPercent(doc.text), (c) => String(c.value));
		if (disability.agreed) {
			const c = disability.agreed;
			const evidence = makeEvidence(snapshot, c.quote, { field: "minDisabilityPercent", locator: "eligibility clause", fromIndex: c.index });
			if (evidence) facts.minDisabilityPercent = { value: c.value, evidence: [evidence] };
		}

		facts.documentDate = doc.documentDate?.label || null;
		return { facts, issues };
	},
};
