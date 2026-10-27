import { queryTerms, normalizeRetrievalText, answerablePassage } from './passages.js';
import { evaluateResearchEligibility } from './researchEligibility.js';

// Expose requirements, not actual private values or the evaluator's internal trace.
export function ruleReasons(result) {
  return { supported: result.passedRules.map(rule => rule.required || rule.description).filter(Boolean).slice(0, 12),
    excluded: result.failedRules.map(rule => rule.required || rule.description).filter(Boolean).slice(0, 12),
    unresolved: result.unknownRules.map(rule => rule.required || rule.description).filter(Boolean).slice(0, 12) };
}

export function qualifyCandidate(scheme, profile, coverage, citations = []) {
  const result = evaluateResearchEligibility(profile, scheme), reasons = ruleReasons(result);
  const conditions = coverage?.conditions ?? [];
  const contradictions = conditions.filter(item => item.status === 'mismatch').map(item => item.explanation || item.label);
  const supported = [...conditions.filter(item => item.status === 'match').map(item => item.label), ...reasons.supported];
  const unresolved = [...conditions.filter(item => item.status === 'unknown' && item.id !== 't0').map(item => `Confirm: ${item.label}`), ...reasons.unresolved];
  if (!coverage || !conditions.some(item => item.id !== 't0')) unresolved.push('Confirm that this scholarship addresses your request.');
  if (conditions.some(item => item.id === 't0' && item.status === 'unknown')) unresolved.push('Confirm that the scheme covers the requested funding purpose or subject.');
  if (!citations.length) unresolved.push('Check the official guideline for supporting conditions.');
  else if (!citations.some(answerablePassage)) unresolved.push('The saved excerpts do not establish eligibility conditions. Check the official guideline.');
  if (citations.some(item => item.extractionNeedsReview)) unresolved.push('The source text needs manual review.');
  const excluded = result.status === 'failed' || contradictions.length > 0;
  return { status: excluded ? 'excluded' : unresolved.length || result.status !== 'passed' ? 'needs_verification' : 'supported',
    supported: [...new Set(supported)].slice(0, 24),
    unresolved: [...new Set(unresolved)].slice(0, 32),
    reasons: [...new Set([...contradictions, ...(result.status === 'failed' ? reasons.excluded : [])])].slice(0, 24) };
}

// Lexicographic policy: no relevance score can revive a contradiction. Repository
// relevance order is the stable tie-breaker after independently supported conditions.
export function candidateRelevance(scheme, plan) {
  const words = new Set(normalizeRetrievalText([scheme.title, ...(scheme.fieldEvidence ?? []).map(ref => ref.quote)].join(' ')).match(/[\p{L}\p{N}]+/gu) || []);
  return plan.discovery.map(queryTerms).filter(terms => terms.some(term => words.has(term))).length;
}

export function matchingProfile(profile, plan) {
  // The legacy education rule has no distinction between enrollment and funded course.
  // In an explicitly cross-course request, keep that check unknown until the rule's
  // applicability is established; never rewrite the student's authorized profile.
  let result = profile;
  const requirements = plan?.requirements ?? [];
  const fundingObjective = requirements.some(item => item.id === 't0' || (item.role === 'funding' && item.operator === 'include'
    && ['educationLevel', 'stream', 'other'].includes(item.field)));
  const normalized = value => String(value).normalize('NFKC').trim().toLowerCase();
  for (const field of ['educationLevel', 'stream']) {
    const scoped = requirements.filter(item => item.field === field);
    const funding = scoped.filter(item => item.role === 'funding' && item.operator === 'include');
    const matchesInput = item => item.operator === 'include' && (Array.isArray(item.value) ? item.value : [item.value]).some(value => normalized(value) === normalized(profile[field]));
    const differentCourse = funding.length && !funding.some(matchesInput)
      && scoped.some(item => ['applicant_current', 'applicant_qualification'].includes(item.role));
    // A completed qualification cannot stand in for current admission when the
    // requested course's level/subject remains unestablished. Preserve a separate
    // explicit enrollment assertion and every independent authorized input.
    const priorOnly = !funding.length && fundingObjective
      && scoped.some(item => item.role === 'applicant_qualification' && matchesInput(item))
      && !scoped.some(item => item.role === 'applicant_current' && matchesInput(item));
    if (differentCourse || priorOnly) result = { ...result, [field]: null };
  }
  return result;
}

export function prioritizeCandidates(cards) {
  return cards.filter(card => card.qualification.status !== 'excluded').sort((a, b) =>
    Number(a.research?.identityUnresolved ?? false) - Number(b.research?.identityUnresolved ?? false)
    ||
    // Lexicographic evidence opportunity, not a weighted eligibility score.
    // Inspect usable policy in the relevant geographic context, then the actual
    // funding subject. Incidental attribute matches cannot outweigh that subject.
    // Context only defers investigation: it never proves domicile or eligibility.
    Number(b.research?.evidenceAvailable ?? false) - Number(a.research?.evidenceAvailable ?? false)
    || Number((b.research?.contextAffinity ?? 1) > 0) - Number((a.research?.contextAffinity ?? 1) > 0)
    || (b.research?.subjectMatches ?? b.research?.topicMatches ?? 0) - (a.research?.subjectMatches ?? a.research?.topicMatches ?? 0)
    || (b.research?.addressable.length ?? 0) - (a.research?.addressable.length ?? 0)
    || (b.research?.recordedMatches ?? 0) - (a.research?.recordedMatches ?? 0)
    || (b.research?.contextAffinity ?? 0) - (a.research?.contextAffinity ?? 0)
    || b.relevance - a.relevance || b.retrieval.conditions.filter(c => c.status === 'match').length - a.retrieval.conditions.filter(c => c.status === 'match').length);
}
