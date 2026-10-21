import http from 'k6/http';
import {check} from 'k6';
import exec from 'k6/execution';
import {Counter,Rate,Trend} from 'k6/metrics';
const fixture=JSON.parse(open('./fixture.json'));
const mode=__ENV.MODE||'discovery',cache=__ENV.CACHE||'on',vus=Number(__ENV.VUS||10);
const base=cache==='off'?'http://127.0.0.1:5103':'http://127.0.0.1:5102';
const warmup=Number(__ENV.WARMUP||5),duration=Number(__ENV.DURATION||15);
const latency=new Trend('measured_latency',true),count=new Counter('measured_requests'),errors=new Rate('measured_error_rate'),hits=new Rate('measured_cache_hit_rate');
const serverErrors=new Counter('server_errors'),badBodies=new Counter('invalid_bodies');
export const options={scenarios:{load:{executor:'constant-vus',vus,duration:`${warmup+duration}s`,gracefulStop:'30s'}},summaryTrendStats:['avg','med','p(95)','p(99)','max'],thresholds:{measured_error_rate:['rate==0'],invalid_bodies:['count==0']}};
export default function(){
  const i=exec.scenario.iterationInTest;
  let r,valid=false;
  if(mode==='eligibility')r=http.post(`${base}/api/scholarships/evaluate`,JSON.stringify(fixture.profiles[i%fixture.profiles.length]),{headers:{'Content-Type':'application/json'}});
  else r=http.get(`${base}/api/scholarships?${mode==='filtering'?fixture.filters[i%fixture.filters.length]:'limit=20&sort=deadline'}`);
  let body;try{body=r.json()}catch(_){body=null}
  if(body?.success&&r.status===200){
    if(mode==='eligibility'){
      const s=body.summary,d=body.data;
      valid=s.totalEvaluated>0&&s.eligibleCount+s.ineligibleCount+s.missingInfoCount===s.totalEvaluated&&d.matched.length===s.eligibleCount&&d.ineligible.length===s.ineligibleCount&&d.missingProfileData.length===s.missingInfoCount&&d.matched.every(x=>x.evaluation.isEligible&&x.evaluation.failedRules.length===0&&x.evaluation.unknownRules.length===0)&&d.missingProfileData.every(x=>x.evaluation.unknownRules.length>0);
    }else valid=Array.isArray(body.data)&&body.data.length>0&&body.data.length<=20&&body.total>=body.data.length&&body.data.every(x=>x.publication.state==='published'&&x.status!=='closed');
  }
  check(r,{'valid real API response':()=>valid});
  const elapsed=exec.instance.currentTestRunDuration;
  if(elapsed>=warmup*1000&&elapsed<(warmup+duration)*1000){count.add(1);latency.add(r.timings.duration);errors.add(!valid);hits.add(r.headers['X-Cache']==='HIT');serverErrors.add(r.status>=500?1:0);badBodies.add(valid?0:1)}
  if(!valid&&__ITER===0)console.error(`${r.status}: ${r.body.slice(0,300)}`);
}
export function handleSummary(data){return {[__ENV.SUMMARY||'results/run.json']:JSON.stringify({mode,cache,vus,warmupSeconds:warmup,measuredSeconds:duration,rps:data.metrics.measured_requests.values.count/duration,metrics:data.metrics},null,2)}}
