const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const target='C:/Users/sansk/Downloads/service-provider/output/taskgenie-resume/main.tex';
const before=fs.readFileSync(target,'utf8');
const heading=before.indexOf('{Udaan --');if(heading<0)throw Error('Udaan heading missing');
const start=before.indexOf('\\resumeItem{',heading),closing=before.indexOf('\\resumeItemListEnd',start);
const end=before.lastIndexOf('\n',closing);
const old=before.slice(start,end);
if((old.match(/\\resumeItem\{/g)||[]).length!==4)throw Error('Expected the four existing Udaan bullets; refusing unrelated edits');
const bullets=[
  "Engineered an automated scholarship ingestion pipeline using Cheerio and Playwright, with SHA-256 change detection and MongoDB version history to track updates with source evidence.",
  "Built explainable eligibility matching with source-linked rules and missing-data checks; used Redis and BullMQ to send deduplicated in-app alerts when rule changes affected saved profiles.",
  "Implemented a privacy-first certificate scanner using PDF.js and Tesseract.js, with browser-local text extraction, editable fields, and manual review without uploading documents."
];
const newline=before.includes('\r\n')?'\r\n':'\n';
const replacement=bullets.map((s,i)=>(i?'    ':'')+'\\resumeItem{'+s+'}').join(newline);
const after=before.slice(0,start)+replacement+before.slice(end);
fs.writeFileSync(path.join(__dirname,'results/resume-before.tex'),before);
fs.writeFileSync(target,after);
const saved=fs.readFileSync(target,'utf8');
if(saved.slice(0,start)!==before.slice(0,start)||saved.slice(start+replacement.length)!==before.slice(end))throw Error('Unexpected edit outside Udaan bullet text');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const taskgenie=s=>s.slice(s.indexOf('{TaskGenie --'),s.indexOf('{Udaan --'));
const result={source:target,bullets:3,outsideUdaanUnchanged:true,taskgenieUnchanged:taskgenie(before)===taskgenie(saved),taskgenieBeforeSha256:sha(taskgenie(before)),taskgenieAfterSha256:sha(taskgenie(saved)),pdfGenerated:false};
fs.writeFileSync(path.join(__dirname,'results/resume-scope.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(__dirname,'FINAL-BULLETS.md'),bullets.map(s=>'- '+s).join('\n')+'\n');
console.log(JSON.stringify(result));
