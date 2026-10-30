import test from 'node:test';
import assert from 'node:assert/strict';
import { studentCondition, studentFindings } from '../src/navigator/studentFindings.js';
import { navigatorErrorMessage } from '../src/navigator/navigatorErrors.js';

test('plain labels preserve prior qualifications, intended course and location roles without internal jargon', () => {
  const requirements = [{ id: 'c0', field: 'educationLevel', role: 'applicant_qualification', value: 'Class 12' },
    { id: 'c1', field: 'stream', role: 'funding', value: 'engineering' }, { id: 'c2', field: 'state', role: 'applicant_schooling', value: 'UP' },
    { id: 'c3', field: 'state', role: 'applicant_domicile', value: 'Punjab' }];
  assert.equal(studentCondition({ requirementId: 'c0' }, requirements), 'What you have completed: Class 12');
  assert.equal(studentCondition({ requirementId: 'c1' }, requirements), 'Course: engineering');
  assert.equal(studentCondition({ requirementId: 'c2' }, requirements), 'Where you studied: UP');
  assert.equal(studentCondition({ requirementId: 'c3' }, requirements), 'Domicile: Punjab');
  assert.equal(studentCondition({ label: 'Original legacy condition' }), 'Original legacy condition');
});

test('income explanations show readable rupees while preserving exact values and inequality direction', () => {
  const requirement = { id: 'c0', field: 'incomeCeiling', role: 'applicant_current', value: 500000, operator: 'include' };
  assert.equal(studentCondition({ requirementId: 'c0' }, [requirement]), 'Family income: ₹5,00,000');
  assert.equal(studentCondition({ requirementId: 'c0' }, [{ ...requirement, operator: 'lt' }]), 'Family income: below ₹5,00,000');
  assert.equal(studentCondition({ requirementId: 'c0' }, [{ ...requirement, operator: 'gte' }]), 'Family income: at least ₹5,00,000');
});

test('visible findings require retained evidence or recorded rules; missing information never becomes a finding', () => {
  const entry = { answer: { conditions: [
    { requirementId: 'c0', status: 'supported', basis: 'source_interpretation', evidence: [{ evidenceId: 'valid' }] },
    { requirementId: 'c1', status: 'unknown', basis: 'source_interpretation', evidence: [{ evidenceId: 'valid' }] },
    { requirementId: 'c2', status: 'unknown', basis: 'unresolved', evidence: [] },
    { requirementId: 'c3', status: 'supported', basis: 'source_interpretation', evidence: [] },
  ] } };
  const findings = studentFindings(entry);
  assert.deepEqual(findings.visible.map(item => item.requirementId), ['c0', 'c1', 'c2']);
  assert.equal(findings.unanswered.length, 1); assert.equal(findings.established.length, 1);
  const onlyUnknown = studentFindings({ answer: { conditions: [entry.answer.conditions[2]] } });
  assert.equal(onlyUnknown.visible[0].status, 'unknown');
  assert.equal(onlyUnknown.hasFindings, false);
  const recorded = { requirementId: 'c4', status: 'supported', basis: 'recorded_check', evidence: [] };
  assert.equal(studentFindings({ answer: { conditions: [recorded] } }).visible[0], recorded);
});

test('a cited explanation of the important open question is not crowded out by easy recorded checks', () => {
  const conditions = Array.from({ length: 4 }, (_, index) => ({ requirementId: `c${index}`, status: 'supported', basis: 'recorded_check', evidence: [] }));
  const open = { requirementId: 'c4', status: 'unknown', basis: 'source_interpretation', evidence: [{ evidenceId: 'valid' }] };
  assert.deepEqual(studentFindings({ answer: { conditions: [...conditions, open] } }).visible.map(c => c.requirementId), ['c0', 'c1', 'c4']);
});

test('the answer to an explicit student question leads the preview instead of being hidden by easy checks', () => {
  const conditions = Array.from({ length: 4 }, (_, i) => ({ requirementId: `c${i}`, status: 'supported', basis: 'recorded_check', evidence: [] }));
  const answer = { requirementId: 'q0', status: 'supported', basis: 'source_interpretation', evidence: [{ evidenceId: 'validated' }] };
  const requirements = [{ id: 'q0', field: 'question' }];
  assert.equal(studentFindings({ answer: { conditions: [...conditions, answer] } }, requirements).visible[0], answer);
  const partial = { ...answer, status: 'unknown' };
  assert.equal(studentFindings({ answer: { conditions: [...conditions, partial] } }, requirements).visible[0], partial);
});

test('network and startup errors explain recovery without showing credentials or raw transport jargon', () => {
  const error = code => ({ response: { data: { error: { code, message: 'PRIVATE_CONNECTION_STRING' } } } });
  for (const code of ['DATABASE_INITIALIZING', 'DATABASE_UNAVAILABLE', 'NAVIGATOR_INITIALIZING', 'NAVIGATOR_INITIALIZATION_FAILED']) {
    const message = navigatorErrorMessage(error(code)); assert.doesNotMatch(message, /PRIVATE|ESERVFAIL|indexes|stack/);
  }
  assert.match(navigatorErrorMessage({ message: 'Network Error' }), /cannot reach Udaan/);
  assert.match(navigatorErrorMessage({ code: 'ECONNABORTED' }), /Check saved progress/);
});
