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
mounted only on sign-in/sign-up pages, not on the scanner. Application fonts are self-hosted with their licenses, preserving the existing typefaces without remote font requests. Reset, type changes,
unmount and pagehide cancel processing and clear scanner state. Worker cleanup
and memory reclamation are best effort, not secure erasure.

## Decisions and provenance

General observations check format, conflicting values, future issue dates and
explicit expiry dates. Optional fields are not universal document requirements.
Catalogue amounts, application years, category names and document lists do not
establish legal certificate requirements. Removed the inferred April 1, universal
notary/NCL and approval/rejection assertions. Production `verifiedRules` remains
empty until explicit, reviewed source excerpts and scoped requirements exist.
Only valid sourced rules can produce scholarship-specific results.

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
no auto-evaluation, no fields in history state and downloadable results.
