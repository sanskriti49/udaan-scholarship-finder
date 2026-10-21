import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.join(dir,'results');
const rows=[];
for(const file of fs.readdirSync(path.join(root,'matrix')).filter(x=>/^(discovery|filtering|eligibility)-(on|off)-\d+\.json$/.test(x))){
  const s=JSON.parse(fs.readFileSync(path.join(root,'matrix',file))),m=s.metrics;
  rows.push({mode:s.mode,cache:s.cache,vus:s.vus,requests:m.measured_requests.values.count,rps:s.rps,p50:m.measured_latency.values.med,p95:m.measured_latency.values['p(95)'],p99:m.measured_latency.values['p(99)'],errorRate:m.measured_error_rate.values.rate,cacheHitRate:m.measured_cache_hit_rate.values.rate,
    serverErrors:m.server_errors.values.count,databaseCalls:JSON.parse(fs.readFileSync(path.join(root,'matrix',file.replace('.json','.diagnostics.json')))).mongooseCalls});
}
rows.sort((a,b)=>a.mode.localeCompare(b.mode)||a.vus-b.vus||a.cache.localeCompare(b.cache));
fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify(rows,null,2));
const f=n=>n.toFixed(2),p=n=>`${(100*n).toFixed(2)}%`;
let md='# Executed Udaan k6 results\n\nAll values below come from retained native Grafana k6 v2.3.0 summaries. Latency is HTTP request duration in milliseconds; RPS counts completions inside the fixed 15-second measurement window after 5 seconds of warm-up. Failed responses remain in percentiles and are separately counted.\n\n';
md+='| API workload | Redis cache | VUs | Measured completions | RPS | p50 ms | p95 ms | p99 ms | Errors | Cache hits |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for(const r of rows)md+=`| ${r.mode} | ${r.cache} | ${r.vus} | ${r.requests} | ${f(r.rps)} | ${f(r.p50)} | ${f(r.p95)} | ${f(r.p99)} | ${p(r.errorRate)} | ${p(r.cacheHitRate)} |\n`;
md+='\n## Matched cache comparisons\n\nThe same unchanged router and controllers, fixture and request sets were used for each pair. Cache-off uses the actual Redis-unavailable fallback; cache-on primes the real Redis cache. Only one target receives load at a time. These are application cache comparisons, not a new code optimization or production measurements.\n\n| Workload | VUs | p95 cache off → on (ms) | Measured p95 reduction | RPS off → on |\n|---|---:|---:|---:|---:|\n';
for(const before of rows.filter(x=>x.cache==='off')){
  const after=rows.find(x=>x.cache==='on'&&x.mode===before.mode&&x.vus===before.vus);
  if(after)md+=`| ${before.mode} | ${before.vus} | ${f(before.p95)} → ${f(after.p95)} | ${p(1-after.p95/before.p95)} | ${f(before.rps)} → ${f(after.rps)} |\n`;
}
md+='\n## Interpretation and limits\n\nThe fixture has 300 synthetic scholarships, a varied five-query filter set and twelve complete/incomplete profiles. Eligibility returns complete explanations for all candidates, so its larger responses require substantial serialization and client JSON checking even when cached. Request-body and eligibility classification assertions run on every response. MongoDB calls per run, cache-hit rates, versions, resource limits and the exact scripts are retained.\n\nThe loopback harness mounts the real production scholarship router, cache middleware, optional authentication, controllers and Mongoose models, with no mocked request-path database/cache/eligibility responses. It excludes the global per-IP quota, request logging and unrelated background schedulers. It is not a full production deployment benchmark, and the guest evaluation path does not measure authenticated profile auto-save. Warm Redis results do not establish cold-cache/stampede, expiry, Internet, multi-instance or outage capacity. No benchmark measured live portal fetches, SMTP delivery or arbitrary OCR accuracy.\n';
fs.writeFileSync(path.join(root,'RESULTS.md'),md);console.log(`Summarized ${rows.length} full k6 runs`);
