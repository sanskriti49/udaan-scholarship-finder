# Live scholarship ingestion

Eleven enabled source configurations fetch current public data. No sample data is
used as a fallback. NSP includes its listed AICTE and UGC schemes; the separate
AICTE adapter reads actual council scholarship/fellowship cards.

| Source | Public content | Fetch method |
|---|---|---|
| NSP | Scheme list, dated application windows, linked PDFs | HTTP with rendering fallback |
| UP | Four scheme sections and stated timetable cycle | Chromium |
| MahaDBT | Department tabs and scheme detail panels | HTTP with rendering fallback |
| Karnataka SSP | Department/scheme IDs and original Kannada criteria | HTTP with browser fallback for transport failures |
| West Bengal SVMCM | Official Government myScheme JSON catalogue | HTTP |
| Bihar PMS | BC/EBC portal and dated application windows | HTTP |
| DST INSPIRE | SHE section of the official programme page | Chromium |
| AICTE | Scholarship/fellowship cards and linked guidelines | HTTP |
| ONGC | Three category-specific scheme panels | Chromium |
| Reliance | UG and PG eligibility and award pages | Chromium |
| LIC | Latest Golden Jubilee notice and scheme PDF | HTTP |

West Bengal's administering portal was unreachable in the live check. The source
is explicitly labelled as Government myScheme, with references back to the state
portal. Current application dates remain unknown. Karnataka's original language
is preserved; thresholds are not guessed from Kannada text. Coverage is limited
to these verified pages.

A timetable issue date is not an opening date. LIC's calendar-year notice does not
become an invented academic year. Reliance's maximum awards cover degree duration,
not one year. Bihar's dated closing window takes precedence over an open banner.
Complex course, merit, residence and other conditions stay in the description and
force provisional eligibility matching. Passing a few modelled rules cannot turn
such a scheme into a confirmed match. Unknown deadlines and amounts remain null.

## Browser setup and deployment

Install backend packages and run `npm run pipeline:browser:install` locally.
On Linux use `npx playwright install --with-deps chromium` for system dependencies.
`PLAYWRIGHT_CHANNEL=chrome` or `msedge` selects an installed browser instead.

On a Render native Node service the npm postinstall hook downloads the matching
Chromium headless shell into the installed package (`PLAYWRIGHT_BROWSERS_PATH=0`)
and verifies launch. The runtime uses the same path. A failed download or missing
Linux library produces a build failure instead of replacing a working service.
The service build must install backend dependencies, for example `npm ci` with
root directory `backend`; start with `npm start`. GitHub auto-deployment then
runs these steps on a push. `/api/health` exposes the deployed Render commit,
source count and browser availability. Admin crawler status separately reports
source runs; a working browser alone does not establish that a crawl succeeded.

Chromium uses normal certificate validation. Document redirects are paused before
the request to enforce allowed hosts and robots rules. Other traffic is restricted
to allowed hosts and GET. Embedded external media is blocked without failing the
main page. Time, document-size and request-count bounds apply. No portal logins,
CAPTCHA bypasses or student-document uploads are involved.

## Verification

UP, Karnataka and AICTE try their administering portal first. If it fails or its
layout cannot be verified, they fetch explicitly verified government myScheme
records: five UP programmes, two Karnataka programmes, and AICTE's PG scholarship.
This is limited alternative coverage, not the entire primary catalogue. NSP
separately covers AICTE Pragati, Saksham and Swanath. No current dates are inferred
from myScheme's general programme descriptions or old guideline filenames.

Karnataka can try Chromium after a Node transport failure or timeout, retaining normal TLS
validation. HTTP refusals and robots restrictions are not bypassed. An empty
alternative catalogue is a rejected crawl and leaves stored data intact. A
limited fallback never marks absent primary records as missing.

`/api/health/ingestion` reports `partial`, `fallbackUsed: true`, the primary error,
published counts and limited coverage when an alternative supplied records.
Each record names the government fallback and retains its exact source citations,
application links, eligibility text and application instructions. A successful
primary crawl clears the fallback flag. Other published records are retained.

```sh
npm test
npm run test:pipeline:browser
npm run pipeline:check-live -- --follow-ups=60 --output=test-results/live-source-check.json
```

The live check uses in-memory storage and sends no notifications. Its report
states which listing and guideline requests succeeded. Excerpts under
`test/fixtures/official-portals` preserve real public-page HTML/JSON for parser
regressions; they are not a production feed. HTML snapshots survive HTTP 304;
rendered pages are fetched again because shell validators do not cover data
populated by JavaScript. Offline replay cannot launch a live browser.

## Database lifecycle

Startup applies migrations and refreshes existing catalogues from live sources,
under a database-scoped Redis lock. The scheduler repeats crawls every 24 hours
and refreshes statuses hourly while the host runs. Environments sharing Redis
use separate crawler locks and response cache namespaces for separate databases. `PIPELINE_BOOTSTRAP=off` or
`ENABLE_CRAWLER=false` disables bootstrap. Historical `replay` mode does not
refresh an existing catalogue.

Eligibility-result caches share the catalogue namespace with list/detail caches,
so a completed crawl invalidates matching results as well. Environments using
the same Redis account cannot return another database's eligibility results.

Migration 003 no longer seeds canned notices. Migrations 004 and 005 quarantine
records citing normalized JSON samples, recognizing both old `/api/schemes`
snapshot URLs and later homepage forms. Original data is archived under the same
IDs; unverified cycles are excluded. Live HTTP JSON snapshots are unaffected.
Production replay excludes all eight unverified JSON samples. Fresh ingestion
never inherits fabricated sample amounts, eligibility rules or dates.
