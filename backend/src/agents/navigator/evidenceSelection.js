/** Select useful question coverage, not repeated mentions. Coverage means a
 * passage may address a question; it never means that the applicant qualifies. */
export function selectEvidence(items, limit, coverageFor) {
  const pool = items.map((item, order) => ({ item, order, targets: new Set(coverageFor(item)) }));
  const selected = [], covered = new Set();
  const take = candidate => {
    selected.push(candidate.item);
    for (const id of candidate.targets) covered.add(id);
    pool.splice(pool.indexOf(candidate), 1);
  };
  // Keep an explicit restriction in the packet even if positive eligibility
  // paragraphs cover more questions. Never optimize away all negative evidence.
  const restriction = pool.filter(candidate => candidate.item.policyRole === 'exclusion')
    .sort((a, b) => b.targets.size - a.targets.size || a.order - b.order)[0];
  if (restriction && limit > 0) take(restriction);
  while (selected.length < limit && pool.length) {
    const gain = candidate => [...candidate.targets].filter(id => !covered.has(id)).length;
    const next = [...pool].sort((a, b) => gain(b) - gain(a) || a.order - b.order)[0];
    take(next);
  }
  return selected;
}
