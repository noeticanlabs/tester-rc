# CohBit-Copilot v7.2 — Obligation Dashboard + Aging Trial
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-02T22:54:12.772Z

## Obligation Health
| Metric | Count |
|--------|-------|
| Total | 219 |
| Open | 214 |
| Under Review | 3 |
| Deferred | 2 |
| Needs Repair | 0 |
| Accepted Risk | 0 |
| False Positive | 0 |
| Resolved | 0 |

## Aging / Staleness
| Level | Count | Rule |
|-------|-------|------|
| 🔴 Stale High | 0 | P0 open > 7 days |
| 🟠 Stale Medium | 0 | P1 open > 14 days |
| 🟡 Stale Low | 0 | P2/P3 open > 30 days |
| 🔵 Re-Review Needed | 0 | Deferred > 30 days |
| ⚪ Repair Due | 0 | needs_repair > 14 days |
| 🟢 Fresh | 219 | Within thresholds |

## Closure Evidence
| Evidence Type | Count |
|--------------|-------|
| Closed with receipt | 0 |
| Closed without receipt | 0 (should be 0) |

## Constraint Verification
- Dashboard aggregates all obligations: ✅
- Staleness classified by priority + age: ✅
- P0 stale_high threshold (7 days): ✅ active
- P1 stale_medium threshold (14 days): ✅ active
- Deferred re-review threshold (30 days): ✅ active
- Closure with receipt tracked: ✅ (0)
- Closure without receipt flag: ✅ (0)
- No source mutation: ✅

## Resource
- Compute: 1.2s / 180s
- Content: 3345KB
- Health: **usable_with_limits**

---
*v7.2 Dashboard Trial. v7.1 made obligations governable. v7.2 makes accountability visible.*