# CohBit-Copilot v3.1 — Calibrated Content-Aware Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T03:39:53.051Z
**Evidence Level:** surface_detected (regex/content scan, not AST-verified)

## Philosophy
> Content findings are evidence, not verdicts.
> This calibration distinguishes high-confidence production risks from low-confidence test patterns.
> Test-file `unwrap()` / `panic!()` are expected — downgraded to low confidence.
> High-confidence signals in production code should be reviewed first.

## 1. Repository Overview
- Files: **1087** | Language: rust
- Code: 634 | Proof: 11 | Docs: 186

## 2. Content Ingestion
| Metric | Value |
|--------|-------|
| Files read | 500 / 500 |
| Bytes read | 3331.5 KB / 50 MB |

## 3. Calibrated Risk Signals
- .rs files scanned: **500** | Files with findings: 154
- Total review signals: **835**

### Severity × Confidence Matrix
| | High Severity | Medium Severity | Low Severity |
|---|---|---|---|
| **High Confidence** | 216 | 0 | 0 |
| **Medium Confidence** | 30 | 483 | 20 |
| **Low Confidence** | 0 | 0 | 86 |

### Context Breakdown
| Context | Count | Priority |
|---------|-------|----------|
| Production (src/example) | **780** | HIGH |
| Test / Fixture | 0 | Low (expected patterns) |
| Benchmark | 55 | Low |
| Unknown | 0 | Review context |

### Legacy Category Summary (for comparison)
| Category | Count | Severity | Confidence |
|----------|-------|----------|------------|
| `unwrap()` / `expect()` | 378 | medium (downgraded in tests) | low in tests, medium in src |
| `panic!` / `todo!` / `unimplemented!` | 30 | high/medium | low in tests, medium/high in src |
| `unsafe` blocks / functions | 1 | **high** | **high** |
| Filesystem write paths | 38 | high/medium | high/medium |
| Process commands | 76 | **high** | **high** |
| Path signals (all) | 203 | low-medium | varies |

### Path-Risk Refinement
| Sub-category | Count | Notes |
|--------------|-------|-------|
| Path Join (dynamic) | 97 | medium confidence |
| Relative Traversal (`../`) | 11 | **high severity** |
| FS Operation from Variable | 98 | **high severity** |
| Literal Path (low confidence) | 86 | low confidence |

### ⚠ High-Confidence Production Risks (184)
| File | Line | Pattern | Risk Kind |
|------|------|---------|-----------|
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/coh-ctrl/src/main.rs | 425 | `fs::write(output` | filesystem_path_from_variable |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-builder/src/lib.rs | 40 | `fs::write(file_path` | filesystem_path_from_variable |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/ast_patch.rs | 9 | `std::process::Command` | process_command |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/ast_patch.rs | 36 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 10 | `std::process::Command` | process_command |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 36 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 46 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 70 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 141 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 150 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/container_isolation.rs | 186 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 279 | `std::process::Command` | process_command |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 744 | `std::process::Command` | process_command |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 752 | `std::process::Command` | process_command |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 914 | `std::process::Command` | process_command |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 279 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 744 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 752 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 914 | `Command::new(` | command_new |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 896 | `fs::remove_file(` | filesystem_delete_file |

### Production Files to Review (149 files)
| File | Findings |
|------|----------|
| crates/ctrl-engine/src/queue_driven_attempt.rs | 50 |
| crates/ctrl-engine/examples/self_formalization.rs | 35 |
| crates/ctrl-engine/src/engine.rs | 35 |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 34 |
| .kilo/worktrees/expensive-risk/Cohbit-CTRL/crates/ctrl-engine/src/engine.rs | 34 |
| CohBit-primitive-review/rust/cohbit/src/atom.rs | 30 |
| crates/ctrl-engine/src/lemma_map.rs | 30 |
| CohBit-primitive-review/rust/cohbit-offline-lm-runtime/src/governance.rs | 22 |
| CohBit-primitive-review/rust/cohbit/src/ufe/atom_builder.rs | 21 |
| CohBit-primitive-review/rust/cohbit/src/trace.rs | 20 |
| CohBit-primitive-review/rust/cohbit-ctrl-tool/src/lib.rs | 18 |
| CohBit-primitive-review/rust/cohbit-ctrl-tool/src/env.rs | 14 |
| crates/ctrl-engine/src/forge.rs | 13 |
| crates/ctrl-engine/src/kernel_verify.rs | 12 |
| .kilo/worktrees/certain-pea/Cohbit-CTRL/crates/ctrl-engine/src/kernel_verify.rs | 11 |

### Unwrap/Expect Context Breakdown
- Production: 372 (review worthy — confidence medium)
- Test/Fixture: 6 (expected — confidence downgraded to low)

## 4. Rust Symbol Extraction
- Total symbols: 11204 | Functions: 5182 (1725 public)
- Structs: 792 | Enums: 306 | Traits: 22
- Impls: 691 | Modules: 540 | Tests: 721

## 5. Filename-Level Risk Scan
- Risk warnings: **0**

## 6. Resource Budgets
| Budget | Limit | Used | Status |
|--------|-------|------|--------|
| Compute | 120s | 1.6s | within_budget |
| Content | 50MB | 3.3MB | within_budget |
| Overall | healthy | **HEALTHY** | — |

## 7. Forecast
- Bottleneck: production_risk
- Action: Review high-confidence production signals immediately.

## 8. Benchmark
- Passed: 15 / Failed: 0 | 0ms

## 9. Limitations
- **Evidence level:** surface_detected — No Rust AST parser. Regex-based pattern matching only.
- **File context:** Path-based heuristic (`/tests/`, `/src/`, `/benches/`). May misclassify unusual layouts.
- **Confidence:** Rule-based. Test-file unwrap/expect/panic are downgraded to low. No ML or semantic analysis.
- **Path-risk detection:** `filesystem_path_from_variable` uses regex to detect non-literal arguments — may miss indirect variable usage.
- **Low-confidence findings are still signals** — they are not false positives, just weaker evidence.
- **Budget:** 50MB / 500 files / 2MB per file. Large repos partially audited.

## 10. Recommendations
- **IMMEDIATE:** 184 high-confidence production risks require review.
- 11 relative traversal patterns detected. Verify path bounds.
- Resource health: **healthy**.

---
*v3.1 Calibrated Audit. v3.0 made it real. v3.1 makes it precise.*