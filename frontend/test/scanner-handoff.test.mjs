import test from 'node:test';
import assert from 'node:assert/strict';
import { eligiblePrefill } from '../src/scanner/prefill.js';
import { emptyFields, editField } from '../src/scanner/extract.js';
import { stageEligibilityDraft, readEligibilityDraft, clearEligibilityDraft } from '../src/utils/eligibilityDraft.js';
test('semester numbers and ambiguous degrees never become guessed courses',()=>{
 const f=emptyFields('bonafide');for(const value of ['3rd semester','Year of study: 2','B.Tech or postgraduate']){f.study=editField(f.study,value);assert.deepEqual(eligiblePrefill('bonafide',f),{});}
 f.study=editField(f.study,'B.Tech, 3rd semester');assert.deepEqual(eligiblePrefill('bonafide',f),{educationLevel:'UG'});
 f.study.ambiguous=true;assert.deepEqual(eligiblePrefill('bonafide',f),{});
});
test('transfer only offers valid income and exact category codes',()=>{
 const f=emptyFields('income');for(const value of ['','-1','200000 per month']){f.annualIncome=editField(f.annualIncome,value);assert.deepEqual(eligiblePrefill('income',f),{});}f.annualIncome=editField(f.annualIncome,'0');assert.deepEqual(eligiblePrefill('income',f),{familyIncome:0});
 const c=emptyFields('caste');c.casteCategory=editField(c.casteCategory,'ST');assert.deepEqual(eligiblePrefill('caste',c),{casteCategory:'ST'});c.casteCategory=editField(c.casteCategory,'Scheduled Tribe or SC');assert.deepEqual(eligiblePrefill('caste',c),{});
});
test('draft transfer copies only selected fields and can be cleared',()=>{
 const value={familyIncome:180000};stageEligibilityDraft(value,'Income Certificate');value.familyIncome=5;assert.equal(readEligibilityDraft().prefill.familyIncome,180000);clearEligibilityDraft();assert.equal(readEligibilityDraft(),null);
});
