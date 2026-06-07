# CohBit-Copilot v6.0 — Integrated Copilot Trial
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T04:46:28.896Z

## Pipeline Status
| Step | Status | Count |
|------|--------|-------|
| Scan | ✅ | 1092 files |
| Detect | ✅ | 835 findings |
| Calibrate | ✅ | P0=184 P1=30 P2=483 P3=138 |
| Seed Atlas | ✅ | 214 code-atlas entries |
| Route Repair | ✅ | 214 routes |
| **Propose Fix** | ✅ | **0 proposals** |
| Gate Ready | — | 0 proposals ready for review |
| Apply | ⛔ gated | 0 applied (requires gate pipeline) |
| Test Correlation | — | 721 tests available |

## Findings Summary
| Metric | Value |
|--------|-------|
| Total calibrated | 835 |
| Production | 780 |
| Test | 0 |
| High×High | 216 |
| Unsafe | 1 |
| FS writes | 38 |

## Proposal Results
- Proposed: 0
- No patch: 214
  - needs_human: 184
  - needs_ast: 30
  - diagnostic: 0

## No Bounded Proposals
_All P0/P1 findings require human review or AST analysis._

## Constraint Verification
- unsafe -> needs_human: yes
- No proposals auto-applied: yes
- Test candidates: 721 test functions

## Resource Budget
- Compute: 1.7s / 180s
- Content: 3332KB
- Health: healthy

## Missing for Full Copilot
- Audit->Proposal bridge: v6.0 complete
- Gate auto-pipeline: needs CTRL integration
- AST-backed repair: needs tree-sitter/syn
- Multi-session memory: needs incremental delta
- Test auto-correlation: needs test runner integration
- Continuous watch mode: needs file watcher

---
*v6.0 Integrated Copilot Trial.*