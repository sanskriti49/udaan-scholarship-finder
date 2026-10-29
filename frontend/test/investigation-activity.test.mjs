import test from 'node:test';
import assert from 'node:assert/strict';
import { investigationActivity, stageOf, formatClock } from '../src/navigator/investigationActivity.js';
const event = (tool, type = 'tool_completed') => ({ tool, type });
test('rail marks only observed completed tools, including nonsequential and repeated activity', () => {
 const result = investigationActivity({ status:'running', events:[event('evaluateMatches'),event('searchScholarships'),event('findGuidelinePassages','tool_started')] });
 assert.deepEqual(result.reached,[2,0]);assert.equal(result.activeIndex,1);assert.equal(result.mood,'read');
 assert.equal(stageOf({ action:'prepare_notes' }),3);assert.equal(stageOf(event('requestClarification')),-1);
});
test('paused and terminal states never animate an abandoned started event as active', () => {
 for (const status of ['ready','quota_exhausted','cancelled','partial','interrupted','awaiting_input']) {
 const result=investigationActivity({status,events:[event('searchScholarships','tool_started')]});
 assert.equal(result.activeIndex,-1);assert.equal(result.label,null);
 }
 assert.equal(investigationActivity({status:'completed',events:[],plan:{entries:[]}}).mood,'empty');
});
test('model planning, saved excerpt counts and checkpoints are truthful without invented percentages', () => {
 const run={status:'running',collectedPassageCount:3,events:[{type:'model_started'}]};
 assert.equal(investigationActivity(run).mood,'planning');assert.equal(investigationActivity(run).label,'Understanding your brief');
 assert.deepEqual(investigationActivity(run).chips,[{key:'sources',label:'3 saved excerpts'}]);
 run.events=[event('searchScholarships')];assert.equal(investigationActivity(run).label,'Waiting for the next saved update');
});
test('clock handles expired and invalid waits safely',()=>{assert.equal(formatClock(-3),'0:00');assert.equal(formatClock(125),'2:05');assert.equal(formatClock(NaN),'0:00');});

test('finishing execution without a useful supported answer does not celebrate a recommendation', () => {
 const entry = { matching: { status: 'passed' }, qualification: { status: 'needs_verification' }, answer: { concern: false, conditions: [{ status: 'unknown', basis: 'source_interpretation', evidence: [{ evidenceId: 'saved-source' }] }] } };
 const run = { status: 'completed', events: [], plan: { answer: { status: 'partial' }, entries: [entry] } };
 assert.equal(investigationActivity(run).mood, 'empty');
 run.plan.answer.status = 'answered'; assert.equal(investigationActivity(run).mood, 'empty');
 entry.answer.conditions[0].status = 'supported'; assert.equal(investigationActivity(run).mood, 'done');
 entry.answer.concern = true; assert.equal(investigationActivity(run).mood, 'empty');
 entry.answer.concern = false; entry.answer.fundingRelevance = 'unknown'; assert.equal(investigationActivity(run).mood, 'empty');
 assert.equal(investigationActivity({ status: 'running', events: [{ type: 'model_started', action: 'answer_evidence' }] }).label, 'Answering from the source evidence');
});
