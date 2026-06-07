# CohBit-Copilot v8.3 — Integrated Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\CohBit-primitive-main\CohBit-primitive\rust
**Ran:** 2026-06-06T14:48:13.890Z

## Boundary Status
| Field | Value |
|-------|-------|
| Evidence level | surface_detected |
| Mutation status | none (audit is observation-only) |
| Proposal status | none (all findings refused or gated) |
| Commit status | not_applicable (audit does not commit) |
| Limitations | Regex-based Rust risk scan. Not AST-verified. Test-file findings are expected patterns, not production risks. Binary files rejected. 50MB/500 file budget enforced. |

> ⚠ Findings are review signals, not verified defects. No mutation was performed during this audit.

## Repository
- Files: 626 | Language: rust
- Content read: 500 files, 4659KB

## Findings
| Metric | Value |
|--------|-------|
| Total calibrated | 1061 |
| Evidence: surface_detected | 1061 |
| Production | 593 |
| Test | 419 |
| P0 | 72 | P1 | 15 | P2 | 488 | P3 | 486 |
| High×High | 167 | High×Med | 15 |
| Unsafe | 1 | FS writes | 74 | Process | 4 |

## Atlas Memory
- Entries: 87 | Edges: 193

## Obligations
| Status | Count |
|--------|-------|
| open | 72 |
| under_review | 15 |
| Open | 87 |
| Stale | 0 |

## Dashboard
- Total: 87 | Open: 72 | Review: 15 | Deferred: 0
- Stale high: 0 | Review req: 0
- Escalations: 0

## Proposals
- Generated: 0 | Gate-ready: 0
- Applied: 0 (always gated)
- Claim status: draft (all findings surface-detected)

## Reconciliation (v8.1)
| Metric | Value |
|--------|-------|
| New obligations | 3 |
| Existing obligations (unchanged) | 69 |
| Changed obligations (content updated) | 15 |
| Closed obligations preserved | 0 |
| Duplicates prevented | 84 |

## Symbols
- Total: 12737 | Functions: 5728 | Tests: 1485

- Reconciliation: 3 new | 69 existing | 0 closed preserved | 84 dupes prevented

## Resource
- Compute: 1.4s / 300s
- Content: 4659KB / 51200KB
- Health: **usable_with_limits**

---
*v8.0 Integrated Audit. One command. One report. Full v7 pipeline.*