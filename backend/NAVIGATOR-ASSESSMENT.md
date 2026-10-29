# Navigator engineering assessment — 23 October 2026

Decision: pause the general adaptive-agent refactor. Keep the semantic boundary and deterministic safety infrastructure. Build an evidence-answering hybrid, beginning with the intent-to-retrieval handoff. Keep GPT-OSS 120B provisionally as an evaluation baseline; it has not earned production acceptance, and replacing it cannot repair the confirmed downstream defects.

## Evidence and scope

Inspected the current branch `feature/scholarship-research-agent`, provider/configuration, both workflows, persistent limits, context compaction, repository search, passage retrieval, source checks, rule summaries, finalization, and UI request construction. Read-only live Mongo aggregates and two repository searches were performed. No catalogue/profile records were modified.

With explicit confirmation of a Free Groq account, ran exactly three synthetic intent requests through the existing adapter and persistent quota reservation. Temporary diagnostic runs were removed; their quota charges remain. Requests were spaced by 60 seconds; no retries or model switches. Results are in `navigator-intent-evaluation.json` at repository root. This is a smoke evaluation, not a statistically reliable benchmark or an end-to-end answer evaluation.

Reran Navigator's 77 backend unit tests: all passed. Previous durability/frontend/browser results were not rerun or represented as new evidence. The diagnostic script is standalone and not imported by production code. No production implementation, settings, dependencies, or provider changed.

## Confirmed findings

1. **The model never answers the research question in the current default path.** `durableNavigator.js` selects `catalogue_v1` and overrides the configured six-call budget to one. `catalogueWorkflow.js` calls the model only for intent. Its subsequent steps are deterministic search, passage retrieval, optional matching/clarification, and finalization. No retrieved evidence goes back to the model. `researchTools.js` constructs cards, rule counts, quotations and generic next steps. A better model cannot supply an explanation through an absent answer stage. The legacy agent also only finishes with IDs, not a claim-level answer.

2. **Missing metadata is treated as exclusion during discovery.** Of 166 published nonlegacy records, 150 have null/missing `level`; only 6 have UG, 4 PG, 3 Diploma, 2 Class 10, 1 PhD. The new `levels` filter uses exact `$in`, unlike the older `level` filter that includes null. A correctly parsed UG request removes those 150 candidates before reading their evidence. This does not prove those 150 are eligible; it proves their potential relevance cannot be assessed in this path. Live repository queries returned six candidates for national UG/income-450000 and zero for Maharashtra PG/exclude-national/income-450000.

3. **Metadata coverage and vocabulary are inadequate for exact filtering.** All 166 records have at least one field-evidence reference, but only 42 have a recorded academic year and 33 a recorded closing date. Reference presence does not establish intact snapshots, coverage of requested clauses, current applicability, or sufficient eligibility rules. States include `UP`, while the model can emit `Uttar Pradesh`; no canonical vocabulary is supplied or resolved at this boundary. Some state values are regional groupings. `state` also defaults to All India in the model schema, so that label alone is not proof of nationwide scope.

4. **Preserving intent is not the same as executing it.** The compiler only executes education/state constraints plus an income ranking hint. Year, renewal and other requirements are retained as unresolved. In the live follow-up case the model put hostel expenses in `other`, left `searchQuery` empty, and the compiled query contained no hostel topic. The intent report then displayed the entire original quote containing superseded UG/national terms. Exact source anchoring is useful provenance but does not guarantee semantic completeness, correct scope, or clear presentation. Arbitrary cross-field OR conditions are not representable by the flat filter compiler; they should remain explicit unsupported/ambiguous conditions until supported.

5. **Retrieval is still lexical and shallow.** Catalogue search ORs up to 12 non-filler tokens over title/organization/description/tags, ranking coverage and title overlap. Passage retrieval uses token overlap, a small synonym list, and numeric normalization; it returns at most four chunks. It searches full text only for appropriately linked PDFs, otherwise scheme-bound excerpts, which is an important cross-scheme safety boundary. `includeContext` can return nonanswering context. The workflow uses the first 300 characters of the latest brief for every passage request, rather than compiled questions and retained context. Quote integrity is validated; relevance and claim entailment are not.

6. **Current freshness tools are not used by the default workflow.** The catalogue graph neither selects source checks nor supplies `sourceChecker` to its tools. The older graph does. Even there, the checker compares bytes; unchanged bytes do not establish current-year applicability, and changed content is not ingested as new policy. This is intentional safety, but it cannot resolve fresh policy questions on its own.

7. **Eligibility reasoning is unnecessarily compressed.** The evaluator has rule-level checks and traces. Navigator retains counts, status, missing fields and review flags, discarding much of the explanation needed to tell a student why a recorded check passed or failed. Preserve and expose appropriate verified rule explanations before asking an LLM to reconstruct them. Do not convert inferred private values from a brief into authorized matching inputs.

8. **The provider integration is validated tool calling, not strict constrained output generation.** It sends a function schema with `tool_choice: required`, temperature 0, low reasoning, hidden reasoning, no parallel tool calls and 1000 maximum completion tokens. Zod validates the result after generation. `z.strictObject` is not Groq's strict decoding. Zod refinements and exact-quote checks are not fully expressible in the exported JSON schema. An extraction-only call is a candidate for strict JSON-schema response mode, after compatibility testing; semantic and source validation must remain.

9. **Budget accounting prevents runaway calls, but does not schedule token demand.** Persistent daily call counters and a shared provider cooldown exist. Successful response headers do not feed a proactive TPM scheduler, and rate limits are discovered reactively. All legacy tool messages remain in history; compaction removes proof metadata but a pre-compaction 32K-character/30-message limit can still reject context. There is no progress-based duplicate search suppression in the legacy loop.

## Live observations versus hypotheses

| Synthetic case | Observed result | Application latency | Prompt / completion tokens |
|---|---|---:|---:|
| Master's, exclude national, Maharashtra, written income | Schema valid; effective PG/state/income constraints correct. Explicit UG exclusion omitted but PG include already excludes it under current exact filtering. | 1556 ms | 878 / 377 |
| Pragati fourth-year renewal, not first application | HTTP 200/tool_calls, then INVALID_RESEARCH_INTENT | 1754 ms | 881 / 533 |
| Earlier UG/national/hostel, corrected to PG/Maharashtra | Schema valid; corrections retained, hostel requirement stranded in `other` rather than executed search | 1729 ms | 887 / 472 |

All three were below the cap, with 114/220/203 reasoning tokens reported. No 429, timeout or truncation occurred. Total: 2646 input + 1382 completion = 4028 tokens. Free-account usage cost: $0 under the confirmed plan. At the documented paid GPT-OSS rates, the uncached list-price equivalent is approximately $0.00123 for all three; this is not a charge or a production cost forecast. One response had cached input, so uncached arithmetic is conservative.

The failed case's raw arguments were not retained, so this sample cannot distinguish a schema/refinement violation from an invalid quote anchor. The diagnostic script now records safe validation categories for future runs; no extra call was made to reconstruct it. Two schema successes out of three are not a semantic accuracy rate. No live evidence synthesis, contradiction handling, or tool-planning quality was tested.

The surviving historical run aggregates were all legacy workflows: one cancelled MODEL_LIMIT run at six calls; one PROVIDER_QUOTA run at six attempts; one cancelled app QUOTA_EXHAUSTED run; two completed runs totaling ten calls. This confirms both application and provider limits have occurred. It does not establish that every reported failure came from the model or reveal deleted history.

Hypotheses worth testing: low reasoning/output budget may harm longer cases; source-anchor copying and union/refinement complexity may cause avoidable rejection; larger prompts/history may trigger TPM bursts; another model may interpret constraints more faithfully. None is proven by this three-call sample. Increasing reasoning globally is not supported by these results.

## Limits verdict

| Limit | Current effective behavior | Recommendation |
|---|---|---|
| Provider quota | Public Free table: 30 RPM, 1000 RPD, 8000 TPM, 200000 TPD for GPT-OSS 120B; actual organization limits can differ | Respect; read headers, queue token demand, show realistic waiting state; no key rotation |
| App daily calls | Configured global 100, user 50; defaults 20/8 | Keep global protection; size from measured tokens and expected users, not calls alone |
| Model attempts | Config says 6, new workflow forces 1 | Replace with route-specific ceilings: 0 for structured browsing, 1 for interpretation, usually one additional answer call only when needed |
| Tool actions | Configured 8; search consumes 1 and reserves 3, leaving 4 candidates | Separate cheap local reads from paid inference/network budgets; retain bounded batches and progress checks |
| Output/reasoning | 1000 tokens, low reasoning; configurable output maximum 2000 | Keep baseline until A/B evaluation; reserve bounded output by task and schema size; no blanket high reasoning |
| Time | Provider 20s; advance 40s; lease 60s; source check 10s; Mongo 3s | Keep deadlines/cancellation; measure end-to-end latency before tuning; never exceed lease safety |
| Context | 1000-char brief, up to 4 prior user turns via API; UI sends only brief/profile; 32K raw message chars/30 messages | Add explicit referent/context state for follow-ups; compact before token admission; do not silently truncate questions at 300 chars |
| Abuse/security | 5 start attempts/hour, 30 writes/min, 120 reads/min; owner scope, leases, allowlists, citation checks | Preserve security; make start throttle configurable for development/product use; don't charge ordinary recoverable refinement as a fresh investigation |

An operational cap should bound work, not determine whether a question is answerable. Reserve finalization capacity and report answer coverage separately from execution completion. Permit at most one repair for a known correctable formatting error only when token capacity exists; do not automatically retry 429/auth failures or ambiguous crashed attempts.

## Target architecture and model decision

Use the existing Express/Mongo infrastructure and a small hybrid router, not another agent framework:

1. Structured catalogue inputs go directly to retrieval. Natural-language requests go through the preserved validated intent boundary.
2. Resolve canonical catalogue vocabulary and classify constraints as confirmed match, confirmed mismatch, or unknown. Retrieve plausible candidates without asserting unknowns satisfy exclusions.
3. Use the deterministic rule engine for authorized inputs; expose rule-level reasons. Retrieve evidence per outstanding question with existing scheme/version boundaries.
4. When the student asks a question that the retrieved material can address, one bounded model call produces claim-level answers linked to evidence IDs and explicit unresolved conditions. Validate IDs and source integrity deterministically. Entailment and interpretation still need evaluation; valid IDs alone are not proof that a claim is true.
5. Only material evidence gaps trigger further bounded research: another within-scheme retrieval, a registered freshness check, or one focused clarification. Changed/missing official data returns to ingestion/review. Stop when the next action cannot improve coverage; present partial useful answers honestly.
6. Track completed work and unresolved questions separately. Reuse retrieved/versioned evidence and validated intent on follow-up; invalidate caches on source/profile/intent changes.

Keep GPT-OSS 120B provisionally, but do not approve it as the final reasoning model yet. Its current live intent reliability is insufficient, while architectural defects dominate answer quality. Compare the current adapter with strict schema extraction and adequate bounded output, then one genuinely different model on identical reviewed cases.

Candidate comparison:
- GPT-OSS 20B/Groq: inexpensive, same adapter, but current free table gives the same TPM/RPD; it is not a quota remedy. Use only if measured accuracy is adequate.
- Qwen 3.8 27B/Groq: documented strict-output support and current free quota make it a low-integration-cost comparison candidate. Verify account availability and lifecycle; no Udaan quality evidence yet.
- Gemini 2.5 Flash: documented free tier and configurable thinking make it a useful independent comparison, not an assumed winner. Requires a provider adapter and checking account quotas/data terms; free-tier content is marked as used to improve Google's products, so begin with synthetic/public evidence only.
- OpenRouter free variants: useful experiments, but additional provider routing, varying model availability and account-specific limits are poor foundations for a dependable default/fallback.
- Paid inference: possible later explicit opt-in with a spend ceiling; unnecessary for this diagnosis. Do not introduce automatic paid escalation.
- Two-model production routing: defer until a measured quality/cost difference justifies another operational dependency. Start with one selected model serving two distinct contracts (intent and evidence answers).

## Compact repeatable evaluation

Maintain 12 reviewed cases, scored at stage boundaries, not only by run status:

1. National UG discovery with an income bound.
2. Master's wording with bachelor's exclusion.
3. State-only request excluding nationwide awards.
4. Fourth-year fresh application versus renewal.
5. Follow-up correction retaining the earlier funding purpose.
6. Contradictory include/exclude conditions: ask a focused clarification.
7. Cross-field alternatives: preserve logic or explicitly request clarification, never silently flatten.
8. Unfamiliar paraphrase for accommodation costs.
9. Catalogue candidate with missing level metadata.
10. Scheme present but requested clause absent: unknown, not denial.
11. Conflicting academic-year/deadline evidence: expose conflict and avoid an unsupported resolution.
12. Malformed output, 429, timeout and cancellation as injected transport variants: bounded termination and truthful recovery.

Use existing synthetic source/evidence helpers and durable fixtures for deterministic regressions. Add a small reviewed public-source subset for live end-to-end answers; don't infer truth from the LLM itself. Freeze document versions and expected supporting spans. Record: constraint preservation/contradiction correctness, candidate recall and confirmed-mismatch rate, supporting-passage recall, claim support/abstention, useful-answer completion, duplicate actions, stage and end-to-end latency, input/output/reasoning tokens, finish reason, safe validation failure category, provider-vs-app quota error, and estimated cost. Keep raw private prompts and hidden reasoning out of logs.

Compare identical cases with current vs strict extraction first, then one challenger. For tiny samples report counts and case-level failures; do not claim p95 or statistically stable accuracy. Treat any fabricated eligibility claim, lost exclusion, or cross-scheme citation as a release blocker. Schema validity and status=completed are separate from useful-answer success.

## Prioritized increments

1. **Immediate product fix: make intent-to-retrieval coverage explicit.** Retain unknown candidates separately from verified matches; canonicalize vocabulary from existing catalogue/rule definitions; ensure every constraint/question is executed, deliberately unresolved, or clarified. Do not label unknowns as eligible or silently relax exclusions. Test metadata-missing cases, scope aliases, and hostel-purpose preservation. Benefit: useful coverage regardless of model choice.
2. **Small model acceptance gate.** Preserve semantic schema, test strict decoding and validation diagnostics, compare a challenger using the reviewed corpus. Reject release if critical semantic failures remain. Benefit: stop investing on assumed model quality.
3. **Add evidence-answer synthesis for a selected scheme/question.** Keep deterministic rule reasons, source IDs and partial answers; no autonomous loop yet. Benefit: directly answers the question rather than displaying a pile of quotations.
4. **Add only measured gap-resolution actions and follow-up state.** Token-aware admission, duplicate-action suppression, cached retrieval, material clarifications and explicit partial outcomes. Benefit: adaptive behavior where evidence warrants it, without a general unrestricted agent.

The hybrid has less overhead and fewer failure opportunities than a model-driven action at every step. It adds an answer call for questions that need explanation, trading some latency/tokens for the capability currently missing. It still cannot answer questions absent from available official evidence; data coverage and reviewed ingestion remain necessary. A free-tier demo is feasible; dependable multi-user throughput is not guaranteed by a free quota.

## Provider references checked

- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/reasoning
- https://console.groq.com/docs/model/openai/gpt-oss-120b
- https://console.groq.com/docs/models
- https://ai.google.dev/gemini-api/docs/pricing
- https://openrouter.ai/docs/api_reference/limits

Provider tables change; account limits and model availability must be checked at evaluation time. No benchmark claim is used as evidence of Udaan task quality.
