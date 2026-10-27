import { Annotation, StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { z } from "zod";
import { NavigatorError, parseToolArguments, toolSchemas } from "./contracts.js";
import { SYSTEM_PROMPT } from "./investigation.js";
import { createResearchTools } from "./researchTools.js";

const callsSchema = z.array(z.strictObject({ id: z.string().min(1).max(200), type: z.literal("function"), function: z.strictObject({ name: z.string().min(1).max(80), arguments: z.string().max(8000) }) })).min(1).max(4)
	.refine(calls => new Set(calls.map(call => call.id)).size === calls.length);
const State = Annotation.Root({ session: Annotation({ reducer: (_, update) => update, default: () => null }) });

export const initialSession = goal => ({ messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: goal }], pending: [],
	context: { version: 1, evaluations: [], passages: [] }, status: "ready", clarification: null, plan: null });

/** All closures are execution-local; private profile answers never enter graph state. */
export function createDurableGraph({ store, lease, provider, repository, sourceChecker, checkpointer, signal, allowances, now = () => new Date() }) {
	const assertActive = async () => { if (signal.aborted) throw new NavigatorError("CANCELLED", "This execution stopped."); return store.readLease(lease); };
	const event = async (type, tool) => { await assertActive(); await store.appendEvent(lease, type, tool ? { tool } : {}); };
	const model = async ({ session }) => {
		await assertActive();
		if (JSON.stringify(session.messages).length > 32000 || session.messages.length > 30) throw new NavigatorError("CONTEXT_LIMIT", "The investigation reached its context budget.");
		let reserved = false;
		const reserveCall = async () => {
			await assertActive();
			if (!reserved) { await store.reserveModel(lease, allowances); reserved = true; }
		};
		await reserveCall();
		await event("model_started");
		const response = await provider.complete({ messages: structuredClone(session.messages), reserveCall, signal });
		await assertActive();
		await store.recordUsage(lease, response.usage ?? null);
		const parsed = callsSchema.safeParse(response?.message?.tool_calls);
		if (!parsed.success) throw new NavigatorError("MODEL_PROTOCOL", "The model did not return valid tool requests.");
		const pending = parsed.data;
		const run = await assertActive();
		if (pending.length > run.limits.maxToolCalls - run.usage.toolCalls) throw new NavigatorError("TOOL_LIMIT", "The investigation reached its lifetime tool budget.");
		if (pending.length !== 1 && pending.some(call => ["finishInvestigation", "requestClarification"].includes(call.function.name))) throw new NavigatorError("MODEL_PROTOCOL", "Finish and clarification requests must be made alone.");
		await event("model_completed");
		return { session: { ...session, pending, messages: [...session.messages, { role: "assistant", content: null, tool_calls: pending }] } };
	};
	const tool = async ({ session }) => {
		const run = await assertActive(), call = session.pending[0];
		if (!call) throw new NavigatorError("MODEL_PROTOCOL", "No pending tool request is available.");
		await store.reserveTool(lease);
		const name = call.function.name, eventName = Object.hasOwn(toolSchemas, name) ? name : "unknown";
		await event("tool_started", eventName);
		const tools = createResearchTools({ repository, profile: run.privateProfile, checkpoint: session.context, sourceChecker, signal,
			reserveSourceCheck: async () => { await assertActive(); await store.reserveSourceCheck(lease); }, now });
		let output;
		try { output = await tools.execute(name, parseToolArguments(name, call.function.arguments)); }
		catch (error) {
			if (!(error instanceof NavigatorError)) throw new NavigatorError("TOOL_UNAVAILABLE", "A research tool could not complete its request.");
			output = { kind: "tool_error", code: error.code, message: error.message };
		}
		await assertActive();
		await assertActive();
		await store.appendEvent(lease, output.kind === "tool_error" ? "tool_failed" : "tool_completed", { tool: eventName,
			...(name === "findGuidelinePassages" && output.kind === "passages" ? { resultCount: output.passages.length } : {}) });
		const next = { ...session, context: tools.exportState(), pending: session.pending.slice(1) };
		if (output.kind === "plan") return { session: { ...next, status: "completed", plan: output } };
		if (output.kind === "clarification") return { session: { ...next, status: "awaiting_input", clarification: output, clarificationCallId: call.id } };
		return { session: { ...next, messages: [...session.messages, { role: "tool", tool_call_id: call.id, content: JSON.stringify(output) }] } };
	};
	const clarify = async ({ session }) => {
		// Do not place irreversible operations before interrupt: this node restarts on resume.
		const choice = interrupt({ fields: session.clarification.fields, optional: true });
		await assertActive();
		const parsed = z.strictObject({ skip: z.boolean(), resolvedFields: z.array(z.string()).max(3) }).safeParse(choice);
		if (!parsed.success) throw new NavigatorError("INVALID_RUN_INPUT", "The clarification resume token is invalid.");
		const content = JSON.stringify({ kind: "clarification_result", ...parsed.data, instruction: "Profile inputs were handled privately. Run evaluateMatches again before finishing; skipped inputs remain unknown." });
		return { session: { ...session, status: "ready", clarification: null, clarificationCallId: null,
			context: { ...session.context, evaluations: [] },
			messages: [...session.messages, { role: "tool", tool_call_id: session.clarificationCallId, content }] } };
	};
	return new StateGraph(State).addNode("model", model, { retryPolicy: { maxAttempts: 1 } })
		.addNode("tool", tool, { retryPolicy: { maxAttempts: 1 } }).addNode("clarify", clarify, { retryPolicy: { maxAttempts: 1 } })
		.addEdge(START, "model").addEdge("model", "tool")
		.addConditionalEdges("tool", ({ session }) => session.status === "completed" ? END : session.status === "awaiting_input" ? "clarify" : session.pending.length ? "tool" : "model")
		.addEdge("clarify", "model").compile({ checkpointer, interruptAfter: ["model"] });
}
