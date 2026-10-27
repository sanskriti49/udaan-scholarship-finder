import { z } from "zod";
import { evaluationProfileSchema, validationIssues } from "../../engine/ruleSchema.js";
import { CLARIFICATION_FIELDS, NavigatorError } from "./contracts.js";
import { conversationSchema } from "./researchIntent.js";
import { providedApplicantFields } from './retrievalCoverage.js';

export const ownerSchema = z.string().regex(/^[a-f\d]{24}$/);
export const runIdSchema = z.string().uuid();
export const selectedProfileSchema = evaluationProfileSchema.pick(Object.fromEntries(CLARIFICATION_FIELDS.map(field => [field, true])));
export const startRunSchema = z.strictObject({
	requestId: z.string().uuid(), goal: z.string().trim().min(1).max(1000),
	profile: selectedProfileSchema.default({}),
	conversation: conversationSchema.default([]),
});
export const advanceRunSchema = z.strictObject({
	runId: runIdSchema, revision: z.number().int().nonnegative(),
	clarification: z.strictObject({ skip: z.boolean(), answers: selectedProfileSchema }).optional(),
});
export const prepareNotesSchema = advanceRunSchema.omit({ clarification: true });

export function parseContract(schema, value) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) throw new NavigatorError("INVALID_RUN_INPUT", `Invalid Navigator input: ${validationIssues(parsed.error).map(issue => issue.path).join(", ")}.`);
	return parsed.data;
}

export function publicRun(run) {
	return {
		runId: run._id, revision: run.revision, status: run.status === "running" && run.lease?.until <= run._serverNow ? "interrupted" : run.status,
		createdAt: run.createdAt.toISOString(), expiresAt: run.expiresAt.toISOString(),
		goal: run.goal, limits: structuredClone(run.limits),
		...(['groq', 'gemini'].includes(run.provider) ? { provider: run.provider, model: run.model } : {}),
		collectedPassageCount: run.collectedPassageCount ?? 0,
		workflow: run.workflow ?? "legacy", catalogueNoAI: Boolean(run.catalogueNoAI),
		usage: structuredClone(run.usage), events: structuredClone(run.events),
		clarification: run.clarification ?? null, plan: run.plan ? { ...run.plan, providedFields: providedApplicantFields(run.plan.intent) } : null, error: run.error ?? null,
	};
}
