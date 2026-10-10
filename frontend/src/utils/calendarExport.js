import { formatGrant } from "./formatGrant";
import { cleanOfficialUrl } from "./formatEvidence";

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
 * If deadline is missing or invalid, schedules the event for 14 days from today.
 */
export function getScholarshipEventDates(deadline) {
	const now = new Date();
	let eventDate;

	if (deadline) {
		const parsed = new Date(deadline);
		if (!isNaN(parsed.getTime())) {
			eventDate = parsed;
		}
	}

	if (!eventDate) {
		// Default to 14 days from now if no deadline is specified
		eventDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
	}

	// Deadline day: Event starts at 09:00 AM IST (03:30 AM UTC) and ends at 11:59 PM IST (06:29 PM UTC)
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
	const link = cleanOfficialUrl(scholarship.applicationLink || scholarship.sourceUrl || "https://scholarships.gov.in");
	const org = scholarship.organization || "Official Scholarship Portal";
	const state = scholarship.state || "All India";

	return [
		`🎓 Application Deadline: ${scholarship.title}`,
		`🏛️ Organization: ${org}`,
		`💰 Award Amount: ${grant.main} ${grant.period ? `(${grant.period})` : ""}`,
		`📍 State / Scope: ${state}`,
		`🔗 Official Portal: ${link}`,
		"",
		"📋 PRE-FLIGHT DOCUMENT READINESS CHECKLIST:",
		"• Family Income Certificate (Issued in current FY on/after April 1)",
		"• College Bonafide Certificate with Institute 6-digit AISHE Code",
		"• Marksheet / Academic Records (Name must match Aadhaar card)",
		"• Bank Passbook (Aadhaar-seeded & NPCI DBT mapped active savings account)",
		"",
		"🛡️ Tracked & verified via Udaan Scholarship Finder (Zero-PII Scanner)",
	].join("\n");
}

/**
 * Generates a direct Google Calendar Web Intent URL.
 * Opens pre-filled calendar creation in browser / Google Calendar app.
 */
export function buildGoogleCalendarUrl(scholarship) {
	const { start, end } = getScholarshipEventDates(scholarship.deadline);
	const title = `[Deadline] Apply to ${scholarship.title}`;
	const description = buildEventDescription(scholarship);
	const link = cleanOfficialUrl(scholarship.applicationLink || scholarship.sourceUrl || "https://scholarships.gov.in");
	const location = `${scholarship.state || "All India"} · ${link}`;

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
	const { start, end } = getScholarshipEventDates(scholarship.deadline);
	const now = new Date();
	const uid = `udaan-${scholarship._id || scholarship.id || Date.now()}-${start.getTime()}@udaan.in`;
	const title = `[Deadline] Apply to ${scholarship.title}`.replace(/[,;]/g, " ");
	const description = buildEventDescription(scholarship)
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
	const location = `${scholarship.state || "All India"} · Official Online Portal`
		.replace(/[,;]/g, " ");
	const url = cleanOfficialUrl(scholarship.applicationLink || scholarship.sourceUrl || "https://scholarships.gov.in");

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
		`URL:${url}`,
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
}
