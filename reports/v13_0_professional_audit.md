# CohBit-Copilot — Professional Audit Report
**Audit ID:** PRO_MQ3THEW8
**Generated:** 2026-06-07T13:27:50.696Z
**Mode:** internal

## Executive Summary
- **Overall Status:** healthy
- **Files analyzed:** 445
- **Findings:** 75 total (P0: 0, P1: 0, P2: 9, P3: 66)
- **Production findings:** 0
- **Test findings:** 75
- **High×High:** 2 | **High×Med:** 0
- **Unsafe blocks:** 0 | **FS writes:** 0 | **Process commands:** 0
- **Top risk modules:** L0_artifact.ts, L10_memory_graph.ts, L11_query.ts
- **Compute:** 0.3s | **Content:** 2998KB

> ⚠ Findings are review signals, not verified defects. No mutation was performed during this audit.


## Repository Overview
| Category | Count |
|-------|-------|
| Source files | 214 |
| Test files | 112 |
| Config files | 40 |
| Docs | 79 |
| Other | 0 |
| Total | 445 |
| Generated (excluded) | 0 |

**Symbols:** 399 total — 139 functions, 75 tests

**Source-to-test mappings:** 85 sources have identified tests

## Risk Distribution
### Severity × Confidence Matrix
|  | High Conf | Med Conf | Low Conf |
|-------|-------|-------|-------|
| High Sev | 2 | 0 | 7 |
| Med Sev | 1 | 0 | 65 |
| Low Sev | 0 | 0 | 0 |

### Priority Distribution
| Priority | Count | Action |
|-------|-------|-------|
| P0 | 0 | Review immediately |
| P1 | 0 | Review at next opportunity |
| P2 | 9 | Review during maintenance |
| P3 | 66 | Review if bandwidth permits |

### Risk by Module (Top 10)
| Module | Files | P0 | P1 | Risk Score | Test Coverage |
|-------|-------|-------|-------|-------|-------|
| L0_artifact.ts | 2 | 0 | 0 | 0 | covered |
| L10_memory_graph.ts | 1 | 0 | 0 | 0 | uncovered |
| L11_query.ts | 1 | 0 | 0 | 0 | uncovered |
| L12_governance.ts | 1 | 0 | 0 | 0 | uncovered |
| L13_canonical_pattern.ts | 1 | 0 | 0 | 0 | uncovered |
| L1_language_surface.ts | 2 | 0 | 0 | 0 | covered |
| L2_parse_ast.ts | 1 | 0 | 0 | 0 | covered |
| L3_invariant.ts | 1 | 0 | 0 | 0 | covered |
| L4_transition.ts | 1 | 0 | 0 | 0 | covered |
| L5_risk_constraint.ts | 1 | 0 | 0 | 0 | covered |

## Top Review Targets

_No findings to review._

## Uncovered High-Risk Files

_No uncovered high-risk files detected._

## Evidence-Rich Findings

_No P0 or P1 findings._

## Test Coverage Suggestions

### Sources with no identified tests (129)
> ⚠ These source files have no matching test files by naming convention. Verify manually.
| Source File | Tests Found |
|-------|-------|
| packages/code-atlas/src/L10_memory_graph.ts | 0 |
| packages/code-atlas/src/L11_query.ts | 0 |
| packages/code-atlas/src/L12_governance.ts | 0 |
| packages/code-atlas/src/L13_canonical_pattern.ts | 0 |
| packages/code-atlas/src/L6_projection.ts | 0 |
| packages/code-atlas/src/L7_verifier.ts | 0 |
| packages/code-atlas/src/L8_receipt.ts | 0 |
| packages/code-atlas/src/L9_repair_obligation.ts | 0 |
| packages/code-atlas/src/index.ts | 0 |
| packages/math-atlas/src/M0_artifact.ts | 0 |

### Sources with limited test coverage (84)
| Source File | Tests Found |
|-------|-------|
| packages/code-atlas/src/L0_artifact.ts | 2 |
| packages/code-atlas/src/L1_language_surface.ts | 2 |
| packages/code-atlas/src/L2_parse_ast.ts | 1 |
| packages/code-atlas/src/L3_invariant.ts | 1 |
| packages/code-atlas/src/L4_transition.ts | 1 |
| packages/code-atlas/src/L5_risk_constraint.ts | 1 |
| packages/code-atlas/src/store.ts | 2 |
| packages/tlt-atlas/src/L0_artifact.ts | 2 |
| packages/tlt-atlas/src/L1_language_surface.ts | 2 |
| packages/tlt-atlas/src/L2_phrase_parse.ts | 1 |

## Refusal / Proposal Boundary
> ⚠ This audit observed, classified, and reported. It did NOT authorize, mutate, apply, or commit.

| Boundary | Status |
|----------|--------|
| Evidence level | surface_detected (regex) / syntax_checked (AST-lite) |
| Claim status | review_signal (all findings) |
| Mutation status | none (no files were modified) |
| Proposal status | not_applicable (no proposals were generated) |
| Commit status | not_applicable (no commits were authorized) |
| Auto-proposal | refused (all findings are gated behind human review) |

**Proposal-eligible findings:** 0

> ⚠ Every finding in this report is a review signal, not a certified defect. No code was mutated. No commits were made.

## Limitations
- **Evidence level:** Regex-based pattern detection (`surface_detected`) with optional AST-lite structural context (`syntax_checked`).
- **Not a Rust compiler:** Does not resolve macros, generics, or trait bounds.
- **Path-heuristic test mapping:** Source-to-test mapping uses naming conventions, not symbol-level analysis.
- **Guard detection is local:** Nearby guard detection scans ±3 lines only. Cross-function guards are not detected.
- **Budget limits:** Content budget (50MB/500 files) may exclude large repositories.
- **No runtime analysis:** Does not execute code, track allocations, or profile performance.
- **Language scope:** Currently optimized for Rust. Non-Rust files receive generic file classification only.

> ⚠ This report is a professional audit signal. It is not a security certification, a correctness guarantee, or a replacement for human code review.

## Machine-Readable Output

JSON output written to: `c:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-Copilot\reports\v13_0_professional_audit.json`



The JSON file contains the full review queue with enriched findings, repo intelligence, and resource budget data.



---

*CohBit-Copilot v3.6 Professional Audit Report. Read-only. No mutation. Findings are review signals, not verified defects.*

## Trust-Kernel Evidence (v12)

| Kernel | Version | Available | Evidence-Only |
|--------|---------|-----------|---------------|
| Receipt Verification | v11.8 | ✅ | ✅ |
| Path Safety | v11.9 | ✅ | ✅ |
| Deterministic IDs | v12.0 | ✅ | ✅ |
| Audit Scanner | v12.1 | ✅ | ✅ |
| Policy / Admissibility | v12.2 | ✅ | ✅ |

**all available | all evidence-only | no authority seized**

## Resource Processor Map (R21)

| Processor | Logic | Evidence Level | CPU (ms) |
|-----------|-------|---------------|----------|
| content_read | deterministic | surface_detected | 206 |
| rust_risk_scan | heuristic | surface_detected | 4 |
| rust_ast_lite_parse | hybrid | none | 6 |
| review_queue_build | deterministic | none | 10 |
| obligation_reconcile | deterministic | none | 0 |
| receipt_emit | deterministic | none | 0 |
| resource_accounting | deterministic | none | 0 |

## Obligations & Reconciliation

| Metric | Value |
|--------|-------|
| Total obligations | 0 |
| Open | 0 |
| Stale | 0 |
| Escalations | 0 |
| New (this run) | 0 |
| Existing unchanged | 0 |
| Changed | 0 |
| Duplicates prevented | 0 |

---

*CohBit-Copilot v13.0 Professional Audit Report. Read-only. No mutation. Findings are review signals, not verified defects. [Trust Kernel Report →](docs/trust_kernel_report.md)*
