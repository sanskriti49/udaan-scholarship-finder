import { NavigatorError } from "./contracts.js";

function integer(env, name, fallback, min, max) {
	const value = env[name] ?? String(fallback);
	if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
		throw new NavigatorError("INVALID_CONFIGURATION", `${name} must be an integer between ${min} and ${max}.`);
	}
	return Number(value);
}

/** No dotenv import, network traffic, or model fallback. Credentials are backend-only. */
export function readNavigatorConfig(env = process.env) {
	const enabled = env.NAVIGATOR_ENABLED ?? "false";
	const adaptiveResearch = env.NAVIGATOR_ADAPTIVE_RESEARCH ?? 'true';
	if (!['true', 'false'].includes(adaptiveResearch)) throw new NavigatorError('INVALID_CONFIGURATION', 'NAVIGATOR_ADAPTIVE_RESEARCH must be true or false.');
	if (!["true", "false"].includes(enabled)) throw new NavigatorError("INVALID_CONFIGURATION", "NAVIGATOR_ENABLED must be true or false.");
	if (enabled === "false") return { enabled: false };
	const provider = env.NAVIGATOR_PROVIDER;
	if (!['groq', 'gemini'].includes(provider)) throw new NavigatorError("INVALID_CONFIGURATION", "Explicitly configure NAVIGATOR_PROVIDER=groq or gemini.");
	const model = typeof env.NAVIGATOR_MODEL === "string" ? env.NAVIGATOR_MODEL.trim() : "";
	const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY';
	const apiKey = typeof env[keyName] === "string" ? env[keyName].trim() : "";
	if (!model || !/^[a-zA-Z\d][a-zA-Z\d._/-]{0,149}$/.test(model) || (provider === 'gemini' && !/^gemini-[a-zA-Z\d][a-zA-Z\d.-]{0,139}$/.test(model))) throw new NavigatorError("INVALID_CONFIGURATION", "Configure one model enabled for the selected provider.");
	if (!apiKey || apiKey.length > 512 || /\s/.test(apiKey)) throw new NavigatorError("INVALID_CONFIGURATION", `Configure a backend ${keyName}.`);
	const globalDailyLimit = integer(env, "NAVIGATOR_GLOBAL_DAILY_CALLS", 20, 1, 10000);
	const userDailyLimit = integer(env, "NAVIGATOR_USER_DAILY_CALLS", 8, 1, 10000);
	if (userDailyLimit > globalDailyLimit) throw new NavigatorError("INVALID_CONFIGURATION", "The user daily allowance cannot exceed the global allowance.");
	return {
		enabled: true, provider, model, apiKey,
		adaptiveResearch: adaptiveResearch === 'true',
		maxResearchDecisions: integer(env, 'NAVIGATOR_MAX_RESEARCH_DECISIONS', 1, 0, 2),
		maxResearchCandidates: integer(env, 'NAVIGATOR_MAX_RESEARCH_CANDIDATES', 5, 1, 5),
		timeoutMs: integer(env, "NAVIGATOR_TIMEOUT_MS", provider === 'gemini' ? 45000 : 20000, 1000, provider === 'gemini' ? 60000 : 30000),
		maxOutputTokens: integer(env, "NAVIGATOR_MAX_OUTPUT_TOKENS", 1000, 100, 2000),
		answerOutputTokens: integer(env, "NAVIGATOR_ANSWER_OUTPUT_TOKENS", 3000, 1000, 4000),
		answerContextChars: integer(env, 'NAVIGATOR_ANSWER_CONTEXT_CHARS', 16000, 8000, 28000),
		maxModelCalls: integer(env, "NAVIGATOR_MAX_MODEL_CALLS", 6, 1, 6),
		maxToolCalls: integer(env, "NAVIGATOR_MAX_TOOL_CALLS", 8, 1, 12),
		globalDailyLimit, userDailyLimit,
	};
}
