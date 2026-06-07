# Gate Lifecycle — CohBit-Copilot (v1.0)

## Overview

```
Proposal → Review → Authorize → Apply → Test → Rollback → Receipt
```

Each gate has a defined set of valid input states, output states, and rejection conditions. No gate may be bypassed. The session ledger records every gate transition.

---

## 1. ProposalGate

| Property | Value |
|----------|-------|
| **Input** | `ProposalInput` (description, files, estimated spend/defect/authority, policyHash) |
| **Output (success)** | `PROPOSED` — `PatchProposal` created with unique ID |
| **Source** | `gates.ts:propose()` |

**Rejection conditions:** none at this gate (proposal is always accepted; review and authorization filter later).

---

## 2. ReviewGate

| Property | Value |
|----------|-------|
| **Input** | Gate record with status `PROPOSED` |
| **Output (success)** | `REVIEW_PASSED` — human approved |
| **Output (rejection)** | `REVIEW_REJECTED` — human rejected with comments |
| **Source** | `gates.ts:review()` |

**Rejection conditions:** `approved === false`. Cannot proceed from `REVIEW_REJECTED` to `AUTHORIZED`.

---

## 3. AuthorizeGate

| Property | Value |
|----------|-------|
| **Input** | Gate record with status `REVIEW_PASSED` |
| **Output (success)** | `AUTHORIZED` |
| **Output (rejection)** | `AUTHORIZATION_DENIED` |
| **Source** | `gates.ts:authorize()` |

**Rejection conditions:**
- Policy hash mismatch between proposal and receipt wedge
- Admissibility law violation: `V(post) + spend > V(pre) + defect + authority`
- Memory mass budget exceeded: `M_mem(b) > B_mem`

---

## 4. ApplyGate

| Property | Value |
|----------|-------|
| **Input** | Gate record with status `AUTHORIZED` |
| **Output (success)** | `APPLIED` — files written, pre-state snapshot recorded |
| **Output (failure)** | `APPLY_FAILED` |
| **Source** | `gates.ts:apply()` + `fs.ts:applyPatch()` |

**Produces:** `ApplySnapshot` with per-file `beforeContent` and `beforeHash` for self-contained rollback.

**Partial write failure:** rolls back all successfully written files to pre-state.

---

## 5. PostApplyTestGate

| Property | Value |
|----------|-------|
| **Input** | Gate record with status `APPLIED` |
| **Output (success)** | `TESTS_PASSED` — all tests passed |
| **Output (failure)** | `TESTS_FAILED` — one or more tests failed |
| **Source** | `gates.ts:runTests()` + `fs.ts:runProjectTests()` |

**Auto-detection:** if no `--command` specified, detects project language from manifest files (package.json → Node, Cargo.toml → Rust, go.mod → Go, pyproject.toml → Python, *.csproj → dotnet).

**NoTestsFound policy:** `allow-with-notice` (default) or `reject`.

---

## 6. RollbackGate

| Property | Value |
|----------|-------|
| **Input** | Gate record with status `TESTS_FAILED` |
| **Output (success)** | `ROLLED_BACK` — files restored to pre-patch state |
| **Output (failure)** | `ROLLBACK_FAILED` |
| **Source** | `gates.ts:rollback()` + `fs.ts:rollbackWorkspace()` |

**Verification:** post-rollback file content is hashed and compared against pre-state `beforeHash`. Mismatch emits `DirtyWorkspace` warning.

---

## 7. ReceiptGate

| Property | Value |
|----------|-------|
| **Input** | Gate record with status `TESTS_PASSED` |
| **Output (success)** | `RECEIPTED` — deterministic SHA-256 receipt produced |
| **Output (failure)** | Stays at `APPLIED` if receipt build fails |
| **Source** | `gates.ts:commitReceipt()` + `receipt.ts:buildReceipt()` |

**Receipt contents:** valuation pre/post, full wedge (11 fields), canonical serialization, SHA-256 hash (64 lowercase hex chars).

**Cross-language identity:** Python and Rust SDKs produce identical hashes from the same canonical input (8 vectors verified).

---

## State Transition Table

| Current State | Valid Transitions |
|---------------|-------------------|
| `PROPOSED` | → `REVIEW_PASSED`, `REVIEW_REJECTED` |
| `REVIEW_PASSED` | → `AUTHORIZED`, `AUTHORIZATION_DENIED` |
| `AUTHORIZED` | → `APPLIED`, `APPLY_FAILED` |
| `APPLIED` | → `TESTS_PASSED`, `TESTS_FAILED` |
| `TESTS_FAILED` | → `ROLLED_BACK`, `ROLLBACK_FAILED` |
| `TESTS_PASSED` | → `RECEIPTED` |