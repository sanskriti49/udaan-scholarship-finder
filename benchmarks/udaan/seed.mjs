import './environment.cjs';
import fs from 'node:fs';
const {default:mongoose}=await import('../../backend/node_modules/mongoose/index.js');
const {default:Scholarship}=await import('../../backend/src/models/Scholarship.js');
await mongoose.connect(process.env.MONGO_URI,{maxPoolSize:20});
if(mongoose.connection.name!=='udaan_audit_bench')throw Error('Benchmark fixture database required');
await Scholarship.deleteMany({});
const now=new Date();
const states=['All India','Uttar Pradesh','Maharashtra','Karnataka','Bihar','West Bengal','Delhi'];
const levels=['UG','PG','Class 12'];
const records=Array.from({length:300},(_,i)=>{
  const state=states[i%states.length],level=levels[Math.floor(i/7)%levels.length];
  const rules=[{id:'income',field:'familyIncome',operator:'LTE',targetValue:[150000,250000,400000,600000][i%4]},
    {id:'education',field:'educationLevel',operator:'IN',targetValue:[level]},
    {id:'marks',field:'percentage',operator:'GTE',targetValue:[60,70,80,90][i%4]}];
  const deadline=new Date(now.getTime()+(20+i%90)*86400000);
  return {schemeKey:`synthetic-audit-${i}`,slug:`synthetic-audit-${i}`,title:`Synthetic ${level} Merit Scholarship ${i}`,organization:'Synthetic Test Institution',
    description:'Synthetic scholarship fixture for API benchmarks. Not a real award.',sourceUrl:'https://bench.invalid/scholarships',sourceSite:'bench.invalid',primarySourceId:'synthetic-audit',sourceType:i%2?'Government':'Corporate',
    state,level,category:i%2?'Merit based':'Need based',tags:[level,'Engineering'],amount:{value:10000+(i%10)*5000,currency:'INR',period:'yearly'},
    rules,provenanceQuotes:rules.map(r=>({ruleId:r.id,sourceUrl:'https://bench.invalid/rules',quote:`Synthetic ${r.field} ${r.operator} ${JSON.stringify(r.targetValue)}`})),
    eligibility:{gender:'Any',familyIncome:{max:rules[0].targetValue,operator:'LTE'}},requiredDocuments:[],status:'open',sortDeadline:deadline,deadline,
    currentCycle:{academicYear:'2026-27',applicationType:'general',opensAt:new Date(now.getTime()-20*86400000),closesAt:deadline},
    publication:{state:'published',note:'Synthetic audit data only'},freshness:{firstSeenAt:now,lastSeenAt:now,lastVerifiedAt:now,lastSuccessfulCrawlAt:now,staleAfterHours:72},legacy:false,verified:false};
});
await Scholarship.insertMany(records);await Scholarship.syncIndexes();
const filters=states.slice(0,5).map(state=>`state=${encodeURIComponent(state)}&level=UG&minAmount=10000&sort=amount_high&limit=20`);
const profiles=Array.from({length:12},(_,i)=>({state:states[i%states.length],educationLevel:i%2?'UG':'PG',familyIncome:200000+(i%3)*50000,...(i%4?{percentage:75}:{}),gender:'Female',documentsHeld:[]}));
fs.writeFileSync(new URL('./fixture.json',import.meta.url),JSON.stringify({filters,profiles,scholarships:300,seededAt:now.toISOString()},null,2));
fs.writeFileSync(new URL('./results/seed.json',import.meta.url),JSON.stringify({seededAt:now.toISOString(),count:await Scholarship.countDocuments({}),indexes:await Scholarship.collection.indexes(),mongo:(await mongoose.connection.db.admin().serverInfo()).version},null,2));
console.log('Seeded 300 synthetic scholarships with varied states, levels, income/marks rules and deadlines.');await mongoose.disconnect();
