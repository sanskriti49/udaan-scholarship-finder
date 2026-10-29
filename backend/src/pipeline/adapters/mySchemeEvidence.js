import { makeEvidence } from '../core/evidence.js';

const MAX_JSON = 120000;
const normalized = value => String(value).normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();

/** Walk a validated JSON document while retaining original string offsets.
 * Parsing a reserialized object would destroy the snapshot's citation proof. */
function stringSpans(text) {
  let cursor = 0, tokens = 0;
  const spans = [];
  const space = () => { while (/\s/u.test(text[cursor] || '') && cursor < text.length) cursor++; };
  function string(path, keep) {
    const start = cursor++;
    while (cursor < text.length) {
      if (text[cursor] === '\\') { cursor += 2; continue; }
      if (text[cursor++] === '"') break;
    }
    const raw = text.slice(start, cursor), value = JSON.parse(raw);
    if (keep) spans.push({ path, start: start + 1, end: cursor - 1, value });
    return value;
  }
  function value(path, depth = 0) {
    if (depth > 64 || ++tokens > 20000) throw new Error('JSON document bounds');
    space();
    if (text[cursor] === '"') { string(path, true); return; }
    const open = text[cursor++];
    if (open === '{') {
      space(); const keys = new Set();
      while (text[cursor] !== '}') {
        const key = string(path, false);
        // JSON.parse accepts duplicate keys, but their earlier source blocks
        // would have ambiguous identity. Do not cite either interpretation.
        if (keys.has(key)) throw new Error('Ambiguous JSON object');
        keys.add(key); space(); cursor++; value([...path, key], depth + 1); space();
        if (text[cursor] !== ',') break;
        cursor++; space();
      }
      cursor++; return;
    }
    if (open === '[') {
      space(); let index = 0;
      while (text[cursor] !== ']') {
        value([...path, index++], depth + 1); space();
        if (text[cursor] !== ',') break;
        cursor++;
      }
      cursor++; return;
    }
    while (cursor < text.length && !/[\s,\]}]/u.test(text[cursor])) cursor++;
  }
  value([]);
  return spans;
}

const fields = [
  ['data.en.eligibilityCriteria.eligibilityDescription', 'eligibility'],
  ['data.en.schemeContent.exclusions', 'eligibility.exclusions'],
  ['data.en.documentsRequired', 'requiredDocuments'],
  ['data.en.applicationProcess', 'application'],
  ['data.en.schemeContent.detailedDescription', 'description'],
  ['data.en.schemeContent.benefits', 'benefits'],
];

/** Source-format adapter for the government's single-scheme API. It performs no
 * eligibility inference and never treats a scheme title as an eligibility rule. */
export function mySchemePolicyEvidence(snapshot, expectedTitle) {
  if (snapshot.kind !== 'json' || typeof snapshot.text !== 'string' || snapshot.text.length > MAX_JSON) return [];
  try {
    const url = new URL(snapshot.url);
    if (url.protocol !== 'https:' || url.hostname !== 'www.myscheme.gov.in' || url.pathname !== '/api/apisetu/schemes') return [];
    const json = JSON.parse(snapshot.text), name = json.data?.en?.basicDetails?.schemeName;
    if (json.statusCode !== 200 || !name || normalized(name) !== normalized(expectedTitle) || json.data.slug !== url.searchParams.get('slug')) return [];
    const groups = new Map();
    for (const span of stringSpans(snapshot.text)) {
      if (!span.value.trim() || span.path.at(-1) !== 'text') continue;
      const path = span.path.join('.');
      const match = fields.find(([prefix]) => path.startsWith(`${prefix}.`));
      if (!match) continue;
      let container = span.path;
      for (let length = span.path.length - 1; length > 0; length--) {
        const candidate = span.path.slice(0, length).reduce((node, key) => node?.[key], json);
        if (['paragraph', 'list_item', 'block_quote', 'table_cell'].includes(candidate?.type)) { container = span.path.slice(0, length); break; }
      }
      const key = container.join('.'), previous = groups.get(key);
      groups.set(key, { field: match[1], path: key, start: previous?.start ?? span.start, end: span.end });
    }
    return [...groups.values()].sort((a, b) => a.start - b.start).flatMap(span => {
      // String interiors retain JSON escaping. The quote remains the original
      // source span, including intervening rich-text JSON where a sentence is
      // split into bold/link fragments. Omitting 'Only' in another fragment
      // must not manufacture an independent complete assertion.
      const quote = snapshot.text.slice(span.start, span.end);
      const evidence = makeEvidence(snapshot, quote, { field: span.field, locator: `JSON ${span.path}`, fromIndex: span.start });
      return evidence ? [{ ...evidence, sourceEncoding: 'json' }] : [];
    }).slice(0, 160);
  } catch { return []; }
}

/** A JSON string value is a source boundary, not punctuation in prose. Rebuild
 * its source-schema identity instead of trusting flags from a checkpoint. A
 * cropped value, unrelated JSON string, or other scheme never receives it. */
export function validatedJsonPolicyEdges(scheme, snapshot, evidence) {
  const found = mySchemePolicyEvidence(snapshot, scheme.officialTitle || scheme.title).some(item =>
    String(item.snapshotId) === String(evidence.snapshotId) && item.url === evidence.url && item.textHash === evidence.textHash
    && item.charStart === evidence.charStart && item.charEnd === evidence.charEnd && item.quote === evidence.quote);
  return found ? { startComplete: true, endComplete: true } : null;
}
