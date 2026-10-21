# Policy change detection and presentation

The reported SHE, ONGC and Swami Vivekananda examples were reproduced using the running local API on 21 October 2026. Their award objects differed only because MongoDB materialized `months: null` and `options: []`, while extraction omitted those optional properties. Their values, periods and descriptions were unchanged. Those entries contain no closing-date delta, so they are not evidence of a deadline extension. One older Swami Vivekananda entry also changed the application URL; that real recorded difference is retained.

## Comparison contract

`core/policyValues.js` compares policy meaning with the persistence defaults applied. Missing/null duration and missing/empty option lists are equivalent; numeric values, currencies, payment periods, known durations, rate options and descriptive qualifications remain significant. Reordering an eligibility set or rate table is not an update. Rules compare their conditions, and trees retain their AND/OR/NOT/conditional structure. Source quotations are never normalized or rewritten.

A subsequent API audit also found optional URLs changing from `null` to empty strings. Both mean no URL was recorded and are treated as unchanged. A partial links extraction preserves prior cited application, guideline and FAQ URLs, including during the final nested-object merge.

The ingestion merge and data hash use this contract, so a repeat crawl after a real Mongoose round trip does not create another version, trigger a notification or report a data change. Missing whole-field extraction still preserves previously recorded values under the existing merge rules.

The frontend has a dependency-free copy of the comparison contract so both services can deploy independently. The backend regressions check cross-runtime parity on representative records. Keep the two modules aligned when extending the contract.

## Existing records and UX

History APIs return a read projection with substantive `deltas`, `unchangedFields`, a `routineRefresh` flag, and `relatedEvidence`. Original version documents and evidence stay intact in MongoDB. Mixed records retain their real changes and receive a summary based on those changes. Projection is idempotent. The UI excludes excerpts explicitly tagged for unrelated fields and reports when no matching excerpt was saved; untagged older excerpts remain unverified source context.

The Changes tab groups unchanged records in a quiet, expandable reference section. A timeline containing only unchanged entries says that no changed terms were recorded. Missing structured comparisons and new application cycles remain separate from confirmed no-op entries. Previously unrecorded details are labeled as new information, rather than proof the issuer changed a policy.

Date-only updates show the application-year context, identify extensions or earlier deadlines from the actual timestamps, and do not use an eligibility label or prompt for an eligibility replay. If only the time changed on the same calendar date, both times are shown in IST. Award comparisons show structured amounts, currencies, periods, durations and all rates alongside any additional description, so identical display text cannot mask a real change.

Eligibility labels are conservative: unknown/structural changes use a neutral label; known criteria moving in opposite directions use `MIXED_CHANGE`. Award increases are not labeled as eligibility expansions. Duplicate displayed source excerpts are grouped without changing their text or losing distinct page/locator context.

## Derived update badges

The catalogue, featured listings, details and Recent updates filter/count use a shared, batched index of stored change history. Known no-op-only histories no longer advertise an award change. Missing history remains unknown and does not clear a badge automatically. The index caches successful reads for 60 seconds and shares concurrent loads; existing HTTP catalogue caching may retain an older response for its normal five-minute TTL.

The next normal ingestion also repairs old `hasChanges` and `latestChangeSummary` metadata without deleting or rewriting history. No destructive history cleanup or forced live crawl is needed.

## Verification

`test/unit/policy-changes.test.js`, `test/unit/policy-updates.test.js` and `test/integration/policy-persistence.test.js` cover schema defaults, real changes hidden by identical descriptions, mixed updates, semantic hashes, repeat crawls, badge repair and preserved audit records. Frontend policy-diff unit/browser checks cover the reported shapes and mobile/desktop presentation. Fixture crawls exercise Mongoose casting in memory; they do not change the live database or establish the date an issuer actually announced a policy.
