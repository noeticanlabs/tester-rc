# CohBit-Copilot — Claim Table

**Purpose:** Status of every architectural claim in the system, so reviewers know what is verified vs. intended.  
**Generated:** 2026-06-06  
**Package version:** 10.9.0

---

## Classification Legend

| Label | Meaning | How to Verify |
|-------|---------|---------------|
| `runtime-tested` | Exercised by the test suite (vitest or trial runners) | Run the referenced test |
| `architecture-claim` | Structurally enforced by design, not per-operation tested | Read the referenced source |
| `scaffolded` | Code exists with tests but is not wired into operational paths | Check that the file exists + test file exists |
| `future-route` | Intentionally deferred; no code exists yet | Acknowledged limitation |
| `known-gap` | Acknowledged limitation, partially addressed | See `docs/known_gaps.md` |

---

## 1. Core Mathematical Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 1.1 | Admissibility law: `V(post) + s ≤ V(pre) + d + a` | `runtime-tested` | `tests/conformance.test.ts`, `tests/hardening.test.ts` |
| 1.2 | Rational64 arithmetic with GCD reduction | `runtime-tested` | `tests/conformance.test.ts` — `2/2 == 1/1` |
| 1.3 | Deterministic SHA-256 receipt hashing | `runtime-tested` | `tests/conformance.test.ts` — 16 test vectors |
| 1.4 | Cross-language SDK conformance (TS/Python/Rust) | `runtime-tested` | `sdks/compute_hashes.test.ts`, `sdks/rust/tests/conformance.rs`, `sdks/python/tests/test_conformance.py` |
| 1.5 | Directed triangle inequality | `architecture-claim` | `spec/SPEC.md` Theorem 1 |
| 1.6 | Path accounting telescopes | `architecture-claim` | `spec/SPEC.md` Theorem 3 |
| 1.7 | Memory mass defined over canonical bytes | `runtime-tested` | `tests/hardening.test.ts` |
| 1.8 | Type-safe coupling (no commit without policy) | `architecture-claim` | `src/gates.ts` authorize() — enforced in code structure |

---

## 2. Gate Pipeline Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 2.1 | 7-gate lifecycle: Propose→Review→Authorize→Apply→Test→Rollback→Receipt | `runtime-tested` | `tests/proposer.test.ts`, `tests/ledger.test.ts` |
| 2.2 | ProposeGate: copilot may propose, bounded proposals only | `runtime-tested` | `tests/proposer.test.ts` |
| 2.3 | ReviewGate: Proposal ≠ Authority; copilot cannot self-approve | `architecture-claim` | `src/gates.ts` review() — requires external reviewer |
| 2.4 | AuthorizeGate: admissibility + policy hash binding + memory budget | `runtime-tested` | `tests/conformance.test.ts` |
| 2.5 | ApplyGate: pre-state snapshot with hashes for rollback | `runtime-tested` | `tests/security_atomic_write.test.ts` |
| 2.6 | TestGate: language-aware test command detection | `runtime-tested` | `tests/workspace.test.ts` |
| 2.7 | RollbackGate: restore from pre-state snapshot | `runtime-tested` | `tests/security_rollback.test.ts` |
| 2.8 | ReceiptGate: deterministic receipt, only from TESTS_PASSED | `runtime-tested` | `tests/conformance.test.ts` |
| 2.9 | Gate state machine enforces sequential progression | `runtime-tested` | `tests/gates` (various gate status tests) |
| 2.10 | Gate records persist across CLI processes (v11.2) | `runtime-tested` | `tests/gate_store.test.ts` |

---

## 3. Integrated Audit Pipeline Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 3.1 | 8-phase pipeline: Scan→Content→Risk→Symbols→Review→Atlas→Obligations→Proposals→Report | `runtime-tested` | `trials/v8_0_integrated_audit.ts` |
| 3.2 | Audit observes, does not mutate source code | `architecture-claim` | `src/integrated_pipeline.ts` — writes only to .cohbit/ and reports/ |
| 3.3 | Rust regex risk scanner with severity×confidence | `runtime-tested` | `trials/v8_4_rust_fixture_trial.ts`, `trials/v8_5_safe_proposal_fixture_trial.ts` |
| 3.4 | AST-lite structural parser (function boundaries, return types) | `runtime-tested` | Part of v3.4 tooling, exercised by integrated pipeline |
| 3.5 | Evidence-rich findings (18 fields, guard detection, code windows) | `architecture-claim` | `packages/tooling/src/T_rust_finding_enricher.ts` |
| 3.6 | Professional report generator (10 sections, 3 modes) | `runtime-tested` | `reports/v8_0_integrated_audit.md` |
| 3.7 | Audit fixture battery (6 fixtures) | `runtime-tested` | `sandbox/fixtures/` — 6 fixture directories |
| 3.8 | Priority P0–P3 triage with deterministic finding IDs | `runtime-tested` | `trials/v3_2_ctrl_triage_audit_runner.ts` |
| 3.9 | Budget enforcement (50MB/500 files) | `architecture-claim` | `src/integrated_pipeline.ts` — enforced at pipeline entry |

---

## 4. Obligation & Dashboard Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 4.1 | Obligation state machine: open→under_review→closed | `runtime-tested` | `trials/v7_1_obligation_lifecycle_trial.ts` |
| 4.2 | Cross-run reconciliation (new/existing/changed/duplicates) | `runtime-tested` | `trials/v8_1_stability_audit.ts` |
| 4.3 | Content evidence hash change detection | `runtime-tested` | v8.6 — `computeContentEvidenceHash()` |
| 4.4 | Dashboard health panels (open/review/deferred/stale) | `runtime-tested` | `trials/v7_2_dashboard_trial.ts` |
| 4.5 | Escalation for stale high-priority obligations | `runtime-tested` | `trials/v7_3_escalation_trial.ts` |
| 4.6 | Canonical pattern memory (v8.7) | `runtime-tested` | `trials/v8_0_integrated_audit.ts` — aggregateCanonicalPatterns |
| 4.7 | Obligation persistence across runs | `runtime-tested` | v8.1 — persistObligationStore()/loadObligationStore() |

---

## 5. TLT Language System Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 5.1 | Transformer: language → typed graph nodes + edges | `runtime-tested` | `trials/v9_0_tlt_bidirectional_trial.ts` |
| 5.2 | Voice: graph → advisory language statements (9 categories) | `runtime-tested` | `trials/v9_0_tlt_bidirectional_trial.ts` |
| 5.3 | Atlas Feed: candidate patterns → Atlas review | `runtime-tested` | `trials/v9_0_tlt_bidirectional_trial.ts` |
| 5.4 | Claim guard: 5-level strength ladder | `runtime-tested` | `trials/v9_1_claim_boundary_hardening_trial.ts` |
| 5.5 | Voice NEVER upgrades graph status | `architecture-claim` | `packages/tlt-atlas/src/T_claim_guard.ts` |
| 5.6 | Public/internal terminology boundary | `runtime-tested` | `trials/v9_1_claim_boundary_hardening_trial.ts` |
| 5.7 | Summary generator: 5 audience modes | `runtime-tested` | `trials/v9_2_summary_generator_trial.ts` |
| 5.8 | Public language inherits evidence limits | `runtime-tested` | `trials/v9_2_summary_generator_trial.ts` |

---

## 6. Teaching Mode Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 6.1 | 12-module curriculum (M0–M11) | `runtime-tested` | `trials/v10_6_curriculum_trial.ts` |
| 6.2 | teach() with 3 audiences (internal, public, linkedin) | `runtime-tested` | `trials/v10_1_teaching_fixture_trial.ts` |
| 6.3 | generateQuiz() with topic-specific questions | `runtime-tested` | `trials/v10_6_curriculum_trial.ts` |
| 6.4 | Learning polarity (positive/negative classification) | `runtime-tested` | `trials/v10_3_polarity_trial.ts` |
| 6.5 | Lesson memory persistence | `runtime-tested` | `trials/v8_8_lesson_memory_trial.ts` |
| 6.6 | Standards traceability matrix (12 modules × 12 domains) | `scaffolded` | `docs/curriculum/standards_traceability_matrix.md` |
| 6.7 | Teaching mode has unit tests | `known-gap` | Trial-only coverage; no vitest tests for teaching.ts |

---

## 7. Security Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 7.1 | Symlink resolution | `runtime-tested` | `tests/security_symlink.test.ts` |
| 7.2 | Path traversal prevention | `runtime-tested` | `tests/security_path.test.ts` |
| 7.3 | Atomic writes (temp→rename→hash verify) | `runtime-tested` | `tests/security_atomic_write.test.ts` |
| 7.4 | Concurrent write safety (ledger lock) | `runtime-tested` | `tests/security_concurrency.test.ts` |
| 7.5 | Binary file rejection | `runtime-tested` | `tests/security_binary_files.test.ts` |
| 7.6 | English command safety (unsafe rejection) | `runtime-tested` | `tests/security_english.test.ts` |
| 7.7 | Ledger integrity | `runtime-tested` | `tests/security_ledger.test.ts` |
| 7.8 | Proposal safety | `runtime-tested` | `tests/security_proposal.test.ts` |
| 7.9 | Rollback safety | `runtime-tested` | `tests/security_rollback.test.ts` |
| 7.10 | Windows path safety | `runtime-tested` | `tests/security_windows_paths.test.ts` |

---

## 8. Resource Governance Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 8.1 | R1 compute budget (create/authorize/record) | `runtime-tested` | `tests/integrated_pipeline_r21.test.ts` |
| 8.2 | R5 time budget (create/check/record) | `runtime-tested` | `tests/integrated_pipeline_r21.test.ts` |
| 8.3 | R18 resource receipt (create/close) | `runtime-tested` | `tests/integrated_pipeline_r21.test.ts` |
| 8.4 | R19 resource dashboard | `scaffolded` | Wired into integrated pipeline only |
| 8.5 | R21 processor runtime (withProcessorSync/aggregate) | `runtime-tested` | `tests/integrated_pipeline_r21.test.ts` |
| 8.6 | R21 compute processor map (18 profiles) | `scaffolded` | `packages/tooling/src/resource/R21_compute_processor_map.ts` |
| 8.7 | runGoverned() wraps 25 workflow types | `runtime-tested` | `packages/tooling/src/T_resource_governor.ts` |
| 8.8 | All auditable operations pass through resource authorization | `known-gap` | R1/R5/R18/R19 wired; R6/R8/R4 scaffolded; see known_gaps.md |

---

## 9. Persistence Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 9.1 | Append-only JSONL session ledger | `runtime-tested` | `tests/ledger.test.ts` |
| 9.2 | Gate record disk persistence (atomic writes) | `runtime-tested` | `tests/gate_store.test.ts` |
| 9.3 | Obligation store persistence across runs | `runtime-tested` | v8.1 trials |
| 9.4 | Atlas memory persistence (code-atlas store) | `runtime-tested` | `packages/code-atlas/tests/store.test.ts` |
| 9.5 | Canonical pattern deduplication (v8.6) | `runtime-tested` | v8.6 — rebuildAtlasIndex() |

---

## 10. Atlas Memory Claims

| # | Claim | Status | Verification |
|---|-------|--------|-------------|
| 10.1 | Code Atlas (L0–L13, 16 layers) | `runtime-tested` | `packages/code-atlas/tests/scaffold.test.ts` |
| 10.2 | TLT Atlas (L0–L16, 20 layers) | `runtime-tested` | `packages/tlt-atlas/tests/scaffold.test.ts` |
| 10.3 | Math Atlas (M0–M18, 19 layers) | `runtime-tested` | `packages/math-atlas/tests/scaffold.test.ts` |
| 10.4 | Cross-atlas bridge (atlas_bridge.ts) | `runtime-tested` | `tests/atlas_bridge.test.ts` |
| 10.5 | Atlas integration (seed/enrich/reconcile) | `runtime-tested` | `trials/v8_0_integrated_audit.ts` |
| 10.6 | Operational lesson memory (v8.8) | `runtime-tested` | `trials/v8_8_lesson_memory_trial.ts` |

---

## Summary

| Status | Count | Explanation |
|--------|-------|-------------|
| `runtime-tested` | 52 | Exercised by vitest or trial runners |
| `architecture-claim` | 7 | Structurally enforced by design |
| `scaffolded` | 4 | Code exists but not fully wired |
| `known-gap` | 3 | Acknowledged limitation |
| `future-route` | 0 | None claimed in this table |
| **Total** | **66** | |

---

*Claim Table. Reference document. All statuses verified against codebase as of v10.9.0/v11.6.*