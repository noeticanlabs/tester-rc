# CohBit-Copilot v4.0 — Memory-Aware Atlas Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T03:55:53.585Z
**Evidence Level:** surface_detected (regex scan, not AST-verified)

## ⚠ Important
> Atlas entries in this audit are **advisory memory records** derived from surface-detected findings.
> They are **not proof of defect**, not verified repairs, and **not gate-pipeline receipts**
> unless explicitly linked to a receipt.

## 1. Summary
| Metric | Value |
|--------|-------|
| Files | 5404 | Language: rust |
| Calibrated findings | 835 |
| P0 (immediate) | **184** |
| P1 (next) | **30** |
| P2/P3 (lower) | 621 |
| P0/P1 seeded to atlas | **214** |
| Memory graph edges | 451 |

## 2. Atlas Store
- Entries written to `.cohbit/atlas/entries/`
- Written: 214 | Errors: 0
- All entries: `claimStatus=draft`, `evidenceLevel=surface_detected`

## 3. Invariant Coverage
| Invariant | Name | Findings | Top Risk Context |
|-----------|------|----------|-----------------|
| INV_009 | — | 189 | filesystem_path_from_variable |
| INV_006 | — | 183 | filesystem_path_from_variable |
| INV_017 | — | 83 | filesystem_path_from_variable |
| INV_002 | — | 76 | process_command |
| INV_010 | — | 30 | panic_review_signal |
| INV_005 | — | 14 | filesystem_delete_file |
| INV_013 | — | 13 | filesystem_delete_file |
| INV_016 | — | 12 | relative_traversal |
| INV_012 | — | 1 | unsafe_block |

## 4. Failure Mode Coverage
| Failure Mode | Findings | Severity |
|-------------|----------|----------|
| FAIL_INPUT_001 | 159 | **medium** |
| FAIL_MEM_004 | 95 | **high** |
| FAIL_PANIC_001 | 30 | **medium** |
| FAIL_MEM_005 | 13 | **high** |
| FAIL_MEM_001 | 1 | **high** |

## 5. Memory Graph Summary
- Graph ID: XLG_SEED_v4.0_1780286151859
- Total edges: 451
- Edge types: finding→file (uses_invariant), file→invariant (maps_to), invariant→failure_mode (blocked_by)
- Files linked: 377 nodes

## 6. Retrieval Guard
- Candidates: 0 accepted / 214 rejected
- Evidence level: none

## 7. Calibrated Signal Summary
| High×High | High×Med | Medium×High | Medium×Med | Low×Low |
|-----------|----------|-------------|------------|---------|
| 216 | 30 | 0 | 483 | 86 |

## 8. Resource Budget
- Compute: 1.7s / 120s (within_budget)
- Content: 3332KB / 51200KB
- Health: **healthy**

## 9. Limitations
- **All entries are draft** — claimStatus=draft, evidenceLevel=surface_detected
- **Deterministic memory IDs only** — sha256(session+finding+file+line).slice(0,32)
- **P0/P1 only** — P2/P3 findings not stored (gated behind config)
- **Heuristic mapping** — riskKind→invariant is fixed, not context-aware
- **No cross-language edges** — Rust-only analysis
- **Append-only storage** — no deduplication or conflict resolution

---
*v4.0 Memory-Aware Audit. v3.0 made it real. v3.1 made it precise. v3.2 made it actionable. v4.0 makes it rememberable.*