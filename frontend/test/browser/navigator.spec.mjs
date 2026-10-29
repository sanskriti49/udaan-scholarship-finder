import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { researchFixture, SCHEME_ID } from "../../../backend/test/navigatorHelpers.js";
import { createResearchTools } from "../../../backend/src/agents/navigator/researchTools.js";
import { compileResearchIntent } from '../../../backend/src/agents/navigator/researchIntent.js';
import { answerPlanFixture } from '../../../backend/test/answerFixture.js';
import { replayPlan, savedReplayFixture, UP_ID } from '../../../backend/test/navigatorReplayFixture.js';
import { renewalPlanFixture } from '../../../backend/test/evidenceBudgetFixture.js';
import { PROMPTS } from '../../src/navigator/contracts.js';

test('Gemini readiness names the actual provider and explains data use without starting inference', async ({ page }) => {
  const { requests } = await setup(page, { provider: 'gemini' });
  await page.goto('/navigator');
  await expect(page.getByText(/Your question goes to Google Gemini; Udaan notes/)).toBeVisible();
  await page.getByText('How answers & privacy work', { exact: true }).click();
  await expect(page.getByText(/Google’s free API tier can use submitted content/)).toBeVisible();
  await expect(page.locator('.nv-privacy-note')).not.toContainText('Your question goes to Groq');
  expect(requests.filter(request => request.method === 'POST')).toEqual([]);
});
import { namedReplayPlan } from '../../../backend/test/namedResearchFixture.js';
import { admissionBrief } from '../../../backend/test/admissionIntentFixture.js';
import { adaptiveFixture, memoryJourney } from '../../../backend/test/adaptiveFixture.js';
import { publicRun } from '../../../backend/src/agents/navigator/durableContracts.js';

for (const width of [390, 1440]) test(`recorded real Pragati answer is visible with precise policy proof at ${width}px`, async ({ page }) => {
  const receipt = JSON.parse(await readFile(new URL('../../../backend/test/fixtures/navigator-pragati-live-journey.json', import.meta.url), 'utf8'));
  const { requests, errors } = await setup(page, { initial: { goal: receipt.question, status: 'completed', plan: receipt.plan,
    provider: receipt.provider, model: receipt.model, usage: receipt.usage } });
  await page.setViewportSize({ width, height: 950 });
  await page.goto(`/navigator/plan?run=${ID}`);
  const findings = page.getByRole('region', { name: 'Answers from source evidence' });
  await expect(findings.locator('.rp-finding').first()).toContainText('what other conditions must I meet?');
  await expect(findings).toContainText('family income not exceeding Rs. 8 lakh');
  await expect(page.getByText('Annual family income (₹)', { exact: true })).toHaveCount(0);
  await findings.getByRole('button', { name: /^Read source/ }).first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('blockquote')).toContainText('Maximum two girl child per family');
  await expect(drawer.locator('blockquote')).toContainText('valid income certificate');
  await expect(drawer.getByRole('link', { name: 'Open original source' })).toHaveAttribute('href', /scholarships\.gov\.in\/public\/schemeGuidelines\/AICTE\/AICTE_2010_G\.pdf/);
  await page.keyboard.press('Escape');
  expect(requests.filter(r => r.method === 'POST')).toEqual([]); expect(errors).toEqual([]);
  await noOverflow(page);
});

for (const unavailable of [false, true]) test(`adaptive research presents ${unavailable ? 'an attempted official-source gap' : 'newly acquired cited findings'} without extra browser inference`, async ({page}) => {
 const f=adaptiveFixture({missing:true,twoSources:true,unavailable}), result=await memoryJourney(f);
 const plan=publicRun({_id:ID,createdAt:new Date(),expiresAt:new Date(Date.now()+86400000),plan:result.session.plan}).plan;
 const {requests,errors}=await setup(page,{initial:{status:'completed',workflow:'adaptive_v2',goal:admissionBrief,limits:result.run.limits,usage:{...baseRun().usage,...result.run.usage},plan}});
 await page.setViewportSize({width:390,height:1000});await page.goto(`/navigator/plan?run=${ID}`);
 if(unavailable){
   const gap=page.getByRole('region',{name:'What could not be established'});await expect(gap).toContainText('official source was attempted');
   await expect(page.locator('.rp-card')).toHaveCount(0);await page.getByText('Why some questions are still open',{exact:true}).click();
   await expect(page.getByRole('region',{name:'Evidence answer status'})).toContainText('does not mean you are ineligible');
   await expect(page.locator('body')).not.toContainText('No source interpretation could be validated');
 }else{
   await expect(page.locator('.rp-card')).toHaveCount(1);await expect(page.getByLabel('Annual family income (₹)', { exact: true })).toHaveCount(0);
   await expect(page.getByRole('region',{name:'Answers from source evidence'})).toContainText('undergraduate engineering');
   await page.getByRole('region',{name:'Answers from source evidence'}).getByRole('button',{name:/^Read source/}).first().click();
   await expect(page.getByRole('dialog').locator('blockquote')).toContainText(f.clause);await page.keyboard.press('Escape');
 }
 await noOverflow(page);expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

for (const width of [390, 1440]) test(`named-scheme replay answers the actual comparison without duplicate income questions at ${width}px`, async ({ page }) => {
 const plan=await namedReplayPlan(), {requests,errors}=await setup(page,{initial:{status:'completed',goal:admissionBrief,plan}});
 await page.setViewportSize({width,height:1000});await page.goto(`/navigator/plan?run=${ID}`);
 await expect(page.locator('.rp-card')).toHaveCount(1);
 const card=page.locator('.rp-card');await expect(card).toContainText('Central Sector Scholarship Of Top Class Education For SC Students');
 await expect(card.locator('.rp-hidden-count')).toBeVisible();
 await card.locator('.rp-more > summary').click();
 const conditions=card.getByRole('region',{name:'All eligibility findings'});
 await expect(conditions).toContainText('notified institution');
 await expect(card).toContainText('₹8,00,000');
 await expect(page.getByLabel('Annual family income (₹)', { exact: true })).toHaveCount(0);
 const targets=page.getByRole('region',{name:'The schemes you asked about'});
 await expect(targets).toContainText('Post-Matric SC scholarship');await expect(targets).toContainText('Maharashtra');await expect(targets).toContainText('₹2,50,000');
 await expect(page.locator('.rp-card')).not.toContainText('OBC Pre Matric');
 await expect(page.locator('body')).not.toContainText(/You are eligible|Research complete|Funding need: Top Class/);
 const proof=conditions.getByRole('listitem').filter({hasText:'notified institution'}).getByRole('button',{name:/^Read source/}).first();
 await expect(proof).toBeVisible();await proof.click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('notified institutions');
 await page.keyboard.press('Escape');await noOverflow(page);await page.screenshot({path:test.info().outputPath(`named-scheme-results-${width}.png`),fullPage:true});
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

async function illustrationsStayInFrame(page) {
 const overflow = await page.locator('.nv-mission-art svg, .nv-scene-reader svg, .nv-results-character svg, .nv-path-peeker svg').evaluateAll(svgs => svgs.flatMap(svg => {
  const frame=svg.viewBox.baseVal;
  return [...svg.querySelectorAll('path,circle')].map(shape=>({shape:shape.tagName,box:shape.getBBox()}))
   .filter(({box})=>box.x < -30 || box.y < -30 || box.x+box.width > frame.width+30 || box.y+box.height > frame.height+30)
   .map(({shape,box})=>({shape,x:box.x,y:box.y,width:box.width,height:box.height}));
 }));
 expect(overflow, 'Illustrations must not draw facial features outside their artboard').toEqual([]);
}

for (const width of [390, 1440]) test(`illustrated question starters stay editable and useful without AI at ${width}px`, async ({page}) => {
 const {requests,errors} = await setup(page,{available:false});
 await page.setViewportSize({width,height:1000}); await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/navigator');
 await page.getByRole('button',{name:PROMPTS[0].label,exact:true}).click();
 const question = page.getByLabel('Your research question'); await expect(question).toBeFocused(); await expect(question).toHaveValue(PROMPTS[0].goal);
 await expect(page.locator('.nv-question-scene')).toHaveAttribute('data-mode','0');
 await expect(page.locator('.nv-paper-question')).toHaveText(PROMPTS[0].goal);
 await question.fill('Could I renew a course award while changing my university?');
 await expect(page.locator('.nv-paper-question')).toHaveText('Could I renew a course award while changing my university?');
 await expect(page.getByRole('button',{name:'Start research',exact:true})).toBeDisabled();
 const tools = page.getByRole('complementary',{name:'Tools that do not need AI'});
 await expect(tools.getByRole('link',{name:/Explore the catalogue/})).toHaveAttribute('href','/scholarships');
 await expect(tools.getByRole('link',{name:/Explore the catalogue/})).toHaveAttribute('target','_blank');
 await expect(tools.getByRole('link',{name:/Check eligibility/})).toHaveAttribute('href','/eligibility');
 if (width===1440) expect((await page.locator('.nv-shell').boundingBox()).width).toBeGreaterThanOrEqual(1200);
 const navStyle=await page.getByRole('navigation',{name:'Navigator pages'}).evaluate(el=>({background:getComputedStyle(el).backgroundColor,radius:getComputedStyle(el).borderRadius}));
 expect(navStyle).toEqual({background:'rgba(0, 0, 0, 0)',radius:'0px'});
 const compass=page.getByRole('button',{name:'Turn the research compass',exact:true});await compass.click();
 await expect(page.locator('.nv-hand-note')).toHaveText('Find the line that matters.');
 expect(await page.locator('.nv-compass-needle').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
 await page.evaluate(()=>scrollTo(0,0)); await noOverflow(page); await illustrationsStayInFrame(page); await page.screenshot({path:test.info().outputPath(`question-desk-${width}.png`),fullPage:true});
 expect(requests.filter(r=>r.method==='POST')).toEqual([]); expect(errors).toEqual([]);
 expect(await page.evaluate(()=>Object.keys(localStorage).sort())).toEqual(['token','user']);
});

// UI fixtures exercise retained/withheld findings, not live-model accuracy.
function copyComparisonEntry(entry, index) {
 const copy=structuredClone(entry); copy.schemeId=String(index).repeat(24); copy.title=`Synthetic comparison option ${index}`;
 for(const citation of copy.citations) citation.schemeId=copy.schemeId;
 return copy;
}
for(const width of [390,1440]) test(`comparison keeps source conflicts, unknowns and partial findings honest at ${width}px`,async({page})=>{
 const plan=await answerPlanFixture({invalidRenewal:true}), first=plan.entries[0], second=copyComparisonEntry(first,4);
 second.answer={...second.answer,concern:false,conditions:second.answer.conditions.map(c=>({...c,status:'unknown',basis:'unresolved',evidence:[],explanation:'This option has not been assessed for this condition.'}))};
 second.sourceChecks=[{snapshotId:String(second.citations[0].evidence.snapshotId),url:second.citations[0].evidence.url,checkedAt:'2026-10-22T08:00:00.000Z',status:'changed',reason:'different_bytes'}];
 plan.entries=[first,second];const{requests,errors}=await setup(page,{initial:{status:'completed',plan}});
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/navigator/plan?run=${ID}`);
 await page.getByRole('button',{name:`Compare ${first.title}`,exact:true}).click();await page.getByRole('button',{name:`Compare ${second.title}`,exact:true}).click();
 const tray=page.getByRole('region',{name:'Comparison tray'});await tray.getByRole('button',{name:'Compare 2 options',exact:true}).click();
 const panel=page.getByRole('region',{name:'Compare selected scholarships',exact:true});await expect(panel).toBeFocused();
 await expect(panel).toContainText('does not confirm full eligibility');await expect(panel).toContainText('Guidance needs a current-source check');await expect(panel).not.toContainText('PRIVATE_UNSUPPORTED_RENEWAL_GUARANTEE');
 const category=panel.getByRole('rowheader',{name:'Category: OBC',exact:true}).locator('..');
 await expect(category.getByRole('cell').first()).toContainText('Does not fit this condition');await expect(category.getByRole('cell').last()).toContainText('Still to check');
 const renewal=panel.getByRole('rowheader',{name:'Year of study: 4',exact:true}).locator('..');
 await expect(renewal.getByRole('cell').first()).toContainText('Still to check');
 await category.getByRole('cell').first().locator('summary').click();await category.getByRole('button',{name:'Read source',exact:true}).click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('exclusively for students belonging to SC or ST');await page.keyboard.press('Escape');
 await noOverflow(page);
 await illustrationsStayInFrame(page);
 await panel.screenshot({path:test.info().outputPath(`compare-findings-${width}.png`)});
 await panel.getByRole('button',{name:'Close comparison'}).click();await expect(tray.getByRole('button',{name:'Compare 2 options',exact:true})).toBeFocused();
 await tray.getByRole('button',{name:`Remove ${second.title} from comparison`,exact:true}).click();await expect(tray.getByRole('button',{name:'Compare 1 option',exact:true})).toBeDisabled();
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('comparison has a three-option bound, preserves exclusions and clears private selection on reload',async({page})=>{
 const plan=await answerPlanFixture();const first=plan.entries[0];plan.entries=[first,...[4,5,6].map(i=>copyComparisonEntry(first,i))];
 const excluded=plan.entries[3];excluded.matching.status='failed';excluded.matching.failedCount=1;excluded.qualification={status:'excluded',supported:[],unresolved:[],reasons:['A recorded category restriction rules this option out.']};
 const{requests,errors}=await setup(page,{initial:{status:'completed',plan}});await page.goto(`/navigator/plan?run=${ID}`);
 for(const entry of plan.entries.slice(0,3))await page.getByRole('button',{name:`Compare ${entry.title}`,exact:true}).click();
 await expect(page.getByRole('button',{name:`Compare ${excluded.title}`,exact:true})).toBeDisabled();
 await page.getByRole('button',{name:`Compare ${plan.entries[2].title}`,exact:true}).click();await page.getByRole('button',{name:`Compare ${excluded.title}`,exact:true}).click();
 await page.getByRole('button',{name:'Compare 3 options',exact:true}).click();const panel=page.getByRole('region',{name:'Compare selected scholarships',exact:true});
 await expect(panel).toContainText('Does not fit');await expect(panel).toContainText('A recorded category restriction rules this option out.');
 await expect(panel.getByRole('link',{name:/application/i})).toHaveCount(0);
 await page.reload();await expect(page.getByRole('region',{name:'Comparison tray'})).toHaveCount(0);await expect(page.getByRole('region',{name:'Compare selected scholarships',exact:true})).toHaveCount(0);
 for(const entry of plan.entries.slice(0,2))await page.getByRole('button',{name:`Compare ${entry.title}`,exact:true}).click();
 await page.getByRole('button',{name:'Compare 2 options',exact:true}).click();
 await page.evaluate(()=>{localStorage.removeItem('token');localStorage.removeItem('user');window.dispatchEvent(new Event('auth-changed'));});
 await expect(page.getByRole('region',{name:'Comparison tray'})).toHaveCount(0);await expect(page.getByRole('region',{name:'Compare selected scholarships',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('comparison works with catalogue-only notes without inventing missing eligibility findings',async({page})=>{
 const plan=await citedPlan();plan.preparation='catalogue';plan.aiAssistance='not_requested';
 const first=plan.entries[0],second=copyComparisonEntry(first,4);delete first.retrieval;delete second.retrieval;delete first.answer;delete second.answer;delete plan.answer;
 plan.entries=[first,second];const{requests,errors}=await setup(page,{initial:{status:'completed',plan}});await page.goto(`/navigator/plan?run=${ID}`);
 for(const entry of plan.entries)await page.getByRole('button',{name:`Compare ${entry.title}`,exact:true}).click();await page.getByRole('button',{name:'Compare 2 options',exact:true}).click();
 const panel=page.getByRole('region',{name:'Compare selected scholarships',exact:true});await expect(panel).toContainText('suitability remains unconfirmed');
 await expect(panel.getByText('Fits this condition',{exact:true})).toHaveCount(0);
 const sources=panel.getByRole('rowheader',{name:'Source material',exact:true}).locator('..');await sources.getByRole('button',{name:'Read source 1',exact:true}).first().click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('Annual family income');await page.keyboard.press('Escape');
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('saved investigation replay shows useful findings and source proof without income or domicile inventions', async ({page}) => {
 const fixture=savedReplayFixture(), plan=await replayPlan();
 const {requests,errors}=await setup(page,{initial:{status:'completed',goal:fixture.question,plan}});
 await page.setViewportSize({width:390,height:900});await page.goto(`/navigator/plan?run=${ID}`);
 await expect(page.getByRole('region',{name:'Your research takeaway'})).toContainText('No suitable scholarship has been established yet');
 const up=page.locator('.rp-card').filter({hasText:'Post-matric Scholarship Scheme- Uttar Pradesh'});
 await expect(up.getByRole('region',{name:'Answers from source evidence'})).toContainText('Other Backwards Classes');
 await expect(up).toContainText('school location alone does not establish');
 await expect(page.locator('body')).not.toContainText(/You are eligible|Your income exceeds|VJNT|Swami Vivekananda/);
 await expect(up.locator('.rp-more')).not.toHaveAttribute('open');
 await page.screenshot({path:test.info().outputPath('navigator-results-mobile.png'),fullPage:true});
 await up.getByRole('button',{name:'Read source',exact:true}).first().click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('Students from Other Backwards Classes');
 await expect(page.getByRole('dialog').getByRole('link',{name:'Open original source'})).toHaveAttribute('href','https://www.myscheme.gov.in/schemes/mpss');
 await noOverflow(page);await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Edit question',exact:true}).click();
 await expect(page.getByLabel('Your research question')).toHaveValue(fixture.question);
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

for(const width of [390,1440])test(`findings filters separate supported, uncertain and rejected options at ${width}px`,async({page})=>{
 const plan=await answerPlanFixture(), supported=plan.entries[0];supported.answer.concern=false;
 supported.answer.conditions=supported.answer.conditions.map(c=>c.status==='contradicted'?{...c,status:'unknown',basis:'unresolved',evidence:[],explanation:'The category still needs checking.'}:c);
 supported.matching.missingFields=['familyIncome'];
 const unknown=structuredClone(supported),excluded=structuredClone(supported);
 unknown.schemeId='444444444444444444444444';unknown.title='An unconfirmed related option';delete unknown.answer;
 excluded.schemeId='555555555555555555555555';excluded.title='A recorded incompatible option';delete excluded.answer;
 for(const e of [unknown,excluded])for(const c of e.citations)c.schemeId=e.schemeId;
 excluded.matching.status='failed';excluded.matching.failedCount=1;excluded.qualification={status:'excluded',supported:[],unresolved:[],reasons:['The category requirement does not fit.']};
 plan.entries=[unknown,excluded,supported];const{requests,errors}=await setup(page,{initial:{status:'completed',plan}});
 await page.setViewportSize({width,height:900});await page.goto(`/navigator/plan?run=${ID}`);
 await expect(page.getByRole('region',{name:'Your research takeaway'})).toContainText('does not confirm that every eligibility condition is met');
 await expect(page.locator('.rp-card').first()).toHaveAttribute('data-finding-group','promising');
 await expect(page.locator('.rp-more[open]')).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Answers from source evidence'})).toContainText('The guideline accepts Class 12');
 await page.getByRole('button',{name:/Restrictions/}).click();
 await expect(page.locator('.rp-card')).toHaveCount(1);await expect(page.locator('.rp-blocker')).toContainText('does not fit');
 await page.getByRole('button',{name:/Still to check/}).click();await expect(page.locator('.rp-card')).toContainText('unconfirmed related option');
 await page.getByRole('button',{name:/^All \d/}).click();await expect(page.locator('.rp-card')).toHaveCount(3);
 await page.screenshot({path:test.info().outputPath(`navigator-results-${width}.png`),fullPage:true});await noOverflow(page);
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('source answers preserve supported, contradictory and unknown conditions behind concise cards',async({page})=>{
 const plan=await answerPlanFixture();const{requests,errors}=await setup(page,{initial:{status:'completed',plan}});
 await page.setViewportSize({width:390,height:844});await page.goto(`/navigator/plan?run=${ID}`);
 await expect(page.locator('.rp-tab')).toContainText('Eligibility concern');
 await expect(page.locator('.rp-findings')).toContainText('The guideline accepts Class 12');
 await expect(page.locator('.rp-findings')).toContainText('restricts this scheme to SC or ST');
 await page.locator('.rp-more > summary').click();
 const all=page.getByRole('region',{name:'All eligibility findings'});
 await expect(all).toContainText('fourth-year renewal is allowed');await expect(all).toContainText('To check');
 await all.getByRole('button',{name:'Read source',exact:true}).first().click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('exclusively for students belonging to SC or ST');
 await noOverflow(page);expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('provider failure keeps sources available without inventing a usable answer',async({page})=>{
 const plan=await answerPlanFixture();plan.answer={...plan.answer,acceptedAssessments:0,assessedConditions:0,status:'partial',reason:'PROVIDER_TIMEOUT',message:'The source explanation could not finish.'};
 for(const e of plan.entries)e.answer.conditions=e.answer.conditions.map(c=>({...c,status:'unknown',basis:'unresolved',evidence:[],explanation:'This is still open.'}));
 await setup(page,{initial:{status:'completed',plan}});await page.goto(`/navigator/plan?run=${ID}`);
 await expect(page.locator('.rp-unknown')).toContainText('need evidence to check this option');
 await openFindingNotes(page);await expect(page.getByRole('region',{name:'Evidence answer status'})).toContainText('provider did not respond');
 await page.locator('.rp-more > summary').click();await page.getByRole('button',{name:/^Source 1/}).click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('Applicants who have completed Class 12');
});

test('a rejected assessment cannot erase valid findings or leak into notes',async({page})=>{
 const plan=await answerPlanFixture({invalidRenewal:true});const{requests,errors}=await setup(page,{initial:{status:'completed',plan}});
 await page.goto(`/navigator/plan?run=${ID}`);await expect(page.locator('.rp-findings')).toContainText('The guideline accepts Class 12');
 await expect(page.locator('body')).not.toContainText('PRIVATE_UNSUPPORTED');
 await openFindingNotes(page);const notice=page.getByRole('region',{name:'Evidence answer status'});
 await expect(notice).toContainText('Valid findings were kept');await expect(notice).toContainText('QUOTE_NOT_FOUND');
 await expect(notice.getByRole('link',{name:'Review the saved findings and sources'})).toHaveAttribute('href','#nv-saved-findings');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save notes',exact:true}).click();
 expect(await readFile(await(await download).path(),'utf8')).not.toContain('PRIVATE_UNSUPPORTED');
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('initialization retries only initial reads; start and advance failures require explicit user actions', async ({ page }) => {
 await setup(page); let lists = 0, statuses = 0, starts = 0, advances = 0; const startIds = [];
 await page.route('**/api/navigator/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname.replace('/api/navigator', '');
  const starting = () => route.fulfill({ status: 503, headers: { 'Retry-After': '1' }, json: { error: { code: 'NAVIGATOR_INITIALIZING', message: 'Research is starting. Please wait.' } } });
  if (path === '/status' && ++statuses === 1) return route.fulfill({ json: { available: false, state: 'initializing', retryable: true, retentionDays: 7 } });
  if (path === '/runs' && req.method() === 'GET' && ++lists === 1) return starting();
  if (path === '/runs' && req.method() === 'POST') { starts++; startIds.push(req.postDataJSON().requestId); if (starts === 1) return starting(); }
  if (path.endsWith('/advance') && req.method() === 'POST') { advances++; return starting(); }
  return route.fallback();
 });
 await page.goto('/navigator'); await expect(page.getByRole('button', { name: 'Start research', exact: true })).toBeEnabled();
 await expect.poll(() => lists).toBe(2); expect(starts + advances).toBe(0);
 await page.getByLabel('Your research question').fill(goal); await page.getByRole('button', { name: 'Start research', exact: true }).click();
 await expect(page.getByRole('alert')).toContainText('Udaan is reconnecting');
 await page.waitForTimeout(1700); expect(starts).toBe(1); expect(advances).toBe(0);
 await page.getByRole('button', { name: 'Start research', exact: true }).click();
 await expect.poll(() => advances).toBe(1); await page.waitForTimeout(1700);
 expect(starts).toBe(2); expect(advances).toBe(1); expect(startIds[0]).toBe(startIds[1]);
});

test('permanent initialization failure is actionable and never triggers startup retries', async ({ page }) => {
 await setup(page); let reads = 0;
 await page.route('**/api/navigator/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname.replace('/api/navigator', '');
  if (path === '/status') return route.fulfill({ json: { available: false, state: 'failed', retryable: false, retentionDays: 7 } });
  if (path === '/runs' && req.method() === 'GET') { reads++; return route.fulfill({ status: 503, json: { error: { code: 'NAVIGATOR_INITIALIZATION_FAILED', message: 'Research could not initialize. The backend configuration or database needs attention.' } } }); }
  return route.fallback();
 });
 await page.goto('/navigator'); await expect(page.getByRole('alert')).toContainText('Research is unavailable right now');
 await page.waitForTimeout(1700); expect(reads).toBe(1);
 await expect(page.getByRole('button', { name: 'Start research', exact: true })).toBeDisabled();
});

test('startup that outlasts the initial reads reconnects without a reload, lost draft or research request', async ({page}) => {
 const {requests,errors}=await setup(page);let statuses=0,ready=false;
 await page.route('**/api/navigator/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/navigator','');
  if(path==='/status'){ready=++statuses>=4;return route.fulfill({json:{available:ready,state:ready?'ready':'initializing',retryable:!ready,retentionDays:7}});}
  if(path==='/runs'&&request.method()==='GET'&&!ready)return route.fulfill({status:503,json:{error:{code:'NAVIGATOR_INITIALIZING',message:'Initializing'}}});
  return route.fallback();
 });
 await page.goto('/navigator');await page.getByLabel('Your research question').fill('Keep my question while reconnecting');
 await expect(page.getByRole('button',{name:'Start research',exact:true})).toBeEnabled();
 expect(statuses).toBe(4);await expect(page.getByLabel('Your research question')).toHaveValue('Keep my question while reconnecting');
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('backend network failure has a useful reconnect action and never discards the typed question',async({page})=>{
 const{requests,errors}=await setup(page);let online=false;
 await page.route('**/api/navigator/**',async route=>{if(!online)return route.abort('connectionrefused');return route.fallback();});
 await page.goto('/navigator');await page.getByLabel('Your research question').fill('Engineering scholarships after Class 12');
 await expect(page.getByRole('alert')).toContainText('cannot reach Udaan');await expect(page.getByRole('button',{name:'Start research',exact:true})).toBeDisabled();
 online=true;await page.getByRole('button',{name:'Reconnect',exact:true}).click();
 await expect(page.getByRole('button',{name:'Start research',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Your research question')).toHaveValue('Engineering scholarships after Class 12');
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
});

test('a stalled startup stops its bounded read checks and leaves a useful manual recovery action', async ({page}) => {
 const {requests,errors} = await setup(page); let statuses = 0;
 await page.clock.install();
 await page.route('**/api/navigator/status', route => { statuses++; return route.fulfill({json:{available:false,state:'initializing',retryable:true,retentionDays:7}}); });
 await page.goto('/navigator'); await expect.poll(() => statuses).toBe(1);
 await page.clock.runFor(600); await expect.poll(() => statuses).toBe(2);
 await page.clock.runFor(1100); await expect.poll(() => statuses).toBe(3);
 await page.getByLabel('Your research question').fill('Keep my question if startup takes too long');
 for (let index = 0; index < 16; index++) { await page.clock.runFor(2100); await expect.poll(() => statuses).toBe(4 + index); }
 await expect(page.getByRole('alert')).toContainText('Reconnect to check again');
 await page.clock.runFor(20000); expect(statuses).toBe(19);
 await expect(page.getByLabel('Your research question')).toHaveValue('Keep my question if startup takes too long');
 await expect(page.getByRole('button',{name:'Reconnect',exact:true})).toBeEnabled();
 expect(requests.filter(r=>r.method==='POST')).toEqual([]); expect(errors).toEqual([]);
});

const ID = "0e659cbf-582c-4545-b2a1-3649eb39dd26";
const goal = "Find evidence about income conditions in recorded scholarships.";
const baseRun = () => ({ runId: ID, goal, revision: 0, status: "ready", createdAt: "2026-10-22T00:00:00Z", expiresAt: "2026-10-29T00:00:00Z",
	limits: { maxModelCalls: 6, maxToolCalls: 8 }, usage: { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, reportedModelCalls: 0, tokenUsageIncomplete: false }, events: [], clarification: null, plan: null, error: null });
async function citedPlan() {
	const tools = createResearchTools({ repository: researchFixture().repository, profile: { familyIncome: 0 } });
	await tools.execute("evaluateMatches", { schemeIds: [SCHEME_ID] });
	const result = await tools.execute("findGuidelinePassages", { schemeId: SCHEME_ID, query: "income" });
	return tools.execute("finishInvestigation", { selections: [{ schemeId: SCHEME_ID, evidenceIds: result.passages.map(p => p.id) }] });
}

test('missing education metadata stays unknown even when an independent income check passes',async({page})=>{
 const fixture=researchFixture();const{retrieval,report}=compileResearchIntent({objective:'Find support',searchQuery:'',constraints:[{field:'educationLevel',operator:'include',value:'UG',source:{messageIndex:0,quote:'synthetic'}}],questions:[],ambiguities:[]});
 const tools=createResearchTools({repository:fixture.repository,profile:{familyIncome:0},retrieval,includeContext:true});
 const found=await tools.execute('findGuidelinePassages',{schemeId:SCHEME_ID,query:'income'});const plan=await tools.execute('finishInvestigation',{selections:[{schemeId:SCHEME_ID,evidenceIds:found.passages.map(p=>p.id)}]});plan.intent=report;
 await setup(page,{initial:{status:'completed',plan}});await page.setViewportSize({width:390,height:844});await page.goto(`/navigator/plan?run=${ID}`);
 await expect(page.locator('.rp-tab')).toContainText('More information needed');
 await page.locator('.rp-more > summary').click();await expect(page.locator('.rp-more')).toContainText('Education level: UG');
 await expect(page.locator('.rp-facts')).toContainText('1 passed');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save notes',exact:true}).click();expect(await readFile(await(await download).path(),'utf8')).toContain('Still to check: Confirm: Education level: UG');await noOverflow(page);
});
async function setup(page, { signedIn = true, initial = null, stages = ["ready", "awaiting_input"], delay = 0, available = true, provider = null, malformed = false } = {}) {
	const requests = [], errors = [], plan = await citedPlan(); let run = initial ? { ...baseRun(), ...initial } : null, index = 0;
	page.on("pageerror", error => errors.push(error.message));
	if (signedIn) await page.addInitScript(() => { localStorage.setItem("token", "synthetic-browser-test-token"); localStorage.setItem("user", JSON.stringify({ _id: "333333333333333333333333", name: "Navigator test" })); });
	await page.route("**/api/**", async route => {
		const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^.*\/api\/navigator/, ""), method = request.method();
		if (!url.pathname.includes("/api/navigator")) return route.fulfill({ json: { success: true, data: [], notifications: [], bookmarks: [] } });
		const body = request.postDataJSON(); requests.push({ path, method, body });
		if (path === "/status") return route.fulfill({ json: { available, retentionDays: 7, ...(provider ? { provider } : {}) } });
		if (path === "/runs" && method === "GET") return route.fulfill({ json: { runs: run ? [run] : [] } });
		if (path === "/runs" && method === "POST") { run = { ...baseRun(), goal: body.goal }; return route.fulfill({ status: 201, json: { run } }); }
		if (path === `/runs/${ID}` && method === "DELETE") { run = null; return route.fulfill({ status: 204 }); }
		if (path === `/runs/${ID}/cancel`) { run = { ...run, revision: run.revision + 1, status: "cancelled", clarification: null }; return route.fulfill({ json: { run } }); }
		if (path === `/runs/${ID}/notes`) {
			run = { ...run, revision: run.revision + 2, status: "completed", error: null, clarification: null,
				plan: { ...plan, preparation: "collected_evidence", caveat: "Notes from collected evidence; AI research did not finish. Official eligibility is not confirmed." } };
			return route.fulfill({ json: { run } });
		}
		if (path === `/runs/${ID}/catalogue`) {
			run = { ...run, revision: run.revision + 2, status: "ready", error: null, catalogueNoAI: true, workflow: "catalogue_v1", collectedPassageCount: 0 };
			return route.fulfill({ json: { run } });
		}
		if (path === `/runs/${ID}/advance`) {
			if (delay) await new Promise(resolve => setTimeout(resolve, delay));
			if (run.status !== "cancelled") {
				const status = body.clarification ? "completed" : stages[Math.min(index++, stages.length - 1)];
				run = { ...run, status, revision: run.revision + 2, usage: run.catalogueNoAI ? run.usage : { ...run.usage, modelCalls: run.usage.modelCalls + 1, toolCalls: run.usage.toolCalls + 1 },
					events: [...run.events, { sequence: run.events.length + 1, type: "tool_completed", tool: "searchScholarships" }],
					clarification: status === "awaiting_input" ? { kind: "clarification", fields: ["state", "familyIncome", "hasDisability"], optional: true } : null,
					plan: status === "completed" ? run.catalogueNoAI ? { ...plan, preparation: "catalogue", aiAssistance: "not_requested" } : plan : null,
					error: status === "quota_exhausted" ? { code: "PROVIDER_QUOTA", message: "The model provider is rate limited. Resume later.", retryAt: new Date(Date.now() + 60000).toISOString() } : null };
			}
			return route.fulfill({ json: { run: malformed ? { ...run, plan: { kind: "fake" }, status: "completed" } : run } });
		}
		if (path === `/runs/${ID}` && run) return route.fulfill({ json: { run: malformed ? { ...run, status: "completed", plan: { kind: "fake" } } : run } });
		return route.fulfill({ status: 404, json: { error: { code: "RUN_NOT_FOUND", message: "The investigation is unavailable." } } });
	});
	return { requests, errors, getRun: () => run };
}
async function start(page) {
	await page.goto("/navigator"); await page.getByLabel("Your research question").fill(goal);
	await page.getByRole("button", { name: "Start research", exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`/navigator/investigation\\?run=${ID}`));
}
async function noOverflow(page) {
 const overflow = await page.evaluate(() => ({ width: innerWidth, actual: document.documentElement.scrollWidth,
  elements: [...document.querySelectorAll('.nv-root *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1)
   .slice(0, 8).map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width })) }));
 expect(overflow.actual, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
}

test("unresolved semantic conditions remain visible and exportable instead of being presented as verified", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 900 });
	const plan = await citedPlan(); plan.preparation = "catalogue"; plan.aiAssistance = "search_planning";
	plan.intent = { status: "interpreted", reason: null, constraints: ["fourth year", "renewal only"], questions: ["Can I renew in fourth year?"], unresolved: ["fourth year", "renewal only"], ambiguities: [] };
	const { requests, errors } = await setup(page, { initial: { status: "completed", plan } });
	await page.goto(`/navigator/plan?run=${ID}`);
		await page.locator('.rp-research > summary').click();
	await expect(page.getByRole("region", { name: "Request interpretation" })).toContainText("These conditions have not been resolved."); await expect(page.getByRole("region", { name: "Request interpretation" })).toContainText("fourth year"); await expect(page.getByRole("region", { name: "Request interpretation" })).toContainText("renewal only");
	const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Save notes" }).click();
	const file = await downloaded, content = await readFile(await file.path(), "utf8"); expect(content).toContain("Condition not resolved by catalogue filters: fourth year");
	await noOverflow(page); expect(requests.filter(request => request.method === "POST")).toEqual([]); expect(errors).toEqual([]);
});

test("ambiguous intent and unavailable interpretation are explicit rather than fabricated completion", async ({ page }) => {
	for (const status of ["needs_clarification", "unavailable"]) {
		const plan = await citedPlan(); plan.entries = []; plan.outcome = "insufficient_evidence"; plan.preparation = "catalogue";
		plan.intent = { status, reason: status === "unavailable" ? "INVALID_RESEARCH_INTENT" : null, constraints: [], questions: ["Which academic year?"], unresolved: [], ambiguities: status === "needs_clarification" ? ["The education-level constraints conflict."] : [] };
		const { requests, errors } = await setup(page, { initial: { status: "completed", plan } });
		await page.goto(`/navigator/plan?run=${ID}`);
				await expect(page.locator("body")).toContainText(status === "needs_clarification" ? "One thing to clear up" : "couldn’t reliably understand all your conditions");
		if (status === "unavailable") await expect(page.locator("body")).toContainText("rather than personalised recommendations");
		expect(requests.filter(request => request.method === "POST")).toEqual([]); expect(errors).toEqual([]);
		await page.unrouteAll();
	}
});

for (const width of [390, 1440]) {
	test(`zero retrieved passages offer real catalogue recovery instead of an unusable evidence button at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		const { requests, errors, getRun } = await setup(page, { stages: ["completed"], initial: {
			status: "quota_exhausted", collectedPassageCount: 0,
			events: [{ sequence: 1, type: "tool_completed", tool: "findGuidelinePassages", resultCount: 0 }],
			error: { code: "PROVIDER_QUOTA", message: "Synthetic limit", retryAt: new Date(Date.now() + 60000).toISOString() },
		} });
		await page.goto(`/navigator/investigation?run=${ID}`);
		await expect(page.getByRole("button", { name: "Use collected evidence — no AI call" })).toHaveCount(0);
		await page.locator(".nv-activity-disclosure > summary").click(); await expect(page.getByText("0 source excerpts", { exact: true })).toBeVisible(); await page.locator(".nv-activity-disclosure > summary").click();
		const recovery = page.getByRole("button", { name: "Search catalogue without AI", exact: true }); await expect(recovery).toBeEnabled();
		await noOverflow(page); await page.screenshot({ path: test.info().outputPath(`navigator-empty-evidence-${width}.png`), fullPage: true });
		await recovery.click(); await expect(page).toHaveURL(new RegExp(`/navigator/plan\\?run=${ID}`));
		await expect(page.getByRole("heading", { name: "Here’s what we found." })).toBeVisible();
		await expect(page.locator(".rp-notes[role=status]")).toContainText("without AI assistance");
		expect(getRun().usage.modelCalls).toBe(0); expect(requests.filter(request => request.path.endsWith("/notes"))).toHaveLength(0);
		expect(requests.filter(request => request.path.endsWith("/catalogue"))).toHaveLength(1);
		await noOverflow(page); expect(errors).toEqual([]);
	});
}

for (const [width, status, code] of [[390, "quota_exhausted", "PROVIDER_QUOTA"], [1440, "partial", "MODEL_PROTOCOL"]]) {
	test(`collected evidence remains useful after ${code} without further inference at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		const usage = { ...baseRun().usage, modelCalls: 5, toolCalls: 3 };
		const { requests, errors } = await setup(page, { initial: { status, usage, collectedPassageCount: 1, events: [{ sequence: 1, type: "tool_completed", tool: "findGuidelinePassages", resultCount: 1 }], error: { code, message: "Synthetic failed AI fixture.", ...(code === "PROVIDER_QUOTA" ? { retryAt: new Date(Date.now() + 60000).toISOString() } : {}) } } });
		await page.goto(`/navigator/investigation?run=${ID}`);
		const action = page.getByRole("button", { name: "Use collected evidence — no AI call" }); await expect(action).toBeEnabled();
		if (code === "PROVIDER_QUOTA") await expect(page.getByRole("button", { name: "Continue research" })).toBeDisabled();
		await noOverflow(page); await page.screenshot({ path: test.info().outputPath(`navigator-recovery-${width}.png`), fullPage: true });
		await action.click(); await expect(page).toHaveURL(new RegExp(`/navigator/plan\\?run=${ID}`));
		await expect(page.locator(".rp-notes[role=status]")).toContainText("Research paused");
		await expect(page.locator(".rp-notes[role=status]")).toContainText("without another AI call"); await expect(page.locator(".rp-card")).toHaveCount(1);
		expect(requests.filter(request => request.path.endsWith("/advance"))).toHaveLength(0);
		expect(requests.filter(request => request.method === "POST").map(request => request.path)).toEqual([`/runs/${ID}/notes`]);
		const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Save notes" }).click();
		const file = await download, content = await readFile(await file.path(), "utf8"); expect(content).toContain("no further AI call"); expect(content).toContain("SYNTHETIC TEST ONLY");
		await noOverflow(page); expect(errors).toEqual([]);
	});
}

for (const width of [390, 1440]) {
	test(`official-source receipts stay visible in the plan, drawer and export at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		const plan = await citedPlan(), entry = plan.entries[0], citation = entry.citations[0];
		entry.sourceChecks = [{ snapshotId: String(citation.evidence.snapshotId), url: citation.evidence.url, checkedAt: "2026-10-22T08:00:00.000Z", status: "changed", reason: "different_bytes" }];
		entry.status = "unknown"; entry.stale = true; entry.statusReason = "An official source returned different content. Recorded conditions and dates need review.";
		const { requests, errors } = await setup(page, { initial: { status: "completed", plan, events: [{ sequence: 1, type: "tool_completed", tool: "checkOfficialSource" }] } });
		await page.goto(`/navigator/plan?run=${ID}`);
		await page.locator('.rp-more > summary').click();
		await expect(page.locator(".rp-card")).toContainText("Source content changed"); await expect(page.locator(".rp-card")).toContainText("Recorded conditions and dates need review");
		await noOverflow(page); await page.screenshot({ path: test.info().outputPath(`navigator-source-check-${width}.png`), fullPage: true });
		await page.getByRole("button", { name: /^Source 1/ }).click();
		await expect(page.getByRole("dialog")).toContainText("Source content changed"); await expect(page.getByRole("dialog")).toContainText("Attempt recorded"); await noOverflow(page);
		await page.keyboard.press("Escape");
		const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Save notes" }).click();
		const file = await downloaded, text = await readFile(await file.path(), "utf8"); expect(text).toContain("Source content changed"); expect(text).toContain("2026-10-22T08:00:00.000Z");
		await page.locator('.rp-research > summary').click(); await page.getByRole("link", { name: "Open activity history" }).click(); await page.locator(".nv-activity-disclosure > summary").click(); await expect(page.getByText("Check the official page", { exact: true })).toBeVisible();
		expect(requests.filter(r => r.method === "POST")).toHaveLength(0); expect(errors).toEqual([]);
	});

	test(`live UI contract: start, skip, cited plan, accessible drawer and download at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 }); const { requests, errors } = await setup(page);
		await page.goto("/navigator"); await expect(page.getByRole('button', { name: 'Start research', exact: true })).toBeEnabled();
		await page.screenshot({ path: test.info().outputPath(`navigator-home-${width}.png`), animations: 'disabled' }); await page.getByRole("button", { name: /Add a little context/ }).click();
		await noOverflow(page);
		await page.locator(".nv-brief-grid").screenshot({ path: test.info().outputPath(`navigator-form-${width}.png`) });
		await start(page); await expect(page.getByRole("button", { name: "Skip for now" })).toBeVisible();
		await noOverflow(page); await page.getByRole("button", { name: "Use selected details" }).click(); await expect(page.getByRole("alert")).toContainText("Provide a requested detail");
		await page.getByRole("button", { name: "Skip for now" }).click(); await page.getByRole("link", { name: "Open research plan" }).click();
		await expect(page.locator(".rp-card")).toHaveCount(1);
		await page.locator('.rp-more > summary').click();
		await expect(page.locator(".rp-facts")).toContainText("Rule checks");
		await page.getByRole("button", { name: /^Source 1/ }).click(); const drawer = page.getByRole("dialog");
		await expect(drawer).toContainText("Page 1"); await expect(drawer.locator("blockquote")).toContainText("Annual family income");
		await expect(drawer).toContainText("Not performed by this investigation");
		const sourceUrl = new URL(await drawer.getByRole("link", { name: "Open original source" }).getAttribute("href"));
		expect(sourceUrl.hash).toContain(':~:text='); sourceUrl.hash = ''; expect(sourceUrl.href).toBe("https://example.invalid/synthetic-guideline");
		await expect(page.getByRole("button", { name: "Close source note" })).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(drawer.getByRole("link")).toBeFocused();
		await noOverflow(page); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: /^Source 1/ })).toBeFocused();
		await page.locator('.rp-research > summary').click();
		await page.getByRole("checkbox", { name: "Read the current official guideline" }).check(); await expect(page.getByRole("progressbar", { name: "Checklist progress" })).toHaveAttribute("aria-valuenow", "1");
		await page.screenshot({ path: test.info().outputPath(`navigator-plan-${width}.png`), fullPage: true });
		const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Save notes" }).click();
		const file = await downloaded, text = await readFile(await file.path(), "utf8"); expect(text).toContain("SYNTHETIC TEST ONLY"); expect(text).toContain("https://example.invalid/synthetic-guideline");
		expect(requests.filter(r => r.path.endsWith("/advance"))).toHaveLength(3); expect(requests.find(r => r.body?.clarification)?.body.clarification).toEqual({ skip: true, answers: {} });
		await noOverflow(page); expect(errors).toEqual([]);
	});
}

test("opted-in context and requested clarification preserve zero and false without browser persistence", async ({ page }) => {
	const { requests } = await setup(page); await page.goto("/navigator"); await page.getByLabel("Your research question").fill(goal);
	await page.getByRole("button", { name: /Add a little context/ }).click(); await page.getByLabel("Annual family income (₹)").fill("0"); await page.getByRole("checkbox", { name: /Use these details/ }).check();
	await page.getByRole("button", { name: "Start research", exact: true }).click(); await expect(page.getByRole("button", { name: "Skip for now" })).toBeVisible();
	expect(requests.find(r => r.method === "POST" && r.path === "/runs").body.profile).toEqual({ familyIncome: 0 });
	await page.getByRole("combobox", { name: "Domicile state", exact: true }).selectOption("Goa"); await page.getByLabel("Annual family income (₹)").fill("0"); await page.getByLabel("Disability status").selectOption("false");
	await page.getByRole("button", { name: "Use selected details" }).click(); await expect(page.getByRole("link", { name: "Open research plan" })).toBeVisible();
	expect(requests.find(r => r.body?.clarification)?.body.clarification.answers).toEqual({ state: "Goa", familyIncome: 0, hasDisability: false });
	expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(["token", "user"]); expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
});

test("reload recovers a run without inference; continue and quota cooldown are explicit", async ({ page }) => {
	const { requests } = await setup(page, { initial: { status: "interrupted" }, stages: ["quota_exhausted"] });
	await page.goto(`/navigator/investigation?run=${ID}`); await expect(page.getByRole("button", { name: "Continue research" })).toBeEnabled();
	await page.reload(); await expect(page.getByRole("button", { name: "Continue research" })).toBeEnabled(); expect(requests.filter(r => r.method === "POST")).toEqual([]);
	await page.getByRole("button", { name: "Continue research" }).click(); await expect(page.getByRole("heading", { name: "A pause, with your place saved." })).toBeVisible();
	await expect(page.getByRole("button", { name: "Continue research" })).toBeDisabled(); await expect(page.locator(".nv-status-note[role='status']")).toContainText("No automatic retries");
	expect(requests.filter(r => r.path.endsWith("/advance"))).toHaveLength(1);
});

for (const [code, label] of [["QUOTA_EXHAUSTED", "Today’s research allowance is used up"], ["PROVIDER_QUOTA", "Research needs a short pause"]]) {
	test(`${label} shows a readable retry time without starting more inference`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 900 });
		const retryAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
		const { requests } = await setup(page, { initial: { status: "quota_exhausted", error: { code, message: "Synthetic limit fixture.", retryAt } } });
		await page.goto(`/navigator/investigation?run=${ID}`);
		const note = page.locator(".nv-status-note[role='status']"); await expect(note).toContainText(label); await expect(note).toContainText("No automatic retries");
		await expect(note.locator("time")).toHaveAttribute("datetime", retryAt); await expect(note.locator("time")).toContainText(/IST|GMT\+5:30/);
		await expect(page.getByRole("button", { name: "Continue research" })).toBeDisabled();
		if (code === "QUOTA_EXHAUSTED") await expect(note).toContainText("shared daily research allowance");
		expect(requests.filter(r => r.method === "POST")).toEqual([]); await noOverflow(page);
	});
}

test("an elapsed quota wait permits an explicit continue; cancelled runs hide their old quota countdown", async ({ page }) => {
	const error = { code: "QUOTA_EXHAUSTED", message: "Synthetic past limit.", retryAt: new Date(Date.now() - 1000).toISOString() };
	const { requests } = await setup(page, { initial: { status: "quota_exhausted", error } });
	await page.goto(`/navigator/investigation?run=${ID}`); await expect(page.locator(".nv-status-note[role='status']")).toContainText("retry time has passed");
	await expect(page.getByRole("button", { name: "Continue research" })).toBeEnabled(); expect(requests.filter(r => r.method === "POST")).toEqual([]);
	await page.getByRole("button", { name: "Cancel research", exact: true }).click(); await expect(page.getByRole("heading", { name: "This trail can wait." })).toBeVisible();
	await expect(page.locator(".nv-status-note")).toHaveCount(0); await expect(page.getByRole("button", { name: "Continue research" })).toHaveCount(0);
});

test("pause waits for the current checkpoint; cancellation wins over a late response", async ({ page }) => {
	const { requests } = await setup(page, { delay: 1200, stages: ["ready", "completed"] }); await start(page);
	await page.getByRole("button", { name: "Pause after this step" }).click(); await expect(page.getByRole("button", { name: "Continue research" })).toBeEnabled();
	expect(requests.filter(r => r.path.endsWith("/advance"))).toHaveLength(1);
	await page.getByRole("button", { name: "Continue research" }).click(); await page.getByRole("button", { name: "Cancel research", exact: true }).click();
	await expect(page.getByRole("heading", { name: "This trail can wait." })).toBeVisible(); await expect(page.getByRole("link", { name: "Open research plan" })).toHaveCount(0);
});

test("guests never start research; unavailable and malformed responses never fabricate a plan", async ({ page }) => {
	const { requests } = await setup(page, { signedIn: false, available: false }); await page.goto("/navigator");
	await expect(page.getByRole("link", { name: "Sign in to research", exact: true })).toHaveAttribute("href", "/login?redirect=%2Fnavigator");
	await expect(page.getByRole("button", { name: "Start research", exact: true })).toHaveCount(0); expect(requests.filter(r => r.method === "POST")).toEqual([]);
});

test("unsupported server plan fails closed with saved progress retained", async ({ page }) => {
	await setup(page, { malformed: true, stages: ["completed"] }); await start(page);
	await expect(page.getByRole("alert")).toContainText("could not be opened safely"); await expect(page.getByRole("link", { name: "Open research plan" })).toHaveCount(0);
});

test("saved investigations can be opened and deleted without model calls", async ({ page }) => {
	const { requests } = await setup(page, { initial: { status: "cancelled" } }); await page.goto("/navigator");
	await expect(page.getByRole("region", { name: "Your recent investigations" })).toContainText(goal);
	await page.getByRole("button", { name: `Delete investigation: ${goal}` }).click(); await expect(page.getByRole("region", { name: "Your recent investigations" })).toHaveCount(0);
	expect(requests.filter(r => r.method === "POST")).toEqual([]);
});

test("switching auth identity clears a visible private investigation", async ({ page }) => {
	await setup(page, { initial: { status: "interrupted" } }); await page.goto(`/navigator/investigation?run=${ID}`); await expect(page.locator(".nv-question-strip")).toContainText(goal);
	await page.evaluate(() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.dispatchEvent(new Event("auth-changed")); });
	await expect(page.locator(".nv-question-strip")).toHaveCount(0); await expect(page.getByRole("link", { name: "Sign in to research", exact: true })).toBeVisible();
});

test("an unavailable run link never displays a previous investigation's notes", async ({ page }) => {
	await setup(page, { initial: { status: "interrupted" } }); await page.goto(`/navigator/investigation?run=${ID}`); await expect(page.locator(".nv-question-strip")).toContainText(goal);
	await page.evaluate(() => { history.pushState({}, "", "/navigator/investigation?run=4cbad649-a47f-455f-bfb0-994c88c86c35"); window.dispatchEvent(new PopStateEvent("popstate")); });
	await expect(page.getByRole("alert")).toContainText("unavailable"); await expect(page.locator(".nv-question-strip")).toHaveCount(0);
});

test("unavailable research can be checked again without authorizing inference", async ({ page }) => {
	const { requests } = await setup(page, { available: false }); await page.goto("/navigator");
	await expect(page.getByRole("button", { name: "Start research", exact: true })).toBeDisabled();
	await page.getByRole("button", { name: "Check availability again" }).click();
	await expect(page.getByRole("button", { name: "Check availability again" })).toBeVisible();
	expect(requests.filter(r => r.path === "/status").length).toBeGreaterThanOrEqual(2); expect(requests.filter(r => r.method === "POST")).toEqual([]);
});


test('failed eligibility is a clearly explained rejected result, never a recommended lead', async ({ page }) => {
  const fixture = researchFixture();
  const tools = createResearchTools({ repository: fixture.repository, profile: { familyIncome: 500000 }, includeContext: true });
  const found = await tools.execute('findGuidelinePassages', { schemeId: SCHEME_ID, query: 'income' });
  const plan = await tools.execute('finishInvestigation', { selections: [{ schemeId: SCHEME_ID, evidenceIds: found.passages.map(p => p.id) }] });
  await setup(page, { initial: { status: 'completed', plan } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/navigator/plan?run=${ID}`);
  const card = page.locator('.rp-card').filter({ hasText: fixture.scheme.title });
  await expect(card).toContainText('Does not fit');
  await card.locator('.rp-more > summary').click(); await expect(card).toContainText('Why it does not fit'); await expect(card).toContainText('Annual family income');
  await expect(card).not.toContainText('LEAD'); await expect(card).not.toContainText('Promising candidate');
  await expect(page.getByText('Catalogue research ready', { exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('role ambiguity asks one readable question without exposing compiler filters', async ({ page }) => {
  const { report } = compileResearchIntent({ objective: 'Find course funding', searchQuery: '', constraints: [
    { field: 'educationLevel', value: 'PG', operator: 'include', role: 'funding', source: { messageIndex: 0, quote: 'synthetic' } },
    { field: 'educationLevel', value: 'Diploma', operator: 'include', role: 'funding', source: { messageIndex: 0, quote: 'synthetic' } },
  ], questions: [], ambiguities: [] });
  const plan = await citedPlan(); plan.entries = []; plan.intent = report; plan.outcome = 'insufficient_evidence';
  await setup(page, { initial: { status: 'completed', plan } });
  await page.goto(`/navigator/plan?run=${ID}`);
  const interpretation = page.getByRole('region', { name: 'Request interpretation' });
  await expect(interpretation).toContainText('Which course level should the scholarship fund?');
  await expect(interpretation).not.toContainText('educationLevel');
  await expect(interpretation.locator('li')).toHaveCount(0);
});


test('investigation scene follows saved activity and reduced motion without starting research', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' });
 await page.setViewportSize({ width:390,height:844 });
 const { requests, errors } = await setup(page,{initial:{status:'running',collectedPassageCount:3,events:[
 {sequence:1,type:'tool_completed',tool:'searchScholarships'},
 {sequence:2,type:'tool_started',tool:'findGuidelinePassages'}]}});
 await page.goto(`/navigator/investigation?run=${ID}`);
 await expect(page.locator('.nv-stage')).toHaveAttribute('data-mood','read');
 const rail=page.getByRole('list',{name:'Research stages reached so far'});
 await expect(rail.locator('[aria-current=step]')).toContainText('Read sources');
 await expect(rail.locator('.is-done')).toContainText('Search catalogue');
 await expect(rail.locator('.is-done')).toHaveCount(1);
 await expect(page.locator('.nv-now')).toContainText('Reading scholarship guidelines');
 await expect(page.getByRole('heading',{name:'Finding your next step.'})).toBeVisible();
 expect(await page.locator('.nv-bob').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await noOverflow(page);expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/navigator-motion-mobile.png',fullPage:true});
});

test('cooldown scene does not imply active work or automatic retries', async ({ page }) => {
 await page.setViewportSize({width:1440,height:1000});
 const { requests }=await setup(page,{initial:{status:'quota_exhausted',error:{code:'PROVIDER_QUOTA',message:'Rate limited',retryAt:new Date(Date.now()+60000).toISOString()},events:[{sequence:1,type:'tool_started',tool:'searchScholarships'}]}});
 await page.goto(`/navigator/investigation?run=${ID}`);
 await expect(page.locator('.nv-stage')).toHaveAttribute('data-mood','quota');
 await expect(page.locator('.nv-ring')).toBeVisible();await expect(page.locator('.nv-now')).toHaveCount(0);
 await expect(page.locator('.nv-rail [aria-current]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue research',exact:true})).toBeDisabled();
 await expect(page.locator('.nv-status-note[role=status]')).toContainText('No automatic retries');
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);await noOverflow(page);
 await page.screenshot({path:'test-results/navigator-motion-desktop.png',fullPage:true});
});


test('failed interpretation offers an explicit catalogue choice without implying that conditions were applied', async ({page}) => {
 const {requests}=await setup(page,{initial:{status:'partial',workflow:'catalogue_v1',limits:{maxModelCalls:1,maxToolCalls:8},usage:{...baseRun().usage,modelCalls:1,tokenUsageIncomplete:true},error:{code:'MODEL_PROTOCOL',message:'We could not reliably understand your request. No catalogue search ran and your conditions have not been applied.'},events:[{sequence:1,type:'model_started'},{sequence:2,type:'model_failed',code:'MODEL_PROTOCOL'}]}});
 await page.goto(`/navigator/investigation?run=${ID}`);
 await expect(page.getByText('We could not reliably understand your request.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Search catalogue without AI',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue research',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open research plan',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Your question hasn’t been researched yet.',exact:true})).toBeVisible();
 await expect(page.getByText('CATALOGUE ONLY',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Review and retry',exact:true}).click();
 await expect(page.getByLabel('Your research question')).toHaveValue(baseRun().goal);
 expect(requests.filter(request=>request.method==='POST').map(request=>request.path)).toEqual([`/runs/${ID}/cancel`]);
});


test('question-aware source retrieval reaches a useful renewal finding and the original compass stays interactive', async ({page}) => {
 const plan = await renewalPlanFixture();
 const {requests,errors} = await setup(page,{initial:{status:'completed',plan}});
 await page.goto(`/navigator/plan?run=${ID}`);
 const findings=page.getByRole('region',{name:'Answers from source evidence'});
 await expect(findings).toContainText('Renewal is available to existing award holders');
 await expect(page.getByRole('region',{name:'Your research takeaway'})).toContainText('No suitable scholarship has been established yet');
 await findings.getByRole('button',{name:'Read source',exact:true}).click();
 await expect(page.getByRole('dialog').locator('blockquote')).toContainText('may renew for fourth-year study');
 await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Edit question',exact:true}).click();
 await expect(page.getByRole('button',{name:'Turn the research compass',exact:true})).toBeVisible();
 await expect(page.locator('.nv-compass-scene .nv-scene-reader')).toHaveCount(0);
 expect(requests.filter(r=>r.method==='POST')).toEqual([]);expect(errors).toEqual([]);await noOverflow(page);
});

test('a failed retry cleanup keeps the question visible and never starts replacement research', async ({page}) => {
 const {requests}=await setup(page,{initial:{status:'partial',workflow:'catalogue_v1',usage:{...baseRun().usage,modelCalls:1},error:{code:'INVALID_RESEARCH_INTENT',message:'The AI returned an inconsistent income condition.'}}});
 let cancellations=0;
 await page.route(`**/api/navigator/runs/${ID}/cancel`,async route=>{cancellations++;await route.fulfill({status:503,json:{error:{code:'NAVIGATOR_UNAVAILABLE',message:'Saved research is temporarily unavailable.'}}});});
 await page.goto(`/navigator/investigation?run=${ID}`);
 await page.getByRole('button',{name:'Review and retry',exact:true}).click();
 await expect(page.getByRole('button',{name:'Review and retry',exact:true})).toBeEnabled();
 await expect(page.getByRole('heading',{name:'Your question hasn’t been researched yet.',exact:true})).toBeVisible();
 await expect(page).toHaveURL(new RegExp(`/navigator/investigation\\?run=${ID}$`));
 expect(cancellations).toBe(1); expect(requests.filter(r=>r.method==='POST')).toEqual([]);
});

async function openFindingNotes(page) {
 const notes = page.locator(".rp-panel");
 if (await notes.getAttribute("open") === null) await notes.locator(":scope > summary").click();
}
