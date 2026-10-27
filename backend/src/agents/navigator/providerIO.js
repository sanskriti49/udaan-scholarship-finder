import { z } from 'zod';
import { NavigatorError } from './contracts.js';

export const messageSchema = z.discriminatedUnion('role', [
  z.strictObject({ role: z.enum(['system', 'user']), content: z.string() }),
  z.strictObject({ role: z.literal('assistant'), content: z.string().nullable(), tool_calls: z.array(z.strictObject({ id: z.string(), type: z.literal('function'), function: z.strictObject({ name: z.string(), arguments: z.string() }) })).optional() }),
  z.strictObject({ role: z.literal('tool'), tool_call_id: z.string(), content: z.string() }),
]);

/** Bound success and error bodies alike. Never log or persist provider bodies. */
export async function readBoundedJson(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'The model returned no response body.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 128 * 1024) throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'The model response exceeded its size limit.');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof NavigatorError || error?.name === 'AbortError') throw error;
    throw new NavigatorError('PROVIDER_RESPONSE_INVALID', 'The model returned an unreadable response.');
  } finally { await reader.cancel().catch(() => {}); }
}
