# Executed Udaan k6 results

All values below come from retained native Grafana k6 v2.3.0 summaries. Latency is HTTP request duration in milliseconds; RPS counts completions inside the fixed 15-second measurement window after 5 seconds of warm-up. Failed responses remain in percentiles and are separately counted.

| API workload | Redis cache | VUs | Measured completions | RPS | p50 ms | p95 ms | p99 ms | Errors | Cache hits |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| discovery | off | 10 | 1147 | 76.47 | 124.85 | 152.26 | 162.98 | 0.00% | 0.00% |
| discovery | on | 10 | 5928 | 395.20 | 17.66 | 35.00 | 44.65 | 0.00% | 100.00% |
| discovery | off | 50 | 1261 | 84.07 | 587.15 | 664.03 | 907.28 | 0.00% | 0.00% |
| discovery | on | 50 | 6530 | 435.33 | 108.48 | 145.94 | 158.32 | 0.00% | 100.00% |
| discovery | off | 100 | 1227 | 81.80 | 1209.47 | 1460.56 | 1524.49 | 0.00% | 0.00% |
| discovery | on | 100 | 6218 | 414.53 | 227.94 | 303.77 | 457.35 | 0.00% | 100.00% |
| eligibility | off | 10 | 353 | 23.53 | 400.25 | 465.73 | 483.62 | 0.00% | 0.00% |
| eligibility | on | 10 | 643 | 42.87 | 208.68 | 262.33 | 339.82 | 0.00% | 100.00% |
| eligibility | off | 50 | 361 | 24.07 | 2030.75 | 2247.67 | 2297.06 | 0.00% | 0.00% |
| eligibility | on | 50 | 624 | 41.60 | 1180.89 | 1248.79 | 1279.14 | 0.00% | 100.00% |
| eligibility | off | 100 | 369 | 24.60 | 4061.29 | 4251.25 | 4380.74 | 0.00% | 0.00% |
| eligibility | on | 100 | 597 | 39.80 | 2501.70 | 2675.61 | 2705.46 | 0.00% | 100.00% |
| filtering | off | 10 | 1177 | 78.47 | 120.82 | 153.04 | 186.23 | 0.00% | 0.00% |
| filtering | on | 10 | 6172 | 411.47 | 17.03 | 31.94 | 43.34 | 0.00% | 100.00% |
| filtering | off | 50 | 1222 | 81.47 | 608.57 | 689.58 | 853.64 | 0.00% | 0.00% |
| filtering | on | 50 | 7520 | 501.33 | 88.27 | 152.20 | 206.06 | 0.00% | 100.00% |
| filtering | off | 100 | 1702 | 113.47 | 722.54 | 1364.84 | 1414.59 | 0.00% | 0.00% |
| filtering | on | 100 | 6390 | 426.00 | 226.95 | 282.56 | 313.49 | 0.00% | 100.00% |

## Matched cache comparisons

The same unchanged router and controllers, fixture and request sets were used for each pair. Cache-off uses the actual Redis-unavailable fallback; cache-on primes the real Redis cache. Only one target receives load at a time. These are application cache comparisons, not a new code optimization or production measurements.

| Workload | VUs | p95 cache off → on (ms) | Measured p95 reduction | RPS off → on |
|---|---:|---:|---:|---:|
| discovery | 10 | 152.26 → 35.00 | 77.01% | 76.47 → 395.20 |
| discovery | 50 | 664.03 → 145.94 | 78.02% | 84.07 → 435.33 |
| discovery | 100 | 1460.56 → 303.77 | 79.20% | 81.80 → 414.53 |
| eligibility | 10 | 465.73 → 262.33 | 43.67% | 23.53 → 42.87 |
| eligibility | 50 | 2247.67 → 1248.79 | 44.44% | 24.07 → 41.60 |
| eligibility | 100 | 4251.25 → 2675.61 | 37.06% | 24.60 → 39.80 |
| filtering | 10 | 153.04 → 31.94 | 79.13% | 78.47 → 411.47 |
| filtering | 50 | 689.58 → 152.20 | 77.93% | 81.47 → 501.33 |
| filtering | 100 | 1364.84 → 282.56 | 79.30% | 113.47 → 426.00 |

## Interpretation and limits

The fixture has 300 synthetic scholarships, a varied five-query filter set and twelve complete/incomplete profiles. Eligibility returns complete explanations for all candidates, so its larger responses require substantial serialization and client JSON checking even when cached. Request-body and eligibility classification assertions run on every response. MongoDB calls per run, cache-hit rates, versions, resource limits and the exact scripts are retained.

The loopback harness mounts the real production scholarship router, cache middleware, optional authentication, controllers and Mongoose models, with no mocked request-path database/cache/eligibility responses. It excludes the global per-IP quota, request logging and unrelated background schedulers. It is not a full production deployment benchmark, and the guest evaluation path does not measure authenticated profile auto-save. Warm Redis results do not establish cold-cache/stampede, expiry, Internet, multi-instance or outage capacity. No benchmark measured live portal fetches, SMTP delivery or arbitrary OCR accuracy.
