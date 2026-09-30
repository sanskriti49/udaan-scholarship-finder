import { pageForOffset } from "./documents.js";

/**
 * Evidence = a verbatim quote plus the exact character range where it occurs in
 * a stored snapshot of an official document. If a quote cannot be located in the
 * snapshot, no evidence is created and the field it would support stays unknown.
 */

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function locateQuote(text, quote, fromIndex = 0) {
	if (!text || !quote) return null;
	const exact = text.indexOf(quote, fromIndex);
	if (exact !== -1) return { start: exact, end: exact + quote.length, matched: quote };

	// Whitespace-tolerant match (PDF line wraps); the stored quote becomes the
	// exact matched slice so later verification is a plain string comparison.
	const tokens = quote.trim().split(/\s+/).map(escapeRegExp);
	if (tokens.length === 0) return null;
	const re = new RegExp(tokens.join("\\s+"), "g");
	re.lastIndex = fromIndex;
	const match = re.exec(text);
	if (!match) return null;
	return { start: match.index, end: match.index + match[0].length, matched: match[0] };
}

/**
 * @param {object} snapshot  { id, sourceId, url, fetchedAt, sha256, textHash, text, pages, authorityTier }
 * @param {string} quote     text expected to be present in snapshot.text
 * @param {object} meta      { field, locator }
 */
export function makeEvidence(snapshot, quote, meta = {}) {
	const found = locateQuote(snapshot.text, quote, meta.fromIndex || 0);
	if (!found) return null;
	return {
		field: meta.field || null,
		snapshotId: snapshot.id,
		sourceId: snapshot.sourceId,
		url: snapshot.url,
		fetchedAt: snapshot.fetchedAt,
		contentSha256: snapshot.sha256,
		textHash: snapshot.textHash,
		quote: found.matched,
		charStart: found.start,
		charEnd: found.end,
		page: pageForOffset(snapshot.pages, found.start),
		locator: meta.locator || null,
		authorityTier: snapshot.authorityTier ?? null,
		documentDate: snapshot.documentDate?.label || null,
	};
}

/** Returns { ok, reason } — used by tests and by the /evidence API. */
export function verifyEvidence(evidence, snapshot) {
	if (!evidence || !snapshot) return { ok: false, reason: "missing" };
	if (String(evidence.snapshotId) !== String(snapshot.id)) return { ok: false, reason: "snapshot_mismatch" };
	if (evidence.url !== snapshot.url) return { ok: false, reason: "url_mismatch" };
	if (evidence.textHash !== snapshot.textHash) return { ok: false, reason: "text_hash_mismatch" };
	const slice = snapshot.text.slice(evidence.charStart, evidence.charEnd);
	if (slice !== evidence.quote) return { ok: false, reason: "quote_not_at_offset" };
	return { ok: true };
}
