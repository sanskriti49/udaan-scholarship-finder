# Personalized eligibility-change alerts

Students enable **Eligibility changes that affect me** under Settings → Notifications, save a profile through Eligibility, and bookmark schemes. The preference defaults to false, including for older accounts. Alerts use the chosen in-app/email channels and are independent of deadline alerts or minimum match scores.

## Recorded changes and source evidence

Ingestion stores immutable `EligibilityRuleVersion` snapshots containing the evaluator's rules, unknown-criteria flag, source quotations and checked field evidence. The semantic hash includes fields, operators and targets; refreshing a quotation or reordering a category set does not create a new rule version. A change from `<` to `≤` does.

Snapshots also retain optional recursive policy trees. Their hashes include logical structure, so changing AND to OR creates a new version. Compound policies need a checked full-policy excerpt as well as leaf citations. See [the rule engine contract](RULE_ENGINE.md) for validation and ingestion safeguards.

Before marking a version verified, the pipeline checks every recorded rule citation against the stored source snapshot, URL, text hash and character offsets. This establishes excerpt integrity, not legal/provider certification or complete scholarship coverage. Versions retain both previous and current evidence. No alerts are generated for first observations, uncited rules, extraction failures or unverified previous versions. Existing schemes acquire their baseline on the next successful crawl; an invented historical baseline is never backfilled.

The current version points to its predecessor. Each alert job contains the scheme ID and both version IDs, not student profile values. Workers read opted-in students' saved profiles and evaluate each profile unchanged against both snapshots. A missing income/category/domicile/disability stays unknown. Passing one criterion never means a guaranteed scholarship award.

## Meaningful personal changes

The current implementation alerts when a changed recorded criterion changes from failed to passed, passed to failed, unknown to known, or newly requires information that is missing. Adding an already-passing criterion, changing source wording, or raising an income ceiling for a student who remains below both ceilings produces no alert. Changed requirements with an unknown answer in both versions also produce no alert.

For recursive policies, alerts compare the overall tree outcome. A leaf changing in an alternative route does not generate an alert when the student's overall result remains unchanged. The explanation includes the old/new policy expression and the checks still needing review.

The inbox card and email contain old/new requirements, the saved answer used, source excerpts and links, remaining failed/unknown criteria, and a link to review the saved profile. The payload records assessment time and profile update time. Source-backed extraction does not establish that all provider terms were captured.

Missing rules after a partial extraction remain pending review in the existing merge policy; absence of text is not treated as verified removal of a restriction. Catalogue publication changes and deadline alerts retain their existing behavior. Later versions supersede queued older impacts before evaluation so stale rule-change messages are suppressed.

## Delivery and recovery

1. The pipeline inserts the version and its pending alert state before updating the scholarship's current-version pointer. A deterministic version key makes retries reuse the inserted version. The relay only queues a version published through that pointer; a failed scholarship save cannot publish an orphan event.
2. A relay runs after ingestion and through the existing scheduler (startup and every 30 minutes by default). If enqueue fails or Redis is unavailable, the MongoDB pending event remains. Queued events not completed after an hour are reconsidered; failed BullMQ jobs are retried with attempts reset. Database errors are propagated.
3. BullMQ uses a stable `eligibility_<scheme>_<version>` job ID, five attempts and exponential backoff. The worker verifies evidence again, scans bookmark recipients with a cursor, and processes up to ten recipients concurrently. Delivery errors reach BullMQ instead of being swallowed.
4. Unique permanent `EligibilityAlertDelivery` receipts identify user + scheme + version. Notification creation is resumable. The receipt survives inbox dismissal and BullMQ job cleanup. Eligibility inbox dismissal hides its stored record, including while email is pending, so retry cannot resurrect the card. Other notification types retain their existing deletion behavior. A failed email can be retried against the same saved notification payload; a short lease prevents concurrent email attempts.

This provides durable event recovery and deduplicated notification records. SMTP does **not** offer exactly-once delivery: a process can crash after SMTP accepts an email and before the database records success. A later retry can resend that email. The existing email service uses simulated delivery when SMTP is not configured. Monitor failures and configure real SMTP before claiming email delivery.

Rule/version snapshots contain source data, not user documents. Saved profile fields used by a particular alert appear only in that user's notification/email. Scanner processing remains browser-local.

## Verification and interview demo

```sh
cd backend
npm test
npm run demo:eligibility
```

The demo runs the real ingestion/versioning and impact processor over an in-memory store. It labels all rules as synthetic, uses the illustrative ₹2.5 lakh → ₹3 lakh ceiling and ₹2.8 lakh saved income, and proves a repeated event produces no additional inbox alert. It performs no network requests, database writes or email delivery.

Backend regressions cover source verification, operator-only changes, interrupted saves, repeated events, retries, disabled/missing preferences, missing profiles, exact boundaries, removed bookmarks, superseded versions and email retry/dismissal behavior. Build smoke tests exercise opt-in persistence and the source/impact card at mobile and desktop sizes with mocked API responses. These isolated checks do not establish production MongoDB, Redis, SMTP or portal availability.

Deployment uses the existing server, scheduler and BullMQ reminder worker. The additive `006-eligibility-alert-indexes` startup migration creates version/receipt indexes; no records are deleted. Keep the scheduler and worker running. Background queue connections reconnect with bounded backoff; the eligibility producer probes a disconnected cache connection at most once a minute when relaying events. Pending events are recovered on a subsequent relay when the queue connection becomes ready; service downtime can delay delivery.
