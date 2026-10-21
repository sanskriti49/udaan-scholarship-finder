import './environment.cjs';
import fs from 'node:fs';
const {default:mongoose}=await import('../../backend/node_modules/mongoose/index.js');
const {clearScholarshipCache}=await import('../../backend/src/middlewares/cacheMiddleware.js');
const {closeRedisClient}=await import('../../backend/src/config/redis.js');
const {default:Scholarship}=await import('../../backend/src/models/Scholarship.js');
await mongoose.connect(process.env.MONGO_URI);
const get=async(port,query)=>{const r=await fetch(`http://127.0.0.1:${port}/api/scholarships?${query}`);const body=await r.json();return{status:r.status,cache:r.headers.get('x-cache'),count:body.count,total:body.total,firstTitle:body.data?.[0]?.title}};
try{
  await clearScholarshipCache();
  const canonical=await get(5102,'level=UG&limit=20');
  const reordered=await get(5102,'limit=20&level=UG');
  const lowercaseCached=await get(5102,'level=ug&limit=20');
  const lowercaseUncached=await get(5103,'level=ug&limit=20');
  const response=await fetch('http://127.0.0.1:5102/api/scholarships?limit=20');const body=await response.json();
  const id=body.data[0]._id,title=body.data[0].title;
  await Scholarship.updateOne({_id:id},{$set:{title:'Updated synthetic title'}});await clearScholarshipCache();
  const updated=await(await fetch(`http://127.0.0.1:5102/api/scholarships/${id}`)).json();
  await Scholarship.updateOne({_id:id},{$set:{title}});await clearScholarshipCache();
  const admin=await fetch('http://127.0.0.1:5102/api/scholarships/cache/clear',{method:'POST'});
  const evaluation=await(await fetch('http://127.0.0.1:5102/api/scholarships/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  const findings={canonical,reordered,lowercaseCached,lowercaseUncached,caseCollision:lowercaseCached.total!==lowercaseUncached.total,
    cacheInvalidationShowsUpdate:updated.data.title==='Updated synthetic title',unauthenticatedAdminStatus:admin.status,emptyProfileSummary:evaluation.summary};
  fs.writeFileSync(new URL('./results/api-contracts.json',import.meta.url),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings));
}finally{await closeRedisClient();await mongoose.disconnect()}
