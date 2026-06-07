# CohBit-Copilot v2.3 — External Review Package

**Prepared:** 2026-05-31
**Scope:** CohBit-Copilot v2.2.0-dev, Code Atlas v1.0.0, TLT Atlas v0.9.0, Math Atlas v0.3.0
**Status:** Review candidate — not independently audited

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CohBit-Copilot Runtime                    │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐ │
│  │ english │  │ proposer │  │ patch     │  │ repair    │ │
│  │   .ts   │  │   .ts    │  │ builder.ts│  │ planner.ts │ │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └─────┬──────┘ │
│       │            │              │               │         │
│  ┌────┴────────────┴──────────────┴───────────────┴──────┐ │
│  │              Atlas Bridge (atlas_bridge.ts)             │ │
│  │  classifyPatchFile() / buildAtlasEntry() /             │ │
│  │  mapCommandToSemantics()                                │ │
│  └────┬──────────────┬──────────────┬─────────────────────┘ │
│       │              │              │                        │
│  ┌────┴────┐   ┌────┴────┐   ┌────┴─────┐                  │
│  │ 7-Gate  │   │ Session │   │   Atlas   │                  │
│  │ Pipeline│   │ Ledger  │   │   Store   │                  │
│  │(gates.ts)│  │(ledger.ts)│  │(store.ts) │                  │
│  └────┬────┘   └────┬────┘   └────┬─────┘                  │
│       │              │              │                        │
│  ┌────┴────┐   ┌────┴────┐   ┌────┴─────┐                  │
│  │   FS    │   │ .cohbit/│   │.cohbit/  │                  │
│  │ Bridge  │   │ session │   │ atlas/   │                  │
│  │ (fs.ts) │   │_ledger  │   │ entries/ │                  │
│  └─────────┘   │ .jsonl  │   │  *.json  │                  │
│                └─────────┘   └──────────┘                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Path Safety (path_safety.ts) + Atomic Write          │   │
│  │  (atomic_write.ts) + Ledger Lock (ledger_lock.ts)    │   │
│  │  = Filesystem Security Boundary                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
│  @cohbit/code-atlas   │  │  @cohbit/tlt-atlas    │  │  @cohbit/math-atlas  │
│     v1.0.0            │  │     v0.9.0            │  │     v0.3.0           │
│                       │  │                       │  │                      │
│  L0  Artifact         │  │  L0  Artifact         │  │  M0  Artifact        │
│  L1  Language Surface │  │  L1  Language Surface │  │  M1  Representation  │
│  L2  Parse/AST        │  │  L2  Phrase Parse     │  │  M2  Model Family    │
│  L3  Invariant (41)   │  │  L3  Semantic Unit    │  │  M3  Object/Structure│
│  L4  Transition (22)  │  │  L4  Intent (15)      │  │  M4  Relation (25)   │
│  L5  Risk/Constraint  │  │  L5  Meaning Invariant│  │  M5  Math Invariant  │
│  L6  Projection (5)   │  │  L6  Tone/Register    │  │  M6  Assumption (20) │
│  L7  Verifier (6)     │  │  L7  Domain Context   │  │  M7  Mapping (20)    │
│  L8  Receipt          │  │  L8  Projection       │  │  M8  Analogy (6)     │
│  L9  Repair           │  │  L9  Ambiguity/Risk   │  │  M9  Evidence (11)   │
│  Store                │  │                       │  │                      │
└──────────────────────┘  └──────────────────────┘  └─────────────────────┘
```

## 2. Threat Model

### Trust Boundaries

| Boundary | Description | Risk Level |
|---|---|---|
| **User → CLI** | User-provided commands, file paths, descriptions | Medium — input validation at CLI, English parser, and path safety |
| **CLI → Gate Pipeline** | Command dispatches proposal/routing logic | Low — gates enforce state transitions |
| **Proposal → Filesystem** | PatchFile paths passed to fs.ts | High — mitigated by path_safety.ts (symlink, null byte, traversal, containment) |
| **Gate Pipeline → Receipt** | Receipt computation and storage | Medium — deterministic hashing, schema-validated |
| **Receipt → Atlas Store** | Auto-storage on commitReceipt() | Low — advisory only, never blocks commit |
| **Runtime → Ledger** | Session event appends | Medium — lock-protected concurrent appends |
| **Process → .cohbit/** | Local disk persistence | Low — file permissions, same-user access |

### Attack Surface Categories

| Category | Attack Vector | Mitigation | Status |
|---|---|---|---|
| **Path Traversal** | `../etc/passwd`, `C:\Windows\System32`, UNC paths | `path_safety.ts`: `isWithinWorkspaceSync()`, null byte rejection, ADS rejection | ✅ Tested |
| **Symlink Escape** | Read/write through symlinks outside workspace | `checkSymlinkEscape()` at write time; `validateFilePath()` at read time | ✅ Tested |
| **Case Collision** | Windows case-insensitive filename confusion | `detectCaseCollision()` on write proposals | ⚠️ Detected but not enforced |
| **Binary Injection** | Binary content in text patch flow | Extension check + content-level null byte detection + encoding detection | ✅ Tested |
| **Large File DoS** | OOM from oversized files | 5MB budget enforced in `snapshotWorkspace()` | ✅ Tested |
| **Ledger Corruption** | Concurrent writes, truncated lines | Advisory lock (`ledger_lock.ts`) + skip-on-parse-failure | ✅ Tested |
| **TOCTOU** | File changed between validation and access | `checkSymlinkEscape()` re-checked at write time in `applyPatch()` | ✅ Tested |
| **Receipt Tampering** | Modified receipt after commit | SHA-256 deterministic hashing | ✅ Tested (conformance) |
| **Atlas Storage Bypass** | Skipping receipt→atlas link | Advisory only; receipt always committed even if atlas storage fails | ✅ Tested |

### Unmitigated Risks

| Risk | Impact | Reason Not Mitigated |
|---|---|---|
| Network filesystem symlinks | Medium | `fs.realpath()` may not resolve NFS/SMB symlinks correctly |
| Hardware-level TOCTOU | Low | Out of scope for runtime layer |
| Malicious node_modules | Medium | `workspace.ts` ignores `node_modules/` but doesn't scan for tampering |
| Third-party dependency chain | High | No SBOM; npm audit not enforced in CI |

## 3. Authority Boundary Proof Table

| Operation | Proposer | Reviewer | AuthorizeGate | ApplyGate | TestGate | ReceiptGate | Atlas | CLI |
|---|---|---|---|---|---|---|---|---|
| Observe workspace | ✅ | ✅ | — | — | — | — | — | ✅ |
| Classify invariants | — | — | — | — | — | — | ✅ | ✅ |
| Propose patch | ✅ | — | — | — | — | — | — | ✅ |
| Approve proposal | — | ✅ (human) | — | — | — | — | — | — |
| Check admissibility | — | — | ✅ | — | — | — | — | — |
| Policy hash binding | — | — | ✅ | — | — | — | — | — |
| Memory mass check | — | — | ✅ | — | — | — | — | — |
| Write to filesystem | — | — | — | ✅ | — | — | — | — |
| Run tests | — | — | — | — | ✅ | — | — | ✅ |
| Classify test failures | — | — | — | — | ✅ | — | — | — |
| Rollback | — | — | — | — | ❌ (on fail) | — | ✅ | — |
| Emit receipt | — | — | — | — | — | ✅ | — | — |
| Store to atlas | — | — | — | — | — | ✅ (auto) | ✅ | ✅ |
| Retrieve from atlas | — | — | — | — | — | — | ✅ | ✅ |
| Sign/authorize self | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key: ✅ = permitted, ❌ = forbidden by boundary, — = not applicable**

## 4. Security Test Matrix

| Test File | # Tests | Coverage |
|---|---|---|
| `tests/security_path.test.ts` | 10 | Path traversal rejection, workspace boundary, null byte, file existence |
| `tests/security_symlink.test.ts` | 11 | validateFilePath containment, sync checks, write-time TOCTOU guard |
| `tests/security_windows_paths.test.ts` | 14 | UNC paths, NTFS streams, case collisions, reserved names, mixed slashes |
| `tests/security_atomic_write.test.ts` | 11 | Atomic create/overwrite, temp file lifecycle, batch apply, encoding preservation |
| `tests/security_concurrency.test.ts` | 7 | Lock acquire/release, stale lock detection, rapid sequential cycles |
| `tests/security_binary_files.test.ts` | 21 | Binary detection, encoding detection, BOM handling, budget enforcement, edge cases |
| `tests/security_proposal.test.ts` | 10 | Malformed proposals, scope violations, authority checks |
| `tests/security_ledger.test.ts` | 8 | Corrupted lines, duplicate IDs, empty file, large input tolerance |
| `tests/security_english.test.ts` | 10 | Unsafe command detection, constraint parsing, malformed input |
| `tests/security_rollback.test.ts` | 8 | Hash mismatch, missing snapshot, empty snapshot, warning integrity |
| `tests/hardening.test.ts` | 9 | Receipt validation, adversarial test vectors, canonical serialization |
| `tests/conformance.test.ts` | 46 | Receipt conformance, wedge validation, admissibility law, rejection categories |
| **Total** | **165** | |

All 165 security + conformance tests pass deterministically on every run.

## 5. Reproducibility Guide

### Environment

```bash
# Required
Node.js >= 20.x
npm >= 10.x

# Install
npm install

# Run full test suite
npm test

# Run security-specific tests
npx vitest run tests/security_*.test.ts

# Run conformance tests
npx vitest run tests/conformance.test.ts tests/hardening.test.ts

# Run atlas registry tests
npx vitest run packages/*/tests/*.test.ts

# All tests (complete)
npx vitest run
```

### Expected output

```
Test Files: ~40 passed
Tests:     ~524 passed
Duration:  ~15s (varies by machine)
```

### Determinism

- Receipt hashes: SHA-256, deterministic
- Conformance vectors: JSON test vectors in `test_vectors/`
- Atlas registries: Static type definitions, no runtime variance
- Security tests: No network, no timing dependency, no randomness in assertions

## 6. Known Limitations

### Architectural

1. **Heuristic bridge classifier** — `classifyPatchFile()` uses regex-level pattern matching, not a real parser. It can miss invariants and misclassify complex code.

2. **In-memory session store** — `CLI.ts` stores gate records in a `Map`; sessions don't survive process restart.

3. **Advisory atlas storage** — Atlas storage in `commitReceipt()` is best-effort; receipt commit never blocks on atlas write failure.

4. **No cross-atlas queries** — Code Atlas and TLT Atlas registries coexist but can't be queried jointly (e.g., "find patches with RepairInstruction semantics").

5. **Incomplete layer coverage** — Code missing L10-L12, TLT missing L10-L15, Math missing M10-M17.

6. **Math atlas is type-only** — M0-M9 registries exist but have no classifier or runtime integration.

7. **No operational pipelines** — Spec v0.2 defines ingestion, matching, verifier queue, and retrieval overlays; none are implemented.

### Security

8. **Not independently audited** — All security tests are self-authored; no third-party review.

9. **Not formally verified end-to-end** — Individual components (receipt hashing) are deterministic but the full pipeline's correctness is not proven.

10. **Advisory locking, not OS-enforced** — `ledger_lock.ts` uses PID-based lock files; a malicious local process could ignore them.

11. **No sandboxing** — Patches run with the user's filesystem permissions.

12. **No SBOM / dependency audit** — `npm audit` not enforced; third-party dependency risk.

### Performance

13. **No benchmark suite** — No performance regression tests.

14. **Synchronous fs.realpath()** — Symlink resolution is async I/O-bound; can slow large workspaces.

## 7. Claims & Evidence

| Claim | Evidence | Limitation |
|---|---|---|
| Path traversal is rejected | 35 security tests (path, symlink, windows_paths) | `fs.realpath()` may not catch all network FS edge cases |
| Binary files are rejected by default | Extension check + content-level null byte detection, 21 tests | UTF-16 heuristic is statistical, not perfect |
| Atomic writes prevent partial file corruption | Temp-file + rename pattern, 11 tests | Rename only atomic on same filesystem (NTFS, ext4, APFS satisfied) |
| Concurrent ledger appends do not corrupt JSONL | Advisory lock with stale detection, 7 tests | Lock is advisory, not OS-enforced |
| Receipts are deterministic | SHA-256 hashing, 46 conformance tests | Certificate hash is placeholder (no verifier evidence chain) |
| Gate pipeline enforces state transitions | Gate status validation at each step, 26 tests | In-memory store; no cross-process enforcement |
| Atlas registries contain correct entries | Count tests for all 3 atlases, ~130 tests | Registries are hand-curated from spec, not code-generated |
| Patch classification maps content to invariants | Heuristic classifier, 7 bridge tests | Regex-level only; no AST parsing |
| Auto-atlas-storage works on receipt commit | Advisory store in `commitReceipt()`, store tests | Best-effort; receipt commit never blocked |
| 524 tests pass deterministically | Zero flakes across all test runs | Self-authored test suite |

---

**Not for production deployment without independent security review. This package describes the current architecture honestly and does not claim proof of correctness.**