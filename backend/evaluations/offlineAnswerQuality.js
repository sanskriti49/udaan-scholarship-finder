// Small replay of existing evaluation infrastructure, never contacts a provider.
import fs from 'node:fs/promises';
import { runStudentCase } from './studentRunner.js';
import { studentQuestions, loadStudentCorpus } from './studentQuestions.js';
import { researchFixture, FIXTURE_NOW } from '../test/navigatorHelpers.js';
import { researchSummary } from '../../frontend/src/navigator/researchSummary.js';
import { studentFindings } from '../../frontend/src/navigator/studentFindings.js';

const config = { maxModelCalls: 3, maxToolCalls: 10, maxResearchDecisions: 0, maxResearchCandidates: 5, answerContextChars: 16000 };
const recorded = JSON.parse(await fs.readFile(new URL('../test/fixtures/navigator-student-quality.json', import.meta.url)));
const observations = [];
for (const old of recorded.observations) {
  const item = studentQuestions.find(item => item.id === old.caseId);
  const provider = { name: 'offline-replay', model: old.model, async complete({ mode }) {
    const response = old.modelResponses.find(row => row.mode === mode);
    if (!response) return { message: { content: '{"assessments":[]}' } };
    return structuredClone(response);
  } };
  observations.push(await runStudentCase({ item, corpus: loadStudentCorpus(), provider, config, cachedIntent: old.intent, reusedIntentFrom: 'historical validated intent; scripted answer replay' }));
}
const scenarios = [
  { id: 'synthetic-state-course-category', question: 'Find a scholarship for an OBC student enrolled in UG with domicile in Uttar Pradesh.', profile: { state: 'UP', educationLevel: 'UG', casteCategory: 'OBC' },
    requirements: [['state', 'Uttar Pradesh', 'applicant_domicile'], ['educationLevel', 'UG', 'applicant_current'], ['category', 'OBC', 'applicant_current']] },
  { id: 'synthetic-complete-profile', question: 'Can I meet the recorded income requirement with annual family income of 200000 rupees?', profile: { familyIncome: 200000 }, requirements: [['incomeCeiling', 200000, 'applicant_current']] },
  { id: 'synthetic-missing-income', question: 'What is the income requirement? I do not know my annual family income.', profile: {}, requirements: [] },
  { id: 'synthetic-deadline', question: 'What application deadline is recorded for this scholarship?', profile: {}, requirements: [] },
];
for (const item of scenarios) {
  const f = researchFixture(); f.state.schemes = [f.scheme];
  if (item.requirements.length === 3) {
    f.scheme.level = 'UG';
    f.scheme.rules = [{ id: 'state', field: 'state', operator: 'EQ', targetValue: 'UP' }, { id: 'level', field: 'educationLevel', operator: 'EQ', targetValue: 'UG' }, { id: 'category', field: 'casteCategory', operator: 'IN', targetValue: ['OBC'] }];
  }
  const intent = { objective: 'Inspect the recorded requirements', searchQuery: '', ambiguities: [],
    constraints: item.requirements.map(([field, value, role]) => ({ field, value, role, operator: 'include', source: { messageIndex: 0, quote: item.question } })),
    questions: [{ text: item.question, source: { messageIndex: 0, quote: item.question } }] };
  const provider = { name: 'offline-scripted', model: 'fixture', async complete({ mode, messages }) {
    if (mode === 'research_intent') return { intentFormat: 'json_schema', message: { content: JSON.stringify(intent) } };
    const packet = JSON.parse(messages.at(-1).content), candidate = packet.candidates[0];
    const passage = candidate?.passages.find(p => p.quote.includes(f.income));
    const assessments = passage && ['synthetic-complete-profile', 'synthetic-missing-income'].includes(item.id) ? [{ schemeId: candidate.schemeId, requirementId: 'q0', status: 'unknown', dependsOn: [],
      explanation: 'The recorded income ceiling is Rs 300000 per year. Compare your income with that ceiling; the remaining official conditions still need review.',
      evidence: [{ evidenceId: passage.id, quote: f.income, relation: 'supports' }] }] : [];
    return { message: { content: JSON.stringify({ assessments }) } };
  } };
  observations.push(await runStudentCase({ item, corpus: { version: 1, asOf: FIXTURE_NOW, schemes: f.state.schemes, snapshots: f.state.snapshots }, provider, config, profile: item.profile }));
}
const compact = observations.map(result => ({ caseId: result.caseId, status: result.status, error: result.error,
  tools: result.events.filter(e => e.type === 'tool_completed').map(e => e.tool), clarification: result.clarification,
  retrieved: result.retrievedPassages.map(p => ({ quote: p.evidence.quote, topics: p.policyTopics })),
  summary: result.plan ? researchSummary(result.plan).message : null,
  entries: result.plan?.entries.map(entry => ({ title: entry.title, matching: entry.matching, status: entry.status, deadline: entry.deadline,
    findings: studentFindings(entry, result.plan.intent?.requirements).visible,
    conditions: entry.answer?.conditions, nextSteps: entry.nextSteps })), coverage: result.plan?.coverage,
}));
await fs.writeFile(new URL('./results/2026-10-30-offline-answer-quality.json', import.meta.url), JSON.stringify({
  notice: 'Eight offline scripted/replayed scenarios, not fresh live model quality. Historical real-source snapshots are not current catalogue verification; synthetic cases are labelled. No network or paid calls.', observations: compact,
}, null, 2) + '\n');
console.log(JSON.stringify(compact.map(({ caseId, status, error, tools, entries, clarification }) => ({ caseId, status, error, tools, clarification,
  entries: entries?.map(e => ({ title: e.title, matching: e.matching.status, deadline: e.deadline, conditions: e.conditions?.map(c => ({ label: c.label, status: c.status, explanation: c.explanation, citations: c.evidence.length })) })) })), null, 2));
