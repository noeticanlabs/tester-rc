# CohBit-Copilot v2.9 — Resource-Aware Repo Audit
**Ran:** 2026-06-01T02:48:53.867Z

## Philosophy
> Capability ≠ permission. Permission ≠ affordability. Affordability ≠ wisdom.
> The report is an observation, not an authorization.

## 1. Repository Scan
- Files scanned: **267**
- Code: 210 | Language docs: 29 | Schemas: 25 | Receipts: 3
- Routing: code-atlas(20), tlt-atlas(0), math-atlas(0)

## 2. Risk + Retrieval
- Risk warnings: 0
- Retrieval guard: 0 accepted / 0 rejected (none)
- Open repairs: 0

## 3. Resource Budgets
| Budget | Limit | Used | Status |
|--------|-------|------|--------|
| Compute (cpu_time) | 30s | 0.1s | within_budget |
| Time | 30000ms | 50ms | completed |
| Tool Calls | 50 | 3 | active |
| Benchmark | 20 cases | 1 | authorized |
| Atlas Storage | 10MB | 7.0KB | within_budget |

## 4. Resource Health Dashboard
| Panel | Status |
|-------|--------|
| Compute | healthy |
| Memory | healthy |
| Storage | healthy |
| Repair Backlog | healthy |
| Receipt Storage | healthy |
| Tool Calls | healthy |
| **Overall** | **HEALTHY** |

## 5. Resource Receipt
| Metric | Value |
|--------|-------|
| Authorized | cpu_time:30s, tool_calls:50, benchmark_cases:20 |
| Actual | cpu_time:0.1s, tool_calls:3, benchmark_cases:1, files_scanned:267 |
| Efficiency | Audit completed within budget. Scanned 267 files. 0 risks found. |

## 6. Forecast (30-day)
| Metric | Prediction |
|--------|------------|
| Predicted bottleneck | none_predicted |
| Recommended action | Continue monitoring. |

## 7. Benchmark
| Metric | Value |
|--------|-------|
| Total results | 15 |
| Passed | 15 |
| Failed | 0 |
| Slowest | T3-Scanner/BENCH_0003 (1ms) |
| Total elapsed | 1ms |

## 8. Recommendations
- Atlas routing: code-atlas (20 files), tlt-atlas (0 files), math-atlas (0 files).
- Recommended atlas targets: code-atlas, tlt-atlas, receipt-engine.
- Resource health: **healthy**. No action needed.

---
*v2.9 Resource-Aware Audit. CohBit-Copilot observed, budgeted, benchmarked, receipted, and reported on its own resource consumption.*