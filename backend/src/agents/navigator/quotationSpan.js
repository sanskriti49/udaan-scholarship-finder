const whitespace = /\p{White_Space}/u;
const sentences = new Intl.Segmenter('en', { granularity: 'sentence' });

function contentRange(text, start, end) {
  while (start < end && whitespace.test(text[start])) start++;
  while (end > start && whitespace.test(text[end - 1])) end--;
  return [start, end];
}

/** Structural boundaries in the original UTF-16 source, never normalized text.
 * Line separators survive indentation trimming. Sentence segmentation handles
 * Unicode punctuation; commas/colons/semicolons are not independent assertions.
 * A valid span proves quotation fidelity, not semantic entailment.
 */
function boundaries(text) {
  const starts = new Set(), ends = new Set();
  const add = (start, end) => { const [a, b] = contentRange(text, start, end); if (a < b) { starts.add(a); ends.add(b); } };
  add(0, text.length);
  let offset = 0;
  for (const separator of text.matchAll(/\r\n|[\n\r\u0085\u2028\u2029]/gu)) {
    add(offset, separator.index); offset = separator.index + separator[0].length;
  }
  add(offset, text.length);
  for (const segment of sentences.segment(text)) add(segment.index, segment.index + segment.segment.length);
  return { starts, ends };
}

// Peek at bounded neighboring source text without exposing adjacent schemes on
// shared listing pages. Only two structural flags are attached to the citation.
export function sourceSpanEdges(text, start, end) {
  const from = Math.max(0, start - 240), to = Math.min(text.length, end + 240), context = text.slice(from, to);
  const { starts, ends } = boundaries(context), [a, b] = contentRange(context, start - from, end - from);
  return { startComplete: starts.has(a), endComplete: ends.has(b) };
}

export function quotationSpan(text, quote, sourceStart = 0, edges = {}) {
  if (typeof text !== 'string' || typeof quote !== 'string' || !quote.trim()) return { ok: false, code: 'QUOTE_NOT_FOUND' };
  const { starts, ends } = boundaries(text), [first, last] = contentRange(text, 0, text.length);
  if (edges.startComplete === false) starts.delete(first);
  if (edges.endComplete === false) ends.delete(last);
  let found = false;
  for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) {
    found = true;
    const [a, b] = contentRange(text, at, at + quote.length);
    if (starts.has(a) && ends.has(b)) return { ok: true, span: { charStart: sourceStart + at, charEnd: sourceStart + at + quote.length } };
  }
  // Align whitespace runs only, retaining a reversible UTF-16 source map.
  // No case folding, punctuation repair, dehyphenation or word substitution.
  if (!found) {
    const mapped = [], offsets = [], endsAt = [];
    for (const match of text.matchAll(/\p{White_Space}+|[^\p{White_Space}]/gu)) {
      const value = whitespace.test(match[0][0]) ? ' ' : match[0];
      for (let i = 0; i < value.length; i++) {
        mapped.push(value[i]); offsets.push(match.index + (value === ' ' ? 0 : i));
        endsAt.push(value === ' ' ? match.index + match[0].length : match.index + i + 1);
      }
    }
    const normalized = mapped.join(''), needle = quote.replace(/\p{White_Space}+/gu, ' ').trim();
    const matches = [];
    for (let at = normalized.indexOf(needle); needle && at >= 0; at = normalized.indexOf(needle, at + 1)) {
      found = true;
      const a = offsets[at], b = endsAt[at + needle.length - 1];
      if (starts.has(a) && ends.has(b)) matches.push({ a, b });
    }
    if (matches.length > 1) return { ok: false, code: 'QUOTE_AMBIGUOUS' };
    if (matches.length === 1) {
      const { a, b } = matches[0];
      return { ok: true, span: { charStart: sourceStart + a, charEnd: sourceStart + b }, quote: text.slice(a, b) };
    }
  }
  return { ok: false, code: found ? 'QUOTE_BOUNDARY' : 'QUOTE_NOT_FOUND' };
}
