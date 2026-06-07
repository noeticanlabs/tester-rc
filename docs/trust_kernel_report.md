# CohBit-Copilot — Trust Kernel Integration Report

**Version:** v12.2  
**Date:** 2026-06-06  
**Status:** Five-Kernel Trust Roadmap Complete

---

## Architecture Statement

```
TypeScript orchestrates. Rust verifies. CohBit receipts the boundary.
```

CohBit-Copilot is a hybrid architecture where the TypeScript runtime handles
workflow orchestration, teaching, and the gate lifecycle, while Rust binaries
provide independent, deterministic verification of the most authority-sensitive
facts. All Rust verification produces **evidence only** — Rust never authorizes
commits, applies patches, closes obligations, or replaces the TypeScript gate
lifecycle.

---

## Kernel Summary Table

| # | Kernel | Version | What It Verifies | TS Bridge | Rust Binary | Trial | Tests |
|---|--------|---------|-----------------|-----------|-------------|-------|-------|
| 0 | Language Split Doctrine | v11.7 | Authority boundary definition; TS vs Rust responsibility split | N/A | N/A | N/A | N/A |
| 1 | Receipt Verification | v11.8 | Canonical receipt identity, SHA-256 hash integrity, field-level conformance | `src/rust_receipt_gate.ts` | `sdks/rust/src/bin/id_gate.rs` | `trials/v11_8_rust_receipt_gate_trial.ts` | 5 |
| 2 | Path Safety | v11.9 | File-scope validation; no traversal (`..`), no absolute paths, no null bytes, no symlink escape | `src/rust_path_safety_gate.ts` | `sdks/rust/src/bin/path_gate.rs` | `trials/v11_9_rust_path_safety_trial.ts` | 6 |
| 3 | Deterministic IDs | v12.0 | Stable identity across memory and audit; same-input→same-hash reproducibility | `src/rust_id_gate.ts` | `sdks/rust/src/bin/id_gate.rs` | `trials/v12_0_rust_id_gate_trial.ts` | 6 |
| 4 | Audit Scanner Core | v12.1 | Independent Rust risk-scan evidence; unsafe blocks, filesystem writes, process commands | `src/rust_scanner_gate.ts` | `sdks/rust/src/bin/scanner_gate.rs` | `trials/v12_1_rust_scanner_gate_trial.ts` | 5 |
| 5 | Policy / Admissibility Gate | v12.2 | 9 deterministic gate preconditions (see below) | `src/rust_policy_gate.ts` | `sdks/rust/src/bin/policy_gate.rs` | `trials/v12_2_rust_policy_gate_trial.ts` | 14 |

---

## Kernel 1 — Canonical Receipt Verification (v11.8)

**What it verifies:**
- Receipt fields are present and well-formed
- Policy hash, action hash, and certificate hash are valid SHA-256-length hex strings
- State roots (from/to) are 64-character hex strings
- Spend, defect, and authority are non-negative Rational64 values
- The receipt canonical serialization produces a stable hash

**TypeScript bridge:** `src/rust_receipt_gate.ts` — serializes a `CohBitReceipt` to JSON, invokes the Rust `id_gate` binary, and parses the verification result.

**Rust binary:** `sdks/rust/src/bin/id_gate.rs` — deserializes the receipt JSON, performs 5 structural checks, and returns `{ valid, evidence, checks[] }`.

**Evidence emitted:** Structured JSON with per-check pass/fail status and detail strings. No commit, apply, or authorization fields.

**What it does NOT authorize:** Apply, commit, test, rollback, receipt finalization, obligation closure, evidence promotion.

**Trial:** `trials/v11_8_rust_receipt_gate_trial.ts` — 5 tests covering valid receipt acceptance, field-level rejection, and canonical serialization stability.

**Known limitations:**
- Signature verification is not performed (hash integrity only)
- Hash accessor aliasing (receipt_hash, policy_hash, action_hash, chain_digest_post all alias bit_id)

**Future hardening:**
- Integrate Ed25519 or similar signature verification
- Add cross-receipt chain validation

---

## Kernel 2 — Path Safety Validation (v11.9)

**What it verifies:**
- File paths are relative (no leading `/`, no drive letters on Windows)
- No null byte injection
- No path traversal (`..` segments)
- Path components resolved through OS-native canonicalization
- Symlinks do not escape the workspace root
- Windows-specific: no alternate data streams, no device paths

**TypeScript bridge:** `src/rust_path_safety_gate.ts` — resolves workspace root, passes file paths to the Rust `path_gate` binary, and interprets safety verdicts.

**Rust binary:** `sdks/rust/src/bin/path_gate.rs` — performs canonical path resolution, verifies all paths stay within the workspace root, checks for traversal and injection patterns.

**Evidence emitted:** Structured JSON with per-path safety verdicts. No commit, apply, or authorization fields.

**What it does NOT authorize:** File creation, file deletion, content modification, symlink creation, workspace reconfiguration.

**Trial:** `trials/v11_9_rust_path_safety_trial.ts` — 6 tests covering safe paths (accepted), traversal (rejected), absolute paths (rejected), null bytes (rejected), and Windows-specific edge cases.

**Known limitations:**
- Symlink race condition (TOCTOU) between check and use is not fully mitigated
- OS-native canonicalization may differ between Linux and Windows

**Future hardening:**
- Add inode-based verification for symlink safety
- Cross-platform canonicalization test suite

---

## Kernel 3 — Deterministic IDs (v12.0)

**What it verifies:**
- Same input produces the same hash across multiple Rust invocations
- Different inputs produce different hashes (collision resistance within test scope)
- Hash stability survives process restart
- ID format matches expected SHA-256 hex encoding (64 chars)
- IDs are stable across memory lifecycles (reload→rehash→compare)

**TypeScript bridge:** `src/rust_id_gate.ts` — passes test vectors to the Rust `id_gate` binary, collects hashes, and compares across invocations.

**Rust binary:** `sdks/rust/src/bin/id_gate.rs` — hashes input payloads with SHA-256, returns deterministic IDs.

**Evidence emitted:** Structured JSON with hash outputs and determinism verification status.

**What it does NOT authorize:** ID assignment, ID-based access control, identity-based gating, memory mutation.

**Trial:** `trials/v12_0_rust_id_gate_trial.ts` — 6 tests covering same-input→same-hash, different-input→different-hash, hash format validation, and cross-invocation stability.

**Known limitations:**
- Only tests SHA-256; does not benchmark alternative hash functions
- Collision resistance is tested within a small fixture set, not at cryptographic scale

**Future hardening:**
- Add BLAKE3 as an alternative hash function
- Cryptographic collision resistance benchmark

---

## Kernel 4 — Audit Scanner Core (v12.1)

**What it verifies:**
- Independently scans Rust source files for risk patterns
- Detects unsafe blocks, filesystem writes, process command invocations
- Classifies findings by severity and confidence
- Produces evidence that can be compared with the TypeScript scanner output
- Runs as a standalone binary with no TypeScript dependency

**TypeScript bridge:** `src/rust_scanner_gate.ts` — passes file content to the Rust `scanner_gate` binary, collects findings, and compares against TS scanner output.

**Rust binary:** `sdks/rust/src/bin/scanner_gate.rs` — regex-based Rust source scanner that classifies findings by risk kind, severity, and confidence.

**Evidence emitted:** Structured JSON with per-file finding lists, severity×confidence cross-tabulation, and comparison metadata.

**What it does NOT authorize:** Finding classification as defect, automated fix generation, obligation creation, evidence promotion, audit report finalization.

**Trial:** `trials/v12_1_rust_scanner_gate_trial.ts` — 5 tests covering fixture scanning, unsafe block detection, filesystem write detection, process command detection, and TS/Rust comparison.

**Known limitations:**
- Regex-based scanning; not AST-verified
- May produce false positives on commented-out code or string literals
- Test-file findings are expected patterns, not production risks

**Future hardening:**
- Integrate with Rust AST parser (syn) for structural verification
- Add false-positive suppression via annotation

---

## Kernel 5 — Policy / Admissibility Gate (v12.2)

**What it verifies (9 deterministic precondition checks):**

| # | Check | What It Verifies |
|---|-------|-----------------|
| 1 | `policy_hash_present` | Proposal policyHash is non-empty |
| 2 | `policy_hash_match` | Proposal policyHash matches receipt policyHash |
| 3 | `admissibility` | V_post + spend ≤ V_pre + defect + authority |
| 4 | `memory_budget` | Receipt canonical bytes ≤ memory budget |
| 5 | `file_paths_in_scope` | All paths relative, no traversal, no null bytes |
| 6 | `file_count_budget` | File count ≤ max_files |
| 7 | `receipt_fields` | All Rational64 denominators > 0 |
| 8 | `high_risk_requires_review` | create/delete actions and governed-dir paths require review flag |
| 9 | `unsafe_auto_proposal_refused` | Zero-authority+zero-defect proposals and gate-dir creates refused |

**TypeScript bridge:** `src/rust_policy_gate.ts` — serializes `GateRecord` + `CohBitReceipt` to JSON, auto-computes `requiresReview` per file, invokes the Rust `policy_gate` binary, and parses the 9-check result.

**Rust binary:** `sdks/rust/src/bin/policy_gate.rs` — deserializes the payload, performs all 9 deterministic checks, returns `{ valid, evidence, checks[] }`.

**Evidence emitted:** Structured JSON with per-check pass/fail status, detail strings, and aggregate evidence summary. No commit, apply, or authorization fields.

**What it does NOT authorize:** Commit, apply, receipt finalization, obligation closure, evidence promotion, gate lifecycle replacement.

**Trial:** `trials/v12_2_rust_policy_gate_trial.ts` — 14 tests covering all 9 checks (valid acceptance + 8 rejection scenarios), TS/Rust comparison, backward compatibility, and no-commit-field verification.

**Known limitations:**
- `requiresReview` is computed by the TypeScript bridge, not the Rust binary independently
- Admissibility inequality uses simple Rational64 arithmetic; does not account for floating-point precision
- High-risk directory list is hardcoded; should be configurable

**Future hardening:**
- Move `requiresReview` classification into Rust for full independence
- Add configurable high-risk directory and action class policies
- Add floating-point tolerance parameter for admissibility check

---

## Authority Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                    TypeScript Gate Lifecycle                  │
│  propose → review → authorize → apply → test → rollback → receipt │
│                                                              │
│  TypeScript OWNS: commit, apply, receipt, obligation close   │
│  TypeScript OWNS: workflow orchestration, teaching, CLI      │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    CohBit Receipt       │
              │   (boundary artifact)   │
              └────────────┬────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Rust Trust Kernels                         │
│                                                              │
│  K1: Receipt Identity    — "is the receipt well-formed?"     │
│  K2: Path Safety         — "is the target path safe?"       │
│  K3: Deterministic IDs   — "is identity stable?"            │
│  K4: Audit Scanner       — "what risks does Rust see?"      │
│  K5: Policy Gate         — "do preconditions hold?"         │
│                                                              │
│  Rust PRODUCES: evidence only (JSON checks, details, status) │
│  Rust DOES NOT: commit, apply, authorize, close, promote     │
└──────────────────────────────────────────────────────────────┘
```

---

## Trial Coverage Summary

| Kernel | Trial File | Test Count | Status |
|--------|-----------|------------|--------|
| K1 — Receipt | `trials/v11_8_rust_receipt_gate_trial.ts` | 5 | ✅ PASS |
| K2 — Path Safety | `trials/v11_9_rust_path_safety_trial.ts` | 6 | ✅ PASS |
| K3 — Deterministic IDs | `trials/v12_0_rust_id_gate_trial.ts` | 6 | ✅ PASS |
| K4 — Audit Scanner | `trials/v12_1_rust_scanner_gate_trial.ts` | 5 | ✅ PASS |
| K5 — Policy Gate | `trials/v12_2_rust_policy_gate_trial.ts` | 14 | ✅ PASS |
| **Total** | | **36** | |

---

## Trust Kernel Roadmap History

```
v11.7  Language Split Doctrine                         ✅
v11.8  Rust Kernel 1: Canonical Receipt Verification    ✅
v11.9  Rust Kernel 2: Path Safety Validation            ✅
v12.0  Rust Kernel 3: Deterministic IDs                 ✅
v12.1  Rust Kernel 4: Audit Scanner Core                ✅
v12.2  Rust Kernel 5: Policy / Admissibility Gate       ✅
```

The five-kernel trust roadmap is now complete. Each kernel provides independent Rust verification of an authority-sensitive fact while respecting the evidence-only boundary. The TypeScript gate lifecycle remains the sole authority path for commits, applies, and obligation management.

---

*Generated by CohBit-Copilot v12.2. TypeScript orchestrates. Rust verifies. CohBit receipts the boundary.*