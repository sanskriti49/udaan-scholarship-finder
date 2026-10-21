# Recursive eligibility rules (phases 1 and 2)

Scholarships can store an optional `ruleTree`. It is authoritative when present;
legacy `rules` arrays continue to mean AND, including existing fallback rules.
This adds the evaluator and ingestion/storage support. Existing source adapters
still extract flat criteria; they do not automatically interpret branching prose.
No official scholarship has been assigned a synthetic policy by this change.

## Tree format

```json
{
  "type": "OR",
  "children": [
    {
      "type": "AND",
      "children": [
        { "type": "CONDITION", "id": "engineering", "field": "stream", "operator": "EQ", "targetValue": "Engineering" },
        { "type": "CONDITION", "id": "engineering_marks", "field": "percentage", "operator": "GTE", "targetValue": 75 }
      ]
    },
    {
      "type": "AND",
      "children": [
        { "type": "CONDITION", "id": "humanities", "field": "stream", "operator": "EQ", "targetValue": "Humanities" },
        { "type": "CONDITION", "id": "humanities_marks", "field": "percentage", "operator": "GTE", "targetValue": 65 }
      ]
    }
  ]
}
```

This is a synthetic example. A Humanities student with 70% passes even when the
Engineering route fails. Marks percentages and CGPA are independent inputs; the
app does not invent a conversion between grading systems.

- `CONDITION`: existing rule fields plus `type`. Supported fields are
  `familyIncome`, `cgpa`, `percentage`, `educationLevel`, `stream`, `gender`,
  `casteCategory`, `state`, `hasDisability`. Numeric fields support LT/LTE/GTE/EQ
  with numeric targets; text fields support EQ/string or IN/string array;
  disability supports BOOLEAN_MATCH/EQ with boolean targets. Any/All/* and a
  national domicile scope impose no restriction.
- `AND` / `OR`: nonempty `children` arrays.
- `NOT`: one `child`.
- `CONDITIONAL_BRANCH`: required `condition`, `then` and `else` trees. This is
  if/then/else, not an ordered list of independent qualifying alternatives.
- Nodes may have a description; condition IDs are required and all declared IDs
  are unique. Group IDs are optional. Internal diagnostic IDs are reserved.

## Three-state semantics

| A | B | AND | OR |
|---|---|---|---|
| passed | passed | passed | passed |
| passed | failed | failed | passed |
| passed | unknown | unknown | passed |
| failed | failed | failed | failed |
| failed | unknown | failed | unknown |
| unknown | unknown | unknown | unknown |

AND/OR are commutative. NOT flips known results and preserves unknown. A known
conditional guard selects its branch. With an unknown guard, matching branch
statuses establish that status; different branch statuses stay unknown. Thus a
missing guard can still yield passed when both possible branches pass.

Missing answers, invalid legacy criteria, absent criteria, and malformed stored
trees stay unknown. A malformed tree never falls back to an easier flat policy.
An external manual-review flag remains a global condition. A known failure still
dominates a missing answer under AND.

## API and explanations

`POST /api/scholarships/evaluate` and `/match` retain the existing profile body.
Strict Zod validation rejects unknown keys and invalid types with HTTP 400 and
`errors: [{ path, message }]` before saving or querying. Existing form aliases,
numeric strings, blanks/nulls and explicit false are supported. Income cannot be
negative, CGPA must be 0–10 and marks must be 0–100.

`POST /api/scholarships/evaluate-tree` is an authenticated **admin-only, read-only
preview** accepting `{ "profile": { ... }, "ruleTree": { ... } }`. It neither
publishes policies nor changes a student's saved profile. Trees are strictly
validated before evaluation, at the pipeline boundary, and on model writes.
They allow at most 16 levels and 256 nodes; cycles, duplicate IDs, incompatible
operators/targets and unexpected keys are rejected.

Evaluations return `status`, `isEligible`, `evaluationTree`, relevant
`passedRules`/`failedRules`/`unknownRules`, document readiness, and match confidence.
The internal evaluator and preview also return `ruleResults` containing every
leaf. The complete trace retains failed or missing alternative branches, while
a passing OR exposes one passing proof in the primary checks. An unknown OR
exposes unresolved alternatives rather than labelling other failed alternatives
as disqualifiers. NOT is explained as a negated requirement. Conditional guards
route evaluation and are not themselves mandatory eligibility checks.

`matchConfidence` is a heuristic: AND averages child scores, OR uses the highest,
and known NOT outcomes score 0 or 1. Conditional branches use the selected score
or the lower possible score when their guard is unknown. Unknown answers score
zero; a manual review reduces the score. Only passed outcomes can score 100. It
is not an award probability or a count of all leaves in every possible route.

## Persistence and evidence

Tree structure is retained in immutable eligibility snapshots and semantic
hashes, so AND → OR produces a new version even with identical leaves.
Descriptions and source-only edits do not create semantic tree changes;
commutative child order is normalized for hashing.

Every leaf needs exact, checked source evidence for a verified version. Compound
policies also require a provenance quote with `ruleId: "policy_tree"` linked to
field evidence named `eligibility`, covering the overall policy expression.
This proves that the recorded excerpt exists in the stored snapshot; it does
not automatically verify that a human or adapter interpreted the logic correctly.
Operators and branch relationships must be reviewed against the complete source.

Fresh flat criteria cannot silently overwrite a stored policy expression. If
their leaves differ from the tree, ingestion preserves the tree and marks the
listing `needs_review` with a `rule_tree_requires_review` issue. Submit a complete
reviewed tree to republish. A partial fetch with unchanged or missing leaf data
continues to preserve recorded criteria.

Existing opt-in change alerts compare whole-tree outcomes for tree policies and
suppress changes that leave the student's outcome unchanged. Historical replay,
semantic change classification, and admin population backtesting remain later
phases.

## Cache correction

Known catalogue enums use a shared spelling whitelist in the controller and cache
key builder (`ug` → `UG`, `government` → `Government`). Unordered multi-select
filters normalize their order, duplicates, comma syntax and repeated parameters.
Free text, unknown values, paths and identifiers retain case. Arrays and nested
values have distinct identities; tracking parameters remain excluded. A `v2`
key segment avoids serving cache entries created under the previous normalization.
The eligibility result fingerprint uses evaluator version 3. No Redis flush or
database migration is needed.

## Local checks

From `backend/`: `npm test` and `npm run demo:rules`.
From `frontend/`: `npm run lint`, `npm test`, `npm run build`, and
`npx playwright test policy-tree.spec.mjs app-smoke.spec.mjs`.

Tests use local fixtures, controller/model stubs and the in-memory pipeline store.
Browser tests run the real evaluator with synthetic API responses. They do not
verify deployed MongoDB, Redis, notification delivery, or current official policies.
