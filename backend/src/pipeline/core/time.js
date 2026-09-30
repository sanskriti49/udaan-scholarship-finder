/**
 * Date and academic-year helpers.
 *
 * Rules:
 *  - Official Indian portals publish dates as DD-MM-YYYY (sometimes DD/MM/YYYY)
 *    in IST. We parse only those exact shapes; anything else is "unknown".
 *  - A closing date means "until the end of that day in IST", so it is stored as
 *    23:59:59.999 IST. An opening date is 00:00 IST.
 *  - An academic year is never inferred from the current clock. It must be
 *    stated by the source ("Academic Year 2026-27", "AY 2026-27").
 */

const IST_OFFSET_MINUTES = 330;
const DATE_RE = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;

function istToUtc(year, month, day, h, m, s, ms) {
	const utcMs = Date.UTC(year, month - 1, day, h, m, s, ms) - IST_OFFSET_MINUTES * 60 * 1000;
	return new Date(utcMs);
}

/**
 * Parse an official DD-MM-YYYY date. Returns null for anything that is not a real
 * calendar date (e.g. 31-02-2026) so bad input can never become a fake deadline.
 */
export function parseOfficialDate(raw, { endOfDay = false } = {}) {
	if (raw === null || raw === undefined) return null;
	const match = String(raw).trim().match(DATE_RE);
	if (!match) return null;
	const day = Number(match[1]);
	const month = Number(match[2]);
	const year = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;

	const probe = new Date(Date.UTC(year, month - 1, day));
	if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
		return null;
	}
	return endOfDay ? istToUtc(year, month, day, 23, 59, 59, 999) : istToUtc(year, month, day, 0, 0, 0, 0);
}

/** Normalise "2026-27", "2026–27", "2026-2027" to "2026-27". Returns null if invalid. */
export function normalizeAcademicYear(raw) {
	if (!raw) return null;
	const match = String(raw).match(/(20\d{2})\s*[-–—/]\s*(\d{4}|\d{2})(?!\d)/);
	if (!match) return null;
	const start = Number(match[1]);
	const endRaw = match[2];
	const end = endRaw.length === 4 ? Number(endRaw) : Math.floor(start / 100) * 100 + Number(endRaw);
	if (end !== start + 1) return null;
	return `${start}-${String(end).slice(-2)}`;
}

/** Extract an explicitly stated academic year from page text. */
export function findStatedAcademicYear(text) {
	if (!text) return null;
	const match = String(text).match(/(?:Academic\s+Year|\bAY)\s*[:\-]?\s*(20\d{2}\s*[-–—]\s*\d{2,4})/i);
	return match ? normalizeAcademicYear(match[1]) : null;
}

export function academicYearStart(ay) {
	const normalized = normalizeAcademicYear(ay);
	return normalized ? Number(normalized.slice(0, 4)) : null;
}

/**
 * Plausibility window for dates belonging to an academic year. Indian scholarship
 * cycles for AY Y-(Y+1) typically open mid-Y and close by early Y+1, but some
 * verification stages run later, so the window is deliberately generous:
 * 1 Jan Y .. 31 Dec Y+1. Dates outside it are suspicious, not auto-corrected.
 */
export function isWithinAcademicYearWindow(date, ay) {
	const start = academicYearStart(ay);
	if (!start || !(date instanceof Date) || Number.isNaN(date.getTime())) return false;
	const windowStart = istToUtc(start, 1, 1, 0, 0, 0, 0);
	const windowEnd = istToUtc(start + 1, 12, 31, 23, 59, 59, 999);
	return date >= windowStart && date <= windowEnd;
}

/** Format a Date as DD-MM-YYYY in IST (for human-readable summaries). */
export function formatIstDate(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
	const ist = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
	const dd = String(ist.getUTCDate()).padStart(2, "0");
	const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
	return `${dd}-${mm}-${ist.getUTCFullYear()}`;
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
