import { z } from 'zod';
import { NavigatorError } from './contracts.js';
import { messageSchema, readBoundedJson } from './providerIO.js';
import { intentResponseFormat } from './researchIntent.js';
import { answerResponseFormat } from './evidenceAnswer.js';
import { decisionResponseFormat } from './adaptiveResearch.js';
import { providerRateLimit } from './rateLimit.js';

const formats = { research_intent: intentResponseFormat, evidence_answer: answerResponseFormat, research_decision: decisionResponseFormat };
const count = z.number().int().nonnegative().safe();
const responseSchema = z.object({
  candidates: z.array(z.object({ finishReason: z.string(), content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() }).passthrough()).max(30) }).optional() })).max(1).optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z.object({ promptTokenCount: count, candidatesTokenCount: count.optional(), thoughtsTokenCount: count.optional(), totalTokenCount: count.optional() }).optional(),
});

function quotaDelay(headers, body) {
  const times = headers.get('retry-after') ? [providerRateLimit(headers).seconds] : [];
  // Google's documented google.rpc.RetryInfo; discard all other error content.
  for (const detail of Array.isArray(body?.error?.details) ? body.error.details.slice(0, 20) : []) {
    if (detail?.['@type'] !== 'type.googleapis.com/google.rpc.RetryInfo') continue;
    if (typeof detail.retryDelay === 'string' && /^\d+(?:\.\d+)?s$/.test(detail.retryDelay)) times.push(Math.ceil(Number(detail.retryDelay.slice(0, -1))));
  }
  const finite = times.filter(Number.isFinite);
  return Math.min(86400, Math.max(1, ...(finite.length ? finite : [60])));
}

const diagnostic = (error, values) => { error.providerDiagnostics = values; return error; };
const networkCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET',
  'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);

/** Native GenerateContent transport, not an OpenAI-wire-format guess.
 * https://ai.google.dev/api/generate-content
 * https://ai.google.dev/gemini-api/docs/generate-content/structured-output
 * Only existing structured tasks are enabled; no remote tools, browsing, SDK
 * retry, provider fallback or student-authored URLs. */
export function createGeminiProvider({ apiKey, model, timeoutMs = 45000, maxOutputTokens = 1000, answerOutputTokens = 3000, fetchImpl = globalThis.fetch } = {}) {
  if (typeof apiKey !== 'string' || !apiKey || apiKey.length > 512 || /\s/.test(apiKey) || typeof model !== 'string' || !/^gemini-[a-zA-Z\d][a-zA-Z\d.-]{0,139}$/.test(model)
    || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 2000
    || !Number.isInteger(answerOutputTokens) || answerOutputTokens < 1000 || answerOutputTokens > 4000) throw new NavigatorError('INVALID_CONFIGURATION', 'Configure a Gemini model, backend key and bounded provider limits.');
  return { name: 'gemini', model,
    async complete({ messages, reserveCall, signal, mode } = {}) {
      if (!Object.hasOwn(formats, mode)) throw new NavigatorError('INVALID_CONFIGURATION', 'Gemini supports validated intent, research decisions and evidence answers.');
      const input = z.array(messageSchema).min(1).max(30).safeParse(messages);
      if (!input.success || JSON.stringify(input.data).length > 32000 || input.data.some(message => !['system', 'user'].includes(message.role))) throw new NavigatorError('CONTEXT_LIMIT', 'Supply bounded structured research messages.');
      const format = formats[mode](input.data), outputAllowance = mode === 'evidence_answer' ? answerOutputTokens : maxOutputTokens;
      const systems = input.data.filter(message => message.role === 'system');
      const contents = input.data.filter(message => message.role === 'user').map(message => ({ role: 'user', parts: [{ text: message.content }] }));
      if (!contents.length) throw new NavigatorError('CONTEXT_LIMIT', 'The research question is missing.');
      if (typeof reserveCall !== 'function') throw new NavigatorError('BUDGET_REQUIRED', 'A model-call reservation is required before inference.');
      if (signal?.aborted) throw new NavigatorError('CANCELLED', 'The investigation was cancelled.');
      await reserveCall({ provider: 'gemini', model, maxOutputTokens: outputAllowance });
      if (signal?.aborted) throw new NavigatorError('CANCELLED', 'The investigation was cancelled.');
      const controller = new AbortController(), requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      let timer, rejectCancellation, phase = 'response_headers';
      const started = performance.now();
      const timedOut = () => diagnostic(new NavigatorError('PROVIDER_TIMEOUT', `Gemini did not finish within the ${timeoutMs / 1000}-second response window.`),
        { reason: phase === 'response_headers' ? 'response_timeout' : 'body_timeout', budgetMs: timeoutMs, elapsedMs: Math.round(performance.now() - started) });
      const cancel = () => rejectCancellation?.(new NavigatorError('CANCELLED', 'The investigation was cancelled.'));
      const cancellation = new Promise((_, reject) => { rejectCancellation = reject; });
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(timedOut()); }, timeoutMs); });
        const request = async () => {
          const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST', redirect: 'error', signal: requestSignal, headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({ contents, ...(systems.length ? { systemInstruction: { parts: systems.map(message => ({ text: message.content })) } } : {}),
              generationConfig: { candidateCount: 1, maxOutputTokens: outputAllowance, responseMimeType: 'application/json', responseJsonSchema: format.json_schema.schema,
                // Gemini 3+ uses levels; earlier models must not receive them.
                thinkingConfig: { includeThoughts: false, ...(/^gemini-[3-9](?:\.|-)/.test(model) ? { thinkingLevel: 'LOW' } : {}) } } }),
          });
          phase = 'response_body';
          if (!response.ok) {
            let body;
            try { body = await readBoundedJson(response); } catch { /* Safe status-based failure remains available. */ }
            if (response.status === 429) throw new NavigatorError('PROVIDER_QUOTA', 'Gemini is limiting research. Saved findings are preserved; continue explicitly after the cooldown.', { retryAfterSeconds: quotaDelay(response.headers, body) });
            if ([401, 403].includes(response.status)) throw new NavigatorError('PROVIDER_AUTH', 'The configured Gemini key or model is unavailable.');
            if ([400, 404, 422].includes(response.status)) {
              const error = new NavigatorError('PROVIDER_REQUEST_REJECTED', 'Gemini rejected the configured model or research format. Check backend configuration before retrying.');
              error.providerDiagnostics = { httpStatus: response.status, reason: response.status === 404 ? 'model_unavailable' : 'request_rejected', providerCode: ['INVALID_ARGUMENT', 'NOT_FOUND', 'FAILED_PRECONDITION'].includes(body?.error?.status) ? body.error.status : 'other' };
              throw error;
            }
            throw diagnostic(new NavigatorError('PROVIDER_UNAVAILABLE', response.status === 503
              ? 'Gemini’s service is temporarily unavailable. Your question is saved; try again later.'
              : 'Gemini returned a service error. Your question is saved; try again later.'), { httpStatus: response.status, reason: 'service_unavailable', providerCode: 'other' });
          }
          if (!response.headers.get('content-type')?.includes('application/json')) { await response.body?.cancel().catch(() => {}); throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'The model returned an unexpected response type.'); }
          const parsed = responseSchema.safeParse(await readBoundedJson(response));
          if (!parsed.success) throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'Gemini returned an unsupported response format.');
          const candidate = parsed.data.candidates?.[0];
          const blocked = parsed.data.promptFeedback?.blockReason && parsed.data.promptFeedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED';
          if (blocked || !candidate || candidate.finishReason !== 'STOP') throw diagnostic(new NavigatorError('PROVIDER_RESPONSE_INVALID', 'Gemini could not produce a complete research response. Saved evidence is preserved.'), {
            httpStatus: response.status, reason: blocked ? 'response_blocked' : candidate?.finishReason === 'MAX_TOKENS' ? 'output_limit' : 'incomplete_response', providerCode: 'other',
          });
          const parts = candidate.content?.parts ?? [];
          if (parts.some(part => Object.keys(part).some(key => !['text', 'thought', 'thoughtSignature'].includes(key)))) throw new NavigatorError('MODEL_PROTOCOL', 'Gemini returned an unsupported research action.');
          const content = parts.filter(part => part.thought !== true).map(part => part.text ?? '').join('');
          if (!content.trim() || content.length > (mode === 'evidence_answer' ? 24000 : 12000)) throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'Gemini returned an incomplete or oversized research response.');
          const usage = parsed.data.usageMetadata;
          const generated = usage ? (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0) : 0;
          const outputTokens = usage?.totalTokenCount != null ? usage.totalTokenCount - usage.promptTokenCount : generated;
          if (!Number.isSafeInteger(outputTokens) || outputTokens < generated) throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'Gemini returned invalid usage accounting.');
          return { message: { role: 'assistant', content }, finishReason: 'stop', intentFormat: 'json_schema',
            usage: usage && (usage.candidatesTokenCount != null || usage.totalTokenCount != null) ? { inputTokens: usage.promptTokenCount, outputTokens } : null };
        };
        return await Promise.race([request(), timeout, cancellation]);
      } catch (error) {
        if (signal?.aborted) throw new NavigatorError('CANCELLED', 'The investigation was cancelled.');
        if (controller.signal.aborted) throw timedOut();
        if (error instanceof NavigatorError) throw error;
        const code = error?.cause?.code ?? error?.code;
        throw diagnostic(new NavigatorError('PROVIDER_UNAVAILABLE', 'Gemini could not be reached.'), { reason: 'transport_unavailable', providerCode: networkCodes.has(code) ? code : 'other' });
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); controller.abort(); }
    },
  };
}
