// Entity identity is separate from eligibility. These generic designators do
// not distinguish one named award from another; every other name word must fit.
const designators = new Set('a an and for in of the to scholarship scholarships scheme schemes programme programmes program programs award awards grant grants fellowship fellowships student students'.split(' '));
export const canonicalCategories = ['General', 'SC', 'ST', 'OBC', 'EWS'];
const audiences = new Set(canonicalCategories.filter(category => category !== 'General').map(category => category.toLowerCase()));
export const nameWords = value => [...new Set(String(value ?? '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])];
export function targetName(name) {
	const words = nameWords(name);
	return { core: words.filter(word => !designators.has(word) && !audiences.has(word)), audience: words.filter(word => audiences.has(word)) };
}
export function matchesTarget(scheme, target) {
	const expected = targetName(target.name);
	if (!expected.core.length) return false;
	return [scheme.title, scheme.officialTitle].filter(Boolean).some(title => {
		const words = new Set(nameWords(title)), actual = targetName(title);
		return expected.core.every(word => words.has(word))
			&& !(target.operator === 'exclude' && expected.audience.length && !actual.audience.length)
			&& (!expected.audience.length || !actual.audience.length || expected.audience.some(word => actual.audience.includes(word)));
	});
}
export const targetIds = (scheme, plan) => (plan?.targets ?? []).filter(target => target.operator === 'include' && matchesTarget(scheme, target)).map(target => target.id);
/** Prefer complete recorded names over ambiguous variants when that identity is
 * available. This scopes research effort, not eligibility: a less-specific name
 * is still retained for diagnostics, never classified as ineligible. */
export function preferredTargetCandidates(schemes, plan) {
	const selected = new Set(), included = plan?.targets?.filter(target => target.operator === 'include') ?? [];
	if (!included.length) return new Set(schemes.map(scheme => String(scheme._id ?? scheme.id)));
	for (const target of included) {
		const possible = schemes.filter(scheme => matchesTarget(scheme, target));
		const name = targetName(target.name), words = [...name.core, ...name.audience];
		const complete = possible.filter(scheme => [scheme.title, scheme.officialTitle].filter(Boolean).some(title => {
			const recorded = new Set(nameWords(title)); return words.every(word => recorded.has(word));
		}));
		for (const scheme of complete.length ? complete : possible) selected.add(String(scheme._id ?? scheme.id));
	}
	return selected;
}
export function withinTargetScope(scheme, plan) {
	const targets = plan?.targets ?? [], included = targets.filter(target => target.operator === 'include');
	return (!included.length || included.some(target => matchesTarget(scheme, target)))
		&& !targets.some(target => target.operator === 'exclude' && matchesTarget(scheme, target));
}

/** Spend at least one slot on each requested entity before additional versions.
 * Input order already reflects qualification/evidence quality within that scope. */
export function balanceTargets(cards, targets, limit) {
	if (!targets?.some(target => target.operator === 'include')) return cards.slice(0, limit);
	const queues = targets.filter(target => target.operator === 'include').map(target => cards.filter(card => card.targetIds?.includes(target.id)));
	const selected = [], seen = new Set();
	for (let depth = 0; selected.length < limit && queues.some(queue => depth < queue.length); depth++) {
		for (const queue of queues) {
			const card = queue[depth];
			if (card && !seen.has(card.schemeId) && selected.length < limit) { selected.push(card); seen.add(card.schemeId); }
		}
	}
	return selected;
}

export function targetResults(targets, cards, excluded = [], reviewed = []) {
	return (targets ?? []).filter(target => target.operator === 'include').map(target => {
		const candidates = cards.filter(card => card.targetIds?.includes(target.id)), rejected = excluded.filter(card => card.targetIds?.includes(target.id));
		return { id: target.id, name: target.name,
			status: !candidates.length ? rejected.length ? 'excluded' : 'not_found' : candidates.some(card => reviewed.includes(card.schemeId)) ? 'reviewed' : 'needs_evidence',
			candidateIds: candidates.slice(0, 8).map(card => card.schemeId), excludedIds: rejected.slice(0, 8).map(card => card.schemeId) };
	});
}
