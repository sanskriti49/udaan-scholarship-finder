# Navigator usefulness refinement — 30 October 2026

## Confirmed causes and focused changes

1. **Unrelated clarification:** after evaluating all policy rules, the graph used every missing profile field to decide whether to pause, even for information-only questions. The existing adaptive action menu had the same behavior. Both paths now check whether the question needs personal eligibility verification before interrupting. Deadline, document, source and general-policy questions can finish with recorded facts and uncertainties; explicit personal eligibility questions retain clarification/resume. This is an interruption-scope filter, not another eligibility evaluator or an inferred profile. The current scope vocabulary is English and should not be treated as general multilingual intent understanding.
2. **Education consistency:** current-enrollment education constraints previously went to evidence review, while the shared evaluator had already checked the recorded level rule. Current enrollment now follows the same whole-policy evaluation path as other recorded applicant conditions. Previous qualifications and explicitly different funded courses remain evidence questions. An existing cross-course regression caught an initial over-broad change; the final condition preserves that distinction. AND/OR/NOT checks and unknown alternative routes remain intact.
3. **Duration evidence omitted:** the decisive four-year clause appeared under “AMOUNT OF SCHOLARSHIP” and was not admitted as substantive policy text. Year-of-study retrieval also treated generic education text and numbered list items as coverage. Explicit duration language in a benefits section is now researchable, and year-specific targets require duration-topic coverage rather than a coincidental numeral. No quotation text, hash, source offset or validation rule was relaxed. A focused test proves that duration, renewal documents and promotion reach the final answer packet together.

## Eight offline cases, same questions and scripted responses

The before verdicts are the reviewed 3/8 baseline in [ANSWER-QUALITY-2026-10-30.md](ANSWER-QUALITY-2026-10-30.md). The existing replay regenerates its observation JSON; the final after-run is also retained separately as [offline after observations](results/2026-10-30-offline-after-usefulness.json). Expectations and original negative-control model responses were not changed. Four cases replay historical visible responses and validated intent against frozen official sources; four use synthetic policies/profiles and scripted providers. Neither group is current production-catalogue verification or a new live-model score.

| Scenario | Before | After | Actual change or remaining issue |
| --- | --- | --- | --- |
| SC correction, prior Class 12, no admission, unknown income | Fail | Fail | Correction retained; rejected historical quotation formatting still prevents key admission/income explanations |
| OBC student asking about SC-only scheme | Pass | Pass | Recorded exclusion remains correct; no unnecessary answer request |
| Fourth-year renewal | Fail | Fail | Duration now reaches retrieval and synthesis; replayed answer still contains a bad renewal quotation and promotion-only year support, correctly rejected |
| Part-time guidance unavailable | Fail | Fail | Scoped uncertainty remains; no invented permission or prohibition; prominent answer remains incomplete |
| Synthetic UP/UG/OBC discovery | Fail | Pass | All three recorded requirements consistently supported; broader personal eligibility is not guaranteed |
| Synthetic complete income information | Pass | Pass | ₹2 lakh satisfies recorded ₹3 lakh ceiling; original valid evidence retained |
| Synthetic unknown income, asking about the income rule | Pass | Pass | Ceiling explained; personal compatibility remains unknown without unnecessary interruption |
| Synthetic deadline-only question | Fail | Pass, bounded to recorded metadata | Completes without income clarification, exposing the recorded date in the result card. The question-level source interpretation remains unknown: this is not an independently verified/current deadline |

**Bounded usefulness result: 3/8 → 5/8.** The deadline verdict credits a completed response with the requested recorded date; it does not give credit for a source-verified deadline explanation. The remaining three failed cases remain failures despite successful execution and safer output. Historical answer replays cannot write better wording just because the retrieval packet improves; the live generation below tests that separately.

## Live Gemini observation — separate from offline results

- **Exactly 2 API requests attempted out of the authorized maximum of 3**, both HTTP 200. No retries, model switches or other-provider calls. The third request was unused. The transport increments and writes an exclusive task receipt before every fetch, so failed requests also consume the task budget and re-running the one-shot script is refused.
- Model: **`gemini-3.5-flash-lite`**, using the configured existing Gemini integration and credentials.
- Fictional question: “I received AICTE Pragati (Technical Degree) from my first year and have been promoted to my fourth year. Can it continue this year, and what must I submit for renewal?”
- The actual graph used fresh Gemini intent extraction (request 1) and evidence-answer generation (request 2), with optional model-driven research decisions disabled. No cached/reference intent was injected. It searched the frozen public-source corpus, read passages twice, evaluated matching, then finalized: `searchScholarships → findGuidelinePassages → findGuidelinePassages → evaluateMatches → finishInvestigation`.
- The answer retained four validated assessments with zero rejected assessments: renewal route, four-year duration, degree-level context and the combined renewal question. It explained the marksheet/passing certificate and head-of-institution letter through NSP, citing exact stored source spans. Overall deterministic matching stayed unknown and qualification stayed needs-verification. There was no profile interruption.
- **Manual verdict: useful for the requested first-year-entrant duration and renewal documents, correctly qualified as source interpretation; incomplete as a full current eligibility review.** The answer was verbose and did not separately explain the progression/forfeiture clause. The historical document's current-year applicability was not established. The duration citation ends at a PDF page boundary in the second-year/lateral-entry alternative; the first-year four-year statement is present, but cross-page continuation is a remaining retrieval/quotation-review concern. Valid offsets do not establish complete semantic entailment.
- Provider usage: **2,730 input tokens + 1,614 output tokens = 4,344 total reported tokens**. The provider returned no monetary billing amount; no cost estimate is inferred. No transport or provider errors occurred.

The graph/checkpoints were evaluated through the existing memory-checkpoint harness and real persistent quota reservations in a dedicated **local evaluation database**. Synthetic evaluation runs were deleted by the existing harness; the two local quota charges were retained. No production scholarship/run records, real student data or live scholarship portals were accessed. No key or hidden-thought content was retained.

Artifacts: [attempt receipt](results/2026-10-30-gemini-usefulness-receipt.json), [live observation](results/2026-10-30-gemini-usefulness-observation.json). They retain visible structured output, tool events and public evidence only. A two-request sample does not establish general model accuracy, production throughput or deployed latency.

## Validation and reproduction

- `npm run test:navigator`: **252 passed** after the functional fixes.
- `node --test test/unit/navigator-usefulness.test.js test/unit/navigator-qualification.test.js`: **16 passed**, including the final scope variants, cross-course roles and AND/OR/NOT cases.
- Actual local MongoDB durability suite with scripted providers: **73 passed**, including ownership, persistence, clarification/resume, follow-up handling and source-change controls.
- Existing fabricated-claim, invalid-citation and historical bad-answer controls remain passing negative controls. No discovery, ingestion or eligibility-engine changes were needed.

Offline replay, from `backend/`:

```powershell
node evaluations/offlineAnswerQuality.js
node --test test/unit/navigator-usefulness.test.js test/unit/navigator-qualification.test.js
npm run test:navigator
```

The approved live command was `node evaluations/liveUsefulnessGemini.js --approved-three-attempts`. **Do not delete/reset its receipt or repeat the live evaluation under this task's allowance.** The script refuses a second run. A new live evaluation requires a new explicitly authorized allowance and separate task receipt.

Remaining focused work: exact-quotation formatting losses, cross-page policy continuations, clearer answers when only recorded cycle metadata is available, and making the multi-condition narrative concise without dropping progression or uncertainty. These were not solved by weakening source validation or silently upgrading failed cases.
