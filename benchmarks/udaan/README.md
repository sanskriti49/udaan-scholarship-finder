# Reproducible Udaan audit

All commands run from `C:\Users\sansk\Downloads\udaan-scholarship-finder`. The test configuration replaces dotenv loading and pins loopback MongoDB/Redis, synthetic credentials and disabled email credentials. It never uses the application's cloud database or SMTP credentials.

## Local infrastructure and API fixture

```powershell
npm ci --prefix backend
npm ci --prefix frontend
docker compose -f benchmarks/udaan/compose.yaml up -d
docker exec udaan-audit-mongo mongosh --quiet --eval 'db.runCommand({ping:1})'
node benchmarks/udaan/seed.mjs
# Terminal 1: Redis enabled
node benchmarks/udaan/api.mjs
```

In another terminal:

```powershell
$env:BENCH_CACHE='off'
node benchmarks/udaan/api.mjs
```

The cache-enabled API listens on `127.0.0.1:5102`; the fallback API on `127.0.0.1:5103`. The second API points its cache client at unused loopback port 6395 and exercises the actual fail-open code. MongoDB is on port 27028 with only `udaan_audit_bench` (300 varied synthetic scholarships) and `udaan_audit_tests` (targeted integration fixtures). Redis is dedicated on port 6385. Limits: MongoDB 2 CPUs/2 GiB; Redis 1 CPU/256 MiB; each API has a 20-connection MongoDB pool.

The harness mounts the unchanged production scholarship router and executes actual Express, cache middleware, optional auth, controllers, MongoDB queries and rule evaluation. The production global 300 requests/15 minutes per-IP limiter, logging and background schedulers are intentionally outside this endpoint capacity test. No production source files were refactored or modified.

## Actual k6 matrix

Use native Grafana k6 v2.3.0. This run reused the official executable installed during the TaskGenie benchmark; it did not modify TaskGenie.

```powershell
$env:K6_PATH='C:\path\to\k6.exe'
node benchmarks/udaan/run.mjs
node benchmarks/udaan/summarize.mjs
```

The default matrix is discovery/filtering/eligibility × 10/50/100 constant VUs × Redis off/on, for 18 independent serial runs. Every run has 5 seconds warm-up and 15 seconds measurement, no think time, and up to 30 seconds drain. RPS is completions inside the 15-second window divided by 15. k6 response time percentiles exclude connection/block time. JSON shape, publication state, active status and eligibility category consistency are checked. All error responses remain included in latency metrics. Cached request sets are primed before the run; measured `X-Cache` headers verify hits. Each run saves raw summary, console output and MongoDB call counts.

Filter workload: five popular state/UG/amount combinations. Evaluation: twelve varied profiles, including omitted marks, to exercise eligible/ineligible/missing-information results. API fixture scholarships are clearly synthetic, not claims about actual scholarship availability or official eligibility.

Optional overrides: `LEVELS`, `MODES`, `WARMUP`, `DURATION`, `RESULT_GROUP`. The initial `smoke/` group used 1 VU, 1 second warm-up and 2 seconds measurement to check the harness and does not supply resume metrics. Run only one matrix at a time: the runner clears this dedicated Redis database between paired cache-on runs.

## Executed functional checks

Before the throughput matrix, run the existing tests and the new actual infrastructure tests:

```powershell
$env:DOTENV_CONFIG_PATH='NUL'
$env:REDIS_URL='redis://127.0.0.1:6385'
$env:MONGO_URI='mongodb://127.0.0.1:27028/udaan_audit_tests'
npm test --prefix backend
npm test --prefix frontend
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:pipeline:browser --prefix backend
npm run build --prefix frontend
npm run test:scanner:ui --prefix frontend
node --test benchmarks/udaan/infrastructure.test.mjs
```

The infrastructure test explicitly drops **only `udaan_audit_tests`**, builds actual MongoDB indexes, and uses the dedicated Redis queue. Do not run it concurrently with the k6 matrix or other jobs sharing this Redis. Existing pipeline tests use recorded official captures and controlled network transports; the browser rendering suite uses a real local HTTP server/Chrome; scanner tests execute real self-hosted PDF.js/Tesseract WASM on synthetic PDF/PNG/JPEG inputs. Synthetic documents are test inputs, not resume PDFs.

The five added integration tests cover actual MongoStore ingestion/change history/fetch failure, immutable cited eligibility versions, Redis/BullMQ enqueue deduplication and retry/worker restart, MongoDB delivery receipts with simulated email failure, and the real pending-event relay/worker delivering one source-linked alert to an opted-in affected saved profile while skipping opt-out/replays.

After the matrix, `node benchmarks/udaan/contracts.mjs` records API cache-invalidation/auth/missing-data checks and a query-case cache collision finding. It temporarily edits and restores one synthetic scholarship title, so it must not overlap a throughput run.

## Resume scope

Only the Udaan bullet block in the already-open LaTeX source is replaced. A before-source snapshot and exact prefix/suffix comparison preserve TaskGenie and all other content. No resume PDF is generated. The pasted current resume differs from the open on-disk document outside Udaan; those areas are intentionally left unchanged.
