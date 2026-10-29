import { candidateStatus, FIELDS } from './contracts.js';

// Presentation uses only retained findings. Lexical relevance and the number of
// retrieved quotations never turn an uncertain candidate into a recommendation.
export function findingGroup(entry) {
  if (candidateStatus(entry) === 'excluded') return 'excluded';
  if (entry.answer?.concern || entry.answer?.conditions.some(item => item.status === 'contradicted')) return 'concern';
  if (entry.answer?.fundingRelevance === 'contradicted') return 'concern';
  if (entry.answer?.fundingRelevance === 'unknown') return 'unconfirmed';
  if (candidateStatus(entry) === 'supported') return 'promising';
  const supported = entry.answer?.conditions.some(item => item.status === 'supported'
    && (item.basis === 'recorded_check' || (item.basis === 'source_interpretation' && item.evidence.length > 0)));
  return supported ? 'promising' : 'unconfirmed';
}

export const FINDING_GROUPS = {
  promising: { label: 'Options with supporting findings', description: 'These have some support for your request. Check the remaining conditions before applying.' },
  unconfirmed: { label: 'Options still being investigated', description: 'The available information has not established a suitable match. These are possibilities to check, not recommendations.' },
  concern: { label: 'Options with an eligibility concern', description: 'A source suggests a condition may conflict with your request. These are kept separate from promising options.' },
  excluded: { label: 'Options that do not fit', description: 'A recorded requirement conflicts with the information used for this investigation.' },
};
const order = Object.keys(FINDING_GROUPS);
export const hasSourceFindings = entry => entry.answer?.conditions.some(item => item.basis === 'source_interpretation' && item.evidence.length > 0) ?? false;
export function researchSummary(plan) {
  const entries = [...plan.entries].sort((a, b) => order.indexOf(findingGroup(a)) - order.indexOf(findingGroup(b))
    || (findingGroup(a) === 'unconfirmed' ? Number(hasSourceFindings(b)) - Number(hasSourceFindings(a)) : 0));
  const counts = Object.fromEntries(order.map(group => [group, entries.filter(entry => findingGroup(entry) === group).length]));
  const retained = entries.flatMap(entry => entry.answer?.conditions ?? [])
    .filter(item => item.status !== 'unknown' && (item.basis === 'recorded_check' || item.evidence.length > 0));
  const relevant = entries.filter(entry => ['promising', 'unconfirmed'].includes(findingGroup(entry)));
  const missing = new Map();
  for (const entry of relevant) for (const field of entry.matching?.missingFields ?? []) {
    if (FIELDS[field] && !plan.providedFields?.includes(field)) missing.set(field, (missing.get(field) ?? 0) + 1);
  }
  const nextField = [...missing].sort((a, b) => b[1] - a[1])[0]?.[0];
  const useful = entries.some(hasSourceFindings);
  const heading = plan.intent?.status === 'needs_clarification' ? 'One detail needs clearing up.'
    : counts.promising ? 'Start with the options that have support.'
      : counts.concern || counts.excluded || useful ? 'We found conditions that narrow your search.'
        : 'A useful shortlist is still missing.';
  const message = counts.promising ? `${counts.promising} ${counts.promising === 1 ? 'option has' : 'options have'} supporting findings. This does not confirm that every eligibility condition is met.`
    : counts.concern || counts.excluded || useful ? 'The findings below explain what fits, what still needs checking, and what does not fit. No suitable scholarship has been established yet.'
      : 'The checked information has not established which scholarship fits your request. Your sources are saved below; a related title alone is not enough.';
  return { entries, counts, heading, message, retainedCount: retained.length, nextField: nextField ? FIELDS[nextField].label : null };
}
