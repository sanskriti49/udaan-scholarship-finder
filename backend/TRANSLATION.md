# Public scholarship title translation

`POST /api/scholarships/:id/translate` accepts only `{ "targetLanguage": "en", "sourceLanguage": "auto" }`. The source defaults to `auto`. The ID may be an ObjectId or a slug. The server reads **only the title of a published scholarship**. Client-supplied text, profiles and document data are rejected.

Translation uses the exact source title. There are no scheme-name dictionaries, word substitutions, Unicode-to-language guesses, added benefit descriptions or synthetic English titles. Provider-supported source languages are detected automatically, including languages absent from the UI's Indian-language destination menu. A manual source override helps with short and Romanized titles; machine translation may preserve proper names or misidentify them. The original listing and source evidence are never overwritten.

## Provider setup

For the supported production API, enable Google Cloud Translation Basic and set `GOOGLE_TRANSLATE_API_KEY` **on the backend only**. The service automatically selects `google-cloud`; optionally set `TRANSLATION_PROVIDER=google-cloud` explicitly. Never use a `VITE_` variable for this key. Google Cloud requires its own project, enabled API, billing/quota configuration and access restrictions. See [Google's translation API reference](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate).

Without a key, `google-public` uses the existing unauthenticated Google Translate endpoint for a best-effort demo. This endpoint is undocumented and has no availability/quota contract: it may throttle, change or stop working. It should not be treated as a production SLA. Set `TRANSLATION_PROVIDER=disabled` to disable upstream translation. A configured Cloud provider never silently downgrades to the public endpoint after an error.

Only public titles are sent to Google, on explicit use of the control. No certificate bytes, student profiles, eligibility inputs or source quotations are sent. The error state offers a retry and a separately opened Google Translate page, with the original title intact.

## Reliability and limits

- At most two attempts for transient network, timeout, 429 or 5xx failures; 3.5 seconds per attempt, including response-body reading. Invalid input and unsupported language errors are not retried.
- The route applies the existing global API limiter plus 30 translation requests per IP per minute. Titles are limited to 1,500 characters. At most 40 distinct upstream requests run concurrently per process.
- Successful responses share a 500-entry, 24-hour LRU cache per backend process, keyed by provider, exact source title and both language settings. Failures never become cached source-text fallbacks. Multiple server instances have independent caches.
- The frontend shares successful responses between cards and dialogs in a 100-entry, 30-minute in-memory cache keyed by ID, exact title and languages. Concurrent consumers share a request; cancellation of one consumer does not cancel another. Closing a control or changing languages discards stale responses. The frontend request deadline is 12 seconds.
- Responses distinguish `translated`, `same-language`, and `unchanged`. Unknown detection is reported as unknown; it is never guessed from a script or scheme name. Source changes detected during an open session require refreshing the listing.

Run `node --test test/unit/translation.test.js` in `backend/`, `npm test` in `frontend/`, and `npx playwright test scholarship-translation.spec.mjs` in `frontend/`. Tests use controlled provider responses; a live upstream check is separate from these regressions.
