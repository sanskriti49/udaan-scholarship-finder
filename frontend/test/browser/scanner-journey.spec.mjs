import {test,expect} from '@playwright/test';
async function open(page) { await page.route('**/api/**',route=>route.fulfill({json:{success:true,data:[]}}));await page.goto('/scanner'); }
test('mobile stages, explicit download and selective in-memory handoff',async({page})=>{
 const evaluateCalls=[];page.on('request',r=>{if(r.url().endsWith('/evaluate'))evaluateCalls.push(r.url());});
 await open(page);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 await page.setViewportSize({width:390,height:900});await page.getByRole('button',{name:'Enter details manually'}).click();await page.getByLabel('Annual family income (INR)',{exact:true}).fill('180000');await page.getByLabel('Issue date',{exact:true}).fill('2030-01-01');await page.getByRole('button',{name:'Review next steps'}).click();await expect(page.getByText('The issue date is in the future.',{exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/scanner-review-mobile.png',fullPage:true});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download review'}).click();expect((await download).suggestedFilename()).toBe('udaan-document-review.txt');
 const proceed=page.getByRole('button',{name:'Continue to eligibility'});await expect(proceed).toBeDisabled();await page.getByRole('checkbox',{name:/Annual family income/}).check();await expect(proceed).toBeDisabled();await page.getByRole('checkbox',{name:/I understand/}).check();await proceed.click();await page.waitForURL('**/eligibility');await expect(page.getByText('Only the details you selected were carried over.',{exact:false})).toBeVisible();expect(evaluateCalls).toEqual([]);expect(JSON.stringify(await page.evaluate(()=>history.state))).not.toContain('180000');await page.getByRole('button',{name:'Undergraduate',exact:true}).click();await page.getByRole('button',{name:'Engineering',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Female',exact:true}).click();await page.getByRole('button',{name:'General',exact:true}).click();await page.getByRole('button',{name:'Any state (Central)',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('spinbutton',{name:'Annual family income, exact value'})).toHaveValue('180000');
 await page.reload();await page.getByRole('button',{name:'Undergraduate',exact:true}).click();await page.getByRole('button',{name:'Engineering',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Female',exact:true}).click();await page.getByRole('button',{name:'General',exact:true}).click();await page.getByRole('button',{name:'Any state (Central)',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('spinbutton',{name:'Annual family income, exact value'})).toHaveValue('');
});
test('semester number has no guessed eligibility bridge and edits update the report',async({page})=>{
 await open(page);await page.getByLabel('Document type',{exact:true}).selectOption('bonafide');await page.getByRole('button',{name:'Enter details manually'}).click();await page.getByLabel('Semester / year of study',{exact:true}).fill('3rd semester');await page.getByRole('button',{name:'Review next steps'}).click();await expect(page.getByRole('button',{name:'Continue to eligibility'})).toHaveCount(0);await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByLabel('Semester / year of study',{exact:true}).fill('B.Tech, 3rd semester');await page.getByRole('button',{name:'Review next steps'}).click();await expect(page.getByRole('checkbox',{name:/Level of study: UG/})).toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
});
test('document checklist deep links preserve the selected document type',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill({json:{data:[]}}));
 await page.goto('/scanner.html?type=caste&scholarship=synthetic');
 await expect(page).toHaveURL(/scanner\?type=caste&scholarship=synthetic/);
 await expect(page.getByLabel('Document type',{exact:true})).toHaveValue('caste');
 await page.getByLabel('Document type',{exact:true}).selectOption('bonafide');
 await expect(page).toHaveURL(/type=bonafide/);
 await page.goto('/scanner?type=unknown');await expect(page.getByLabel('Document type',{exact:true})).toHaveValue('income');
});
