# CohBit-Copilot v6.1 — Human-Reviewed Proposal Trial
**Target:** C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-CTRL
**Ran:** 2026-06-01T11:51:43.869Z
**Reviewer:** v6.1-synthetic (synthetic demo — all receipts have proposalAllowed=true)

## ⚠ Important
> All review receipts in this trial are SYNTHETIC DEMONSTRATION.
> proposalAllowed=true is set for demonstration purposes.
> Safety-critical patterns are ALWAYS refused regardless of proposalAllowed.

## Result Summary
| Category | Count |
|----------|-------|
| P0/P1 findings | 214 |
| Safety-refused (always) | **184** |
| Not allowed by receipt | 0 |
| **Gated proposals generated** | **0** |
| Standard proposals (no receipt) | 0 |

## Refused (Safety-Critical) — 184 findings
These patterns are never eligible for automatic proposal generation,
even when a human review receipt has proposalAllowed=true.

| Risk Kind | Count |
|-----------|-------|
| filesystem_path_from_variable | 83 |
| command_new | 50 |
| process_command | 26 |
| filesystem_delete_file | 13 |
| relative_traversal | 11 |
| unsafe_block | 1 |

## No Gated Proposals Generated
_All P0/P1 findings were either safety-critical or had no eligible fix strategy._

## Constraint Verification
- unsafe_block refused even with proposalAllowed: ✅
- process_command refused even with proposalAllowed: ✅
- filesystem_delete refused even with proposalAllowed: ✅
- No proposals auto-applied: ✅
- No proposals committed: ✅
- All receipts: claimStatus=draft, commitStatus=not_applicable: ✅

## Resource
- Compute: 2.1s / 180s
- Content: 3332KB

---
*v6.1 Human-Reviewed Proposal Trial. v6.0 proved the bridge can refuse. v6.1 proves it can propose only after review — and still refuses unsafe patterns.*