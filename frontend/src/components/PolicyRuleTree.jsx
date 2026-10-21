import { formatFieldLabel, formatRuleRequirement } from "../utils/formatEvidence";

const labels = {
	AND: "Meet all of these conditions",
	OR: "Meet at least one of these routes",
	NOT: "Must not meet the following condition",
	CONDITIONAL_BRANCH: "The requirement depends on your profile",
};
const statuses = { passed: "Passes", failed: "Does not pass", unknown: "Needs information or review" };

function RuleNode({ node, trace, depth = 0 }) {
	if (!node || depth >= 16) return <p>Review the provider's complete policy.</p>;
	if (!labels[node.type] && node.type !== "CONDITION") return <p>Policy structure needs review. Check the provider's complete instructions.</p>;
	if (node.type === "CONDITION" && typeof node.field !== "string") return <p>This criterion needs review.</p>;
	if (node.type === "CONDITION") return (
		<div className="min-w-0 break-words rounded-lg border border-emerald-950/15 bg-white p-3">
			<p className="text-sm font-bold">{formatFieldLabel(node.field)}: {formatRuleRequirement(node)}</p>
			{trace?.status && <p className="mt-1 text-xs text-emerald-950/65">{statuses[trace.status]}{trace.check?.actual ? ` · Your answer: ${trace.check.actual}` : ""}</p>}
		</div>
	);
	const child = (value, result, key) => <RuleNode key={key} node={value} trace={result} depth={depth + 1} />;
	return (
		<section className="min-w-0 space-y-3 rounded-xl border border-dashed border-emerald-950/30 bg-emerald-50/30 p-3 sm:p-4" aria-label={labels[node.type] || "Policy conditions"}>
			<p className="text-sm font-bold">{labels[node.type] || "Review policy conditions"}</p>
			{node.type === "OR" && <p className="text-xs text-emerald-950/65">One complete route is enough. Other routes can remain incomplete.</p>}
			{node.type === "NOT" ? child(node.child, trace?.child, "not") : node.type === "CONDITIONAL_BRANCH" ? (
				<div className="space-y-3">
					<p className="text-xs font-bold">If this is true:</p>{child(node.condition, trace?.condition, "if")}
					<p className="text-xs font-bold">Then meet:</p>{child(node.then, trace?.then, "then")}
					<p className="text-xs font-bold">Otherwise meet:</p>{child(node.else, trace?.else, "else")}
				</div>
			) : <div className="space-y-3">{Array.isArray(node.children) && node.children.map((value, index) => child(value, trace?.children?.[index], index))}</div>}
		</section>
	);
}

export default function PolicyRuleTree({ tree, evaluation }) {
	const trace = evaluation?.id === "policy_with_manual_review" ? evaluation.children?.[0] : evaluation;
	if (trace?.type === "INVALID") return <p className="text-sm">The recorded policy needs review. Check the provider's complete instructions.</p>;
	return <RuleNode node={tree} trace={trace} />;
}
