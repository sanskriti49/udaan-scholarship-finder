const MINUTE = 60000, HOUR = 60 * MINUTE;

export function readRefreshPolicy(env = process.env, overrides = {}) {
	const integer = (value, fallback, min, max, name) => {
		const number = value == null ? fallback : Number(value);
		if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${name} must be an integer between ${min} and ${max}.`);
		return number;
	};
	if (env.ENABLE_CRAWLER != null && !['true', 'false'].includes(env.ENABLE_CRAWLER)) throw new Error('ENABLE_CRAWLER must be true or false.');
	return {
		enabled: env.ENABLE_CRAWLER !== 'false',
		intervalMs: integer(overrides.intervalMs ?? env.CRAWLER_INTERVAL_MS, 24 * HOUR, HOUR, 7 * 24 * HOUR, 'CRAWLER_INTERVAL_MS'),
		checkIntervalMs: integer(overrides.checkIntervalMs ?? env.CRAWLER_CHECK_INTERVAL_MS, 15 * MINUTE, MINUTE, HOUR, 'CRAWLER_CHECK_INTERVAL_MS'),
		maxSourcesPerRun: integer(overrides.maxSourcesPerRun ?? env.CRAWLER_MAX_SOURCES_PER_RUN, 2, 1, 4, 'CRAWLER_MAX_SOURCES_PER_RUN'),
		statusIntervalMs: integer(overrides.statusIntervalMs, HOUR, MINUTE, 24 * HOUR, 'statusIntervalMs'),
	};
}

/** Persisted attempts survive restarts. Failed attempts back off without
 * declaring old scholarship evidence freshly verified. */
export function dueSources(sources, states, now, policy) {
	const byId = new Map(states.map(state => [state.sourceId, state]));
	return sources.filter(source => source.enabled !== false).map(source => {
		const state = byId.get(source.id), attempted = new Date(state?.lastAttemptAt ?? '').getTime();
		const failed = state && (['failed', 'rejected'].includes(state.lastStatus) || state.consecutiveFailures > 0);
		const delay = failed ? Math.min(policy.intervalMs, policy.checkIntervalMs * 2 ** Math.min(10, Math.max(0, (state.consecutiveFailures || 1) - 1))) : policy.intervalMs;
		return { source, dueAt: Number.isFinite(attempted) ? attempted + delay : 0 };
	}).filter(item => item.dueAt <= now.getTime())
		.sort((a, b) => a.dueAt - b.dueAt || (a.source.priority ?? 0) - (b.source.priority ?? 0) || a.source.id.localeCompare(b.source.id))
		.slice(0, policy.maxSourcesPerRun).map(item => item.source);
}
