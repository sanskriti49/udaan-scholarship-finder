export const reducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const haptic = (ms = 10) => {
	if (reducedMotion()) return;
	try {
		navigator.vibrate?.(ms);
	} catch {
		/* not supported / blocked */
	}
};

