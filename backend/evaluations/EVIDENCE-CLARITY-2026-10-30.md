# Evidence reliability and clarity — 30 October 2026

## Confirmed boundaries and fixes

PDF extraction in `pipeline/core/documents.js` normalizes each page, joins pages with original stored separators and records page-start offsets. Snapshot hashing happens after extraction. Evidence generation in `pipeline/core/evidence.js` already tolerates whitespace when locating input quotations and persists the exact matched source slice. Neither extraction nor immutable snapshots needed alteration.

The asymmetry was in final answer validation: `quotationSpan.js` required a verbatim substring from the model, so PDF line-wrap differences rejected otherwise identical words. The new fallback collapses **Unicode whitespace runs only**, keeping a UTF-16 mapping back to the original source. It retains the original boundary checks, refuses ambiguous formatting-only matches, and returns the original slice and offsets. `answerValidation.js` stores that original slice instead of the model's reformatted text. Case, punctuation, numbers, hyphens, Unicode characters, word order, substitutions and omissions are not repaired. JSON escape sequences are not decoded. Source/snapshot hashes and provenance remain untouched.

For example, a model's `Annual family income must not exceed Rs 300000; exceptions remain applicable.` can align to the same words separated by CRLF and indentation. The accepted proof contains the original CRLF and indentation. Changing `300000`, removing the exception, inserting `not`, or changing `SC/ST` to `OBC` still fails. Alignment proves text correspondence, not semantic entailment.

The Pragati duration section was split at a recorded PDF page boundary after “through”, separating the lateral-entry continuation and benefit exceptions. When duration is actually requested, a short cross-page duration section now becomes one exact **contiguous original snapshot slice**, including the stored separator. This is not a constructed quotation. Its starting page is retained and its original page range is recorded in `locator`, available in the detailed supporting-source link. The 1,400-character passage cap is unchanged; ordinary retrieval keeps page windows. Larger sections are not concatenated.

Answer instructions now ask for one or two short sentences: direct answer, material conditions/exceptions, uncertainty and a practical next step. They explicitly retain progression/forfeiture for renewal, and keep quotations in evidence rather than repeating them in prose. Redundant prompt sentences were removed to preserve the context allowance: an existing test caught an initial prompt expansion crowding out a residence clause, and that regression was corrected.

The main preview now has up to three conditions and reserves space for an uncited unknown, while keeping the unknown status/question icon. The detailed answer also shows the leading unresolved explanation without requiring expansion. Unknowns do not count as supporting findings or promote eligibility. No old model prose was shortened algorithmically or recast as verified; the prompt change affects future generation only.

## Eight-case replay

Same questions, source captures, scripted responses and expectations as the previous review. [After observations](results/2026-10-30-offline-after-evidence.json) retain tool execution, exact proofs, status and visible findings. Original historical model responses and scorer negative controls are unchanged. No model calls or portal access occurred.

| Case | Evidence/presentation change | Conservative usefulness verdict and cause |
| --- | --- | --- |
| Category correction, no admission, unknown income | All six previous formatting-only quote losses recover; main question has a cited explanation | Still incomplete: historical prose does not fully explain approved-institution/entry requirements and unmet admission. Remaining model-output limitation, not the old quotation loss |
| OBC applicant, SC-only scheme | Recorded exclusion preserved | Pass |
| Fourth-year renewal | Full duration continuation reaches the packet, alongside renewal/progression evidence; unsupported old conclusion is prominent as unknown | Fail: historical `along` → `atong` substitution remains rejected; promotion-only year support remains rejected. No new generation occurred |
| Part-time mode guidance | Scoped missing-evidence explanation is now in the main preview | Still incomplete under the prior full-answer expectation: historical admission explanation is thin and part-time permission remains unestablished. Genuine evidence/interpretation gap, not permission to invent a rule |
| Synthetic UP/UG/OBC discovery | Recorded compatible requirements preserved; broad unresolved question is visible | Pass for recorded compatibility, not official eligibility |
| Synthetic complete income | Existing recorded match and exact citation preserved | Pass |
| Synthetic missing income | Cited ceiling remains useful; private compatibility unknown | Pass |
| Synthetic recorded deadline | Completes without unrelated clarification; source uncertainty is visible | Pass only for the recorded date in metadata; verified current window remains unestablished |

The bounded usefulness classification remains **5/8**. Evidence recovery and visibility improved; failed historical outputs were not rewritten or given easier expectations to increase that number. The distinction between a recorded cycle date and independently verified current application dates remains intact.

## Validation and limits

- Navigator suite: 255 passed. An additional validator integration regression plus the focused format/reliability run passed 17 checks, including exact-source storage after alignment, ambiguous matches, altered facts/restrictions, incomplete boundaries, UTF-16 offsets, cross-page continuation and concise-instruction safeguards.
- Frontend unit suite: 156 passed; lint and production build passed.
- Four focused browser checks passed for mobile/desktop recorded findings, source citations and visible unresolved conditions, including an assertion on the main unknown-condition preview before expanding details.
- Existing source-change, contradiction, fabricated-claim, deterministic-eligibility and budget tests remain passing. No architecture, evaluator, discovery, persistence or ingestion redesign was introduced.

No additional Gemini requests were made. The prior receipt remains at two attempted requests, last written at `2026-10-30T15:05:49Z`, SHA-256 `654a274c5ade0bccd6d771520070674e0d16e11e1a282e0191b87fff892257fc`. Its contents were read for verification only.

Remaining limits: whitespace-only alignment cannot correct OCR errors, word substitutions, dehyphenation or reordered columns. Long cross-page sections remain bounded rather than joined arbitrarily. Structural quotation integrity does not prove semantic entailment or current-year applicability. New concision/progression instructions were tested offline and were not validated through another live model request.
