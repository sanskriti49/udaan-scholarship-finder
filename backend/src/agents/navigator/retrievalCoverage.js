import { normalizeState, stateSpellings, STATE_ALIASES } from '../../engine/stateVocabulary.js';
import { evaluateResearchEligibility, researchEligibilityRules } from './researchEligibility.js';
import { queryTerms, normalizeRetrievalText } from './passages.js';
import { policyTopics } from './policySections.js';
export { canonicalCategories } from './researchTargets.js';
import { canonicalCategories } from './researchTargets.js';

const metadata = { educationLevel: 'level', state: 'state', academicYear: 'currentCycle.academicYear', applicationType: 'currentCycle.applicationType' };
const canonicalGenders = ['Female', 'Male', 'Other'];
const knownLevels = ['Class 10', 'Class 12', 'Diploma', 'UG', 'PG', 'PhD'];
const knownStates = [...new Set([...Object.keys(STATE_ALIASES), ...Object.values(STATE_ALIASES), 'all india'])];
const values = value => Array.isArray(value) ? value : [value];
const normalize = (field, value) => field === 'state' ? normalizeState(value) : String(value).normalize('NFKC').trim().toLowerCase();
const fieldLabels = { educationLevel: 'Education level', state: 'Scheme region', incomeCeiling: 'Annual family income', studyYear: 'Study year', academicYear: 'Academic year', applicationType: 'Application type', category: 'Category', gender: 'Gender', stream: 'Course subject', other: 'Funding need' };
const ruleFields = { category: 'casteCategory', gender: 'gender', stream: 'stream', state: 'state', incomeCeiling: 'familyIncome', educationLevel: 'educationLevel' };

/** Already stated, singular applicant facts need not be asked again. This only
 * controls clarification; it never writes inferred values into a profile. */
export function providedApplicantFields(plan) {
  return (plan?.requirements ?? []).filter(item => item.operator === 'include' && !Array.isArray(item.value)
    && item.value !== 'Any' && ((item.field === 'state' && item.role === 'applicant_domicile')
      || (item.field !== 'state' && item.role === 'applicant_current')))
    .map(item => ruleFields[item.field]).filter(Boolean);
}
const stateLabels = { applicant_domicile: 'Domicile', applicant_schooling: 'School location', applicant_residence: 'Residence', funding_location: 'Intended study location', applicant_current: 'Location context', investigate: 'Location to check' };
const operatorLabels = { include: '', exclude: 'Exclude ', lt: 'below ', lte: 'at most ', gt: 'above ', gte: 'at least ' };
export const requirementLabel = item => `${item.operator === 'exclude' ? 'Exclude ' : ''}${item.field === 'state' ? '' : item.role === 'applicant_current' ? 'Current enrollment / context — ' : item.role === 'applicant_qualification' ? 'Previous qualification — ' : item.role === 'scholarship' ? 'Check scholarship requirement — ' : item.role === 'preference' ? 'Preference — ' : ''}${(item.field === 'state' && stateLabels[item.role]) || fieldLabels[item.field]}: ${item.operator === 'exclude' ? '' : operatorLabels[item.operator]}${values(item.value).join(' or ')}`;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Reject only recorded contradictions. Missing/conflicting metadata stays researchable. */
export function discoveryFilters(plan) {
  return plan.requirements.filter(item => item.stage === 'metadata').map(item => {
    const path = metadata[item.field];
    let targets = values(item.value);
    if (item.field === 'applicationType' && targets.includes('both')) targets = ['fresh', 'renewal', 'both'];
    const patterns = targets.flatMap(value => item.field === 'state' ? stateSpellings(value) : [String(value)]).map(value => new RegExp(`^${escape(value)}$`, 'i'));
    const unknown = [{ [path]: null }, { [path]: '' }, { $expr: { $ne: [{ $type: `$${path}` }, 'string'] } }];
    if (item.field === 'educationLevel') unknown.push({ [path]: { $nin: knownLevels.map(value => new RegExp(`^${escape(value)}$`, 'i')) } });
    if (item.field === 'state') unknown.push({ [path]: { $nin: knownStates.map(value => new RegExp(`^${escape(value)}$`, 'i')) } });
    if (['academicYear', 'applicationType'].includes(item.field)) unknown.push({ 'currentCycle.hasConflict': true }, { 'currentCycle.conflicts.0': { $exists: true } });
    if (item.field === 'applicationType') unknown.push({ [path]: { $nin: ['fresh', 'renewal'] } });
    return { $or: [...unknown, { [path]: item.operator === 'exclude' ? { $nin: patterns } : { $in: patterns } }] };
  });
}

/** No prose is reinterpreted here: all semantic values originate in validated intent. */
export function retrievalPlan(intent) {
  const targets = intent.constraints.filter(item => item.field === 'scheme').map((item, index) => ({ id: `s${index}`, name: item.value, operator: item.operator, source: item.source }));
  const requirements = intent.constraints.map((item, index) => ({ ...item, id: `c${index}`, label: requirementLabel(item),
    stage: (item.field === 'state' && item.role === 'applicant_domicile')
      || (item.field === 'incomeCeiling' && item.role === 'applicant_current' && item.operator === 'include') ? 'rules'
      : ['category', 'gender', 'stream'].includes(item.field) && (!item.role || ['funding', 'applicant_current'].includes(item.role)) && (item.operator === 'include' || item.field !== 'stream') ? 'rules'
        : item.role && item.role !== 'funding' ? 'evidence' : metadata[item.field] && ['include', 'exclude'].includes(item.operator) ? 'metadata' : item.field === 'incomeCeiling' ? 'ranking' : 'evidence' })).filter(item => item.field !== 'scheme');
  requirements.push(...intent.questions.map((item, index) => ({ ...item, id: `q${index}`, label: item.text, field: 'question', stage: 'evidence' })));
  if (intent.searchQuery && !targets.some(target => target.operator === 'include')) requirements.push({ id: 't0', label: `Looking for: ${intent.searchQuery}`, field: 'other', operator: 'include', value: intent.searchQuery, stage: 'evidence' });
  // A name-only research request still deserves a source-based explanation.
  // This is a research question, never a newly asserted applicant condition.
  if (!requirements.length && targets.some(target => target.operator === 'include')) {
    const text = 'What eligibility and application conditions do the available sources establish?';
    requirements.push({ id: 't0', field: 'question', text, label: text, stage: 'evidence' });
  }
  // Do not turn exclusions into positive discovery terms. Each requirement gets its own evidence query.
  const topics = requirements.filter(item => ['other', 'stream', 'category'].includes(item.field) && item.operator === 'include' && (!item.role || ['funding', 'applicant_current'].includes(item.role))).flatMap(item => values(item.value));
  const discovery = [intent.searchQuery, ...topics, ...intent.questions.map(item => item.text)].filter(Boolean);
  return { version: 1, requirements, discovery, ...(targets.length ? { targets } : {}),
    queries: [...new Set([intent.searchQuery, ...requirements.map(item => item.field === 'question' ? item.text : `${item.field} ${values(item.value).join(' ')}`)].filter(Boolean))] };
}

export function classifyRequirement(scheme, item) {
  const path = item.stage === 'metadata' ? metadata[item.field] : null;
  if (item.stage === 'rules') {
    const field = ruleFields[item.field];
    // Catalogue jurisdiction is not itself an explicit domicile rule. A user's
    // schooling/residence never reaches this branch, and legacy state fallback
    // must not manufacture a permanent-residency requirement.
    const explicitDomicile = item.field !== 'state' || scheme.ruleTree != null || scheme.rules?.some(rule => rule.field === 'state');
    const fieldRules = explicitDomicile ? researchEligibilityRules(scheme).filter(rule => rule.field === field) : [];
    // Research audience compatibility is hypothetical, never an authorized personal profile.
    // Evaluate the WHOLE policy for each alternative so OR/NOT/conditional branches retain their meaning.
    const domain = item.field === 'category' ? canonicalCategories : item.field === 'gender' ? canonicalGenders : item.field === 'state' ? knownStates : [];
    const audience = item.operator === 'exclude' ? domain : values(item.value);
    const results = audience.map(value => evaluateResearchEligibility({ [field]: value }, scheme));
    // Text inequality is not semantic incompatibility. Only a closed, recognized
    // category vocabulary can establish disjointness; unfamiliar labels stay open.
    const knownValue = value => domain.some(candidate => normalize(item.field, candidate) === normalize(item.field, value)) || ['any', 'all', '*'].includes(String(value).toLowerCase());
    const exactIncome = item.field === 'incomeCeiling' && item.operator === 'include' && Number.isSafeInteger(item.value);
    const canExclude = fieldRules.length > 0 && (exactIncome || (domain.length > 0 && values(item.value).every(value => domain.some(candidate => normalize(item.field, candidate) === normalize(item.field, value)))
      && fieldRules.every(rule => values(rule.targetValue).every(knownValue))));
    let status = canExclude && results.every(result => result.status === 'failed') ? 'mismatch' : fieldRules.length > 0 && results.some(result => result.status === 'passed' || (result.status !== 'failed' && result.passedRules.some(rule => rule.field === field) && !result.unknownRules.some(rule => rule.field === field))) ? 'match' : 'unknown';
    if (item.operator === 'exclude') {
      const excluded = values(item.value).map(value => normalize(item.field, value));
      const viable = audience.filter((_, index) => results[index].status !== 'failed');
      // Quantify over the recognized audience domain rather than treating a pass
      // for an excluded category as proof of a category-specific restriction.
      status = !canExclude ? 'unknown' : viable.every(value => excluded.includes(normalize(item.field, value))) ? 'mismatch'
        : audience.every((value, index) => !excluded.includes(normalize(item.field, value)) || results[index].status === 'failed') ? 'match' : 'unknown';
    }
    const checkedRules = [...new Set(results.flatMap(result => (status === 'match' ? result.passedRules : result.failedRules).filter(rule => rule.field === field).map(rule => rule.required || rule.description)).filter(Boolean))].slice(0, 3);
    return { id: item.id, label: item.label, stage: item.stage, status, reason: 'recorded_rules', evidenceIds: [],
      ...(status !== 'unknown' && checkedRules.length && checkedRules.every(text => text.length <= 1000) ? { ruleRequirements: checkedRules } : {}),
      ...(status === 'mismatch' ? { explanation: `${item.label}. Recorded requirements: ${checkedRules.join('; ')}`.slice(0, 2400) }
        : status === 'match' && checkedRules.length ? { explanation: `This condition meets the recorded requirement: ${checkedRules.join('; ')}`.slice(0, 2400) } : {}) };
  }
  let actual = path?.split('.').reduce((value, key) => value?.[key], scheme);
  if (typeof actual !== 'string') actual = null;
  if (item.field === 'educationLevel' && !knownLevels.some(value => normalize(item.field, value) === normalize(item.field, actual))) actual = null;
  if (item.field === 'state' && !knownStates.includes(normalizeState(actual)) && !values(item.value).some(value => normalizeState(value) === normalizeState(actual))) actual = null;
  if (['academicYear', 'applicationType'].includes(item.field) && (scheme.currentCycle?.hasConflict || scheme.currentCycle?.conflicts?.length)) actual = null;
  if (!path || actual == null || actual === '' || (item.field === 'applicationType' && !['fresh', 'renewal'].includes(String(actual).toLowerCase()))) {
    return { id: item.id, label: item.label, stage: item.stage, status: 'unknown', reason: path ? 'metadata_missing_or_conflicting' : 'requires_evidence_review', evidenceIds: [] };
  }
  const targets = values(item.value).map(value => normalize(item.field, value));
  const observed = normalize(item.field, actual);
  const included = targets.includes(observed) || (item.field === 'applicationType' && targets.includes('both'));
  const matches = item.operator === 'exclude' ? !included : included;
  return { id: item.id, label: item.label, stage: item.stage, status: matches ? 'match' : 'mismatch', reason: 'recorded_metadata', evidenceIds: [], ...(!matches ? { explanation: `${item.label}. This scheme records: ${actual}.` } : {}) };
}

/** Lexical evidence location is never promoted to semantic support or eligibility. */
export function assessRetrieval(scheme, plan, passages = []) {
  const conditions = plan.requirements.map(item => {
    const condition = classifyRequirement(scheme, item);
    if (condition.status !== 'unknown') return condition;
    const query = item.field === 'question' ? item.text : values(item.value).join(' ');
    const terms = queryTerms(query);
    condition.evidenceIds = passages.filter(passage => {
      const words = new Set(normalizeRetrievalText(passage.evidence.quote).match(/[\p{L}\p{N}]+/gu) || []);
      return terms.some(term => words.has(term));
    }).map(passage => passage.id);
    return condition;
  });
  return { status: conditions.some(item => item.status === 'mismatch') ? 'mismatch' : !conditions.length || conditions.some(item => item.status === 'unknown') ? 'unknown' : 'match', conditions };
}

/** Prioritize unsatisfied questions; discovery terms are last, never the first excerpt slot. */
export function evidenceTargets(scheme, plan, conditions = assessRetrieval(scheme, plan).conditions) {
  // Catalogue field names are not how guidelines phrase conditions. This is a
  // shared domain vocabulary for locating clauses, never an eligibility rule.
  const vocabulary = { educationLevel: 'eligibility qualification admission enrolled course', state: 'domicile resident state', incomeCeiling: 'annual family income limit', gender: 'eligible gender applicants',
    studyYear: 'year semester admission duration', applicationType: 'fresh renewal renew continuation', academicYear: 'academic year session validity', category: 'eligible category caste', stream: 'eligible course discipline' };
  const stateVocabulary = { applicant_schooling: 'school qualifying examination board state admission', applicant_residence: 'residence permanent domicile eligibility', funding_location: 'institution college study location eligibility', applicant_current: 'location residence domicile eligibility' };
  const topics = { educationLevel: ['education'], studyYear: ['education'], stream: ['education'], state: ['residence'],
    incomeCeiling: ['income'], category: ['category'], gender: ['gender'], academicYear: ['academicYear'] };
  return plan.requirements.filter(item => (conditions.find(c => c.id === item.id)?.status ?? 'unknown') === 'unknown').map(item => {
    const query = item.field === 'question' ? item.text : `${item.field === 'state' ? stateVocabulary[item.role] ?? vocabulary.state : vocabulary[item.field] ?? ''} ${values(item.value).join(' ')}`.trim();
    const specificTopics = item.field === 'applicationType' ? item.value === 'renewal' ? ['renewal'] : item.value === 'fresh' ? ['application'] : ['renewal', 'application']
      : topics[item.field] ?? policyTopics(query).filter(topic => topic !== 'eligibility');
    return { id: item.id, query, terms: queryTerms(item.field === 'question' ? item.text : values(item.value).join(' ')), topics: specificTopics };
  });
}

export function evidenceQueries(scheme, plan, targets = evidenceTargets(scheme, plan)) {
  return [...new Set([...targets.map(target => target.query), 'eligibility eligible requirements exclusions', ...plan.discovery])];
}
