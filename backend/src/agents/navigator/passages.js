import { createHash } from "node:crypto";
import { makeEvidence, verifyEvidence } from "../../pipeline/core/evidence.js";
import { mySchemePolicyEvidence } from '../../pipeline/adapters/mySchemeEvidence.js';
import { policySections, policyTopics, topicsForPassage, policyRole, policyPriority } from './policySections.js';
import { selectEvidence } from './evidenceSelection.js';

export const MAX_SNAPSHOT_TEXT = 120000;
const MAX_PASSAGE = 1400;
const OVERLAP = 200;
const sentences = new Intl.Segmenter('en', { granularity: 'sentence' });
const stopwords = new Set("a an and are as at be can cover do does for from i in is it me my of on or scholarship scholarships student students that the this to what which with".split(" "));
const synonyms = [["hostel", "hostels", "hosteller", "hostellers", "boarder", "boarders", "boarding", "maintenance"], ["fee", "fees", "tuition"], ["renewal", "renew", "renewals"], ["deadline", "closing", "closes", "extension"]];

export function answerablePassage(passage) {
	if (passage.extractionNeedsReview || passage.portalHelp || passage.contextOnly || passage.policyRole === 'allocation') return false;
	if (passage.scope === 'scheme_cited_excerpt' && !passage.sourceFields?.some(field => /^(rules(?:\.|$)|eligibility(?:\.|$)|description$|currentCycle(?:\.|$)|requiredDocuments(?:\.|$))/.test(field))) return false;
	return Boolean(passage.policyTopics?.length || passage.sourceFields?.some(field => /^(rules(?:\.|$)|eligibility(?:\.|$)|currentCycle(?:\.|$)|requiredDocuments(?:\.|$))/.test(field))
		|| (passage.sourceFields?.includes('description') && /\b(?:must|shall|eligible|subject\s+to|required|only)\b/iu.test(passage.evidence?.quote ?? '')));
}

// Normalize only for ranking. Quotation text and its hash/offset proof stay untouched.
export function normalizeRetrievalText(value) {
	return String(value).normalize("NFKC").toLowerCase()
		.replace(/(\d[\d,]*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?)\b/gu, (match, amount, unit) => {
			const number = Number(amount.replaceAll(",", "")) * (unit.startsWith("cr") ? 10000000 : 100000);
			return Number.isSafeInteger(number) ? String(number) : match;
		}).replace(/(?<=\d),(?=\d)/gu, "");
}

export function isIntactSnapshot(snapshot) {
	return typeof snapshot?.text === "string" && typeof snapshot.textHash === "string"
		&& createHash("sha256").update(snapshot.text).digest("hex") === snapshot.textHash;
}

export function safeSourceUrl(raw) {
	try { const url = new URL(raw); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
	catch { return null; }
}

export function queryTerms(query) {
	const terms = new Set(normalizeRetrievalText(query).match(/[\p{L}\p{N}]+/gu) || []);
	for (const term of stopwords) terms.delete(term);
	for (const group of synonyms) if (group.some(term => terms.has(term))) for (const term of group) terms.add(term);
	return [...terms].slice(0, 40);
}

function scoreText(words, terms) {
	return terms.reduce((score, term) => score + (words.has(term) ? 1 : 0), 0);
}

/** Chunk exact UTF-16 slices, retaining line breaks, overlap, page boundaries and surrogate pairs. */
function windows(snapshot, start, end, joinDuration = false) {
	// A short duration section may be split by a PDF page break mid-sentence.
	// Cite one contiguous ORIGINAL slice, including its original page separator.
	// Ordinary passages still keep page windows; this cannot exceed the existing cap.
	if (joinDuration && snapshot.kind === 'pdf' && end - start <= MAX_PASSAGE
		&& policyTopics(snapshot.text.slice(start, end)).includes('duration')
		&& (snapshot.pages || []).some(p => p.start > start && p.start < end)) return [[start, end]];
	const boundaries = [...new Set([start, ...(snapshot.pages || []).map(p => p.start).filter(p => Number.isInteger(p) && p > start && p < end), end])].sort((a, b) => a - b);
	const ranges = [];
	for (let i = 0; i < boundaries.length - 1; i++) {
		const pageEnd = boundaries[i + 1]; let offset = boundaries[i];
		while (offset < pageEnd) {
			let next = Math.min(offset + MAX_PASSAGE, pageEnd);
			if (next < pageEnd) {
				const lineEnd = snapshot.text.lastIndexOf("\n", next);
				if (lineEnd > offset + MAX_PASSAGE / 2) next = lineEnd;
			}
			if (next < snapshot.text.length && /[\uDC00-\uDFFF]/.test(snapshot.text[next])) next--;
			if (next <= offset) break;
			ranges.push([offset, next]);
			if (next === pageEnd) break;
			offset = Math.max(offset + 1, next - OVERLAP);
			if (offset > 0 && /[\uDC00-\uDFFF]/.test(snapshot.text[offset])) offset--;
		}
	}
	return ranges;
}

function verifiedReference(raw, snapshot) {
	if (!raw || !safeSourceUrl(raw.url) || raw.url !== snapshot.url || typeof raw.quote !== "string" || !raw.quote.trim()) return null;
	if (!Number.isInteger(raw.charStart) || !Number.isInteger(raw.charEnd) || raw.charStart < 0 || raw.charEnd <= raw.charStart || raw.charEnd > snapshot.text.length) return null;
	return verifyEvidence(raw, snapshot).ok ? raw : null;
}

export function schemeEvidenceReferences(scheme) {
	// Legacy quotations without hash/offset binding are deliberately excluded.
	return [...(scheme.fieldEvidence || []), ...(scheme.currentCycle?.evidence || []), ...(scheme.requiredDocuments || []).map(doc => doc.evidence)].filter(Boolean);
}

/** A retrieval opportunity is not proof that a condition is satisfied. */
export function passageTargets(passage, targets) {
  const topics = passage.policyTopics ?? policyTopics(passage.evidence.quote);
  const words = new Set(normalizeRetrievalText(passage.evidence.quote).match(/[\p{L}\p{N}]+/gu) ?? []);
  return targets.filter(target => target.topics.some(topic => topics.includes(topic))
    || (!target.topicOnly && target.terms.some(term => words.has(term)))).map(target => target.id);
}

/** Shared listing snapshots expose ONLY the exact excerpts bound to this scheme. */
export function findPassages(scheme, snapshots, query, { includeContext = false, queries = null, targets = null, excludeEvidenceIds = [] } = {}) {
	const schemeId = String(scheme._id ?? scheme.id);
	const requests = (queries?.length ? queries : [query]).map(text => ({ terms: queryTerms(text), topics: policyTopics(text) }))
		.filter(request => request.terms.length);
	const termGroups = requests.map(request => request.terms);
	const topicGroups = requests.map(request => request.topics);
	if (!termGroups.length && !includeContext) return [];
	const references = schemeEvidenceReferences(scheme);
	const passages = new Map();
	for (const original of snapshots.slice(0, 12)) {
		if (!isIntactSnapshot(original) || !safeSourceUrl(original.url)) continue;
		const pages = Array.isArray(original.pages) ? original.pages.filter(page => Number.isInteger(page.page) && page.page > 0 && Number.isInteger(page.start) && page.start >= 0 && page.start < original.text.length).sort((a, b) => a.start - b.start) : [];
		const snapshot = { ...original, pages, id: String(original._id ?? original.id) };
		const valid = references.filter(ref => String(ref.snapshotId) === snapshot.id).map(ref => verifiedReference(ref, snapshot)).filter(Boolean);
		if (!valid.length) continue;
		// The source adapter can recover existing uncited policy fields without
		// changing immutable snapshots or widening a shared listing's scope.
		const structured = mySchemePolicyEvidence(snapshot, scheme.officialTitle || scheme.title);
		const scoped = [...valid, ...structured];
		// Explicit scheme-bound guideline links can be HTML or PDF. Shared listing
		// pages still expose only their previously bound excerpts.
		const linkedGuideline = ['pdf', 'html'].includes(snapshot.kind) && safeSourceUrl(scheme.officialLinks?.guidelinesUrl) === safeSourceUrl(snapshot.url);
		// A listing relabelled as a detail URL is still shared (some adapters use
		// both names). Only a distinct explicit detail document can widen scope.
		const linkedDetail = ['pdf', 'html'].includes(snapshot.kind) && safeSourceUrl(scheme.officialLinks?.detailUrl) === safeSourceUrl(snapshot.url)
			&& Boolean(safeSourceUrl(scheme.officialLinks?.listingUrl)) && safeSourceUrl(scheme.officialLinks.detailUrl) !== safeSourceUrl(scheme.officialLinks.listingUrl);
		const wholeDocument = (linkedGuideline || linkedDetail) && snapshot.text.length <= MAX_SNAPSHOT_TEXT;
		const sections = wholeDocument ? policySections(snapshot.text) : scoped.flatMap(ref => policySections(snapshot.text, ref.charStart, Math.min(ref.charEnd, ref.charStart + MAX_SNAPSHOT_TEXT)));
		for (const section of sections) for (const [start, end] of windows(snapshot, section.start, section.end, targets?.some(target => target.topics.includes('duration')))) {
			const text = snapshot.text.slice(start, end);
			const words = new Set(normalizeRetrievalText(text).match(/[\p{L}\p{N}]+/gu) || []);
			const scores = termGroups.map(terms => scoreText(words, terms));
			const score = scores.reduce((sum, value) => sum + value, 0);
			if (!score && !includeContext) continue;
			const lastPage = snapshot.pages.findLast(page => page.start < end)?.page;
			const firstPage = snapshot.pages.findLast(page => page.start <= start)?.page;
			const evidence = makeEvidence(snapshot, text, { field: "navigator.excerpt", fromIndex: start,
				...(firstPage && lastPage > firstPage ? { locator: `Pages ${firstPage}–${lastPage}` } : {}) });
			if (!evidence || !verifyEvidence(evidence, snapshot).ok) continue;
			const id = `ev_${createHash("sha256").update(JSON.stringify([schemeId, snapshot.id, snapshot.textHash, start, end])).digest("hex").slice(0, 40)}`;
			const sourceFields = [...new Set(scoped.filter(ref => ref.charStart <= start && ref.charEnd >= end).map(ref => ref.field).filter(field => typeof field === 'string'))];
			const topics = topicsForPassage(section, text);
			const role = section.role === 'context' ? policyRole('', sourceFields) : section.role;
			if (sourceFields.some(field => /^eligibility(?:\.|$)|^rules(?:\.|$)/u.test(field))) {
				for (const topic of ['eligibility', ...policyTopics(text)]) if (!topics.includes(topic)) topics.push(topic);
			}
			const topicScores = topicGroups.map(group => group.filter(topic => topics.includes(topic)).length);
			const jsonPolicy = structured.some(ref => ref.charStart <= start && ref.charEnd >= end);
			const contextOnly = jsonPolicy && !sourceFields.some(field => /^(?:eligibility|rules|requiredDocuments)(?:\.|$)/u.test(field))
				&& queryTerms(text).length < 4 && !/\b(?:must|shall|eligible|required|only|not)\b/iu.test(text);
			passages.set(id, { id, schemeId, evidence, scope: jsonPolicy ? 'scheme_json_policy' : linkedGuideline ? "linked_guideline" : linkedDetail ? 'linked_detail' : "scheme_cited_excerpt",
				sourceFields, policyTopics: topics, policyRole: role, policyPriority: policyPriority(role), sectionTitle: section.title, portalHelp: section.portalHelp, contextOnly,
				...(jsonPolicy ? { sourceEncoding: 'json' } : {}),
				relevance: score ? "query_match" : "scheme_context",
				interpretationVerified: false, extractionNeedsReview: Boolean(snapshot.quality?.requiresManualReview || snapshot.quality?.requiresReview || snapshot.quality?.requires_review),
				// These labels do not assign a current academic year to a historical document.
				documentDate: typeof snapshot.documentDate?.label === "string" ? snapshot.documentDate.label : null,
				score, scores, topicScores });
		}
		// Preserve the exact policy spans the ingestion pipeline already bound to
		// this scheme. Windowing the surrounding PDF can otherwise bury the actual
		// clause beneath generic document instructions or clip its qualifiers.
		let sentenceSpans, blockEdges;
		for (const ref of valid) {
			if (!includeContext || !targets?.length) break;
			if (ref.quote.length > MAX_PASSAGE) continue;
			const section = sections.find(section => ref.charStart >= section.start && ref.charStart < section.end);
			if (section?.portalHelp || section?.role === 'allocation') continue;
			let anchoredEvidence = ref;
			// Ingested field quotes may end at the extractor's character cap. On a
			// scheme-owned document, recover the containing paragraph/list item from
			// the immutable source. Shared listings must never expose neighboring schemes.
			if (wholeDocument && !structured.length) {
				// PDF line wraps are not paragraph boundaries. Blank lines and new
				// numbered/lettered items delimit blocks without interpreting policy.
				blockEdges ??= [...new Set([0, ...[...snapshot.text.matchAll(/^[\t ]*(?:\r?$|(?:[a-z]|\d+(?:\.\d+)*)[.)][\t ]+)/gimu)].map(match => match.index), snapshot.text.length])].sort((a, b) => a - b);
				const start = blockEdges.findLast(edge => edge <= ref.charStart), end = blockEdges.find(edge => edge >= ref.charEnd);
				sentenceSpans ??= [...sentences.segment(snapshot.text)].map(part => ({ start: part.index, end: part.index + part.segment.length }));
				const first = sentenceSpans.find(span => span.start <= ref.charStart && span.end > ref.charStart);
				const last = sentenceSpans.find(span => span.start < ref.charEnd && span.end >= ref.charEnd);
				const span = end - start <= MAX_PASSAGE ? { start, end } : first && last && last.end - first.start <= MAX_PASSAGE ? { start: first.start, end: last.end } : null;
				if (span) anchoredEvidence = makeEvidence(snapshot, snapshot.text.slice(span.start, span.end), { field: ref.field, fromIndex: span.start });
			}
			const topics = topicsForPassage({ topics: [], role: 'context', portalHelp: false }, anchoredEvidence.quote);
			if (!topics.length) continue;
			if (!passageTargets({ policyTopics: topics, evidence: anchoredEvidence }, targets).length) continue;
			const id = `ev_${createHash('sha256').update(JSON.stringify([schemeId, snapshot.id, snapshot.textHash, anchoredEvidence.charStart, anchoredEvidence.charEnd])).digest('hex').slice(0, 40)}`;
			const sourceFields = [ref.field], anchored = /^(?:rules(?:\.|$)|eligibility(?:\.|$)|familyIncome(?:Max)?$|minCGPA$|minDisabilityPercent$|disabilityRequired$|gender$|casteGroups$)/u.test(ref.field ?? '');
			if (!anchored) continue;
			passages.set(id, { id, schemeId, evidence: anchoredEvidence, scope: linkedGuideline ? 'linked_guideline' : linkedDetail ? 'linked_detail' : 'scheme_cited_excerpt',
				sourceFields, policyTopics: topics, policyRole: 'eligibility', policyPriority: policyPriority('eligibility'), fieldAnchored: true,
				portalHelp: false, contextOnly: false, interpretationVerified: false,
				extractionNeedsReview: Boolean(snapshot.quality?.requiresManualReview || snapshot.quality?.requiresReview || snapshot.quality?.requires_review),
				documentDate: typeof snapshot.documentDate?.label === 'string' ? snapshot.documentDate.label : null,
				relevance: 'scheme_context', score: 0 });
		}
	}
	const policy = p => Number(answerablePassage(p));
	const material = p => Number(p.policyTopics.some(topic => !['benefits', 'application'].includes(topic)));
	const ranked = [...passages.values()].filter(passage => !excludeEvidenceIds.includes(passage.id)).sort((a, b) => policy(b) - policy(a) || Number(b.fieldAnchored ?? false) - Number(a.fieldAnchored ?? false) || b.policyPriority - a.policyPriority || material(b) - material(a) || b.score - a.score || a.id.localeCompare(b.id));
	const useful = ranked.some(policy) ? ranked.filter(policy) : ranked;
	const questions = targets?.length ? targets : termGroups.map((terms, index) => ({ id: String(index), terms,
		topics: topicGroups[index]?.filter(topic => topic !== 'eligibility') ?? [] }));
	return selectEvidence(useful, 4, passage => passageTargets(passage, questions))
		.map(({ score, scores, topicScores, ...passage }) => passage);
}
