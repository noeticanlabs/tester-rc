# Authority Boundaries — CohBit-Copilot (v1.0)

## Three Fundamental Rules

| Rule | Meaning | Enforcement |
|------|---------|-------------|
| **Proposal ≠ Authority** | Generating a patch proposal does not grant the right to apply it | `proposer.ts` generates; `gates.ts` governs. No module can both propose and authorize. |
| **Patch Applied ≠ Patch Stable** | Writing files to disk does not mean the change is correct | `ApplyGate` writes files; `PostApplyTestGate` determines stability. A snapshot of pre-state content is always preserved. |
| **Test Passed ≠ Final Commit** | A passing test suite does not automatically produce a receipt | `ReceiptGate` only executes when `TESTS_PASSED`. No bypass path exists. |

## What Each Module May Do

| Module | May | May Not |
|--------|-----|---------|
| `proposer.ts` | Generate bounded `PatchProposal` objects; read files for block matching | Write files; review; authorize; apply; test; rollback; receipt; commit |
| `gates.ts` | Enforce gate transitions; validate admissibility; bind policy hashes; classify failures | Generate proposals; execute filesystem operations |
| `fs.ts` | Read files; write through `ApplyGate`; restore through `RollbackGate` | Bypass gates; mutate outside proposal bounds |
| `lang.ts` | Detect project language; select test commands; parse test output | Modify proposal state; affect gate transitions |
| `ledger.ts` | Append events to `.cohbit/session_ledger.jsonl`; load session history | Alter gate outcomes; rewrite history |
| `cli.ts` | Dispatch commands; present outcomes | Collapse gate boundaries; authorize itself |

## Type-Safe Coupling

From the expanded SPEC.md:

```
[CANDIDATE]  CohBitInput
[MATHEMATICAL] CohBit::new → AcceptedCohBit
[OPERATIONAL] Policy::authorize → ExecutableCohBit
[COMMITMENT]  Commit(ExecutableCohBit) → StateChange
```

No commit path exists that bypasses the policy gate. The TypeScript runtime mirrors this flow:

```
[CANDIDATE]  ProposeGate    → PatchProposal
[REVIEW]     ReviewGate     → REVIEW_PASSED / REVIEW_REJECTED
[AUTHORIZE]  AuthorizeGate  → AUTHORIZED / AUTHORIZATION_DENIED
[APPLY]      ApplyGate      → APPLIED (+ snapshot)
[TEST]       PostApplyTestGate → TESTS_PASSED / TESTS_FAILED
[ROLLBACK]   RollbackGate   → ROLLED_BACK
[RECEIPT]    ReceiptGate    → RECEIPTED
```

## Policy Hash Binding

Every `PatchProposal` declares a `policyHash`. The `AuthorizeGate` enforces that the receipt's wedge declares the same policy hash as the proposal. This prevents policy substitution attacks.

## Admissibility Law

```
V(post) + spend ≤ V(pre) + defect + authority
```

The `AuthorizeGate` enforces this inequality before any patch reaches the filesystem. The Rust reference verifier implements an independent `is_admissible()` check using `BigRational` to prevent integer overflow — the TypeScript runtime mirrors this logic in `types.ts`.