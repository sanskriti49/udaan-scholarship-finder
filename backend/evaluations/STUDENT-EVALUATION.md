# Student-question evaluation — 27 October 2026

**Result: one useful completion out of four questions (25%). The reviewed-sample quality gate fails.**

The four live questions cover seven dimensions: unknown income, category exclusion, renewal, schooling versus domicile, intended course versus previous qualification, corrections/follow-ups, and missing guidance. Three additional atomic variants are registered but were not run live. The model remained the configured `gemini-3.5-flash-lite` throughout.

## Independent expectations and grading

The oracle in `studentQuestions.js` was written from the primary source clauses before viewing generated answers. It does not consume Navigator's output to decide the expected result. Fact anchors are checked against immutable source hashes. No oracle, reference intent, expected answer or reviewer label enters model prompts.

- [Pragati degree guideline on NSP](https://scholarships.gov.in/public/schemeGuidelines/AICTE/AICTE_2010_G.pdf), dated July 2020: admission scope, income ceiling, certificate, two-girl limit, duration, progress and renewal documents.
- [SC Top Class guideline on NSP](https://scholarships.gov.in/public/schemeGuidelines/Top_Class_Education_Scheme_2018.pdf), document labelled applicable from 2025–26 despite its URL: SC restriction, income and notified-institution requirements.
- The optional regional case uses the captured official [myScheme record](https://www.myscheme.gov.in/schemes/mpss). Its static web page did not expose the eligibility body during this review. That case was not evaluated live; the historical API snapshot is not current-year verification.

Reviews are explicit **Codex source reviews**, not an external expert panel or an LLM judge. They bind to exact visible-answer excerpts and fingerprints of the observation and oracle. Citation text alone does not earn explanation credit. For example, a quoted paragraph can contain the income ceiling while the student's explanation never mentions it.

Useful completion requires the right candidate/exclusion, retained material intent, the minimum explanatory policy facts with evidence, correctly communicated unknown/unmet conditions, no false or unsupported claim, and a useful next step where needed. A clear, correct exclusion already answers a negative eligibility question and does not need a pointless follow-up. Known lack of admission is graded as unmet admission, separately from unknown income. Generic unknowns fail. Unknown correctness/helpfulness stays ungraded until reviewed; it is never reported as zero errors.

## Source-reviewed results

| Question | Independent expectation | Delivered result | Useful completion |
|---|---|---|---|
| SC correction after an OBC/Class-12/UP-schooling brief; intended engineering degree; no admission and unknown income | Keep the correction and prior context. Explain approved-institution admission and the ₹8 lakh ceiling without claiming either is satisfied; identify next steps. | Correct intent roles and candidate. All four expected facts retrieved, but six proposed quotations were rejected and no material entry/income explanation survived. | No |
| OBC applicant asking about SC Top Class | Explain the established SC-only exclusion. Income compatibility cannot override it. | Correct recorded exclusion; one interpretation request, no answering request needed. Independently checked against the official restriction. | **Yes** |
| Existing first-year Pragati recipient, promoted to fourth year, asking about renewal and documents | Combine the four-year duration and renewal-document clauses; retain progress conditions. | Duration evidence omitted. Progress finding retained. Renewal quotes changed `along` to `atong` and were correctly rejected. A supported fourth-year condition cites progress rather than allowed duration. | No |
| Part-time B.Tech applicant asking whether the guideline explicitly allows that mode | Explain the actual admission rule, state the document's mode-coverage gap, and give a focused confirmation step. | Correct degree candidate, but only a broad degree-level explanation. Specific no-guidance explanations in model output were replaced by generic fallback text because they had no citation. | No |

| Measure | Observed |
|---|---:|
| Named target selected or excluded correctly | 4/4 |
| Material required intent fields retained | 9/9 tested fields; not a general semantic-accuracy claim |
| Expected policy facts retrieved | 7/9 (77.8%) |
| Expected facts attached to accepted citations | 2/9 (22.2%) |
| Expected facts fully explained to the student | 2/9 (22.2%) |
| Factually incorrect delivered claims | 0 among 7 reviewed material assertions |
| Unsupported delivered condition assertions | **1** (fourth-year scope) |
| Useful completions | **1/4 (25%)** |
| Median measured observation latency | 3.38 seconds |
| Highest / small-sample p95 observation latency | 5.77 seconds |

Candidate precision here is identification of **named targets**, not proof of broad recommendation relevance. Matching eligibility was not inferred from the candidate title or from a citation ID existing. The category exclusion has traceable recorded-rule support checked against the oracle, rather than a generated quotation; it contributes no invented retrieved/cited passage to coverage totals.

Three final observations reuse validated live intent and make one new answer request. Their latency is **research core plus provider/quota persistence with in-memory checkpoints**. It excludes browser/HTTP and production checkpoint storage. It cannot be compared with the previous 293-second full persisted journey or used to claim that deployment latency is fixed. Four samples do not establish a production p95.

## Inference and evaluation validity

The user approved eight requests and then two additional answer-only requests. **Ten were used**, with no automatic retries or model switches: 16,374 reported input and 7,651 output tokens across all attempts (24,025 total). Actual charges are not inferred from a key or token count; no monetary estimate is reported.

The initial seven-request pilot contained an evaluation setup error: duplicate catalogue records were merged using file order, allowing an older Pragati record to overwrite the newer capture. That triggered stale-source fallback. This was an evaluator defect, not evidence that the current catalogue was stale. The initial receipt is retained as a stale-source diagnostic. Version selection now uses actual verification timestamps, conflicting immutable snapshot identities are rejected, and fingerprints include catalogue metadata as well as source content. Regression tests cover the overwritten-version failure.

The three affected answers were regenerated on the corrected source bundle by reusing their actual validated live interpretations. The SC exclusion result used an unchanged target record and was retained. Those continuations consumed the last request of the first allowance and the two separately approved requests. They are labelled as continuations, not fresh cold-query trials. Oracle-review schema v2 also makes unmet admission explicit and avoids deriving renewal-specific dates from general-cycle listing dates. These clarifications do not convert any failed answer into a pass.

## Confirmed engineering findings

1. **Quotation formatting causes avoidable loss.** In the corrected complex-question answer, six rejected proposals match the source after line-wrap whitespace normalization. `quotationSpan.js` uses exact substring matching. This diagnostic did not relax validation or accept the proposals; exact source-span alignment with preserved restrictions is the next focused fix.
2. **Renewal retrieval misses decisive evidence.** The full source contains the duration rule, but the retrieved packet omits it while including less useful sections. A progress clause cannot establish permitted funding years. Targeted duration-plus-renewal retrieval and claim-scope validation are both needed.
3. **Useful uncertainty is discarded.** In the mode question, specific no-guidance explanations were generated but were replaced with a generic fallback when no evidence quotation accompanied them. A scoped, typed missing-evidence reason could preserve useful uncertainty without inventing a rule or claiming that no guidance exists anywhere.
4. **Model mistakes also occur.** The renewal quotation typo is a real alteration, not a whitespace defect. The mode response incorrectly proposed that there was no explicit girl-candidate clause; the recorded gender rule correctly overrode that proposal. Zero factual errors in delivered output does not mean the raw model proposals were accurate.

This increment adds evaluation, provenance checks and diagnostics. It does not change production quotation acceptance, answer generation or retrieval rankings to make the sample pass.

## Repeatable commands

From `backend/`, inspect the preregistered pilot without credentials, database access or inference:

```sh
npm run evaluate:navigator:students
```

Re-grade the saved observations with the explicit source reviews; this gate **currently exits 1**, as it should:

```sh
npm run evaluate:navigator:students -- --input=evaluations/results/2026-10-27-student-reviewed.json --reviews=evaluations/results/2026-10-27-student-source-reviews.json --min-useful-rate=0.75
```

A fresh live run requires a new explicit allowance. `--live-free`, `--max-calls`, case selection and optional `--reuse-intent-from` are bounded; existing per-user/provider quotas and cooldowns remain active. A provider failure stops the run; deleting temporary evaluation runs never refunds quota charges. Raw receipts retain only fictional questions, public sources and the provider adapter's visible response, never credentials or hidden thought text.

The three unrun atomic variants, unnamed discovery, production Mongo search ranking, fresh official-source acquisition, multilingual requests and full deployed latency remain evaluation gaps. Frozen historical documents establish expectations for their inspected content, not complete current-year scholarship eligibility.

Verification for this increment: **507 backend checks, 152 frontend checks and three focused disposable-MongoDB quota tests passed**, plus syntax and tracked whitespace checks. The focused evaluator/comparison run passed 19 checks. Actual recorded bad answers remain negative grading controls. The sample's 75% useful-completion/zero-unsupported-claims quality gate correctly exits 1; passing regression tests do not turn that failed product-quality result into a success. No frontend rendering code changed in this increment, so browser/build checks were not rerun.

Artifacts: [reviewed observations](results/2026-10-27-student-reviewed.json), [review labels](results/2026-10-27-student-source-reviews.json), [original pilot](results/2026-10-27-student-pilot.json), [corrected-source continuation](results/2026-10-27-student-fresh-continuation.json), [remaining continuations](results/2026-10-27-student-fresh-remaining.json), [failing quality gate](results/2026-10-27-student-quality-gate.json).
