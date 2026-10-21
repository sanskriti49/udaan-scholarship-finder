import './environment.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
const {default:Redis}=await import('../../backend/node_modules/ioredis/built/index.js');
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
const fixture=JSON.parse(fs.readFileSync(path.join(dir,'fixture.json')));
const k6=process.env.K6_PATH||'k6';
const redis=new Redis('redis://127.0.0.1:6385');
const levels=(process.env.LEVELS||'10,50,100').split(',').map(Number);
const modes=(process.env.MODES||'discovery,filtering,eligibility').split(',');
const group=process.env.RESULT_GROUP||'matrix',out=path.join(dir,'results',group);fs.mkdirSync(out,{recursive:true});
async function health(port){return await(await fetch(`http://127.0.0.1:${port}/health`)).json()}
async function prime(mode){
  const routes=mode==='discovery'?['limit=20&sort=deadline']:mode==='filtering'?fixture.filters:fixture.profiles;
  for(const q of routes){
    const url='http://127.0.0.1:5102/api/scholarships'+(mode==='eligibility'?'/evaluate':`?${q}`);
    const r=await fetch(url,mode==='eligibility'?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)}:{});
    if(r.status!==200)throw Error(`Cache priming failed: ${r.status} ${await r.text()}`);await r.text();
  }
}
try{
  const h=await Promise.all([health(5102),health(5103)]);
  if(!h.every(x=>x.ready)||!h[0].cache||h[1].cache)throw Error('Expected live MongoDB, cache-on and real Redis-off fallback APIs');
  const host={startedAt:new Date().toISOString(),cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,ramBytes:os.totalmem(),platform:os.platform(),node:process.version,
    k6:execFileSync(k6,['version'],{encoding:'utf8'}).trim(),revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    conditions:{mongoCpu:2,mongoRam:'2GiB',redisCpu:1,redisRam:'256MiB',mongoPoolMaxPerApi:20,apiProcesses:2,activeLoadTargets:1,perIpQuotaExcluded:true,backgroundSchedulersExcluded:true,guestEligibility:true,
      warmupSeconds:Number(process.env.WARMUP||5),measurementSeconds:Number(process.env.DURATION||15),thinkTime:0,closedLoop:true,fixtureScholarships:300}};
  fs.writeFileSync(path.join(out,'conditions.json'),JSON.stringify(host,null,2));
  for(const mode of modes)for(const vus of levels)for(const cache of ['off','on']){
    if(cache==='on'){await redis.flushdb();await prime(mode)}
    const port=cache==='off'?5103:5102,before=await health(port),name=`${mode}-${cache}-${vus}`;
    const log=fs.openSync(path.join(out,`${name}.console.txt`),'w');
    const start=new Date().toISOString();
    const child=spawn(k6,['run','--quiet','--no-usage-report','load.js'],{cwd:dir,env:{...process.env,MODE:mode,VUS:String(vus),CACHE:cache,SUMMARY:`results/${group}/${name}.json`},stdio:['ignore',log,log]});
    const exit=await new Promise(resolve=>child.once('exit',resolve));fs.closeSync(log);
    const after=await health(port);const calls={};for(const [k,n]of Object.entries(after.databaseCalls))calls[k]=n-(before.databaseCalls[k]||0);
    fs.writeFileSync(path.join(out,`${name}.diagnostics.json`),JSON.stringify({start,end:new Date().toISOString(),k6ExitCode:exit,mongooseCalls:calls,cacheReady:after.cache},null,2));
    const s=JSON.parse(fs.readFileSync(path.join(out,`${name}.json`)));
    console.log(JSON.stringify({name,exit,rps:s.rps,p95:s.metrics.measured_latency.values['p(95)'],errors:s.metrics.measured_error_rate.values.rate,cacheHits:s.metrics.measured_cache_hit_rate.values.rate}));
    if(exit!==0)process.exitCode=1;
  }
}finally{await redis.quit()}
