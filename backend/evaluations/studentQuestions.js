import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Preregistered evaluation oracle. Never imported by application code or sent
// to the model. Expectations were checked against the primary source clauses,
// independently of Navigator's retrieved results and generated explanations.
export const PRAGATI = '6aa58e923d52461bb6eb9e9a', TOP_SC = '6aa58e923d52461bb6eb9f0c', UP = '1385b34ddb800b59396c4d3e';
const pdf = '6aab6c3e7bb4a9b75421023d', sc = '6aab6c617bb4a9b754210247', up = '6ad8baf5aa75a7b1dc5d90fa';
export const policyFacts = {
  entry: { snapshotId: pdf, quote: '1) The girl candidate should be admitted to First year of Degree level course\nOR\nSecond year of Degree level course through lateral entry in any of the AICTE\napproved Institution of respective year.', meaning: 'Girl student admitted in first year, or second year through lateral entry, at an AICTE-approved institution.' },
  income: { snapshotId: pdf, quote: '3) Family income from all sources should not be more than Rs. 8 lakh per annum during\nthe current financial year.', meaning: 'Pragati family-income ceiling is ₹8 lakh; an unstated income cannot be assumed to satisfy it.' },
  certificate: { snapshotId: pdf, quote: 'A valid income certificate issued by State/ UT Government\nneed to be enclosed.', meaning: 'A valid State/UT income certificate is required.' },
  siblings: { snapshotId: pdf, quote: '2) Maximum two girl child per family are eligible.', meaning: 'Maximum two girl children per family.' },
  renewal: { snapshotId: pdf, quote: '1) The scholarship will be renewed for the next year of study on receipt of renewal\nthrough National Scholarship Portal by submitting passing certificate/ marksheet\nalong with letter from the Head of the Institution on the online portal.', meaning: 'Renewal needs a passing certificate/marksheet and a letter from the head of the institution through NSP.' },
  progress: { snapshotId: pdf, quote: '2) Student failing to get promoted to the next class/ level would forfeit the scholarship.', meaning: 'Failure to progress forfeits the award.' },
  duration: { snapshotId: pdf, quote: 'maximum 4 years for first year\nadmitted students and maximum 3 years for second year admitted students through', meaning: 'The recorded degree guideline funds up to four years for first-year entrants; duration plus renewal/progress clauses support conditional fourth-year continuation.' },
  category: { snapshotId: sc, quote: 'a. Those SC students having total annual family income from all sources up to Rs. 8.00\nlakh and having secured admission in a full-time prescribed course in any of the\nnotified institutions', meaning: 'The SC Top Class scheme is for SC students, not OBC applicants; income and notified-institution conditions also apply.' },
  domicile: { snapshotId: up, quote: 'Native and under study in Uttar Pradesh.', meaning: 'Schooling in UP alone establishes neither native status nor current study there.' },
  upIncome: { snapshotId: up, quote: 'The annual income of parents/guardian of the student is upto Rs. 2 Lakh.', meaning: 'The captured regional guidance sets a ₹2 lakh income ceiling.' },
};
const must = (field, value, role) => ({ field, value, role });

export const studentQuestions = [
  { id: 'context-and-unknown-income', pilot: true, tags: ['unknown-income', 'schooling-versus-domicile', 'intended-course', 'follow-ups'], target: PRAGATI,
    conversation: [{ role: 'user', content: 'I am an OBC girl. I completed Class 12 in Uttar Pradesh and want funding for a B.Tech degree. Research AICTE Pragati (Technical Degree).' }],
    question: 'Correction: I belong to SC, not OBC. I have not been admitted to college yet and do not know my annual family income. Keep the scheme and engineering goal. What conditions would I need to meet?',
    facts: ['entry', 'income', 'certificate', 'siblings'], minimumFacts: ['entry', 'income'], unknowns: ['family-income'], unmetConditions: ['admission'],
    requiredIntent: [must('category', 'SC', 'applicant_current'), must('gender', 'Female', 'applicant_current'), must('educationLevel', 'Class 12', 'applicant_qualification'), must('educationLevel', 'UG', 'funding'), must('state', 'Uttar Pradesh', 'applicant_schooling')],
    forbiddenIntent: [must('category', 'OBC', 'applicant_current'), must('state', 'Uttar Pradesh', 'applicant_domicile')],
    answerKey: 'Explain the degree admission and ₹8 lakh income requirements, without treating either as met. Preserve the corrected category, earlier qualification and intended degree. UP schooling does not establish domicile. Give a practical admission/income next step.' },
  { id: 'category-exclusion', pilot: true, tags: ['category-exclusions'], target: TOP_SC, excluded: true,
    question: 'I am OBC, admitted to the first year of B.Tech, with annual family income of 500000 rupees. Can I apply for the Top Class Education for SC Students scholarship?',
    facts: ['category'], minimumFacts: ['category'], unknowns: [], requiredIntent: [must('category', 'OBC', 'applicant_current'), must('incomeCeiling', 500000, 'applicant_current')],
    answerKey: 'Exclude the SC-only scheme for the explicitly OBC applicant. An income match cannot override category incompatibility. A traceable recorded exclusion is useful even without another model call.' },
  { id: 'renewal-fourth-year', pilot: true, tags: ['renewal'], target: PRAGATI,
    question: 'I received AICTE Pragati (Technical Degree) from my first year and have been promoted to my fourth year. Can it continue this year, and what must I submit for renewal?',
    facts: ['duration', 'renewal', 'progress'], minimumFacts: ['duration', 'renewal'], unknowns: [], requiredIntent: [must('studyYear', 4, 'applicant_current')],
    answerKey: 'Use the duration AND renewal clauses: conditional fourth-year continuation for a first-year entrant, with marksheet/passing certificate and head-of-institution letter. Do not mistake fresh-entry restrictions for renewal restrictions. Do not invent current renewal dates: a general-cycle listing alone does not establish renewal-specific dates.' },
  { id: 'missing-mode-guidance', pilot: true, tags: ['missing-guidance'], target: PRAGATI,
    question: 'I am a girl considering a part-time B.Tech degree. Does the AICTE Pragati (Technical Degree) guideline explicitly allow part-time study, or is that still unclear?',
    facts: ['entry'], minimumFacts: ['entry'], unknowns: ['part-time-mode'], requiredIntent: [must('gender', 'Female', 'applicant_current')],
    sourceAbsence: { snapshotId: pdf, terms: ['part-time', 'part time', 'distance learning'] },
    answerKey: 'The supplied guideline establishes admission at an approved institution but does not settle part-time mode. Scope that gap to the inspected document, give the relevant admission rule, and ask AICTE/the institution to confirm mode eligibility. Do not invent a full-time-only prohibition or an approval.' },
  { id: 'schooling-not-domicile', tags: ['schooling-versus-domicile'], target: UP,
    question: 'I am OBC and completed Class 12 in Uttar Pradesh. My family income is 100000 rupees. Does my school location make me eligible for the Post-matric Scholarship Scheme- Uttar Pradesh?',
    facts: ['domicile', 'upIncome'], minimumFacts: ['domicile'], unknowns: ['native-status', 'current-study-location'],
    requiredIntent: [must('state', 'Uttar Pradesh', 'applicant_schooling')], forbiddenIntent: [must('state', 'Uttar Pradesh', 'applicant_domicile')],
    answerKey: 'Explain native status AND study in UP. Neither follows from previous schooling. Income is below the captured ceiling, but that does not settle the location requirement.' },
  { id: 'qualification-versus-intended-course', tags: ['intended-course'], target: PRAGATI,
    question: 'I am a girl who completed Class 12 and wants funding for an engineering degree. I have not joined a college yet. What would AICTE Pragati (Technical Degree) require?',
    facts: ['entry', 'income'], minimumFacts: ['entry'], unknowns: ['family-income'], unmetConditions: ['admission'],
    requiredIntent: [must('educationLevel', 'Class 12', 'applicant_qualification'), must('educationLevel', 'UG', 'funding')],
    forbiddenIntent: [must('educationLevel', 'Class 12', 'funding'), must('educationLevel', 'UG', 'applicant_current')],
    answerKey: 'Retain Class 12 as a prior qualification and engineering degree as intended study. Explain the admission requirement rather than saying admission is established or the request is contradictory.' },
  { id: 'followup-category-correction', tags: ['follow-ups'], target: TOP_SC,
    conversation: [{ role: 'user', content: 'I am OBC and got admitted to B.Tech. My annual family income is 500000 rupees. Check the Top Class Education for SC Students scholarship.' }],
    question: 'Correction: I am SC, not OBC. Keep my earlier income, admission and scholarship question.',
    facts: ['category'], minimumFacts: ['category'], unknowns: ['notified-institution'],
    requiredIntent: [must('category', 'SC', 'applicant_current'), must('incomeCeiling', 500000, 'applicant_current'), must('educationLevel', 'UG', 'applicant_current')],
    forbiddenIntent: [must('category', 'OBC', 'applicant_current')],
    answerKey: 'Use SC after the correction, retain ₹5 lakh and B.Tech admission, and investigate the same named scheme. Category/income can have support; notified-institution status and full current eligibility remain unestablished.' },
];

export function loadStudentCorpus() {
  const read = name => JSON.parse(fs.readFileSync(new URL(`../test/fixtures/${name}.json`, import.meta.url)));
  const pragmatic = read('navigator-pragati-live-journey'), regional = read('navigator-saved-replay'), named = read('navigator-named-source-replay');
  const latest = (rows, timestamp, immutable = false) => {
    const selected = new Map();
    for (const row of rows) {
      const previous = selected.get(row._id);
      if (immutable && previous && previous.textHash !== row.textHash) throw new Error('Conflicting immutable snapshot identity.');
      const time = record => { const value = Date.parse(timestamp(record) ?? ''); return Number.isFinite(value) ? value : -Infinity; };
      if (!previous || time(row) > time(previous)) selected.set(row._id, row);
    }
    return [...selected.values()];
  };
  // Each real source bundle retains its own captured clock. A replay does not
  // pretend a historical snapshot was freshly fetched today.
  const corpus = { version: 2, schemes: latest([pragmatic.catalogue.scheme, ...named.schemes, ...regional.schemes], s => s.freshness?.lastVerifiedAt),
    snapshots: latest([...pragmatic.catalogue.snapshots, ...named.snapshots, ...regional.snapshots], s => s.fetchedAt, true),
    asOf: pragmatic.capturedAt, notice: 'Frozen historical official-source corpus; not current-year verification. Candidate-pool research, not a benchmark of the production Mongo search query.' };
  for (const [id, fact] of Object.entries(policyFacts)) {
    const snapshot = corpus.snapshots.find(s => s._id === fact.snapshotId);
    const start = snapshot?.text.indexOf(fact.quote) ?? -1;
    if (start < 0 || createHash('sha256').update(snapshot.text).digest('hex') !== snapshot.textHash) throw new Error(`Invalid independently reviewed policy anchor: ${id}`);
  }
  for (const item of studentQuestions.filter(c => c.sourceAbsence)) {
    const source = corpus.snapshots.find(s => s._id === item.sourceAbsence.snapshotId);
    if (item.sourceAbsence.terms.some(term => source.text.toLowerCase().includes(term))) throw new Error('The preregistered documentation gap changed. Review its answer key.');
  }
  return corpus;
}
