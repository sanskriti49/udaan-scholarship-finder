import { parseDate } from "./extract.js";

// Display differences only. This never changes the identity evaluator's result
// or rewrites a name; every original separator and character is preserved.
export function markedNameParts(name, reference, highlight = true) {
  const key = word => word.normalize("NFKC").toLowerCase();
  const shared = new Set((String(reference || "").match(/[\p{L}\p{M}]+/gu) || []).map(key));
  return (String(name || "").match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu) || []).map(text => ({
    text, changed: highlight && /^[\p{L}\p{M}]+$/u.test(text) && !shared.has(key(text)),
  }));
}

export function auditDateTrail(fields, fy, includeFy = true) {
  if (!fy) return [];
  const date = key => fields[key]?.ambiguous ? null : parseDate(fields[key]?.value || "");
  return [
    ...(includeFy ? [{ id: "fy", label: "Current FY begins", date: fy.start }] : []),
    { id: "issue", label: "Document issued", date: date("issueDate") },
    { id: "expiry", label: "Stated expiry", date: date("expiryDate") },
    { id: "today", label: "Review date · India", date: fy.today },
  ].filter(point => point.date).sort((a, b) => a.date.localeCompare(b.date));
}

export function auditDateLabel(date) {
  const normalized = parseDate(date || "");
  return normalized ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${normalized}T12:00:00Z`)) : "Not recorded";
}
