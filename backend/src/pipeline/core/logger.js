/**
 * Minimal structured logger. One JSON object per line so crawl logs can be
 * grepped or shipped anywhere without adding a logging dependency.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function threshold() {
	const configured = (process.env.PIPELINE_LOG_LEVEL || "info").toLowerCase();
	return LEVELS[configured] ?? LEVELS.info;
}

export function createLogger(bindings = {}) {
	const emit = (level, msg, fields = {}) => {
		if (LEVELS[level] < threshold()) return;
		const line = JSON.stringify({
			ts: new Date().toISOString(),
			level,
			msg,
			...bindings,
			...fields,
		});
		if (level === "error" || level === "warn") console.error(line);
		else console.log(line);
	};
	return {
		debug: (msg, fields) => emit("debug", msg, fields),
		info: (msg, fields) => emit("info", msg, fields),
		warn: (msg, fields) => emit("warn", msg, fields),
		error: (msg, fields) => emit("error", msg, fields),
		child: (extra) => createLogger({ ...bindings, ...extra }),
	};
}

export const rootLogger = createLogger({ component: "pipeline" });
