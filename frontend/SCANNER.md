# Document Health Scanner

Open `/scanner.html` from the desktop/mobile **Scanner** navigation link or a scholarship detail's **Check document readiness** link. No login is needed. This is a second Vite entry point, not a replacement application.

## Architecture and privacy boundary

The main application mounts Google OAuth globally and loads Google Fonts. The scanner deliberately performs a full-page navigation to its own entry point, with the existing local fonts/styles, React and Lucide icons. It imports neither the authentication provider nor the authenticated API client. No analytics, remote fonts, OAuth, captcha or error reporting scripts run in this entry. Keep future telemetry/session replay out of it.

`scanner.html` has a restrictive CSP: same-origin scripts, fonts and workers, WASM compilation, no frames/objects/forms. Only the configured public API origin is additionally allowed for connections. Vite gives development scripts a per-server nonce for React refresh; production needs no inline script exception. Deploy the generated `dist/scanner.html` as a real file (serve existing files before your SPA fallback), together with all of `dist/scanner-assets` and `dist/assets`. Do not override this page with `index.html` or add hosting-provider tracking scripts. CSP does not defend against malicious first-party code or browser extensions.

Public scholarship metadata is requested with credentials omitted and no referrer. Document bytes, file names, OCR text and reviewed fields are never request arguments. The first 100 public scholarships are offered by the MVP adapter, plus a linked scholarship fetched by its public ID if it is outside that list. The scanner does not import MongoDB/Redis clients or use browser storage, cookies, analytics or document-upload endpoints. Tesseract's IndexedDB language cache is explicitly disabled. Static OCR assets can be HTTP-cached; document contents are not persisted.

All processing state is held in React/worker memory. Type changes, reset, cancellation and unmount invalidate pending results. Pagehide unmounts React, including on back/forward-cache navigation. Canvases are zero-sized, image bitmaps closed, PDF tasks destroyed, and workers terminated. No object URLs are created. Memory reclamation is best-effort, not secure erasure.

Tesseract 7 exposes the native worker only after initialization completes. `startOCR` captures its synchronous construction using a narrowly scoped constructor wrapper restored in `finally`, without awaiting or changing dependency files. This permits immediate termination on cancellation and failed/stalled asset downloads, including before initialization. Versions are pinned; rerun the worker-lifecycle tests on upgrades. Library errors are deliberately replaced with fixed user messages without retaining their potentially sensitive `cause`.

## Processing and extraction

- `src/scanner/process.js`: signature/extension checks; 10 MB, 5 PDF pages, 20 MP source image, 4 MP rendering, 100,000 characters/page, one sequential OCR worker, two-minute timeout. Image headers are checked before decoding. Modern browsers with WebAssembly, workers and `createImageBitmap` are required.
- Searchable PDF pages use PDF.js text extraction. Sparse pages use PDF.js canvas rendering and English Tesseract OCR. The OCR worker is reused across pages and closed after the file. Heavy libraries are dynamically imported. All workers/WASM/font/CMap/language files come from the application origin.
- `extract.js`: explicit labels for issue/expiry dates; strict Indian dates, currency and adjacent year ranges; annual **family** income only; institution names, study year/semester, enrollment wording, optional AISHE and designations; Caste / Category extraction (OBC, SC, ST, EWS, Central DoPT OM 36012/22/93 Non-Creamy Layer clause, sub-caste, and bilingual authority labels). Multiple differing candidates remain unresolved. Raw supporting lines and page/method references accompany candidates; manually edited values retain the original evidence and are labeled separately.
- `useScanner.js`, `Scanner.jsx`, `scanner.css`: transient state, accessible review, evidence details, active scheme criteria preview, general observations, and evidence-backed compliance reports. Editing never reruns OCR.

## Rules and evidence

`rules.js` performs deterministic evaluation combining:
1. **General Document Health:** format validation, future issue dates, expired validity dates, and high-risk rejection warnings (e.g., Notary/affidavit attestation instead of competent revenue officers).
2. **Real Scheme Criteria Compliance:** Grounded directly in Udaan's verified MongoDB scholarship records:
   - **Statutory Income Ceiling:** evaluates extracted `annualIncome` against `scheme.eligibility.familyIncome.max`.
   - **Academic Year & April 1 Boundary:** validates that income/caste certificates were issued on or after April 1 of the scheme cycle start year (`YYYY-04-01`), preventing previous financial year portal rejections.
   - **Central vs State OBC-NCL Resolution:** checks for Central Government DoPT OM 36012/22/93 non-creamy layer compliance on All-India/Central government schemes.
   - **Bonafide Session Matching:** ensures enrollment session aligns with `scheme.currentCycle.academicYear`.
   - **Mandatory Document Checklist:** confirms document prerequisite against `scheme.requiredDocuments`.
3. **Registry Override Rules:** allows custom cycle-scoped rules with official guidelines excerpts and verification timestamps. Synthetic test rules remain strictly isolated to unit tests.

## Run and verify

```sh
npm ci
npm run dev
npm run test:scanner
npm run build
npx playwright install chromium
npm run test:scanner:ui
npx eslint src/scanner vite.config.js
```

Use `PLAYWRIGHT_CHANNEL=chrome` (PowerShell: `$env:PLAYWRIGHT_CHANNEL='chrome'`) to use installed Chrome instead of downloading Chromium. Browser tests run against the production build, with only synthetic data and mocked public scholarship metadata. They exercise real local OCR, native and scanned PDF processing, PNG/JPEG, manual edits, evidence, mobile layout, drops, invalid/large/empty files, cancellation, asset-load failure, worker cleanup, network methods/origins and empty browser storage. Screenshots are synthetic test artifacts only. `predev` and `prebuild` copy assets from lockfile-pinned npm packages; generated assets are ignored by Git.

## Limitations

English only; handwriting, unusual layouts, complex tables and OCR errors require manual review. Mixed text/image PDF pages with a substantial text layer may omit image-only fields. No region overlays or document preview are retained: evidence is line text with page references. Date/validity extraction does not infer a legal expiration date from a stated duration. Institution names without a reliable label/header may remain blank. No authenticity, signature, Aadhaar, legal-compliance or approval checks. Real verified scheme rules must be reviewed before enabling scheme-specific decisions.

## Verification record (9 October 2026)

- 10 Node extraction/rule/file/privacy tests passed.
- 6 Playwright browser tests passed using installed Chrome, including real OCR and worker cleanup on success, cancellation and language-asset failure.
- Production build and scanner-specific ESLint passed; desktop/mobile synthetic screenshots were inspected.
- Development-mode manual-entry smoke check passed with no page errors or CSP violations.
- Repository-wide lint reports 74 errors and 8 warnings in existing code. `npm audit` reports one pre-existing high-severity `source-map-js` advisory; version 1.2.1 was already present in the original lockfile. Neither unrelated issue was modified.

Libraries: [Tesseract local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [Tesseract API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [PDF.js API](https://mozilla.github.io/pdf.js/api/).
