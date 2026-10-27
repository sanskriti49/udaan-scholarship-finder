const MAX_SECONDS = 86400;
const seconds = value => Number.isFinite(value) && value >= 0 ? Math.min(MAX_SECONDS, Math.max(1, Math.ceil(value))) : null;
function duration(value) {
	if (typeof value !== "string" || value.length > 80) return null;
	const parts = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|d|h|m|s)/g)];
	if (!parts.length || parts.map(part => part[0]).join("") !== value) return null;
	return seconds(parts.reduce((sum, part) => sum + Number(part[1]) * ({ ms: .001, s: 1, m: 60, h: 3600, d: 86400 })[part[2]], 0));
}
/** Whitelisted rate headers only. Never retain provider bodies, prompts or failed generations. */
export function providerRateLimit(headers, now = Date.now()) {
	const exhausted = name => /^0(?:\.0+)?$/.test(headers.get(name) ?? "");
	const tokenLimit = exhausted("x-ratelimit-remaining-tokens"), requestLimit = exhausted("x-ratelimit-remaining-requests");
	const scope = tokenLimit && !requestLimit ? "tokens" : requestLimit && !tokenLimit ? "requests" : "unknown";
	const retry = headers.get("retry-after");
	let wait = typeof retry === "string" && /^\d+(?:\.\d+)?$/.test(retry) ? seconds(Number(retry)) : null;
	if (wait == null && retry && retry.length <= 80 && Number.isFinite(Date.parse(retry))) wait = seconds((Date.parse(retry) - now) / 1000);
	if (wait == null) {
		const resets = [tokenLimit && duration(headers.get("x-ratelimit-reset-tokens")), requestLimit && duration(headers.get("x-ratelimit-reset-requests"))].filter(value => typeof value === "number");
		wait = resets.length ? Math.max(...resets) : 60;
	}
	return { seconds: wait, scope };
}
