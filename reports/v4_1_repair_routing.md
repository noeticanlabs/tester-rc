# CohBit-Copilot v4.1 — Repair Routing Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T04:08:41.126Z
**Evidence Level:** surface_detected (regex scan, not AST-verified)

## ⚠ Important
> Repair routing classifies atlas memory into possible next actions.
> It does **not** generate, authorize, apply, verify, promote, or commit any repair.
> All routes have `mayGenerateProposal=false`. No automatic patch generation.

## 1. Summary
| Metric | Value |
|--------|-------|
| Files | 5404 | Language: rust |
| Calibrated findings | 835 |
| P0/P1 seeded | 214 |
| Routes classified | **214** |

## 2. Repairability Breakdown
| Repairability | Count | May Generate Proposal |
|--------------|-------|----------------------|
| human_review_required | **214** | 0 (none) |

## 3. Human Review Required (214)
| File | Line | Risk Kind | Reason |,|------|------|-----------|--------|,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/coh-ctrl/src/main.rs | 425 | filesystem_path_from_variable | Filesystem operation on variable path is an injection risk. Requires h... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-builder/src/lib.rs | 40 | filesystem_path_from_variable | Filesystem operation on variable path is an injection risk. Requires h... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/ast_patch.rs | 9 | process_command | External process execution is a trust boundary. Requires human securit... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/ast_patch.rs | 36 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 10 | process_command | External process execution is a trust boundary. Requires human securit... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 36 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 46 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 70 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 141 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 150 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 186 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 268 | filesystem_path_from_variable | Filesystem operation on variable path is an injection risk. Requires h... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 279 | process_command | External process execution is a trust boundary. Requires human securit... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 279 | command_new | Command construction requires review of input sources. No automatic re... |,| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 416 | filesystem_path_from_variable | Filesystem operation on variable path is an injection risk. Requires h... |,> **214 findings require human review before any repair can proceed.**

## 4. Needs AST Analysis (0)
_No findings need AST analysis._

## 5. Diagnostic Only (0)


## 6. Needs Verification Evidence (0)


## 7. Hard Constraints (verified)
- `mayGenerateProposal`: **false** on all 214 routes ✅
- `unsafe_block` → human_review_required ✅
- `process_command` → human_review_required ✅
- `filesystem_delete` → human_review_required ✅
- `relative_traversal` → human_review_required ✅
- Test-context panic/unwrap → diagnostic_only ✅
- No patches generated ✅
- No evidence promoted ✅

## 8. Calibrated Signal Summary
| High×High | High×Med | Medium×High | Medium×Med |
|-----------|----------|-------------|------------|
| 216 | 30 | 0 | 483 |

## 9. Symbol Summary
- Symbols: 11204 | Functions: 5182 (1725 public)
- Structs: 792 | Tests: 721

## 10. Resource Budget
- Compute: 2.6s / 120s (within_budget)
- Content: 3332KB / 51200KB
- Health: **healthy**

## 11. Limitations
- **No repair generated** — mayGenerateProposal=false on all routes
- **Routing is rule-based** — same riskKind always routes to same class
- **Test context is path-heuristic** — unusual layouts may be misclassified
- **bounded_patch_candidate count is always 0** — gated behind AST analysis (v4.3+)

---
*v4.1 Repair Routing Audit. v4.0 made findings rememberable. v4.1 makes memory actionable without making it autonomous.*