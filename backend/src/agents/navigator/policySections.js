/** A retrieval index, never an eligibility interpreter. Topics identify where to
 * look; only the cited text and checked rules can establish an applicant's fit. */
const TOPICS = {
  eligibility: /\b(?:eligib\w*|qualification\w*|exclusions?|conditions?|requirements?)\b/iu,
  category: /\b(?:categor\w*|caste\w*|tribe\w*|community|communities|obc|sc|st|vjnt|sbc|ews)\b/iu,
  residence: /\b(?:domicil\w*|residen\w*|state|territor\w*)\b/iu,
  education: /\b(?:educat\w*|qualif\w*|course\w*|disciplin\w*|admission\w*|enrol\w*|degree|diploma|undergraduate|postgraduate|phd|engineering|class|school)\b/iu,
  income: /\b(?:income|financial|earnings?|means)\b/iu,
  gender: /\b(?:gender|female|male|girls?|boys?|women|men)\b/iu,
  renewal: /\b(?:renew\w*|continuation|continuing)\b/iu,
  academicYear: /\b(?:academic\s+(?:year|session)|session\s+20\d{2})\b/iu,
  deadline: /\b(?:deadline|closing|closes|last\s+date|extension|application\s+window)\b/iu,
  documents: /\b(?:documents?|certificates?|proof|attachments?)\b/iu,
  application: /\b(?:application|apply|registration)\b/iu,
  benefits: /\b(?:benefits?|allowance|award|amount|tuition|fees?|hostel|maintenance|boarding|boarders?)\b/iu,
};
const PORTAL_HELP = /\b(?:dashboard|password|login|log\s+in|user\s+manuals?|profile|grievance|technical\s+help|help\s+desk|contact\s+us|privacy|terms\s+of\s+use|(?:online|using|new\s+user)\s+registration|registration\s+(?:using|process)|step\s+\d)\b/iu;
const SECTION_LABEL = /\b(?:eligibil\w*|qualif\w*|exclusions?|conditions?|requirements?|domicil\w*|residen\w*|income|gender|renew\w*|academic\s+year|deadline|documents?|certificates?|application\s+(?:process|procedure|window)|how\s+to\s+apply|benefits?|admission\w*|selection|reservation\w*|course\w*)\b/iu;

export function policyTopics(text) {
  return Object.entries(TOPICS).filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
}

// Ordered document roles express research value, rather than adding arbitrary
// keyword scores. An allocation table describes award distribution, not who is
// eligible or where an applicant must be domiciled.
const POLICY_ROLES = ['context', 'allocation', 'benefits', 'application', 'documents', 'conditions', 'renewal', 'eligibility', 'exclusion'];
export function policyRole(title = '', sourceFields = []) {
  if (sourceFields.some(field => /^eligibility\.exclusions/u.test(field)) || /\b(?:exclusions?|ineligib\w*|not\s+eligible)\b/iu.test(title)) return 'exclusion';
  if (/\b(?:annex(?:ure)?|appendix|allocation|allotment|distribution)\b/iu.test(title)
    || /\b(?:number|quota)\s+of\s+(?:scholarships?|awards?|seats?)\b/iu.test(title)) return 'allocation';
  if (sourceFields.some(field => /^(?:rules|eligibility)(?:\.|$)/u.test(field)) || /\b(?:eligib\w*|qualifications?|admission\s+requirements?)\b/iu.test(title)) return 'eligibility';
  if (/\b(?:renew\w*|continuation)\b/iu.test(title)) return 'renewal';
  if (/\b(?:conditions?|restrictions?|reservations?)\b/iu.test(title)) return 'conditions';
  if (sourceFields.some(field => /^requiredDocuments(?:\.|$)/u.test(field)) || /\b(?:documents?|certificates?)\b/iu.test(title)) return 'documents';
  if (sourceFields.includes('application') || /\b(?:application|how\s+to\s+apply|deadlines?)\b/iu.test(title)) return 'application';
  if (sourceFields.includes('benefits') || /\b(?:benefits?|amount|awards?)\b/iu.test(title)) return 'benefits';
  return 'context';
}
export const policyPriority = role => POLICY_ROLES.indexOf(role);

function heading(line) {
  const markdown = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u);
  if (markdown) return { depth: markdown[1].length, title: markdown[2] };
  const numbered = line.match(/^\s*\d+(?:\.\d+)+\s+([\p{Lu}\d ()/&’'-]{3,100})\s*:?\s*$/u);
  if (numbered) return { depth: 6, title: numbered[1].trim() };
  if (/^\s*(?:Annex(?:ure)?|Appendix)\s+[\p{L}\d]+\s*:?\s*$/iu.test(line)) return { depth: 6, title: line.trim() };
  // The PDF extractor may lose heading markup. Only standalone short labels,
  // not arbitrary sentences containing a policy word, establish a section.
  const label = line.trim().replace(/:\s*$/u, '');
  return label.length > 0 && label.length <= 90 && !/^[\s\d*•-]/u.test(label) && !/^(?:select|enter|click|upload|submit|choose|fill|follow|verify|check|view)\b/iu.test(label) && !/[.!?;]/u.test(label)
    && /^[\p{Lu}]/u.test(label) && SECTION_LABEL.test(label) && label.split(/\s+/u).length <= 9
    ? { depth: 7, title: label } : null;
}

/** Exact ranges and heading inheritance preserve restrictions under subheadings.
 * An unrelated sibling heading ends the previous policy scope. */
export function policySections(text, start = 0, end = text.length) {
  const markers = [];
  const lines = text.slice(start, end).matchAll(/[^\r\n\u0085\u2028\u2029]*(?:\r\n|[\r\n\u0085\u2028\u2029]|$)/gu);
  for (const line of lines) {
    const found = heading(line[0].replace(/[\r\n\u0085\u2028\u2029]+$/u, ''));
    if (found) markers.push({ ...found, start: start + line.index });
  }
  if (!markers.length) return [{ start, end, title: null, topics: [], role: 'context', portalHelp: false }];
  const result = [], stack = [];
  let portalAppendix = false;
  if (markers[0].start > start) result.push({ start, end: markers[0].start, title: null, topics: [], role: 'context', portalHelp: false });
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    // Portals commonly append their entire help manual after a scheme. Its
    // nested headers must not reopen the scheme's eligibility scope.
    if (/\b(?:user\s+manuals?|technical\s+help|help\s+desk|copyright)\b/iu.test(marker.title)) portalAppendix = true;
    while (stack.length && stack.at(-1).depth >= marker.depth) stack.pop();
    const own = marker.title.split(/\s+/u).length <= 12 && SECTION_LABEL.test(marker.title) ? policyTopics(marker.title) : [], inherited = stack.at(-1);
    const portalHelp = portalAppendix || PORTAL_HELP.test(marker.title) || Boolean(inherited?.portalHelp);
    const topics = portalHelp ? [] : [...new Set([...(inherited?.topics || []), ...own])];
    const ownRole = policyRole(marker.title), role = ownRole === 'context' ? inherited?.role ?? 'context' : ownRole;
    const section = { ...marker, topics, role, portalHelp, end: markers[i + 1]?.start ?? end };
    stack.push(section);
    result.push(section);
  }
  return result;
}

export function topicsForPassage(section, quote) {
  if (section.portalHelp) return [];
  if (section.role === 'allocation') return ['allocation'];
  const topics = policyTopics(quote);
  const substantiveBenefit = topics.includes('benefits') && /\b(?:has|have|provid\w*|available|paid|awarded|receiv\w*)\b/iu.test(quote)
    && !/^(?:\s*[-*•]?\s*)?(?:select|enter|click|upload|submit|choose|fill|follow|verify|check|view)\b/iu.test(quote);
  // A heading such as Eligibility establishes the policy scope; the body adds
  // indexing topics. Unlabelled text must contain a substantive policy clause.
  if (section.topics.length || substantiveBenefit || /\b(?:must|shall|eligible|eligibility|required|only|subject\s+to|not\s+exceed)\b/iu.test(quote))
    return [...new Set([...section.topics, ...topics])];
  return [];
}
