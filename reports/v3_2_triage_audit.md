# CohBit-Copilot v3.2 — Triaged Review Queue Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\dictionary\Doctrine curriuclum
**Ran:** 2026-06-04T03:31:25.897Z
**Evidence Level:** surface_detected (regex scan, not AST-verified)

## Review Queue Summary
| Priority | Count | Action |
|----------|-------|--------|
| **P0** — Immediate | **0** | Review now |
| **P1** — Next | **0** | Review at next opportunity |
| **P2** — Regular | **0** | Review during maintenance |
| **P3** — Low | **0** | Review if bandwidth permits |
| **Total** | **0** | — |

## 🟢 P0 — No Immediate Review Items
_No high-severity, high-confidence findings in production code._

## Calibrated Signal Summary
| Metric | Value |
|--------|-------|
| Total calibrated findings | 0 |
| Production context | 0 |
| Test/fixture context | 0 |
| Bench context | 0 |
| High×High severity×conf | 0 |
| High×Med severity×conf | 0 |
| Medium×High severity×conf | 0 |

## Legacy Category Summary
| Category | Count |
|----------|-------|
| unwrap/expect | 0 |
| panic/todo/unimpl | 0 |
| unsafe | 0 |
| filesystem writes | 0 |
| process commands | 0 |

## Symbol Extraction
- 0 symbols — 0 functions (0 public), 0 tests

## Resource Budget
- Compute: 0.0s / 120s (within_budget)
- Content: 391KB / 51200KB
- Health: **healthy**

## Limitations
- **Evidence:** surface_detected (regex). No AST parser. Priority is review signal, not defect certification.
- **Test context:** Path-heuristic classification. P0 only triggers in production (src/example) context.

---
*v3.2 Triaged Audit. v3.0 made it real. v3.1 made it precise. v3.2 makes it actionable.*