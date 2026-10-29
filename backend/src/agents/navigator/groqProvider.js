import { z } from "zod";
import { NavigatorError, NAVIGATOR_TOOLS } from "./contracts.js";
import { compactModelMessages } from "./modelContext.js";
import { providerRateLimit } from "./rateLimit.js";
import { RESEARCH_INTENT_TOOL, intentResponseFormat } from "./researchIntent.js";
import { answerResponseFormat, ANSWER_TOOL } from './evidenceAnswer.js';
import { decisionResponseFormat, DECISION_TOOL } from './adaptiveResearch.js';
import { messageSchema, readBoundedJson } from './providerIO.js';

// Provider-documented strict-output capabilities; no provider/model fallback.
const STRICT_INTENT_MODELS = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
const responseSchema = z.object({
	choices: z.array(z.object({
		finish_reason: z.string(),
		message: z.object({
			role: z.literal("assistant"),
			content: z.string().max(24000).nullable().optional(),
			tool_calls: z.array(z.object({
				id: z.string().min(1).max(200), type: z.literal("function"),
				function: z.object({ name: z.string().min(1).max(80), arguments: z.string().max(24000) }),
			})).max(4).optional(),
		}),
	})).length(1),
	usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative() }).optional(),
});

/** Fixed endpoint; no built-in browsing, remote MCP, retries, or paid fallback. */
export function createGroqProvider({ apiKey, model, timeoutMs = 20000, maxOutputTokens = 1000, answerOutputTokens = 3000, fetchImpl = globalThis.fetch } = {}) {
	if (!apiKey || typeof apiKey !== "string" || apiKey.length > 512 || /\s/.test(apiKey) || typeof model !== "string" || !/^[a-zA-Z\d][a-zA-Z\d._/-]{0,149}$/.test(model)
		|| !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000 || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 2000 || !Number.isInteger(answerOutputTokens) || answerOutputTokens < 1000 || answerOutputTokens > 4000) {
		throw new NavigatorError("INVALID_CONFIGURATION", "Configure a model, backend key and bounded provider limits.");
	}
	return {
		name: "groq", model,
		async complete({ messages, reserveCall, signal, mode } = {}) {
			if (mode != null && !["search_plan", "research_intent", "evidence_answer", 'research_decision'].includes(mode)) throw new NavigatorError("INVALID_CONFIGURATION", "Unknown research provider mode.");
			const answering = mode === 'evidence_answer';
			const deciding = mode === 'research_decision';
			const structuredIntent = (mode === 'research_intent' || answering || deciding) && STRICT_INTENT_MODELS.has(model);
			const outputAllowance = answering ? answerOutputTokens : maxOutputTokens;
			const input = z.array(messageSchema).min(1).max(30).safeParse(messages);
			if (!input.success || JSON.stringify(input.data).length > 32000) throw new NavigatorError("CONTEXT_LIMIT", "The investigation context exceeds its allowed size or format.");
			const responseFormat = structuredIntent ? answering ? answerResponseFormat(input.data) : deciding ? decisionResponseFormat(input.data) : intentResponseFormat(input.data) : null;
			if (typeof reserveCall !== "function") throw new NavigatorError("BUDGET_REQUIRED", "A model-call reservation is required before inference.");
			if (signal?.aborted) throw new NavigatorError("CANCELLED", "The investigation was cancelled.");
			// The caller must supply an atomic, persistent reservation before exposing this over HTTP.
			await reserveCall({ provider: "groq", model, maxOutputTokens: outputAllowance });
			if (signal?.aborted) throw new NavigatorError("CANCELLED", "The investigation was cancelled.");
			const controller = new AbortController();
			const requestSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;
			let timer, rejectCancellation;
			const cancel = () => rejectCancellation?.(new NavigatorError("CANCELLED", "The investigation was cancelled."));
			const cancellation = new Promise((_, reject) => { rejectCancellation = reject; });
			signal?.addEventListener("abort", cancel, { once: true });
			try {
				// Race the whole operation, including body reads; injected transports may ignore abort.
				const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new NavigatorError("PROVIDER_TIMEOUT", "The model exceeded its time budget.")); }, timeoutMs); });
				const request = async () => {
					const response = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
						method: "POST", redirect: "error", signal: requestSignal,
						headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
						body: JSON.stringify({ model, messages: compactModelMessages(input.data), ...(structuredIntent ? { response_format: responseFormat } : {
                                tools: answering ? [ANSWER_TOOL] : deciding ? [DECISION_TOOL] : mode === "research_intent" ? [RESEARCH_INTENT_TOOL] : mode === "search_plan" ? NAVIGATOR_TOOLS.filter(tool => tool.function.name === "searchScholarships") : NAVIGATOR_TOOLS, tool_choice: "required",
                            }), temperature: 0, max_completion_tokens: mode === "search_plan" ? Math.min(outputAllowance, 250) : outputAllowance, stream: false,
							...(model.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low", include_reasoning: false, ...(!structuredIntent ? { parallel_tool_calls: false } : {}) } : {}) }),
					});
					if (!response.ok) {
						if ([400, 422].includes(response.status)) {
							let providerCode = 'other', reason = 'request_rejected';
							try {
								const failure = (await readBoundedJson(response))?.error;
								if (['tool_use_failed', 'invalid_json_schema', 'invalid_request_error', 'json_validate_failed', 'model_not_found'].includes(failure?.code)) providerCode = failure.code;
								if (/schema|grammar|response_format|structured.output/iu.test(String(failure?.message ?? ''))) reason = 'schema_rejected';
							}
							catch { /* Malformed/oversized bodies still receive a safe status-based category. */ }
							const error = providerCode === 'tool_use_failed'
								? new NavigatorError("MODEL_PROTOCOL", "The model returned an invalid research action. Use the collected evidence without another AI call, or retry explicitly when allowance is available.")
								: new NavigatorError("PROVIDER_REQUEST_REJECTED", reason === 'schema_rejected' ? 'The AI service rejected the request format. This needs a backend configuration fix before retrying.' : "The provider rejected the research request. Check the configured model and request settings before retrying.");
							error.providerDiagnostics = { httpStatus: response.status, reason, providerCode };
							throw error;
						}
						await response.body?.cancel().catch(() => {});
						if (response.status === 429) {
							const limit = providerRateLimit(response.headers);
							const message = limit.scope === "tokens" ? "Groq's tokens-per-minute allowance is reached. Use the collected evidence without another AI call, or continue after the cooldown."
								: limit.scope === "requests" ? "Groq's daily request allowance is reached. Use the collected evidence without another AI call, or continue after its reset."
									: "Groq is rate limiting research. Use the collected evidence without another AI call, or continue after the cooldown.";
							throw new NavigatorError("PROVIDER_QUOTA", message, { retryAfterSeconds: limit.seconds });
						}
						if ([401, 403].includes(response.status)) throw new NavigatorError("PROVIDER_AUTH", "The configured model or provider key is unavailable.");
						throw new NavigatorError("PROVIDER_UNAVAILABLE", "The configured model could not complete this request.");
					}
					if (!response.headers.get("content-type")?.includes("application/json")) { await response.body?.cancel().catch(() => {}); throw new NavigatorError("PROVIDER_RESPONSE_INVALID", "The model returned an unexpected response type."); }
					const parsed = responseSchema.safeParse(await readBoundedJson(response));
					if (!parsed.success) throw new NavigatorError("PROVIDER_RESPONSE_INVALID", "The model returned an unsupported response format.");
					const { message, finish_reason: finishReason } = parsed.data.choices[0];
					if (!answering && ((message.content?.length ?? 0) > 12000 || message.tool_calls?.some(call => call.function.arguments.length > 8000))) throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'The model response exceeded this task\'s size limit.');
					const calls = message.tool_calls || [];
					if (finishReason === "length" || (!message.content && !calls.length) || new Set(calls.map(call => call.id)).size !== calls.length) throw new NavigatorError("PROVIDER_RESPONSE_INVALID", "The model returned an incomplete response.");
					return { message: { role: "assistant", content: message.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) }, finishReason,
						...(structuredIntent ? { intentFormat: 'json_schema' } : {}),
						usage: parsed.data.usage ? { inputTokens: parsed.data.usage.prompt_tokens, outputTokens: parsed.data.usage.completion_tokens } : null };
				};
				return await Promise.race([request(), timeout, cancellation]);
			} catch (error) {
				if (signal?.aborted) throw new NavigatorError("CANCELLED", "The investigation was cancelled.");
				if (controller.signal.aborted) throw new NavigatorError("PROVIDER_TIMEOUT", "The model exceeded its time budget.");
				if (error instanceof NavigatorError) throw error;
				throw new NavigatorError("PROVIDER_UNAVAILABLE", "The model provider could not be reached.");
			} finally { clearTimeout(timer); signal?.removeEventListener("abort", cancel); controller.abort(); }
		},
	};
}
