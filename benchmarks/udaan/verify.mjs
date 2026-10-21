import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..'),results=path.join(dir,'results');
const before=fs.readFileSync(path.join(results,'resume-before.tex'),'utf8');
const target='C:/Users/sansk/Downloads/service-provider/output/taskgenie-resume/main.tex';
const after=fs.readFileSync(target,'utf8');
const boundaries=s=>{const heading=s.indexOf('{Udaan --');return[s.indexOf('\\resumeItem{',heading),s.lastIndexOf('\n',s.indexOf('\\resumeItemListEnd',heading))]};
const [a,b]=boundaries(before),[c,d]=boundaries(after);
if(before.slice(0,a)!==after.slice(0,c)||before.slice(b)!==after.slice(d))throw Error('Edit outside Udaan bullets');
if((after.slice(c,d).match(/\\resumeItem\{/g)||[]).length!==3)throw Error('Expected three Udaan items');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const tg=s=>s.slice(s.indexOf('{TaskGenie --'),s.indexOf('{Udaan --'));
const scope={source:target,bullets:3,outsideUdaanUnchanged:true,taskgenieUnchanged:tg(before)===tg(after),taskgenieBeforeSha256:sha(tg(before)),taskgenieAfterSha256:sha(tg(after)),pdfGenerated:false,renderedLineCountVerified:false};
fs.writeFileSync(path.join(results,'resume-scope.json'),JSON.stringify(scope,null,2));
for(const [file,pass]of [['backend.tap',143],['frontend.tap',30],['pipeline-browser.tap',6],['infrastructure.tap',5]]){
  const log=fs.readFileSync(path.join(results,file),'utf8');
  if(!new RegExp(`^# pass ${pass}$`,'m').test(log)||!/^# fail 0$/m.test(log)||!/^# skipped 0$/m.test(log))throw Error(`${file} did not pass`);
}
if(!/15 passed/.test(fs.readFileSync(path.join(results,'browser-tests.txt'),'utf8')))throw Error('Browser suite did not pass');
const runs=JSON.parse(fs.readFileSync(path.join(results,'summary.json')));
if(runs.length!==18||runs.some(x=>x.errorRate!==0||x.serverErrors!==0||(x.cache==='on'&&x.cacheHitRate!==1)))throw Error('Benchmark evidence did not pass');
const sourceChanges=execFileSync('git',['diff','--name-only'],{cwd:root,encoding:'utf8'}).trim();
if(sourceChanges)throw Error(`Unexpected production-source changes: ${sourceChanges}`);
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(directory,x.name)):[path.join(directory,x.name)]);
const sourceFiles=['backend/src/controllers/scholarshipController.js','backend/src/engine/ruleEvaluator.js','backend/src/pipeline/pipeline.js','backend/src/pipeline/store/mongoStore.js','backend/src/workers/processEligibilityChange.js','backend/src/services/eligibilityDelivery.js','backend/src/middlewares/cacheMiddleware.js','frontend/src/scanner/process.js','frontend/src/scanner/rules.js'];
const manifest={verifiedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),productionFilesChanged:false,scope,
  measuredCompletions:runs.reduce((n,x)=>n+x.requests,0),k6Runs:18,
  dockerImages:execFileSync('docker',['inspect','--format','{{.Name}} {{.Image}}','udaan-audit-mongo','udaan-audit-redis'],{encoding:'utf8'}).trim().split(/\r?\n/),
  code:sourceFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),
  evidence:walk(dir).filter(p=>!p.endsWith('manifest.json')).sort().map(p=>({file:path.relative(root,p).replaceAll('\\','/'),sha256:sha(fs.readFileSync(p))}))};
fs.writeFileSync(path.join(results,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({tests:'143 backend + 30 frontend + 21 browser + 5 real-infrastructure passed',k6Runs:18,measuredCompletions:manifest.measuredCompletions,...scope}));
