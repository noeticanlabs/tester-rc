# CohBit-Copilot v5.0 — Full System Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T04:27:26.745Z
**Evidence Level:** surface_detected

## System Status
| Layer | Status | Entries |
|-------|--------|---------|
| Code Atlas (Rust) | ✅ seeded | 214 |
| Math Atlas (Lean) | ✅ seeded | 0 |
| TLT Atlas (Docs) | ✅ seeded | 0 |
| Memory Graph | ✅ built | 451 edges |
| Repair Routing | ✅ classified | 214 routes |
| Review Receipts | ✅ stored | 214 receipts |
| Retrieval Guard | ✅ filtered | 0 reviewed / 0 unreviewed |

## 1. Repository
- Files: 1089 | Language: rust
- Content read: 500 files, 3332KB

## 2. Code Atlas (Rust)
- Findings: 835 | P0: 184 | P1: 30
- Production: 780 | Test: 0
- High×High: 216 | High×Med: 30
- Unsafe: 1 | FS writes: 38 | Process: 76
- Symbols: 11204 | Functions: 5182
- Atlas entries: 214 | Graph edges: 451

## 3. Math Atlas (Lean)
- Lean files: 0 | Math entries: 0 | Risks: 0
_No Lean files with detectable mathematical content._

## 4. TLT Atlas (Docs)
- Doc files: 0 | Language entries: 0 | Content risks: 0
_No doc files with detectable risk patterns._

## 5. Cross-Language
_No cross-language edges (Lean or doc content below detection threshold)._

## 6. Repair Routing
- Routes: 214 | human_review_required: 214
- mayGenerateProposal: 0 (should be 0)

## 7. Review + Retrieval
- Reviewed: 0 | Unreviewed: 0
- Guard accepted: 0 | Rejected: 214

## 8. Resource Budget
- Compute: 12.9s / 180s (within_budget)
- Content: 3332KB / 51200KB
- Health: **healthy**

## 9. Limitations
- **Evidence:** surface_detected (regex + content heuristics). No AST parser.
- **Math atlas:** T14 keyword heuristics (sorry, admit, theorem, proof). Not Lean-aware.
- **TLT atlas:** T7 claim inflation detection. Not semantically verified.
- **Cross-language:** Structural links only. No semantic Lean↔Rust equivalence proof.
- **Review receipts:** Synthetic demo decisions. Not human-reviewed.

---
*v5.0 Full System Audit. One command. One report. All layers orchestrated.*