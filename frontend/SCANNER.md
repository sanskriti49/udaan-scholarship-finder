# Document review scanner

## Purpose and access

`/scanner` is a public application page; `/scanner.html` is a legacy route alias.
The three stages are add a document, review editable details, and act on the
observations. It helps students find unreadable fields and date/format issues,
keep an explicitly downloaded review, and optionally reuse a reviewed field in
the eligibility form. It does not certify authenticity, legal validity or approval.

## Processing and privacy

PDF.js extracts searchable text first. Sparse/scanned pages and PNG/JPG files
use English Tesseract OCR locally. Workers, WASM, fonts and OCR language assets
come from this app. Limits: 10 MB, 5 PDF pages, 20 MP source images, 4 MP rendering,
100,000 characters per page and two minutes per scan. Handwriting, other languages,
complex layouts and mixed text/image PDFs may need manual entry.

The server only supplies public scholarship metadata, fetched without credentials.
Files, names, OCR text and editable fields are never API arguments. No document
upload endpoint is used. Tesseract persistence is disabled. Google OAuth is now
mounted only on sign-in/sign-up pages, not on the scanner. Application fonts are self-hosted with their licenses, preserving the existing typefaces without remote font requests. Reset, unmount and pagehide clear document state. Type changes clear the active document; names explicitly kept for comparison survive type changes within this mounted scanner. Worker cleanup
and memory reclamation are best effort, not secure erasure.

## Decisions and provenance

General observations check format, conflicting values, future issue dates and
explicit expiry dates. Optional fields are not universal document requirements.
Catalogue amounts, application years, category names and document lists do not
establish legal certificate requirements. April 1 is used only for advisory FY freshness, never as a universal legal expiry rule. No universal notary/NCL or approval/rejection assertions are made. Production `verifiedRules` remains
empty until explicit, reviewed source excerpts and scoped requirements exist.
Only valid sourced rules can produce scholarship-specific results.

## Private pre-submission auditor

`documentAudit.js` contains pure date and name comparisons; `identitySession.js`
whitelists the minimal name-set fields. `PreSubmissionAudit.jsx` presents the results
inside the existing editable review and next-steps stages. No backend, cloud OCR,
translation service, account profile lookup or persistence was added.

The illustrated application desk groups the local reference name and kept paper
cards. “Use for application” copies a reviewed name into that local reference
only; it never edits the account. A top-level “Start document review” shortcut
jumps directly to the file/manual-entry workspace. The pre-submission review
uses a chronological date trail, word-level name highlights and action-first
observations. Explanations and original source excerpts remain available in
keyboard-operable native disclosures. Date observations and name comparisons
are counts, not a readiness score or verification badge. All highlighting is
presentation-only; the existing audit decisions remain unchanged.

- The FY boundary and general date checks use the calendar in `Asia/Kolkata`,
  including the March 31 / April 1 instant. Income, EWS and explicitly detected
  OBC-NCL wording receive a prior-FY review prompt. Old SC/ST certificates and
  plain OBC status are not automatically treated as annual NCL evidence.
- Income assessment year, explicit certificate-validity FY, issue date and expiry
  are separate fields. A previous income year alone is not an expiry finding.
  The [official DoPT EWS FAQ](https://doptcirculars.nic.in/OM/ViewOMNew.aspx?id=471)
  illustrates this distinction in recruitment; it is not imported as a universal
  scholarship requirement.
- Explicit expiry, conflicting/future dates and a narrowly recognized
  issue-relative validity clause produce observations. Relative durations use
  calendar arithmetic with leap/month-end clamping and report an anniversary,
  not a substituted legal expiry. Unrecognized clauses require manual reading.
- Names come only from explicit holder/student labels or manual entry. Parent
  names and unlabeled OCR lines are not guessed. Source excerpts and ambiguity
  survive editing. EWS and identity/marksheet/bank document modes are available.
- Unicode normalization preserves Indic vowel marks. Bounded edit distance,
  token alignment, initial expansion and a conservative Latin vowel-pattern
  heuristic distinguish spelling, spacing/order, missing middle parts, initials,
  partial overlap and substantial differences. Different/unsupported scripts,
  bad OCR and initials alone remain uncertain. No fuzzy result verifies identity
  or predicts portal acceptance; there is no confidence percentage.
- The application name is declared locally. Keeping a reviewed name is explicit,
  with at most six entries containing only a generated local ID, name, document
  type and read/edit method. Files, filenames and full OCR/evidence text are not
  copied into this comparison set. Current-document evidence remains transient.
  “Review another document” keeps the set; individual forget controls, “Reset
  check”, reload, leaving the scanner and pagehide clear it as indicated.
- Names, FY observations and validity wording never enter the eligibility
  bridge. Existing explicit income/category/study handoff stays separate.
  The user-requested text download can save the current reviewed fields and
  advisory findings on the user's own device; it does not upload them.

Demo: enter “Anil Kumar Sharma” as the local application name, scan an identity
document with “A. Kumar Sharma”, keep that reviewed name, then scan an income
certificate with “Anil Sharma” and a prior-FY issue date. Correct the spelling to
see observations update, continue despite warnings, then reset to forget the set.

## Eligibility handoff

Only unambiguous, valid annual income, exact category codes and explicit degree
wording can be offered. Semester/year numbers never imply undergraduate status.
The visitor selects a field and acknowledges server use before continuing. No
certificate possession is inferred and no evaluation runs automatically.

The selection lives in a transient JavaScript module, not history state, storage
or query parameters. The eligibility form reads and clears it on mount; unused transfers expire after one minute and are cleared on pagehide. The
eligibility form starts without invented profile answers or assumed certificates. The user reviews the remaining questions before submitting to the evaluation API;
signed-in submission also updates their eligibility profile, as stated in the UI.
Downloading a text review saves an explicit user-requested snapshot on their device.

## Verification

`npm run test:scanner`
`node --test test/scanner-handoff.test.mjs`
`PLAYWRIGHT_CHANNEL=msedge npm run test:scanner:ui`
`npx eslint src/scanner src/pages/Eligibility.jsx src/utils/eligibilityDraft.js`
`npm run build`

Browser tests use synthetic documents and public metadata mocks, exercise real
PDF/OCR processing, errors, cancellation and cleanup, and check network/storage
privacy. Additional mobile/handoff checks cover 320/390/768/1440 widths, consent,
no auto-evaluation, no fields in history state and downloadable results. Auditor
regressions exercise actual searchable PDFs and English OCR, successive scans,
India-time FY rollover, live edits, non-blocking warnings, in-tab name retention,
reload/navigation cleanup, and absence of document/name data in requests or
browser storage. These checks use synthetic documents, not personal records.
Presentation regressions also cover Unicode-preserving highlights, chronology,
ambiguous dates, explicit local name reuse and keyboard disclosure controls.

### CI timing and failure diagnostics

The frontend browser suite checks the production build. `NODE_ENV=test` is scoped
to backend tests in the workflow; inheriting it during `vite build` selects a
different React runtime from the default production build.

Document-type selection commits the new keyed workspace synchronously before a
new file can reach the previous workspace. Browser tests normally use
`chooseDocumentType` to wait for the matching workspace label. A separate
immediate-upload regression deliberately omits that wait to protect the actual
UI behavior. The scanned-PDF/JPEG test still performs real local OCR, checks
worker cleanup between documents, and explicitly tests failed initialization.

On CI, failed browser tests retain traces and screenshots in `browser-failures`
for seven days. Open a downloaded trace with `npx playwright show-trace` followed
by its `trace.zip` path. These artifacts contain synthetic test fixtures; they
are not telemetry from students using the scanner. The full browser suite
includes smoke coverage and runs once per verification job.
