# Scholarship discovery relevance

## Confirmed problems

- The catalogue used MongoDB text scores and deadlines without evaluating the student's recorded eligibility. A strong title match could outrank a known domicile, education, income or category contradiction.
- Live cycle status was recomputed and closed results removed **after** database pagination/counting. This could leave short pages and inaccurate totals.
- The fallback eligibility rules omitted recorded streams, alternative education levels, income minima, CGPA maxima and required disability status. Category and education spellings could produce false contradictions.
- The preview desk independently sorted results by deadline. The generic card helper inferred residence requirements from catalogue jurisdiction, and an unknown window with a date could show a countdown.

## Updated flow

1. Reuse the existing published-catalogue MongoDB query, canonical filters and text index. If the text-index query fails, retain the existing escaped-regex fallback, with description matching and deterministic local lexical scores.
2. Compute live cycle status for every filtered candidate, then apply the requested status filter. Unknown windows remain browseable and are never described as verified open.
3. Run the existing deterministic eligibility evaluator. Its **root** status decides the compatibility tier: potentially eligible, needs verification, known mismatch. Preserve recursive AND/OR/NOT/conditional semantics and legacy flat rules. Unknown information never becomes a rejection.
4. With a substantive profile, sort compatibility tiers first. Within each tier, Best match uses query relevance, matched education/course, domicile, category, verified cycle status/deadline, then title and ID. Explicit grant/newest/trust/deadline sorts operate within compatibility tiers. Anonymous discovery retains query relevance without profile tiers. No percentage eligibility score is used.
5. Count and paginate this complete ranked set. Return the existing envelope plus additive `personalized` and per-item `discovery` explanations. The preview desk preserves this order.

Explanations use the evaluator's relevant checks, not every leaf: a failed alternative in a passing OR is never described as a disqualifier. Reasons are bounded, do not return the student's actual income/category values, and explicitly distinguish recorded-rule compatibility from official confirmation.

Explicit rules and trees remain authoritative. Only the metadata fallback gains the previously omitted supported conditions. Recorded age/disability-percentage conditions that the evaluator cannot compare require manual review. National catalogue scope, display category and a regional title do not create or remove policy restrictions. Spelling aliases do not collapse OBC-NCL into OBC.

## API and privacy

- `GET /api/scholarships` remains public, cacheable general browsing.
- `POST /api/scholarships/discover` accepts the **same query filters**. `{}` reads an authenticated student's saved profile, while `{ "profile": { ... } }` uses a strictly validated transient profile (including for guests). An explicit empty profile requests general browsing. Discovery never saves a profile.
- Personalized discovery bypasses Redis and returns `Cache-Control: private, no-store`. No profile values or fingerprints enter URL/cache keys. Public cache keys use a new v3 namespace; eligibility-evaluation fingerprints also change version to invalidate old semantics.
- Signed-in students can turn off “Use my saved eligibility profile” to browse the general catalogue. Existing eligibility-checker/profile editing remains the way to supply saved answers.

## Offline before/after examples

Run `node src/scripts/demoDiscovery.js` from `backend/`. These are synthetic candidates with illustrative text scores, **not measured MongoDB search results or real scholarship advice**. Student: UP, engineering UG, OBC, family income ₹2 lakh, marks 80%.

For “Engineering Merit”, the top five change as follows (all titles share the prefix “Engineering Merit”):

| Position | Previous text-score ordering | Updated ordering |
| --- | --- | --- |
| 1 | Maharashtra | UP — potentially eligible |
| 2 | School | National — potentially eligible |
| 3 | National SC | Unrecorded — needs verification |
| 4 | Unrecorded | Maharashtra — known domicile mismatch |
| 5 | UP | School — known education mismatch |

The National SC mismatch remains available at position six. For “National”, the compatible income/marks scheme moves above the SC-only scheme. For “Maharashtra”, the sole exact result stays visible with its domicile mismatch explained. Unknown rules remain unknown even when the title matches perfectly.

## Limits and future work

- This is an in-process deterministic ranker for the current small catalogue: it fetches and evaluates the complete filtered candidate set before pagination. Large catalogues should be profiled before introducing batching/materialization; truncating candidates before eligibility ranking would break correctness.
- Eligibility is only as complete as recorded policies and explicitly supplied answers. Source/manual-review safeguards remain necessary; category names and marketing copy cannot replace rules.
- Cycle freshness helps break ties; it does not refresh portal data or prove an application is currently accepted. Public responses retain the existing five-minute Redis TTL.
- The regex fallback is resilient but does not reproduce MongoDB stemming, phrase syntax or text scores exactly.
- Offline controller tests mock MongoDB and Redis-facing operations. Browser fixtures exercise the actual UI and shared ranker, without proving live database filtering, Redis operation, portal availability or production throughput.
- Sensible next steps are a reviewed real-catalogue relevance set and a live database smoke check, followed by targeted metadata corrections where evidence supports them.

Discovery now caps the number of matching MongoDB candidates before live-status filtering at `DISCOVERY_MAX_CANDIDATES` (default 5,000; accepted range 1–50,000). If there are more, the API returns HTTP 503 with `DISCOVERY_CANDIDATE_LIMIT` and asks the student to narrow the query; it never returns a partially ranked page or incorrect counts. The limit bounds the number of documents, not their size or concurrent requests. Status-only filters cannot reduce this initial candidate count. Both the `/api/scholarships` and legacy `/scholarships` paths use the same API rate-limit budget.

To run the isolated real MongoDB smoke test in PowerShell from `backend/`, start a local MongoDB instance on `127.0.0.1:27017`, then run:

```powershell
$env:DISCOVERY_LOCAL_SMOKE = '1'
node --test test/integration/discovery-local.test.js
```

To additionally verify real caching and the shared rate limiter, start Redis on `127.0.0.1:6379` and set `$env:DISCOVERY_SMOKE_REDIS = '1'` before the same command. The test forces loopback addresses, creates and drops a uniquely named temporary database, and removes only its own namespaced Redis keys; it does not use the configured remote MongoDB or Redis. Unset both variables afterward with `Remove-Item Env:DISCOVERY_LOCAL_SMOKE, Env:DISCOVERY_SMOKE_REDIS -ErrorAction SilentlyContinue`.

## Validation

Focused backend tests: `node --test test/unit/discovery-*.test.js test/unit/catalogue-cache.test.js test/unit/rule-tree.test.js test/unit/eligibility-policy-origin.test.js`.

Frontend: `npm run lint`, `npm test`, `npm run build`, and `npx playwright test discovery-ranking.spec.mjs scholarship-modal.spec.mjs`.

Results: all 522 backend tests, 156 frontend unit tests, 32 focused eligibility/discovery/cache checks, and 12 browser checks passed. Frontend lint and production build passed. The backend HTTP fixtures and browser preview required execution outside the restricted sandbox because sandbox loopback connections returned `EACCES`; no live scholarship services were required. One Navigator test was updated to recognize the newly supported “Other Backward Classes” spelling while retaining an explicit unfamiliar-category unknown check. Navigator's architecture was unchanged.
