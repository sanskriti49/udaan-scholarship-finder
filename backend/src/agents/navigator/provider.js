import { createGroqProvider } from './groqProvider.js';
import { createGeminiProvider } from './geminiProvider.js';
import { NavigatorError } from './contracts.js';

/** Explicit selection only. Never fail over a saved investigation or spend on
 * a second provider after quota, timeout, configuration or validation failure. */
export function createResearchProvider(config) {
  if (config.provider === 'groq') return createGroqProvider(config);
  if (config.provider === 'gemini') return createGeminiProvider(config);
  throw new NavigatorError('INVALID_CONFIGURATION', 'Select groq or gemini explicitly.');
}
