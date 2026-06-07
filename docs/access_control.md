# Access Control & Profiles

**v14.6 External Tester RC**

CohBit-Copilot uses a three-profile access control system to enforce the core design principle: **Proposal ≠ Authority**. The copilot may propose, but a human with the correct profile must approve.

---

## Profiles

| Profile | Code Name | Can Do | Cannot Do |
|---------|-----------|--------|-----------|
| **Learner** | `learner` | View status, inspect sessions, explore teaching mode, run read-only commands | Cannot propose, review, authorize, apply, or mutate files |
| **Reviewer** | `reviewer` | Everything learner can do, plus review proposals, approve/reject, view audit findings | Cannot authorize (pass to execution) or mutate files directly |
| **Operator** | `operator` | Everything reviewer can do, plus authorize, apply patches, commit receipts | Cannot skip review gate (review must happen before authorize) |

The **learner** profile is the default for new installs and is the safest starting point.

---

## Setting Your Profile

During initialization:
```bash
npx tsx src/cli.ts init
```
The default profile is `learner`.

To change profile at any time:
```bash
npx tsx src/cli.ts access set reviewer
npx tsx src/cli.ts access set operator
npx tsx src/cli.ts access set learner
```

To check your current profile:
```bash
npx tsx src/cli.ts access status
```

Example output:
```
Profile: reviewer
Network: offline
```

---

## Profile Enforcement in the Gate Lifecycle

The 7-gate pipeline enforces profiles at each stage:

| Gate | Who Can Pass | Restriction |
|------|-------------|-------------|
| **Propose** | Reviewer or Operator | Learner cannot propose patches |
| **Review** | Reviewer or Operator | Copilot cannot self-review |
| **Authorize** | Operator only | Admissibility + policy + budgets checked |
| **Apply** | Operator only | Pre-state snapshot required |
| **Test** | Any profile | Read-only; runs test suite |
| **Rollback** | Operator only | Restores from snapshot |
| **Receipt** | Operator only | Deterministic SHA-256 receipt committed |

The learner profile can:
- Run `npx tsx src/cli.ts audit` (read-only pipeline)
- Run `npx tsx src/cli.ts memory-stability`
- Run `npx tsx src/cli.ts teach`
- Run `npx tsx src/cli.ts demo`
- Inspect gate records, sessions, and obligations

---

## The Key Boundary: Proposal ≠ Authority

This is the most important design principle for testers to understand:

1. **The copilot proposes** — it can suggest bounded patches with estimated resource costs
2. **A human reviewer decides** — the review gate requires explicit approval
3. **An operator authorizes** — the authorize gate checks admissibility law, policy hash, and resource budgets
4. **No self-approval** — the copilot cannot approve its own proposals

In practice, this means:
- Even with an `operator` profile, you cannot skip the review gate
- Even with a `reviewer` profile, you cannot apply patches to source files
- No mutation occurs without explicit authorization

---

## Configuration Location

Your profile and settings are stored in:
```
~/.cohbit-copilot/config.json
```

Example:
```json
{
  "profile": "learner",
  "networkMode": "offline",
  "sessionTracking": true
}
```

---

*Access Control & Profiles for CohBit-Copilot v14.6 External Tester RC. Last updated 2026-06-07.*