import { DAY_MS, HOUR_MS, formatIstDate } from "./time.js";

/**
 * Status is computed from official cycle dates and the time they were last
 * verified. It never assumes a date that was not published.
 *
 *   upcoming      opensAt in the future
 *   open          opensAt passed, closesAt in the future
 *   closing_soon  open and closesAt within `closingSoonDays`
 *   closed        closesAt passed
 *   unknown       dates missing, or official sources disagree about the window
 *
 * `stale` is reported separately: a record not re-verified within its source's
 * staleAfterHours keeps its last known status but is flagged, so the UI can say
 * "last confirmed on …" instead of silently presenting old data as current.
 */
export function computeStatus(record, now = new Date(), { closingSoonDays = 7 } = {}) {
	const nowMs = now.getTime();
	const cycle = record?.currentCycle || null;
	const freshness = record?.freshness || {};
	const staleAfterMs = (freshness.staleAfterHours ?? 72) * HOUR_MS;
	const lastVerified = freshness.lastVerifiedAt ? new Date(freshness.lastVerifiedAt).getTime() : null;
	const stale = lastVerified === null || nowMs - lastVerified > staleAfterMs;

	const result = (status, reason) => ({
		status,
		reason,
		stale,
		lastVerifiedAt: freshness.lastVerifiedAt || null,
		computedAt: now,
	});

	if (!cycle) return result("unknown", "No official application window has been published for this scheme.");

	const opensAt = cycle.opensAt ? new Date(cycle.opensAt).getTime() : null;
	const closesAt = cycle.closesAt ? new Date(cycle.closesAt).getTime() : null;
	const latestClose = cycle.latestPossibleClosesAt ? new Date(cycle.latestPossibleClosesAt).getTime() : null;
	const ay = cycle.academicYear ? ` for AY ${cycle.academicYear}` : "";
	const renewal = cycle.applicationType === "renewal" ? " (renewal applications only)" : "";

	if (closesAt !== null && nowMs > closesAt) {
		if (latestClose !== null && nowMs <= latestClose) {
			return result(
				"unknown",
				`Official sources disagree on the closing date${ay}: ${formatIstDate(new Date(closesAt))} vs ${formatIstDate(new Date(latestClose))}. Check the portal.`,
			);
		}
		return result("closed", `Applications${ay}${renewal} closed on ${formatIstDate(new Date(closesAt))}.`);
	}
	if (opensAt !== null && nowMs < opensAt) {
		return result("upcoming", `Applications${ay}${renewal} open on ${formatIstDate(new Date(opensAt))}.`);
	}
	if (opensAt === null) {
		return result("unknown", "The official opening date has not been published.");
	}
	if (closesAt === null) {
		return result("unknown", `Opened on ${formatIstDate(new Date(opensAt))}; the official closing date has not been published.`);
	}
	const remaining = closesAt - nowMs;
	if (remaining <= closingSoonDays * DAY_MS) {
		return result("closing_soon", `Applications${ay}${renewal} close on ${formatIstDate(new Date(closesAt))}.`);
	}
	return result("open", `Applications${ay}${renewal} are open until ${formatIstDate(new Date(closesAt))}.`);
}

/** Sort key that puts unknown deadlines last without inventing a date. */
export function sortDeadline(cycle) {
	return cycle?.closesAt ? new Date(cycle.closesAt) : null;
}
