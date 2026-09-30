import { cleanTitle } from "./extract.js";

/**
 * Conservative deduplication.
 *
 *  - Two records are the SAME scheme only if they produce the same schemeKey
 *    (namespace + administering body + canonical official title), or an explicit
 *    alias in the source registry says so.
 *  - Similar-looking titles are never merged automatically. They raise a
 *    `possible_duplicate` review issue instead. Merging two different schemes
 *    (e.g. Pragati Degree vs Pragati Diploma) is worse than showing both.
 */

export function slugify(value, max = 80) {
	return String(value || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, max)
		.replace(/-+$/g, "");
}

export function canonicalTitle(title) {
	return cleanTitle(title)
		.toLowerCase()
		.replace(/[–—]/g, "-")
		.replace(/\s*-\s*/g, " - ")
		.replace(/\s+/g, " ")
		.trim();
}

export function buildSchemeKey(namespace, administeringBody, title) {
	const body = slugify(administeringBody, 60) || "unknown-body";
	return `${namespace}:${body}:${slugify(canonicalTitle(title), 90)}`;
}

const STOP = new Set(["scheme", "scholarship", "for", "the", "of", "and", "in", "to", "students", "student"]);

function tokens(title) {
	return new Set(
		canonicalTitle(title)
			.split(/[^a-z0-9]+/)
			.filter((t) => t && !STOP.has(t)),
	);
}

export function titleSimilarity(a, b) {
	const ta = tokens(a);
	const tb = tokens(b);
	if (ta.size === 0 || tb.size === 0) return 0;
	let inter = 0;
	for (const t of ta) if (tb.has(t)) inter += 1;
	return inter / (ta.size + tb.size - inter);
}

/**
 * Group candidate records by schemeKey. Returns merged records plus issues for
 * exact-key collisions that disagree and for near-duplicate titles.
 */
export function dedupeCandidates(candidates, { similarityThreshold = 0.85 } = {}) {
	const byKey = new Map();
	const issues = [];

	for (const candidate of candidates) {
		const existing = byKey.get(candidate.schemeKey);
		if (!existing) {
			byKey.set(candidate.schemeKey, candidate);
			continue;
		}
		const a = JSON.stringify(existing.cycles || []);
		const b = JSON.stringify(candidate.cycles || []);
		if (a !== b) {
			issues.push({
				code: "duplicate_key_conflict",
				severity: "blocking",
				schemeKey: candidate.schemeKey,
				message: `The same scheme appears twice on ${candidate.sourceId} with different dates; kept neither version's dates until reviewed.`,
			});
			existing.blocked = true;
		}
	}

	const merged = [...byKey.values()];
	for (let i = 0; i < merged.length; i += 1) {
		for (let j = i + 1; j < merged.length; j += 1) {
			const score = titleSimilarity(merged[i].title, merged[j].title);
			if (score >= similarityThreshold) {
				issues.push({
					code: "possible_duplicate",
					severity: "info",
					schemeKey: merged[j].schemeKey,
					message: `Title is ${Math.round(score * 100)}% similar to ${merged[i].schemeKey}; not merged automatically.`,
					details: { otherSchemeKey: merged[i].schemeKey, score },
				});
			}
		}
	}
	return { records: merged, issues };
}
