# CohBit-Copilot — Full System Test Matrix

**Audit ID:** FULL_SYSTEM_2026-06-03  
**Ran:** 2026-06-03T23:30:00Z  
**Test Runner:** vitest v3.1.0

---

## Test Execution Summary

| Metric | Value |
|--------|-------|
| Test files total | 94 |
| Test files passed | 60 |
| Test files failed | 34 (trial runners — no vitest test suites) |
| Tests total | 797 |
| Tests passed | 792 (99.4%) |
| Tests failed | 5 (0.6%) |
| Duration | 30.71s |

---

## Failed Tests — Root Cause Analysis

| # | Test | File | Line | Error | Root Cause |
|---|------|------|------|-------|------------|
| 1 | Happy Path snapshot | `trials/v0.2-trial.ts` | 116 | `snapshot.files` length 0, expected 1 | path_safety rejects `os.tmpdir()` path outside workspace root |
| 2 | Failure Path rollback | `trials/v0.2-trial.ts` | 237 | Current content contains buggy function, not corrected version | Happy path did not apply fix (test 1 failed), so file still has bug |
| 3 | Edge case hash mismatch | `trials/v0.2-trial.ts` | 401 | `snapshot.files[0]` undefined | Same path_safety rejection cascading |
| 4 | Rust happy path | `trials/v0.4-lang-trials.ts` | 50 | `snapshot.files` length 0 | path_safety rejects temp dir outside workspace root |
| 5 | Rust failure path | `trials/v0.4-lang-trials.ts` | 135 | `snapshot.files[0]` undefined | Same cascade from test 4 |

**Verdict:** All 5 failures are caused by `path_safety.ts` operating correctly — temp directories in `os.tmpdir()` are outside the workspace root. Not code defects.

---

## Source Module → Test Coverage Matrix

### `src/` Core Modules

| Source Module | Test File(s) | Tests | Status | Coverage Assessment |
|---------------|-------------|-------|--------|---------------------|
| `types.ts` | `tests/conformance.test.ts`, `tests/hardening.test.ts` | 16+ | ✅ All pass | Strong — Rational64, isAdmissible, canonical serialization |
| `receipt.ts` | `tests/conformance.test.ts`, `tests/hardening.test.ts` | 16 test vectors | ✅ All pass | Strong — conformance + hardening vectors |
| `gates.ts` | `tests/conformance.test.ts`, `tests/proposer.test.ts` | 8+ spec obligations | ✅ All pass | Strong — full pipeline conformance |
| `ledger.ts` | `tests/ledger.test.ts` | — | ✅ All pass | Good — append, load, summarize |
| `fs.ts` | `tests/conformance.test.ts` | — | ✅ All pass | Good — snapshot, apply, rollback |
| `lang.ts` | `tests/conformance.test.ts` | — | ✅ All pass | Good — detectLanguage, defaultTestCommand |
| `proposer.ts` | `tests/proposer.test.ts` | — | ✅ All pass | Good — bounded patch generation |
| `english.ts` | `tests/english.test.ts` | 55 | ✅ 31/31 capability score | Strong — intent recognition, constraints, targets, unsafe rejection |
| `workspace.ts` | `tests/workspace.test.ts` | — | ✅ All pass | Good — scan, classify |
| `environment.ts` | `tests/environment.test.ts` | — | ✅ All pass | Good — reviewEnvironment |
| `symbols.ts` | `tests/symbols.test.ts` | — | ✅ All pass | Good — extract, find |
| `dep_graph.ts` | `tests/dep_graph.test.ts` | — | ✅ All pass | Good — build, findDependents, findAffectedFiles |
| `planner.ts` | `tests/planner.test.ts` | — | ✅ All pass | Good — plan, work intent |
| `patch_builder.ts` | `tests/patch_builder.test.ts` | — | ✅ All pass | Good — buildPatch |
| `repair_planner.ts` | `tests/repair.test.ts` | — | ✅ All pass | Good — buildRepairPlan |
| `test_recommender.ts` | `tests/test_recommender.test.ts` | — | ✅ All pass | Good — recommend |
| `atomic_write.ts` | `tests/security_atomic_write.test.ts` | — | ✅ All pass | Good — atomic write + hash verification |
| `path_safety.ts` | `tests/security_path.test.ts`, `tests/security_windows_paths.test.ts`, `tests/security_symlink.test.ts` | — | ✅ All pass | Strong — traversal, symlink, Windows paths |
| `atlas_bridge.ts` | `tests/atlas_bridge.test.ts` | — | ✅ All pass | Good — classify, build, map |
| `teaching.ts` | (none) | 0 | ⚠️ No unit tests | **Gap** — trial-only coverage |
| `cli.ts` | `tests/smoke.test.ts` | — | ✅ Smoke passes | **Gap** — no command-level coverage |
| `integrated_pipeline.ts` | (none) | 0 | ⚠️ No unit tests | **Gap** — trial-only coverage |
| `atlas_integration.ts` | (indirect via trial) | 0 | ⚠️ Trial-only | Partial — no isolated unit tests |
| `atlas_repair_routing.ts` | (none) | 0 | ⚠️ No unit tests | **Gap** |
| `retrieval_filter.ts` | (none) | 0 | ⚠️ No unit tests | **Gap** |
| `human_review_receipt.ts` | (none) | 0 | ⚠️ No unit tests | **Gap** |
| `finding_to_proposal.ts` | (none) | 0 | ⚠️ No unit tests | **Gap** |
| `ledger_lock.ts` | (indirect via ledger) | 0 | ⚠️ Indirect only | Partial |
| `workspace.ts` | `tests/workspace.test.ts` | — | ✅ All pass | Good |

### `packages/code-atlas/`

| Source Module | Test File | Tests | Status | Coverage Assessment |
|---------------|-----------|-------|--------|---------------------|
| `L0_artifact.ts` | `tests/L0_artifact.test.ts` | — | ✅ All pass | Strong |
| `L1_language_surface.ts` | `tests/L1_language_surface.test.ts` | — | ✅ All pass | Strong |
| `L2_parse_ast.ts` | `tests/L2_parse_ast.test.ts` | — | ✅ All pass | Strong |
| `L3_invariant.ts` | `tests/L3_invariant.test.ts` | — | ✅ All pass | Strong |
| `L4_transition.ts` | `tests/L4_transition.test.ts` | — | ✅ All pass | Strong |
| `L5_risk_constraint.ts` | `tests/L5_risk_constraint.test.ts` | — | ✅ All pass | Strong |
| `L6_projection.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L7_verifier.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L8_receipt.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L9_repair_obligation.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L10_memory_graph.ts` | (indirect) | 0 | ⚠️ No dedicated test | Partial |
| `L11_query.ts` | (indirect) | 0 | ⚠️ No dedicated test | Partial |
| `L12_governance.ts` | (indirect) | 0 | ⚠️ No dedicated test | Partial |
| `L13_canonical_pattern.ts` | (indirect) | 0 | ⚠️ No dedicated test | Partial |
| `store.ts` | `tests/store.test.ts` | — | ✅ All pass | Strong |
| `index.ts` | `tests/scaffold.test.ts` | — | ✅ All pass | Strong |

### `packages/tlt-atlas/`

| Source Module | Test File | Tests | Status | Coverage Assessment |
|---------------|-----------|-------|--------|---------------------|
| `L0_artifact.ts` | `tests/L0_artifact.test.ts` | — | ✅ All pass | Strong |
| `L1_language_surface.ts` | `tests/L1_language_surface.test.ts` | — | ✅ All pass | Strong |
| `L2_phrase_parse.ts` | `tests/L2_phrase_parse.test.ts` | — | ✅ All pass | Strong |
| `L3_semantic_unit.ts` | `tests/L3_semantic_unit.test.ts` | — | ✅ All pass | Strong |
| `L4_intent.ts` | `tests/L4_intent.test.ts` | — | ✅ All pass | Strong |
| `L5_meaning_invariant.ts` | `tests/L5_meaning_invariant.test.ts` | — | ✅ All pass | Strong |
| `L6_tone_register.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L7_domain_context.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L8_bilingual_projection.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| `L9_ambiguity_risk.ts` | `tests/L6_L9_registry.test.ts` | — | ✅ All pass | Strong |
| L10–L15 | (none) | 0 | ⚠️ No dedicated tests | **Gap** |
| L16 | (none) | 0 | ⚠️ No dedicated test | **Gap** |
| T_claim_guard.ts | (trial only) | 0 | ⚠️ Trial-only | **Gap** — no unit tests |
| T_public_internal_boundary.ts | (trial only) | 0 | ⚠️ Trial-only | **Gap** |
| T_tlt_voice.ts | (trial only) | 0 | ⚠️ Trial-only | **Gap** |
| T_tlt_transformer.ts | (trial only) | 0 | ⚠️ Trial-only | **Gap** |
| T_tlt_atlas_feed.ts | (trial only) | 0 | ⚠️ Trial-only | **Gap** |
| T_summary_generator.ts | (trial only) | 0 | ⚠️ Trial-only | **Gap** |
| `index.ts` | `tests/scaffold.test.ts` | — | ✅ All pass | Strong |

### `packages/math-atlas/`

| Source Module | Test File | Tests | Status | Coverage Assessment |
|---------------|-----------|-------|--------|---------------------|
| M0–M9 | `tests/M0_M9_registry.test.ts` | — | ✅ All pass | Strong |
| M10–M17 | (none) | 0 | ⚠️ No dedicated tests | **Gap** |
| M18 | (trial only) | 0 | ⚠️ Trial-only | **Gap** |
| `index.ts` | `tests/scaffold.test.ts` | — | ✅ All pass | Strong |

### `packages/resource/`

| Source Module | Test File | Tests | Status | Coverage Assessment |
|---------------|-----------|-------|--------|---------------------|
| R0–R5 | `tests/R0_R5_registry.test.ts` | — | ✅ All pass | Strong |
| R6–R18 | `tests/v0_2_layers.test.ts`, `tests/v0_3_layers.test.ts` | — | ✅ All pass | Strong |
| R16–R17 | `tests/v0_4_v0_5_layers.test.ts` | — | ✅ All pass | Strong |
| R19–R20 | `tests/v0_6_final_layers.test.ts` | — | ✅ All pass | Strong |
| `index.ts` | `tests/scaffold.test.ts` | — | ✅ All pass | Strong |

### `packages/tooling/`

| Source Module | Test File | Tests | Status | Coverage Assessment |
|---------------|-----------|-------|--------|---------------------|
| T0, T5, T7 | `tests/T0_T5_T7.test.ts` | — | ✅ All pass | Strong |
| T12, T13 | `tests/v0_2_adapters.test.ts` | — | ✅ All pass | Strong |
| T6, T8, T9, T14, T17 | `tests/v0_3_tooling.test.ts`, `tests/v0_4_tooling.test.ts` | — | ✅ All pass | Strong |
| T3, T15 | `tests/v0_5_retrieval.test.ts` | — | ✅ All pass | Strong |
| T19 | `tests/v0_6_benchmark.test.ts` | — | ✅ All pass | Strong |
| T_integrated_audit | `tests/v0_7_integrated_audit.test.ts` | — | ✅ All pass | Strong |
| T_policy_gate | `tests/v3_0_policy.test.ts` | — | ✅ All pass | Strong |
| T_content_reader | (indirect) | 0 | ⚠️ No dedicated test | Partial |
| T_rust_risk_scanner | (indirect via trial) | 0 | ⚠️ Trial-only | **Gap** |
| T_rust_symbol_extractor | (indirect via trial) | 0 | ⚠️ Trial-only | **Gap** |
| T_rust_review_queue | (indirect via trial) | 0 | ⚠️ Trial-only | **Gap** |
| `index.ts` | `tests/scaffold.test.ts` | — | ✅ All pass | Strong |

### Security Tests

| Test File | Target Module(s) | Tests | Status |
|-----------|-----------------|-------|--------|
| `security_proposal.test.ts` | `proposer.ts` | — | ✅ All pass |
| `security_ledger.test.ts` | `ledger.ts` | — | ✅ All pass |
| `security_english.test.ts` | `english.ts` | — | ✅ All pass |
| `security_path.test.ts` | `path_safety.ts` | — | ✅ All pass |
| `security_rollback.test.ts` | `gates.ts` | — | ✅ All pass |
| `security_windows_paths.test.ts` | `path_safety.ts` | — | ✅ All pass |
| `security_atomic_write.test.ts` | `atomic_write.ts` | — | ✅ All pass |
| `security_binary_files.test.ts` | `fs.ts` | — | ✅ All pass |
| `security_concurrency.test.ts` | `ledger_lock.ts` | — | ✅ All pass |
| `security_symlink.test.ts` | `path_safety.ts` | — | ✅ All pass |

### SDK Conformance

| SDK | Test File | Tests | Status |
|-----|-----------|-------|--------|
| TypeScript | `tests/conformance.test.ts` | 16 test vectors | ✅ All pass |
| TypeScript | `tests/hardening.test.ts` | 8 hardening vectors | ✅ All pass |
| TypeScript | `sdks/compute_hashes.test.ts` | — | ✅ All pass |
| Python | `sdks/python/tests/test_conformance.py` | 8 shared vectors | ✅ All pass |
| Rust | `sdks/rust/tests/conformance.rs` | 8 shared vectors | ✅ All pass |

---

## Coverage Gap Summary

| Severity | Count | Modules |
|----------|-------|---------|
| **No unit tests** | 6 | `teaching.ts`, `integrated_pipeline.ts`, `atlas_repair_routing.ts`, `retrieval_filter.ts`, `human_review_receipt.ts`, `finding_to_proposal.ts` |
| **Trial-only** | 14 | TLT L10–L16 + T_ modules (11), M10–M18 (3), and more |
| **Partial** | 4 | `atlas_integration.ts`, code-atlas L10–L13 |
| **CLI command-level** | 1 | `cli.ts` (11 commands, smoke only) |

---

*Test Matrix generated from `npx vitest run --reporter=verbose` on 2026-06-03.*