import { formatGrant } from "./formatGrant.js";
import { cleanOfficialUrl } from "./formatEvidence.js";
import { documentItems } from "./evidencePresentation.js";

const officialUrl = scholarship => cleanOfficialUrl(scholarship.applicationLink) || cleanOfficialUrl(scholarship.sourceUrl);

/**
 * Formats a Date object to RFC 5545 UTC timestamp format (YYYYMMDDTHHMMSSZ).
 */
function toIcsTimestamp(date) {
	const d = new Date(date);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Computes start and end dates for a scholarship deadline event.
 * Unknown deadlines stay unknown; never manufacture an application date.
 */
export function getScholarshipEventDates(deadline) {
	if (!(deadline instanceof Date) && (typeof deadline !== 'string' || !deadline.trim())) return null;
	// Date parsing rolls impossible ISO dates into the next month. Such a value
	// is not a recorded deadline and must not become a convincing calendar event.
	const iso = typeof deadline === 'string' && deadline.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/u);
	if (iso) {
		const [, year, month, day] = iso.map(Number);
		if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
	}
	const eventDate = new Date(deadline);
	if (Number.isNaN(eventDate.getTime())) return null;

	// A local-day reminder, not a claim about the provider's precise closing time.
	const start = new Date(eventDate);
	start.setHours(9, 0, 0, 0);

	const end = new Date(eventDate);
	end.setHours(23, 59, 0, 0);

	return { start, end };
}

/**
 * Builds a comprehensive description text for calendar entries.
 */
export function buildEventDescription(scholarship) {
	const grant = formatGrant(scholarship.amount);
	const link = officialUrl(scholarship);
	const org = scholarship.organization || "Not recorded";
	const state = scholarship.state || "Not recorded";
	const docs = documentItems(scholarship).filter(doc => doc.sourceCited && doc.mandatory);

	return [
		`🎓 Application Deadline: ${scholarship.title}`,
		`🏛️ Organization: ${org}`,
		`💰 Award Amount: ${grant.main} ${grant.period ? `(${grant.period})` : ""}`,
		`📍 State / Scope: ${state}`,
		`🔗 Official Portal: ${link || 'Not recorded'}`,
		"",
		"📋 Recorded document requirements — confirm current provider instructions:",
		...(docs.length ? docs.map(doc => `• ${doc.name || doc.code} — ${cleanOfficialUrl(doc.evidence.url)}`)
			: ['Document requirements are not recorded with supporting citations.']),
		"",
		"Saved from Udaan's catalogue. Confirm the closing date and time with the provider.",
	].join("\n");
}

/**
 * Generates a direct Google Calendar Web Intent URL.
 * Opens pre-filled calendar creation in browser / Google Calendar app.
 */
export function buildGoogleCalendarUrl(scholarship) {
	const dates = getScholarshipEventDates(scholarship.deadline);
	if (!dates) return null;
	const { start, end } = dates;
	const title = `[Deadline] Apply to ${scholarship.title}`;
	const description = buildEventDescription(scholarship);
	const link = officialUrl(scholarship);
	const location = [scholarship.state, link].filter(Boolean).join(' · ');

	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: title,
		dates: `${toIcsTimestamp(start)}/${toIcsTimestamp(end)}`,
		details: description,
		location: location,
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates RFC 5545 compliant iCalendar (.ics) file content.
 * Compatible with Apple Calendar, Microsoft Outlook, Android, and desktop calendar clients.
 * Embeds dual alarms: 7 days and 2 days prior to deadline.
 */
export function buildIcsContent(scholarship) {
	const dates = getScholarshipEventDates(scholarship.deadline);
	if (!dates) return null;
	const { start, end } = dates;
	const now = new Date();
	const uid = `udaan-${scholarship._id || scholarship.id || Date.now()}-${start.getTime()}@udaan.in`;
	const title = `[Deadline] Apply to ${scholarship.title}`.replace(/[,;]/g, " ");
	const description = buildEventDescription(scholarship)
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
	const location = (scholarship.state || "Location not recorded")
		.replace(/[,;]/g, " ");
	const url = officialUrl(scholarship);

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Udaan Scholarship Finder//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${toIcsTimestamp(now)}`,
		`DTSTART:${toIcsTimestamp(start)}`,
		`DTEND:${toIcsTimestamp(end)}`,
		`SUMMARY:${title}`,
		`DESCRIPTION:${description}`,
		...(url ? [`URL:${url}`] : []),
		`LOCATION:${location}`,
		"STATUS:CONFIRMED",
		// Alarm 1: 7 days before
		"BEGIN:VALARM",
		"TRIGGER:-P7D",
		"ACTION:DISPLAY",
		`DESCRIPTION:Reminder: 7 days left to apply for ${title}`,
		"END:VALARM",
		// Alarm 2: 2 days before (urgent lock-screen alert)
		"BEGIN:VALARM",
		"TRIGGER:-P2D",
		"ACTION:DISPLAY",
		`DESCRIPTION:Urgent: 48 hours left to submit ${title}`,
		"END:VALARM",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

/**
 * Triggers a download of the .ics calendar file in the student's browser.
 */
export function downloadIcsFile(scholarship) {
	const icsContent = buildIcsContent(scholarship);
	if (!icsContent) return false;
	const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");

	const rawTitle = scholarship.title || "scholarship-deadline";
	const cleanSlug = rawTitle
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.slice(0, 40);

	link.href = url;
	link.setAttribute("download", `${cleanSlug}-deadline.ics`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	return true;
}
