import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEligibility } from '../../src/engine/ruleEvaluator.js';

test('catalogue jurisdiction alone cannot manufacture a domicile eligibility rule', () => {
  for (const state of ['Goa', 'Maharashtra', 'UP']) {
    const result = evaluateEligibility({ state: 'Punjab' }, { title: 'Regional award', state });
    assert.equal(result.status, 'unknown', state);
    assert.equal(result.failedRules.length, 0);
    assert.equal(result.isEligible, false);
    assert.equal(result.unknownRules[0].ruleId, 'criteria_not_recorded');
  }
});

test('explicit domicile policy still governs independently of title and catalogue region', () => {
  const rules = [{ id: 'residence', field: 'state', operator: 'EQ', targetValue: 'Goa' }];
  for (const title of ['National unrestricted award', 'Girls engineering scholarship', 'Unfamiliar course bursary']) {
    const scholarship = { title, state: 'All India', rules };
    assert.equal(evaluateEligibility({ state: 'Punjab' }, scholarship).status, 'failed');
    assert.equal(evaluateEligibility({ state: 'Goa' }, scholarship).status, 'passed');
    assert.equal(evaluateEligibility({}, scholarship).status, 'unknown');
  }
});

test('recorded income limits change the result; titles, region and missing income cannot supply it', () => {
  const scheme = ceiling => ({ title: 'High-income national award', state: 'Maharashtra',
    rules: [{ id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: ceiling }] });
  assert.equal(evaluateEligibility({ familyIncome: 360000 }, scheme(350000)).status, 'failed');
  assert.equal(evaluateEligibility({ familyIncome: 360000 }, scheme(370000)).status, 'passed');
  assert.equal(evaluateEligibility({}, scheme(370000)).status, 'unknown');
});
