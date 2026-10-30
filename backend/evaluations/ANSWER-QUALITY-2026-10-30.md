# Navigator answer-quality review — 30 October 2026

## Scope

Eight fictional student scenarios ran through the actual current catalogue LangGraph, tools, eligibility engine, citation validator and student finding formatter using the existing `runStudentCase` harness. The first four replay saved visible model responses and validated intent from the existing four-case source-reviewed evaluation. They use frozen official-source captures, not current catalogue results. The other four use explicitly synthetic policies, profiles and scripted intent/answer responses. No providers, live scholarship portals, production records or databases were contacted.

These are offline product-path observations, not fresh LLM comprehension/quality measurements. Reused historical intent cannot measure current natural-language understanding, and scripted answers cannot establish that a real model will write equivalent explanations. No scripted response is drawn from an evaluation oracle at runtime. The legacy source-reviewed 1/4 live quality result in STUDENT-EVALUATION.md remains historical evidence, not a current live score.

## Reviewed scenario table

Pass means a useful, appropriately qualified answer to the bounded question, not just a completed graph. These verdicts are a manual Codex review of the saved outputs; they do not replace the existing fingerprint-bound live-answer scoring system.

| Scenario | Expected behavior | Observed current behavior | Result / issue |
| --- | --- | --- | --- |
| Historical replay: SC correction after OBC/Class-12/UP-schooling brief, no admission, unknown income | Retain correction; explain admission and income conditions with citations and practical next steps | Correct scheme and correction retained; search, passage reads, matching and finalization ran. Multiple proposed quotations remain rejected; admission and income explanations are missing | **FAIL usefulness** — exact-quote losses remain; profile matching stays unknown |
| Historical replay: OBC student asks about SC Top Class | Explain SC-only exclusion; compatible income must not override it | Search returns a recorded category exclusion, then finalizes without another answering request or unnecessary clarification | **PASS** — useful negative answer from deterministic recorded rule |
| Historical replay: fourth-year Pragati renewal | Combine funding duration, progress and renewal-document requirements; do not invent renewal dates | Reads policy twice. Duration remains missing and altered renewal quotations are rejected. Promotion-only support for fourth-year funding is now rejected with `YEAR_SCOPE_MISSING` | **FAIL usefulness**, with a corrected unsupported assertion — safe uncertainty still does not answer renewal requirements |
| Historical replay: part-time B.Tech guidance | Explain available admission rule and scope uncertainty about part-time mode | Valid admission citation survives. The open part-time condition now names the exact point to confirm, but has no supporting citation and is not among the prominent validated findings | **FAIL full usefulness**, partial formatting improvement; no invented mode permission/prohibition |
| Synthetic: OBC, UG, UP discovery | Surface compatible scheme and explain the three constraints consistently | State/category checks supported and matching passes; education condition remains unknown in response presentation; research executes an additional search | **FAIL consistency/usefulness** — matching versus question-level explanation remains incomplete |
| Synthetic: complete income information, ₹2 lakh against ₹3 lakh ceiling | Explain the recorded income match; avoid an overall eligibility guarantee | Matching passes; recorded check explains the ₹3 lakh requirement and a valid synthetic citation is retained. Other conditions are explicitly left for review | **PASS** for this single recorded requirement, not overall eligibility |
| Synthetic: unknown income, asking for the income rule | State the ceiling and leave personal compatibility unknown without demanding an answer unnecessarily | Valid synthetic income citation, ceiling explained, familyIncome missing and matching unknown; no clarification interruption | **PASS** for explaining the rule with incomplete information |
| Synthetic: recorded deadline only | Give the recorded window with freshness/source caveats; do not ask unrelated income | Deadline exists in fixture cycle metadata, but the graph pauses for optional familyIncome clarification before an answer | **FAIL usefulness** — unnecessary clarification for a deadline-only question |

All eight scenarios invoked relevant existing tools; none failed with a tool or provider exception. Seven completed and one paused for clarification. Three met the bounded usefulness expectations above. This 3/8 mixed offline result is not a model success rate, production accuracy, or a fresh measurement comparable to the prior live 1/4 sample.

## Changes from this evaluation

1. `answerValidation.js` now rejects supported study-year claims whose cited text does not address years/duration. This blocks the reproduced fourth-year claim grounded only in a promotion/forfeiture clause. Exact-quote checks remain unchanged. The guard is a necessary scope check, not general semantic entailment: a clause mentioning years can still be misinterpreted and needs evaluation.
2. `evidenceAnswer.js` now identifies the specific unresolved question in deterministic fallback text and asks the provider to confirm that point. It does not repeat uncited model explanations or claim a rule is absent from all sources. Unknown remains unknown.

The evaluation helper additionally accepts a transient explicit profile for synthetic cases. Its existing default remains an empty profile. Production orchestration, discovery ranking and eligibility rules were not changed.

## Reproduction and artifacts

From `backend/`:

```powershell
node evaluations/offlineAnswerQuality.js
node --test test/unit/navigator-answer-reliability.test.js test/unit/navigator-student-evaluation.test.js
npm run test:navigator
```

The replay writes [the eight observations](results/2026-10-30-offline-answer-quality.json), including tool execution, retrieved quotes, retained conditions/citations, matching state, clarification and visible findings. The source-reviewed historical fixtures remain intact as negative controls.

Validation: 26 focused tests passed, including positive duration support, rejected promotion-only support, useful scoped uncertainty, rejection of unsupported model prose, and the existing student scorer's negative controls. All 248 Navigator tests passed. No paid calls were made.

## Small follow-up work

The highest-value next experiments are to prevent profile clarification on deadline/source-only questions, reconcile recorded education compatibility with question-level findings, and improve duration/renewal evidence selection. Continue evaluating exact-quote losses without accepting changed words or dropped policy restrictions. Unknown explanations in the less prominent unanswered section may still be overlooked. These are documented limitations, not silently converted to passes by an easier score or weaker validator.
