import { z } from "zod";

export const MAX_RULE_DEPTH = 16;
export const MAX_RULE_NODES = 256;
export const RULE_FIELDS = ["familyIncome", "cgpa", "percentage", "educationLevel", "stream", "gender", "casteCategory", "state", "hasDisability"];
const numericFields = new Set(["familyIncome", "cgpa", "percentage"]);
const text = z.string().trim().min(1).max(500);
const reservedIds = new Set(["policy_tree", "policy_with_manual_review", "official_manual_review", "invalid_rule_tree", "criteria_not_recorded", "invalid_rule"]);
const nodeId = text.refine(value => !reservedIds.has(value) && !value.startsWith("logic:"), "This ID is reserved for evaluator diagnostics");
const wildcard = v => typeof v === "string" && ["any", "all", "*"].includes(v.toLowerCase());

export const conditionSchema = z.strictObject({
	type: z.literal("CONDITION"),
	id: nodeId,
	field: z.enum(RULE_FIELDS),
	operator: z.enum(["LT", "LTE", "GTE", "EQ", "IN", "BOOLEAN_MATCH"]),
	targetValue: z.union([text, z.number().nonnegative(), z.boolean(), z.array(text).min(1).max(100)]),
	description: z.string().max(2000).optional(),
	failMessage: z.string().max(2000).optional(),
	isMandatory: z.boolean().optional(),
}).superRefine((rule, ctx) => {
	const { field, operator, targetValue: target } = rule;
	let valid;
	if (wildcard(target)) valid = operator === "EQ" || operator === "IN";
	else if (numericFields.has(field)) valid = ["LT", "LTE", "GTE", "EQ"].includes(operator) && typeof target === "number";
	else if (field === "hasDisability") valid = ["BOOLEAN_MATCH", "EQ"].includes(operator) && typeof target === "boolean";
	else valid = (operator === "EQ" && typeof target === "string") || (operator === "IN" && Array.isArray(target));
	if (!valid) ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Target type and operator must match the rule field" });
});

const group = { id: nodeId.optional(), description: z.string().max(2000).optional() };
const recursiveNode = z.lazy(() => z.discriminatedUnion("type", [
	conditionSchema,
	z.strictObject({ type: z.literal("AND"), ...group, children: z.array(recursiveNode).min(1).max(MAX_RULE_NODES) }),
	z.strictObject({ type: z.literal("OR"), ...group, children: z.array(recursiveNode).min(1).max(MAX_RULE_NODES) }),
	z.strictObject({ type: z.literal("NOT"), ...group, child: recursiveNode }),
	z.strictObject({ type: z.literal("CONDITIONAL_BRANCH"), ...group, condition: recursiveNode, then: recursiveNode, else: recursiveNode }),
]));

// Inspect iteratively BEFORE Zod's recursive parser: bounded depth/size and cycle
// checks must also protect internal callers, not just JSON HTTP requests.
export const ruleTreeSchema = z.unknown().superRefine((tree, ctx) => {
	const stack = [{ node: tree, depth: 1 }], seen = new Set(), ids = new Set();
	let count = 0;
	while (stack.length) {
		const { node, depth } = stack.pop();
		if (++count > MAX_RULE_NODES || depth > MAX_RULE_DEPTH) {
			ctx.addIssue({ code: "custom", message: `Rule trees allow at most ${MAX_RULE_NODES} nodes and ${MAX_RULE_DEPTH} levels` }); return;
		}
		if (!node || typeof node !== "object" || Array.isArray(node)) continue;
		if (seen.has(node)) { ctx.addIssue({ code: "custom", message: "Rule trees cannot contain cycles or shared nodes" }); return; }
		seen.add(node);
		if (typeof node.id === "string") {
			const id = node.id.trim();
			if (ids.has(id)) { ctx.addIssue({ code: "custom", message: "Rule node IDs must be unique" }); return; }
			ids.add(id);
		}
		const children = node.type === "NOT" ? [node.child] : node.type === "CONDITIONAL_BRANCH" ? [node.condition, node.then, node.else] : node.children;
		if (Array.isArray(children)) {
			if (children.length > MAX_RULE_NODES) { ctx.addIssue({ code: "custom", message: "Too many rule nodes" }); return; }
			for (const child of children) stack.push({ node: child, depth: depth + 1 });
		}
	}
}).pipe(recursiveNode);

const optionalText = z.string().trim().max(200).nullable().optional();
const optionalNumber = max => z.union([z.number().nonnegative().max(max), z.string().trim().max(40).refine(value =>
	value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max), "Expected a non-negative number within range")]).nullable().optional();
const optionalBoolean = z.union([z.boolean(), z.enum(["true", "false"])]).nullable().optional();

// Aliases are retained for the existing profile form and scanner handoff. Unknown
// keys (including user IDs, rules and MongoDB operators) are rejected at the API.
export const evaluationProfileSchema = z.strictObject({
	fullName: optionalText, educationLevel: optionalText, level: optionalText,
	stream: optionalText, courseStream: optionalText, eligibleStreams: optionalText,
	familyIncome: optionalNumber(Number.MAX_SAFE_INTEGER), income: optionalNumber(Number.MAX_SAFE_INTEGER),
	cgpa: optionalNumber(10), percentage: optionalNumber(100),
	gender: optionalText, casteCategory: optionalText, caste_category: optionalText, category: optionalText, state: optionalText,
	hasDisability: optionalBoolean, disabilityRequired: optionalBoolean,
	documentsHeld: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
});

export const treeEvaluationSchema = z.strictObject({ profile: evaluationProfileSchema, ruleTree: ruleTreeSchema });
export const validationIssues = error => error.issues.map(({ path, message }) => ({ path: path.join("."), message }));

export function ruleTreeLeaves(tree) {
	if (tree.type === "CONDITION") return [tree];
	if (tree.type === "NOT") return ruleTreeLeaves(tree.child);
	if (tree.type === "CONDITIONAL_BRANCH") return [tree.condition, tree.then, tree.else].flatMap(ruleTreeLeaves);
	return tree.children.flatMap(ruleTreeLeaves);
}

// Ignore descriptions/evidence in semantic hashes, while preserving structure.
export function semanticRuleTree(tree) {
	if (tree.type === "CONDITION") return { type: tree.type, id: tree.id, field: tree.field, operator: tree.operator,
		targetValue: tree.operator === "IN" && Array.isArray(tree.targetValue) ? [...tree.targetValue].sort() : tree.targetValue };
	if (tree.type === "NOT") return { type: tree.type, child: semanticRuleTree(tree.child) };
	if (tree.type === "CONDITIONAL_BRANCH") return { type: tree.type, condition: semanticRuleTree(tree.condition), then: semanticRuleTree(tree.then), else: semanticRuleTree(tree.else) };
	return { type: tree.type, children: tree.children.map(semanticRuleTree).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}
