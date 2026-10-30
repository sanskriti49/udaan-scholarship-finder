# Navigator focused architecture review

## Current execution flow

`runtime.js` builds the existing provider adapter, MongoDB run store/checkpointer, read-only research repository, and official-source checker. `durableNavigator.js` enforces ownership, quotas, leases, time budgets, cancellation, and explicit advancement/resumption.

The default catalogue workflow is a LangGraph graph in `catalogueWorkflow.js`; adaptive research adds a bounded action-selection step to that same graph. The earlier model-driven tool graph remains supported in `durableGraph.js`.

1. A validated, source-anchored intent describes the user's objective, constraints, exclusions and unanswered questions. Recent conversation context is supplied and corrections are tested. Failed interpretation does not silently broaden the query.
2. Existing tools search published nonlegacy records, inspect stored policy passages, optionally acquire/check registered official sources, and evaluate recorded requirements. The research repository has a finite candidate horizon and query timeouts. It does not call the public catalogue endpoint: research needs policy/evidence coverage and named-target balancing, while both paths reuse the deterministic eligibility engine.
3. Validated intent and available evidence determine tool actions. The adaptive action menu limits what a model may select; lifetime tool/model budgets and recorded attempts bound loops. Clarification is restricted to missing fields found by matching; answers are private, and clarification resume clears matching summaries.
4. Finalization resolves selected evidence IDs against stored quotations and snapshots, checks revisions, and runs missing deterministic matching locally. The evidence-answer stage receives collected tool results, not unrestricted model memory. Exact source-span, scope, contradiction and dependency validation constrains accepted claims; missing or conflicting support stays unresolved.
5. MongoDB checkpoints persist execution progress. Follow-ups carry bounded user conversation context; source proofs and matching results are independently validated rather than treated as conversational facts. A leased advancement and its provider attempt have explicit time and usage limits. Interrupted/provider-failed execution preserves diagnostics and cannot fabricate a successful answer.

## Confirmed weakness and fix

Navigator still accepted matching checkpoint summaries marked policy version 3 after discovery refined the shared eligibility evaluator (including recorded fallback course requirements). A focused regression reproduced a saved `passed` summary being returned while the current evaluator correctly found a course mismatch. Final qualification was recomputed separately, so this also created inconsistent matching versus qualification fields rather than a uniformly correct final response.

`researchTools.js` now emits/accepts matching policy version 4. Older summaries are discarded, while citations, source checks and acquired-source records remain intact. Existing finalization recomputes missing matching locally, without another provider call or a new evaluator. Tests cover compatible, incompatible and missing profiles and retain exact source quotations across restoration.

The reviewed orchestration already had substantial routing, evidence, clarification and failure safeguards. No additional architectural change was justified in this pass.

## Verification and limits

- `npm run test:navigator`: 246 tests passed after the fix. Coverage includes intent routing, exclusions, multi-step tool handoff, conversation corrections, empty results, fabricated/contradictory evidence, source changes, missing information, quotas, bounded execution and provider failures.
- Focused research/efficiency/answer/intent checks: 45 passed, including the new checkpoint regression.
- Real local MongoDB durability suite: 73 passed, covering persistence across process recreation, clarification/resume, follow-up context, source changes, HTTP ownership and execution quotas. It uses scripted providers and uniquely named temporary databases that it drops afterward. Run from `backend/` with:

```powershell
$env:NAVIGATOR_TEST_MONGO = 'mongodb://127.0.0.1:27017/?directConnection=true'
$env:LANGSMITH_TRACING = 'false'
$env:LANGCHAIN_TRACING = 'false'
$env:LANGCHAIN_TRACING_V2 = 'false'
node --test test/durable/navigator-durable.test.mjs
```

This tests actual persistence and HTTP/graph orchestration with synthetic policies and scripted inference. It does not establish live LLM answer quality, external portal availability or production throughput. Candidate, excerpt and context budgets can omit useful opportunities; source completeness still limits answers. Matching policy-version maintenance must accompany future changes to evaluator semantics. No paid provider calls, dependency additions or discovery/ingestion changes were needed for this refinement.
