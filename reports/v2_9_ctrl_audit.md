# CohBit-Copilot v2.9 — CTRL Resource-Aware Audit
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T02:53:28.651Z

## Philosophy
> Capability ≠ permission. Permission ≠ affordability. Affordability ≠ wisdom.
> The report is an observation, not an authorization.

## 1. Repository
- Files: **1087** | Language: rust
- Code: 634 | Math docs: 28 | Proof: 11 | Language docs: 186
- Schemas: 92 | Receipts: 124 | Other: 12

## 2. Risks + Retrieval
- Risk warnings: **0**
- Retrieval guard: 0 accepted / 0 rejected (none)

## 3. Resource Budgets
| Budget | Limit | Used | Status |
|--------|-------|------|--------|
| Compute | 60s | 0.4s | within_budget |
| Time | 60000ms | 425ms | completed |
| Tool Calls | 50 | 3 | active |

## 4. Resource Health
| Panel | Status |
|-------|--------|
| Compute | healthy |
| Repair Backlog | healthy |
| Tool Calls | healthy |
| **Overall** | **HEALTHY** |

## 5. Resource Receipt
| Authorized | cpu_time:60s, tool_calls:50 |
| Actual | cpu_time:0.4s, tool_calls:3, files_scanned:1087, risks_found:0 |
| Efficiency | Audit completed in 0.4s. 0 risks, 0 open repairs. |

## 6. Forecast (30-day)
- Bottleneck: none_predicted
- Action: Continue monitoring.

## 7. Benchmark
- Passed: 15 / Failed: 0
- Total: 1ms | Slowest: T3-Scanner/BENCH_0003 (1ms)

## 8. Recommendations
- Atlas routing: code-atlas (20 files), tlt-atlas (0 files), math-atlas (0 files).
- Recommended atlas targets: code-atlas, math-atlas, tlt-atlas, receipt-engine.
- 12 files were unclassifiable. Consider adding routing rules.
- Resource health: **healthy**.

---
*v2.9 CTRL Audit. CohBit-Copilot observed, budgeted, receipted, and reported on CohBit-CTRL without granting authority.*