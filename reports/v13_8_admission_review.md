# CohBit-Copilot v13.8 — Learning Admission Review

**Receipt ID:** `AR_d34e9c4c5873`
**Generated:** 2026-06-07T13:25:51.515Z
**Version:** 13.8.0
**Prior v13.7:** `SC_3b4f1c6d497d`

---

## Safe Claim

> CohBit-Copilot v13.8 reviews the 42 stable candidate curriculum findings,
> scoring each by evidence strength and generating per-candidate admission
> recommendations. Automated recommendations are advisory only — all admission
> decisions remain `pending_human_review`. No findings are admitted as learned
> without explicit human sign-off. Evidence remains capped at `corpus_extracted`.

---

## Summary

| Metric | Value |
|--------|-------|
| Total candidates | 42 |
| Recommend: admit_as_learning_record | 3 |
| Recommend: defer_needs_content_review | 39 |

---

## Scoring Rules

| v13.6B Status | Score | Recommendation |
|---------------|-------|----------------|
| `strongly_structurally_confirmed` | 3 | `admit_as_learning_record` |
| `cross_observed` | 2 | `admit_as_learning_record` |
| `structurally_supported_stale_mapping` | 1 | `defer_needs_content_review` |

---

## Recommended: Admit as Learning Record (3)

### CC_TLT_1

| Field | Value |
|-------|-------|
| Source | Noetican Code\Noetican Bilingual Atlas.txt |
| Original type | close_analogue |
| v13.6B status | `cross_observed` |
| Score | 2/3 |
| Recommendation | **`admit_as_learning_record`** |
| Human review | **pending_human_review** |

**Evidence trail:**
- v13.4 curriculum: ✅
- v13.5 reobservation: ✅
- v13.6A structural: cross_observed
- v13.6B content: structurally confirmed

**Limitations:**
- Evidence ceiling: corpus_extracted
- Admitted does NOT mean verified, canon, or proven
- Admission may be withdrawn if reobservation diverges

### CC_LAYERS_12

| Field | Value |
|-------|-------|
| Source | Noetican Code\Noetican Code layers.txt |
| Original type | close_analogue |
| v13.6B status | `strongly_structurally_confirmed` |
| Score | 3/3 |
| Recommendation | **`admit_as_learning_record`** |
| Human review | **pending_human_review** |

**Evidence trail:**
- v13.4 curriculum: ✅
- v13.5 reobservation: ✅
- v13.6A structural: strongly_structurally_confirmed
- v13.6B content: structurally confirmed

**Limitations:**
- Evidence ceiling: corpus_extracted
- Admitted does NOT mean verified, canon, or proven
- Admission may be withdrawn if reobservation diverges

### CC_MATH_13

| Field | Value |
|-------|-------|
| Source | Noetican Code\Noetican Multimodel Mathematics V.0.txt |
| Original type | close_analogue |
| v13.6B status | `cross_observed` |
| Score | 2/3 |
| Recommendation | **`admit_as_learning_record`** |
| Human review | **pending_human_review** |

**Evidence trail:**
- v13.4 curriculum: ✅
- v13.5 reobservation: ✅
- v13.6A structural: cross_observed
- v13.6B content: structurally confirmed

**Limitations:**
- Evidence ceiling: corpus_extracted
- Admitted does NOT mean verified, canon, or proven
- Admission may be withdrawn if reobservation diverges

---

## Recommended: Defer — Needs Content Review (39)

| Finding ID | Source | Score | Status |
|------------|--------|-------|--------|
| CC_CODE_2 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_3 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_4 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_5 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_6 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_7 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_8 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_9 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_10 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_CODE_11 | Noetican Code\Noetican Code Invariant At | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_14 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_15 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_16 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_17 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_18 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_19 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_20 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_21 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_22 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_MATH_23 | Noetican Code\Noetican Multimodel Mathem | 1 | `structurally_supported_stale_mapping` |
| CC_RES_24 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_25 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_26 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_27 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_28 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_29 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_30 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_31 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_RES_32 | Noetican Code\Noetican Resource Layer v0 | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_33 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_34 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_35 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_36 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_37 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_38 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_39 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_40 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_41 | Noetican Code\Noetican Tooling Layer v0. | 1 | `structurally_supported_stale_mapping` |
| CC_TOOL_42 | Noetican Code\Noetican Tooling Layer v1. | 1 | `structurally_supported_stale_mapping` |

---

## Human Review Instructions

This report contains automated advisory recommendations. No findings have been admitted as learned. For each candidate marked admit_as_learning_record, a human reviewer must explicitly confirm admission. For each candidate marked defer_needs_content_review, deeper content hash comparison is recommended before re-review. Evidence ceiling remains corpus_extracted for all candidates. Admitted learning records may be promoted to canon_candidate only after independent verification and additional stability runs.

---

## Attestation

CohBit-Copilot v13.8 reviews 42 stable candidate curriculum findings with automated advisory recommendations. All admission decisions remain pending_human_review. No findings are admitted as learned without explicit human sign-off. Evidence remains capped at corpus_extracted. No canon is promoted. No source is modified.

---

*Generated by CohBit-Copilot v13.8 Learning Admission Review Pipeline*
*Receipt ID: AR_d34e9c4c5873*