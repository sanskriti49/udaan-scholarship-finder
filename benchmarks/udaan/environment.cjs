// Local, synthetic audit only. Application .env/cloud credentials are never used.
const {createRequire}=require('node:module');
const path=require('node:path');
const backendRequire=createRequire(path.resolve(__dirname,'../../backend/package.json'));
backendRequire('dotenv').config=()=>({parsed:{}});
const database=process.env.BENCH_DATABASE||'udaan_audit_bench';
if(!['udaan_audit_bench','udaan_audit_tests'].includes(database))throw Error('Isolated audit database required');
Object.assign(process.env,{
  NODE_ENV:'test',MONGO_URI:`mongodb://127.0.0.1:27028/${database}`,
  REDIS_URL:`redis://127.0.0.1:${process.env.BENCH_CACHE==='off'?'6395':'6385'}`,
  JWT_SECRET:'udaan-synthetic-audit-only',ENABLE_CRAWLER:'false',PIPELINE_BOOTSTRAP:'off',ENABLE_BULLMQ_WORKER:'false',
  EMAIL_USER:'',EMAIL_PASS:'',SMTP_USER:'',SMTP_PASS:'',PIPELINE_LOG_LEVEL:'silent',
});
module.exports={backendRequire};
