import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { makeEvidence } from '../../src/pipeline/core/evidence.js';
import { createResearchTools } from '../../src/agents/navigator/researchTools.js';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { answerContext, applyEvidenceAnswer } from '../../src/agents/navigator/evidenceAnswer.js';
import { researchFixture, SCHEME_ID, FIXTURE_NOW } from '../navigatorHelpers.js';

async function prepared(text, boundQuote = text) {
 const f = researchFixture(); f.snapshot.text = text; f.snapshot.pages = [];
 f.snapshot.textHash = createHash('sha256').update(text).digest('hex');
 f.scheme.fieldEvidence = [makeEvidence(f.snapshot, boundQuote, { field: 'eligibility' })]; f.scheme.rules = []; f.state.schemes = [f.scheme];
 const intent = { objective: 'Check the actual conditions', searchQuery: '', ambiguities: [], constraints: [], questions: [
  { text: 'What is the income limit?', source: { messageIndex: 0, quote: 'income' } },
  { text: 'Who can apply?', source: { messageIndex: 0, quote: 'apply' } },
  { text: 'Is renewal permitted?', source: { messageIndex: 0, quote: 'renewal' } },
 ] };
 const { retrieval } = compileResearchIntent(intent);
 const tools = createResearchTools({ repository: f.repository, retrieval, includeContext: true, now: () => FIXTURE_NOW });
 const read = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'eligibility' });
 const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: read.passages.map(p => p.id) }] });
 return { plan, packet: answerContext({ goal: 'Check income, who may apply, and renewal.', intent, retrieval }, plan), evidenceId: read.passages[0].id };
}
const row = (p, requirementId, quote, patch = {}) => ({ schemeId: SCHEME_ID, requirementId, status: 'supported', explanation: 'The cited source explicitly states this condition.',
 evidence: [{ evidenceId: p.evidenceId, quote, relation: 'supports' }], ...patch });
const response = assessments => ({ message: { content: JSON.stringify({ assessments }) } });

test('formatted model quotation is replaced with its exact original source slice', async () => {
 const source = 'Annual family income\r\n  must not exceed Rs 300000; exceptions remain applicable.';
 const p = await prepared(source);
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', source.replace(/\s+/gu, ' '))]));
 assert.equal(result.answer.acceptedAssessments, 1);
 const proof = result.entries[0].answer.conditions[0].evidence[0];
 assert.equal(proof.quote, source);
 const citation = result.entries[0].citations.find(c => c.id === proof.evidenceId);
 assert.equal(citation.evidence.quote.slice(proof.span.charStart - citation.evidence.charStart, proof.span.charEnd - citation.evidence.charStart), source);
});

test('promotion-only evidence cannot establish a permitted funding year', async () => {
 const quote = 'Student failing to get promoted to the next class/level would forfeit the scholarship.';
 const p = await prepared(quote);
 p.packet.context.requirements.find(r => r.id === 'q2').field = 'studyYear';
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q2', quote)]));
 assert.equal(result.entries[0].answer.conditions[2].status, 'unknown');
 assert.equal(result.answer.diagnostics[0].code, 'YEAR_SCOPE_MISSING');
 const duration = await prepared('Funding duration is a maximum of four years for first-year entrants.');
 duration.packet.context.requirements.find(r => r.id === 'q2').field = 'studyYear';
 const supported = applyEvidenceAnswer(duration.plan, duration.packet, response([row(duration, 'q2', 'Funding duration is a maximum of four years for first-year entrants.')]));
 assert.equal(supported.answer.acceptedAssessments, 1);
});

test('uncited unknowns name the actual question without preserving unsupported model prose', async () => {
 const p = await prepared('Annual family income must not exceed Rs 300000.');
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q2', '', { status: 'unknown', explanation: 'PRIVATE_UNSUPPORTED_CLAIM', evidence: [] })]));
 const explanation = result.entries[0].answer.conditions[2].explanation;
 assert.match(explanation, /checked excerpts.*renewal/i);
 assert.ok(!explanation.includes('PRIVATE_UNSUPPORTED'));
 assert.equal(result.entries[0].answer.conditions[2].status, 'unknown');
});

test('regression: an exact complete policy line between unpunctuated source lines is accepted', async () => {
 const quote = 'Only SC/ST applicants may apply';
 const p = await prepared(`Annual income ceiling: Rs 300000\n${quote}\nRenewal requires annual review`);
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q1', quote)]));
 assert.equal(result.entries[0].answer.conditions[1].status, 'supported');
 assert.equal(result.entries[0].answer.conditions[1].evidence[0].quote, quote);
});

test('source spans preserve CRLF, tabs, Unicode separators, punctuation and irregular exact whitespace', async () => {
 for (const separator of ['\n', '\r\n', '\r', '\u0085', '\u2028', '\u2029']) {
  const quote = '\t  पात्र छात्र — income\u00a0ceiling ₹3,00,000; exceptions remain applicable。  ';
  const p = await prepared(`Heading${separator}${quote}${separator}Other condition`);
  const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', quote)]));
  const proof = result.entries[0].answer.conditions[0].evidence[0];
  assert.equal(proof.quote, quote); assert.equal(result.answer.acceptedAssessments, 1);
  const citation = result.entries[0].citations.find(c => c.id === proof.evidenceId);
  assert.equal(citation.evidence.quote.slice(proof.span.charStart - citation.evidence.charStart, proof.span.charEnd - citation.evidence.charStart), quote);
 }
 const text = 'Applicants may apply only if income is below the ceiling,\r\n\tunless another award is already held.';
 const p = await prepared(text); assert.equal(applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', text)])).answer.acceptedAssessments, 1);
});

test('valid income/category findings survive a rejected renewal claim without its prose leaking', async () => {
 const income = 'Annual family income must not exceed ₹3,00,000.';
 const category = 'Only SC/ST applicants may apply.';
 const p = await prepared(`${income}\r\n${category}`);
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', income), row(p, 'q1', category), row(p, 'q2', 'Renewal is guaranteed for every year.', { explanation: 'PRIVATE_UNSUPPORTED_RENEWAL_GUARANTEE' })]));
 assert.equal(result.answer.status, 'partial'); assert.equal(result.answer.acceptedAssessments, 2); assert.equal(result.answer.rejectedAssessments, 1);
 assert.deepEqual(result.entries[0].answer.conditions.map(c => c.status), ['supported', 'supported', 'unknown']);
 assert.equal(result.entries[0].answer.conditions[2].evidence.length, 0);
 assert.equal(result.answer.diagnostics[0].code, 'QUOTE_NOT_FOUND');
 assert.ok(!JSON.stringify(result).includes('PRIVATE_UNSUPPORTED'));
});

test('negation, exceptions and mid-clause truncation cannot be removed from a quotation', async () => {
 const text = 'Applicants are not eligible for renewal, unless a prior award has been renewed; only then may they continue.';
 const p = await prepared(text);
 for (const quote of ['eligible for renewal', 'Applicants are not eligible for renewal', 'only then may they continue.', text.replace('not ', ''), text.replace('unless', 'if')]) {
  const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q2', quote)]));
  assert.equal(result.answer.acceptedAssessments, 0, quote); assert.equal(result.entries[0].answer.conditions[2].status, 'unknown');
  assert.ok(['QUOTE_BOUNDARY', 'QUOTE_NOT_FOUND'].includes(result.answer.diagnostics[0].code));
 }
});

test('a recorded excerpt clipped mid-source cannot hide a negation outside the excerpt', async () => {
 const p = await prepared('Applicants are not eligible for renewal unless a previous award is held.', 'eligible for renewal');
 const citation = p.plan.entries[0].citations[0];
 assert.deepEqual(citation.sourceEdges, { startComplete: false, endComplete: false });
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q2', 'eligible for renewal')]));
 assert.equal(result.answer.acceptedAssessments, 0); assert.equal(result.answer.reason, 'QUOTE_BOUNDARY');
 assert.ok(!JSON.stringify(citation).includes('previous award')); // Neighboring source text was not exposed.
});

test('malformed envelopes, individual schema failures and missing citations have distinct safe diagnostics', async () => {
 const text = 'Annual family income must not exceed ₹3,00,000.';
 const p = await prepared(text);
 const malformed = applyEvidenceAnswer(p.plan, p.packet, { message: { content: '{"PRIVATE":"unterminated' } });
 assert.equal(malformed.answer.reason, 'MALFORMED_ANSWER');
 const schema = applyEvidenceAnswer(p.plan, p.packet, { message: { content: '{"PRIVATE":"extra"}' } });
 assert.equal(schema.answer.reason, 'INVALID_ANSWER_SCHEMA');
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', text), { schemeId: SCHEME_ID, requirementId: 'q1', explanation: 'PRIVATE_SCHEMA_FAILURE' },
  row(p, 'q2', text, { evidence: [{ evidenceId: 'ev_' + 'f'.repeat(40), quote: text, relation: 'supports' }] })]));
 assert.equal(result.answer.acceptedAssessments, 1);
 assert.deepEqual(result.answer.diagnostics.map(d => d.code), ['INVALID_ASSESSMENT_SCHEMA', 'EVIDENCE_MISSING']);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_SCHEMA_FAILURE'));
});

test('missing, circular, rejected and conflicting premises cannot support dependent claims', async () => {
 const text = 'Applicants must meet every required condition.';
 const p = await prepared(text);
 const rows = [row(p, 'q0', text, { dependsOn: ['q1'] }), row(p, 'q1', 'Invented policy'), row(p, 'q2', text)];
 const result = applyEvidenceAnswer(p.plan, p.packet, response(rows));
 assert.deepEqual(result.entries[0].answer.conditions.map(c => c.status), ['unknown', 'unknown', 'supported']);
 assert.ok(result.answer.diagnostics.some(d => d.code === 'DEPENDENCY_UNRESOLVED'));
 const cycle = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', text, { dependsOn: ['q1'] }), row(p, 'q1', text, { dependsOn: ['q0'] })]));
 assert.equal(cycle.answer.acceptedAssessments, 0);
 const duplicate = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', text), row(p, 'q0', text, { status: 'contradicted', evidence: [{ evidenceId: p.evidenceId, quote: text, relation: 'contradicts' }] }), row(p, 'q1', text, { dependsOn: ['q0'] }), row(p, 'q2', text)]));
 assert.equal(duplicate.answer.acceptedAssessments, 1); assert.equal(duplicate.entries[0].answer.conditions[0].status, 'unknown');
});

test('a source restriction naming other categories cannot positively establish OBC applicability', async () => {
 const p = await prepared('Only SC/ST applicants may apply.');
 p.packet.context.requirements[1] = { ...p.packet.context.requirements[1], field: 'category', operator: 'include', value: 'OBC' };
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q1', 'Only SC/ST applicants may apply.')]));
 assert.equal(result.answer.acceptedAssessments, 0); assert.equal(result.answer.reason, 'UNSUPPORTED_CONCLUSION');
 assert.equal(result.entries[0].answer.conditions[1].status, 'unknown');
 const absent = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q2', '', { status: 'contradicted', evidence: [] })]));
 assert.equal(absent.entries[0].answer.conditions[2].status, 'unknown');
});

test('unfamiliar audience wording is not rejected merely for lacking a canonical abbreviation', async () => {
 const quote = 'Applicants belonging to Other Backward Classes may apply.';
 const p = await prepared(quote);
 p.packet.context.requirements[1] = { ...p.packet.context.requirements[1], field: 'category', operator: 'include', value: 'OBC' };
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q1', quote)]));
 assert.equal(result.answer.acceptedAssessments, 1); assert.equal(result.entries[0].answer.conditions[1].basis, 'source_interpretation');
 assert.equal(result.entries[0].qualification.status, 'needs_verification');
});

test('a changed passage identity is diagnosed separately from an altered quotation', async () => {
 const quote = 'Annual family income must not exceed ₹3,00,000.';
 const p = await prepared(quote); p.packet.context.candidates[0].passages[0].quote += ' Changed context.';
 const result = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', quote)]));
 assert.equal(result.answer.reason, 'EVIDENCE_MISMATCH'); assert.equal(result.answer.acceptedAssessments, 0);
});

test('equivalent conditions cannot conflict, while qualification and current-enrollment roles remain distinct', async () => {
 const quote = 'Current enrollment must be Diploma; the prior qualification must be Class 12.';
 const p = await prepared(quote);
 const facts = [{ ...p.packet.context.requirements[0], field: 'educationLevel', role: 'applicant_current', value: 'Diploma', operator: 'include' },
  { ...p.packet.context.requirements[1], field: 'educationLevel', role: 'applicant_current', value: 'Diploma', operator: 'include' }];
 p.packet.context.requirements.splice(0, 2, ...facts);
 const rows = [row(p, 'q0', quote), row(p, 'q1', quote, { status: 'contradicted', evidence: [{ evidenceId: p.evidenceId, quote, relation: 'contradicts' }] })];
 const conflict = applyEvidenceAnswer(p.plan, p.packet, response(rows));
 assert.equal(conflict.answer.acceptedAssessments, 0); assert.ok(conflict.answer.diagnostics.every(d => d.code === 'CONTRADICTORY_ASSESSMENTS'));
 p.packet.context.requirements[1].role = 'applicant_qualification';
 assert.equal(applyEvidenceAnswer(p.plan, p.packet, response(rows)).answer.acceptedAssessments, 2);
 const self = applyEvidenceAnswer(p.plan, p.packet, response([row(p, 'q0', quote, { dependsOn: ['q0'] })]));
 assert.equal(self.answer.reason, 'DEPENDENCY_INVALID');
});
