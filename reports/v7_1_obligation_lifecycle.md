# CohBit-Copilot v7.1 — Obligation Lifecycle + Query Report Trial
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-02T22:42:55.372Z
**Reviewer:** v7.1-synthetic (demo — all lifecycle transitions are synthetic)

## ⚠ Important
> All lifecycle transitions in this trial are SYNTHETIC DEMONSTRATION.
> No human reviewer made these decisions.
> Closing an obligation tracks responsibility — it does not delete the finding.

## Pipeline Flow
```
finding → invariant → failure mode → transition → verifier route → repair obligation
→ lifecycle (open → under_review → accepted_risk / false_positive / needs_repair / deferred / resolved)
→ close with receipt → query → report
```

## 1. Obligation Summary
| Metric | Value |
|--------|-------|
| Total obligations created | 214 |
| Open (not yet under review) | 206 |
| Under review | 2 |
| Deferred | 3 |
| Accepted risk | 1 |
| False positive | 1 |
| Needs repair | 1 |
| Closed via receipt | 3 |
| Receipt IDs issued | 3 |

## 2. By Transition Class
| Transition | Obligations |
|------------|------------|
| CheckedResourceLifecycle (TRANS_003) | 13 |
| SafeMutation (TRANS_006) | 1 |
| InputValidation (TRANS_013) | 159 |
| PanicBoundaryControl (TRANS_019) | 30 |

## 3. By Invariant
| Invariant | Obligations |
|-----------|------------|
| INV_006 (ConditionalBranch) | 213 |
| INV_009 (ErrorPath) | 200 |


## 4. Report — Status Distribution
| Status | Count |
|--------|-------|
| accepted_risk | 1 |
| false_positive | 1 |
| needs_repair | 1 |
| under_review | 2 |
| deferred | 3 |
| open | 206 |

## 5. Report — Transition Distribution
| Transition | Count |
|------------|-------|
| InputValidation | 159 |
| CheckedResourceLifecycle | 13 |
| PointerValidityCheck | 11 |
| SafeMutation | 1 |
| PanicBoundaryControl | 30 |

## 6. Open Obligations (213)
| File | Risk Kind | Priority | Transition | Status |
|------|-----------|----------|------------|--------|
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/coh-ctrl/src/main.rs | filesystem_path_from_variable | P0 | InputValidation | accepted_risk |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/ast_patch.rs | process_command | P0 | InputValidation | needs_repair |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/ast_patch.rs | command_new | P0 | InputValidation | under_review |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | process_command | P0 | InputValidation | under_review |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | command_new | P0 | InputValidation | deferred |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | command_new | P0 | InputValidation | deferred |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | command_new | P0 | InputValidation | deferred |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | command_new | P0 | InputValidation | open |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | command_new | P0 | InputValidation | open |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | command_new | P0 | InputValidation | open |

## 7. Stale Obligations (0)
_No stale obligations (all < 30 days)._

## 8. Constraint Verification
- Obligations created for human_review_required findings: ✅
- Stable repair IDs: ✅
- Queryable by status: ✅ (open=206, review=2, deferred=3)
- Queryable by transition: ✅ (TRANS_003=13)
- Queryable by invariant: ✅ (INV_006=213)
- Close requires receipt: ✅ (3 via receipt)
- No source mutation: ✅
- No obligations deleted: ✅

## 9. Resource
- Compute: 1.4s / 180s
- Content: 3332KB
- Health: **usable_with_limits**

---
*v7.1 Obligation Lifecycle Trial. v7.0 made the atlas spine operational. v7.1 makes obligations governable.*