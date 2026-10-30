import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { needsEligibilityClarification, assessRetrieval } from '../../src/agents/navigator/retrievalCoverage.js';
import { compileResearchIntent } from '../../src/agents/navigator/researchIntent.js';
import { runStudentCase } from '../../evaluations/studentRunner.js';
import { studentQuestions, loadStudentCorpus, policyFacts } from '../../evaluations/studentQuestions.js';
import { researchFixture, FIXTURE_NOW } from '../navigatorHelpers.js';

const config = { maxModelCalls: 2, maxToolCalls: 10, maxResearchDecisions: 0, maxResearchCandidates: 5, answerContextChars: 16000 };
const planFor = text => ({ requirements: [{ field: 'question', text, source: { quote: text } }] });

test('policy-only questions do not interrupt for unrelated personal eligibility inputs', () => {
 for (const text of ['What is the deadline?', 'Can I get the deadline?', 'What documents are required?', 'Which source supports this guideline?', 'What is the income requirement?', 'What are the renewal requirements?', 'Explain the general eligibility conditions.']) {
  assert.equal(needsEligibilityClarification(planFor(text)), false, text);
 }
 for (const text of ['Am I eligible?', 'Will I be eligible?', 'Do I meet the income requirement?', 'Can I apply, and what is the deadline?']) {
  assert.equal(needsEligibilityClarification(planFor(text)), true, text);
 }
});

test('deadline-only graph run completes without the fixture income clarification', async () => {
 const f = researchFixture(), question = 'What is the recorded application deadline?';
 const intent = { objective: question, searchQuery: '', constraints: [], ambiguities: [], questions: [{ text: question, source: { messageIndex: 0, quote: question } }] };
 const provider = { name: 'fixture', model: 'scripted', async complete({ mode }) { return { intentFormat: 'json_schema', message: { content: JSON.stringify(mode === 'research_intent' ? intent : { assessments: [] }) } }; } };
 const result = await runStudentCase({ item: { id: 'deadline', question }, corpus: { version: 1, asOf: FIXTURE_NOW, schemes: [f.scheme], snapshots: [f.snapshot] }, provider, config });
 assert.equal(result.status, 'completed'); assert.equal(result.clarification, null);
 assert.equal(result.plan.entries[0].deadline, new Date(f.scheme.currentCycle.closesAt).toISOString());
 assert.equal(result.plan.entries[0].matching.status, 'unknown');
});

test('current education conditions use shared whole-policy semantics; previous qualifications stay evidence-only', () => {
 const intent = { objective: 'Find support', searchQuery: '', ambiguities: [], questions: [], constraints: [{ field: 'educationLevel', role: 'applicant_current', operator: 'include', value: 'UG', source: { messageIndex: 0, quote: 'UG' } }] };
 const { retrieval } = compileResearchIntent(intent);
 const leaf = (id, field, targetValue) => ({ type: 'CONDITION', id, field, operator: 'EQ', targetValue });
 const ug = leaf('level', 'educationLevel', 'UG'), school = leaf('school', 'educationLevel', 'Class 10'), income = { ...leaf('income', 'familyIncome', 300000), operator: 'LTE' };
 for (const [ruleTree, expected] of [[{ type: 'AND', children: [ug, income] }, 'match'], [{ type: 'OR', children: [ug, income] }, 'match'], [{ type: 'NOT', child: school }, 'match'], [{ type: 'OR', children: [school, income] }, 'unknown']]) {
  assert.equal(assessRetrieval({ ruleTree }, retrieval).conditions[0].status, expected);
 }
 assert.equal(assessRetrieval({}, retrieval).conditions[0].status, 'unknown');
 intent.constraints[0].role = 'applicant_qualification';
 assert.equal(compileResearchIntent(intent).retrieval.requirements[0].stage, 'evidence');
});

test('renewal synthesis receives exact duration, renewal-document and promotion clauses together', async () => {
 const old = JSON.parse(fs.readFileSync(new URL('../fixtures/navigator-student-quality.json', import.meta.url))).observations.find(o => o.caseId === 'renewal-fourth-year');
 let quotes = '';
 const provider = { name: 'fixture', model: 'scripted', async complete({ mode, messages }) {
  assert.equal(mode, 'evidence_answer');
  quotes = JSON.parse(messages.at(-1).content).candidates.flatMap(c => c.passages.map(p => p.quote)).join('\n');
  return { message: { content: '{"assessments":[]}' } };
 } };
 await runStudentCase({ item: studentQuestions.find(q => q.id === old.caseId), corpus: loadStudentCorpus(), provider, config, cachedIntent: old.intent });
 assert.ok(quotes.includes(policyFacts.duration.quote));
 assert.ok(quotes.includes(policyFacts.renewal.quote));
 assert.ok(quotes.includes(policyFacts.progress.quote));
});
