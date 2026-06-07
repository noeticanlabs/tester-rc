# CohBit-Copilot v3.0 — CTRL Content-Aware Audit
**Target:** c:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-Copilot
**Ran:** 2026-06-01T03:37:23.163Z
**Evidence Level:** surface_detected (regex/content scan, not AST-verified)

## Philosophy
> Content findings are evidence, not verdicts.
> A regex match may trigger review — it does not certify a bug, authorize repair, or imply defect.
> This audit reads source files, finds review signals inside code, links them to file/line evidence,
> budgets the analysis, and reports limitations honestly.

## 1. Repository Overview
- Files: **275** | Language: node
- Code: 215 | Math docs: 0 | Proof: 0 | Language docs: 32
- Schemas: 25 | Receipts: 3 | Other: 0

## 2. Content Ingestion Budget
| Metric | Value |
|--------|-------|
| Files read | 246 |
| Total bytes read | 1268.5 KB |
| Budget limit (total) | 50 MB |
| Max file size | 2048 KB |
| Max files | 500 |
| Skipped binary | 0 |
| Skipped large | 0 |
| Decode errors | 0 |
| Missing files | 0 |

## 3. Rust Content Risk Scan
- .rs files scanned: **30**
- Files with findings: 22
- Total review signals: **70**

### Risk Signal Summary
| Category | Count | Severity |
|----------|-------|----------|
| `unwrap()` / `expect()` | 63 | medium |
| `panic!` / `todo!` / `unimplemented!` | 5 | high/medium |
| `unsafe` blocks / functions | 0 | **high** |
| Filesystem write paths | 0 | high/medium |
| Process commands | 0 | **high** |
| Manual path joins | 0 | low |

### High-Severity Breakdown
- Unsafe blocks/functions in: 0 files
- Filesystem mutation in: 0 files

_No unsafe blocks detected._

_No filesystem mutation patterns detected._

### Top Risk Signals (by severity)
| File | Line | Pattern | Risk Kind | Severity |
|------|------|---------|-----------|----------|
| reference-verifier/rust/tests/behavior.rs | 51 | `panic!(` | panic_review_signal | **high** |
| reference-verifier/rust/tests/behavior.rs | 108 | `../` | relative_traversal | **high** |
| reference-verifier/rust/tests/behavior.rs | 128 | `panic!(` | panic_review_signal | **high** |
| reference-verifier/rust/tests/substrate_mutation.rs | 15 | `panic!(` | panic_review_signal | **high** |
| reference-verifier/rust/tests/substrate_mutation.rs | 27 | `panic!(` | panic_review_signal | **high** |
| sdks/rust/tests/conformance.rs | 41 | `../` | relative_traversal | **high** |
| sdks/rust/tests/conformance.rs | 95 | `panic!(` | panic_review_signal | **high** |
| reference-verifier/rust/tests/adversarial.rs | 61 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/adversarial.rs | 129 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/adversarial.rs | 156 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/adversarial.rs | 157 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/adversarial.rs | 158 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/adversarial.rs | 180 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/adversarial.rs | 195 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 65 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 65 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 67 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 81 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 94 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 108 | `.expect(` | expect_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 111 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 113 | `.expect(` | expect_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 115 | `.expect(` | expect_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 126 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 144 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 162 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 168 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 169 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/behavior.rs | 176 | `.unwrap(` | unwrap_review_signal | **medium** |
| reference-verifier/rust/tests/benchmarks.rs | 29 | `.unwrap(` | unwrap_review_signal | **medium** |

### Top Files by Review Signals
| File | Signals |
|------|---------|
| reference-verifier/rust/tests/behavior.rs | 18 |
| reference-verifier/rust/tests/adversarial.rs | 7 |
| reference-verifier/rust/tests/deep_analysis.rs | 4 |
| reference-verifier/rust/tests/mass_measurement.rs | 4 |
| sdks/rust/tests/conformance.rs | 4 |
| reference-verifier/rust/tests/benchmarks.rs | 3 |
| reference-verifier/rust/tests/geodesic_selection.rs | 3 |
| reference-verifier/rust/tests/substrate_determinism.rs | 3 |
| reference-verifier/rust/tests/substrate_geometry.rs | 3 |
| reference-verifier/rust/tests/trajectory_audit.rs | 3 |

## 4. Rust Symbol Extraction
- .rs files scanned: **30**
- Total symbols extracted: 391

| Symbol Type | Count |
|-------------|-------|
| Functions (total) | 135 |
| Public functions | 7 |
| Structs | 9 |
| Enums | 0 |
| Traits | 0 |
| Impl blocks | 6 |
| Modules | 9 |
| `#[test]` functions | 71 |
| `macro_rules!` macros | 0 |
| Static variables | 0 |
| Constants | 0 |
| Use statements | 158 |

### Derived Insights
- 29 files define `#[test]` functions
- 3 `#[derive(...)]` attributes detected
- 5 panic/todo/unimplemented signals — review for completeness

## 5. Filename-Level Risk Scan (Existing)
- Risk warnings: **0**
- Retrieval guard: 0 accepted / 0 rejected (none)

## 6. Resource Budgets
| Budget | Limit | Used | Status |
|--------|-------|------|--------|
| Compute | 120s | 0.5s | within_budget |
| Time | 120000ms | 464ms | completed |
| Tool Calls | 100 | 6 | active |
| Content Budget | 50MB / 500 files | 1.2MB / 246 files | within_budget |

## 7. Resource Health
| Panel | Status |
|-------|--------|
| Compute | healthy |
| Repair Backlog | healthy |
| Tool Calls | healthy |
| **Overall** | **HEALTHY** |

## 8. Resource Receipt
| Authorized | cpu_time:120s, tool_calls:100, content_budget:50MB/500files |
| Actual | cpu_time:0.5s, tool_calls:6, files_scanned:275, content_files_read:246, content_bytes_read:1298915, rust_risk_findings:70, rust_symbols:391, filename_risks:0 |
| Efficiency | Content-aware audit completed in 0.5s. 70 Rust risk signals, 391 symbols extracted. |

## 9. Forecast (30-day)
- Bottleneck: risk_backlog
- Action: Review content risk signals. Prioritize unsafe blocks and filesystem mutations.

## 10. Benchmark
- Passed: 15 / Failed: 0
- Total: 2ms | Slowest: T15-RetrievalGuard/BENCH_0010 (1ms)

## 11. Limitations
- **Evidence level:** surface_detected — No Rust AST parser is used. All content findings are regex-based pattern matches.
- **Not verified:** A regex match does not certify a bug, authorize repair, or imply defect. Each finding is a review signal.
- **Comment filtering:** Simple `//` comment detection is applied, but `/* */` block comments may produce false positives.
- **Symbol extraction:** Regex-based. May miss generic parameters, where clauses, macro-produced symbols, or complex `impl` patterns.
- **Path join detection:** Heuristic. May produce false positives on legitimate string literals containing `/`.
- **Budget:** Content reading is capped at 50MB total / 500 files / 2MB per file. Large repos may be partially audited.

## 12. Recommendations
- Atlas routing: code-atlas (20 files), tlt-atlas (0 files), math-atlas (0 files).
- Recommended atlas targets: code-atlas, tlt-atlas, receipt-engine.
- 63 unwrap/expect calls found. Consider systematic error handling strategy.
- Resource health: **healthy**.

---
*v3.0 CTRL Content-Aware Audit. CohBit-Copilot observed file contents, found review signals, extracted symbols, budgeted the analysis, and reported limitations honestly — without granting authority.*