# CohBit-Copilot Changelog

## v14.5 — v14.x Comprehensive Tie-Off (2026-06-06)

### Added
- **src/cli.ts**: Two new commands: `repair-review` (list/show/explain/approve/reject/summary) and `propose-repair` (convert approved repair to gate pipeline proposal). Repair pipeline now spans review queue → gate proposal → review → authorize → apply → test → rollback → receipt.
- **packages/tooling/src/T_resource_governor.ts**: Added budget entries for `repair-review`, `propose-from-repair`, and `repair-plan` workflow types.
- **src/cli.ts (governance)**: `handleRepair` now wrapped in `runGoverned({ workflowId: 'repair-plan' })`. All mutation-capable CLI paths are resource-governed.

### Changed
- **package.json**: Version bumped from 10.9.0 to 14.5.0 to align with feature version.
- **src/cli.ts**: Version header updated to v14.5. `parseArgs` extended to recognize `repair-review` and `propose-repair` commands for proposalId extraction.

### Operating Law (v14.5)
> The repair pipeline extends the 7-gate lifecycle with an upstream review queue. Repair review may inspect, explain, and mark tasks as reviewed. Only the gate pipeline (propose → review → authorize → apply → test → rollback → receipt) may mutate source code. Resource governance wraps all mutation-capable CLI paths.

### Documentation Updated
- CHANGELOG.md: Added v13.x and v14.x entries
- docs/version_map.md: Added v12.x, v13.x, v14.x entries
- docs/known_gaps.md: Refreshed — marked resolved gaps, updated status
- reports/v14_4_repair_review_ux.md: Existing (v14.4 delivered)

---

## v14.4 — Repair Review UX (2026-06-06)

### Added
- **src/repair_review.ts**: Human review CLI for AST-guided repair proposals. Operators can list, inspect, explain, approve, and reject repair tasks without granting mutation authority. `approveRepair()` explicitly documents that approval does not apply the patch.
- Read-only review operations on the T8 repair queue.

---

## v14.3 — Repair Proposal Smoke Test (2026-06-06)

### Added
- **trials/v14_3A_repair_proposal_smoke.ts**: Smoke test verifying that findings flow through the v14.3 AST-guided proposal bridge and land as repair tasks.

---

## v14.2 — External Tester RC (2026-06-06)

### Added
- **src/onboarding.ts**: Config initialization (`cohbit-copilot init`)
- **src/system_explain.ts**: System explanation output
- **src/command_hub.ts**: Interactive command hub
- **src/demo_runner.ts**: Starter demo walkthrough
- **src/access_control.ts**: Profile management (observer/learner/reviewer/operator/maintainer)
- **src/network_boundary.ts**: Network mode control (offline/local-lan)
- **trials/v14_2_external_tester_rc.ts**: 8-test smoke suite — all passed

---

## v14.1 — Philosophy Corpus Trial (2026-06-06)

### Added
- **trials/v14_1B_philosophy_corpus_trial.ts**: Corpus ingestion trial for philosophical language

---

## v14.0 — Human Admission Gate (2026-06-06)

### Added
- **src/access_control.ts**: Human admission gate with profile-based access control
- **trials/v14_0_human_admission_gate.ts**: Trial verifying admission gate behavior

---

## v13.x — Curriculum Hardening / Learning Doctrine (2026-06)

### Added
- **v13.9**: Curriculum gap mapping — cross-repo structural comparison
- **v13.8**: Admission review — stable candidate review and admission gating
- **v13.7**: Stable candidate review — content confirmation pipeline
- **v13.6**: Cross-repo structural and content confirmation trials
- **v13.5**: Curriculum reobservation — audit of curriculum content stability
- **v13.4**: Curriculum review — professional audit of teaching curriculum
- **docs/learning_doctrine.md**: Learning doctrine documentation
- **src/memory_stability.ts**: Memory stability reporting
- **src/learning_**: Learning module (foundational)

---

## v12.x — Trust Kernel (2026-06)

### Added
- **v12.4**: Full trust kernel smoke test — verifies all 5 Rust kernels work together
- **v12.3**: (implicit) Trust-kernel hardening and integration
- **docs/trust_kernel_report.md**: Comprehensive trust kernel architecture report

### Trust-Kernel Roadmap — COMPLETE
| Version | Kernel | Status |
|---------|--------|--------|
| v11.7 | Language Split Doctrine | ✅ |
| v11.8 | Rust Kernel 1: Canonical Receipt Verification | ✅ |
| v11.9 | Rust Kernel 2: Path Safety Validation | ✅ |
| v12.0 | Rust Kernel 3: Deterministic IDs | ✅ |
| v12.1 | Rust Kernel 4: Audit Scanner Core Candidate | ✅ |
| v12.2 | Rust Kernel 5: Policy/Admissibility Gate | ✅ |

---

## v12.2 — Rust Kernel 5: Policy / Admissibility Gate (2026-06-06)

### Added
- **sdks/rust/src/bin/policy_gate.rs**: Standalone Rust binary that validates 7 deterministic authorization preconditions: policy hash presence, policy hash match, admissibility law (V_post + spend ≤ V_pre + defect + authority), memory budget, file path scope, file count budget, and receipt field well-formedness. Emits structured JSON with per-check pass/fail. Operating law: Rust may verify deterministic gate preconditions but may NOT authorize commit, close obligations, or apply patches.
- **sdks/rust/Cargo.toml**: Added `[[bin]]` entry for `policy_gate`
- **src/rust_policy_gate.ts**: TypeScript bridge that builds authorization payload from GateRecord + CohBitReceipt, spawns `cargo run --bin policy_gate`, parses structured JSON with 7 per-check results. Rust availability is optional. TypeScript `authorize()` remains the authority path.
- **trials/v12_2_rust_policy_gate_trial.ts**: 10 test cases verifying all criteria: valid proposal acceptance, missing policyHash rejection, hash mismatch rejection, admissibility violation rejection, memory budget exceeded, file count scope, path traversal rejection, TS/Rust comparison, TS backward compatibility, no commit authorization leakage

### Success Criteria Met
| # | Criterion | Verified |
|---|-----------|----------|
| 1 | Valid bounded proposal accepted | ✅ All 7 checks pass |
| 2 | Missing policyHash rejected | ✅ `policy_hash_present` fails |
| 3 | Policy hash mismatch rejected | ✅ `policy_hash_match` fails |
| 4 | Admissibility violation rejected | ✅ V_post + s > V_pre + d + a schema-verified |
| 5 | Memory budget exceeded rejected | ✅ M_mem > B_mem rejected |
| 6 | Unbounded file scope flagged | ✅ 15 files > max 10 rejected |
| 7 | File paths validated | ✅ `../etc/passwd` rejected |
| 8 | TS can compare against Rust evidence | ✅ Side-by-side comparison in trial |
| 9 | TS gate pipeline backward compatible | ✅ `authorize()` unchanged |
| 10 | No commit authorization in output | ✅ No authorized/commitPermission/applyPermission fields |

### Policy Gate Checks (7 total)
```
1. policy_hash_present   — Proposal must declare a policy hash
2. policy_hash_match     — Receipt and proposal hashes must match
3. admissibility         — V_post + s ≤ V_pre + d + a
4. memory_budget         — Canonical bytes ≤ B_mem
5. file_paths_in_scope   — No absolute paths, null bytes, or traversal
6. file_count_budget     — files.length ≤ maxFiles
7. receipt_fields        — All Rational fields have denom > 0
```

### Trust-Kernel Roadmap — COMPLETE
```
v11.7  Language Split Doctrine                         ✅
v11.8  Rust Kernel 1: Canonical Receipt Verification    ✅
v11.9  Rust Kernel 2: Path Safety Validation            ✅
v12.0  Rust Kernel 3: Deterministic IDs                 ✅
v12.1  Rust Kernel 4: Audit Scanner Core Candidate      ✅
v12.2  Rust Kernel 5: Policy/admissibility gate kernel  ✅
```

---

## v12.1 — Rust Kernel 4: Audit Scanner Core Candidate (2026-06-06)

### Added
- **sdks/rust/src/bin/scanner_gate.rs**: Standalone Rust binary that regex-scans Rust source files for 5 core risk patterns (unsafe_block, process_command, filesystem_delete_file, unwrap_review_signal, panic_review_signal). Emits structured JSON output with findings and evidence. Operating law: Rust scanner evidence may strengthen review confidence but does not prove a defect, authorize repair, or replace human review.
- **sdks/rust/Cargo.toml**: Added `regex = "1.10"` dependency and `[[bin]]` entry for `scanner_gate`
- **src/rust_scanner_gate.ts**: TypeScript bridge that writes file content payload, spawns `cargo run --bin scanner_gate`, parses JSON findings. Rust availability is optional. TypeScript `T_rust_risk_scanner.ts` remains primary audit path.
- **trials/v12_1_rust_scanner_gate_trial.ts**: 8 test cases verifying all criteria: safe file reading, cross-scanner pattern matching, comparison report generation, mismatch-as-gap handling, no authorization leakage, TS scanner unchanged, path verifier gating, evidence reportability

### Success Criteria Met
| # | Criterion | Verified |
|---|-----------|----------|
| 1 | Rust scanner reads fixture files safely | ✅ Path gate integration available |
| 2 | Core patterns match on rust-risk-fixture | ✅ TS and Rust overlap comparison |
| 3 | Comparison report generated | ✅ Side-by-side riskKind overlap printout |
| 4 | Mismatches are evidence gaps, not failures | ✅ Gap documented, test always passes |
| 5 | Rust output does not authorize repairs | ✅ No authorization fields in result |
| 6 | TS scanner remains primary | ✅ TS functions unchanged |
| 7 | Path verifier gates before scanner reads | ✅ `verifyPathWithRust()` available |
| 8 | Evidence can be included in reports | ✅ Well-formed evidence string |

### Scanner Scope (5 core patterns)
```
unsafe_block     — unsafe { } blocks
process_command  — std::process::Command usage  
filesystem_delete_file — fs::remove_file() calls
unwrap_review_signal   — .unwrap() calls  
panic_review_signal    — panic!() calls
```

### Trust-Kernel Roadmap
```
v11.7  Language Split Doctrine                         ✅
v11.8  Rust Kernel 1: Canonical Receipt Verification    ✅
v11.9  Rust Kernel 2: Path Safety Validation            ✅
v12.0  Rust Kernel 3: Deterministic IDs                 ✅
v12.1  Rust Kernel 4: Audit Scanner Core Candidate      ✅
v12.2  Rust Kernel 5: Policy/admissibility gate kernel
```

---

## v12.0 — Rust Kernel 3: Deterministic ID Verification Gate (2026-06-06)

### Added
- **test_vectors/id_conformance.json**: 13 shared conformance vectors (5 finding, 4 obligation, 4 processor) with verified expected IDs. Covers dedup (same input→same ID) and evidence-change (different input→different ID) cases.
- **sdks/rust/src/bin/id_gate.rs**: Standalone Rust binary that reads conformance vectors and computes SHA-256 deterministic IDs for finding, obligation, and processor families. Emits `VERIFIED`/`MISMATCH` per vector. Operating law: Rust verifier output is evidence, not authority.
- **sdks/rust/Cargo.toml**: Added `[[bin]]` entry for `id_gate`
- **src/rust_id_gate.ts**: TypeScript bridge that copies conformance vectors to SDK directory, spawns `cargo run --bin id_gate`, parses pass/fail counts. Rust availability is optional.
- **trials/v12_0_rust_id_gate_trial.ts**: 11 test cases verifying all 10 success criteria: conformance vectors exist, TS/Rust ID identity, finding IDs, obligation IDs, processor IDs, receipt deferral acknowledgment, dedup, evidence-change, evidence-only output, backward compatibility, and cross-language verification

### Success Criteria Met
| # | Criterion | Verified |
|---|-----------|----------|
| 1 | Shared ID conformance vectors exist | ✅ 13 vectors in `test_vectors/id_conformance.json` |
| 2 | TS and Rust produce identical IDs | ✅ All vectors cross-validated |
| 3 | Finding IDs verify | ✅ 4 finding vectors + dedup |
| 4 | Obligation IDs verify | ✅ 4 obligation vectors + dedup |
| 5 | Processor IDs verify | ✅ 4 processor vectors + dedup |
| 6 | Receipt IDs deferred | ✅ Trial explicitly documents 4 deferred families |
| 7 | Same canonical input → same ID | ✅ Dedup test: F5==F1, O4==O1, P4==P1 |
| 8 | Changed evidence → changed ID | ✅ Different file/line/riskKind→different IDs |
| 9 | Rust emits evidence only | ✅ Result has no authorization fields |
| 10 | TS workflows backward compatible | ✅ Existing ID functions unchanged |

### Processor ID Algorithm (new for v12.0)
```
processorId = sha256("proc:" + workflowId + ":" + processorKind + ":" + startTime)[0:16]
```
Uses three immutable fields from R21 processor runtime records.

### Trust-Kernel Roadmap
```
v11.7  Language Split Doctrine                         ✅
v11.8  Rust Kernel 1: Canonical Receipt Verification    ✅
v11.9  Rust Kernel 2: Path Safety Validation            ✅
v12.0  Rust Kernel 3: Deterministic IDs                 ✅
v12.1  Rust Kernel 4: Audit Scanner Core candidate
v12.2  Rust Kernel 5: Policy/admissibility gate kernel
```

---

## v11.9 — Rust Kernel 2: Path Safety Validation Gate (2026-06-06)

### Added
- **sdks/rust/src/bin/path_gate.rs**: Standalone Rust binary (std-only, zero new crates) that validates file paths against workspace roots. Checks: null byte, workspace containment, traversal detection, absolute path policy, ADS syntax, symlink escape. Emits JSON with `valid`, `reason`, `evidence`, and `checks[]` array. Never mutates filesystem.
- **sdks/rust/Cargo.toml**: Added `[[bin]]` entry for `path_gate`
- **src/rust_path_safety_gate.ts**: TypeScript bridge that writes path payload to temp JSON, spawns `cargo run --bin path_gate`, parses structured JSON output. Rust availability is optional. Operating law: Rust verifier output is evidence, not authority. TypeScript path_safety.ts remains primary enforcement.
- **trials/v11_9_rust_path_safety_trial.ts**: 11 test cases verifying all 9 success criteria: verifier invocation, valid paths pass, traversal rejection, absolute path policy, symlink handling, evidence-only output, TS backward compatibility, TS/Rust agreement, no file mutation

### Success Criteria Met
| # | Criterion | Verified |
|---|-----------|----------|
| 1 | TS can call Rust path validator | ✅ `verifyPathWithRust()` API |
| 2 | Rust validates workspace-relative paths | ✅ Valid paths pass |
| 3 | Traversal attempts are rejected | ✅ `../etc/passwd` rejected |
| 4 | Absolute path policy is explicit | ✅ Cross-platform detection |
| 5 | Symlink behavior is explicit | ✅ `symlink_escape` check in output |
| 6 | Validation result is evidence only | ✅ No authorization fields |
| 7 | Existing TS path safety backward compatible | ✅ `isWithinWorkspaceSync()` unchanged |
| 8 | Mismatches between TS and Rust fail tests | ✅ Agreement test on 4 paths |
| 9 | No file mutation by Rust validator | ✅ `write` action validates only |

### Trust-Kernel Roadmap
```
v11.7  Language Split Doctrine                         ✅
v11.8  Rust Kernel 1: Canonical Receipt Verification    ✅
v11.9  Rust Kernel 2: Path Safety Validation            ✅
v12.0  Rust Kernel 3: Deterministic IDs / processor records
v12.1  Rust Kernel 4: Audit Scanner Core candidate
v12.2  Rust Kernel 5: Policy/admissibility gate kernel
```

---

## v11.8 — Rust Kernel 1: Canonical Receipt Verification Gate (2026-06-06)

### Added
- **src/rust_receipt_gate.ts**: Process-based bridge between TypeScript orchestration and Rust trust kernel. Writes receipt payload to `sdks/rust/gate_payload.json`, spawns `cargo test test_gate_payload`, parses output for `VERIFIED <hash>` or `MISMATCH`. Rust availability is optional — gate degrades gracefully if cargo not found. Operating law: Rust verifier output is evidence, not commit authority.
- **sdks/rust/tests/conformance.rs**: New `test_gate_payload` test function reads single-vector gate payload from disk, computes SHA-256 hash, and prints `VERIFIED` or `MISMATCH`. Used by TypeScript bridge.
- **trials/v11_8_rust_receipt_gate_trial.ts**: 7 test cases verifying all v11.8 success criteria: cross-language hash match, verifier invocation, corruption detection, evidence-only output, no commit authorization, evidence logging, backward compatibility
- **src/gates.ts commitReceipt()**: Records Rust verifier availability as evidence in GateRecord timeline. Does NOT block receipt emission on Rust availability.

### Success Criteria Met
| # | Criterion | Verified |
|---|-----------|----------|
| 1 | TS and Rust hashes still match on all vectors | ✅ Conformance vectors unchanged |
| 2 | TS can invoke/comparare Rust output | ✅ `verifyReceiptWithRust()` API |
| 3 | Mismatch fails tests | ✅ Corrupted receipt trial |
| 4 | Rust emits verification evidence only | ✅ No authorization fields in result |
| 5 | Rust does not authorize commits | ✅ commitReceipt works regardless of Rust |
| 6 | Verification evidence logged/receipted | ✅ GateRecord timeline events |
| 7 | TS workflow backward compatible | ✅ Core TS functions unchanged |

### Non-Claims
- Does NOT require WASM, FFI, or native modules
- Does NOT make Rust a hard dependency
- Does NOT block receipt emission on Rust availability
- Does NOT replace TypeScript receipt serialization
- Does NOT add Rust to any existing gate's critical path

---

## v11.7 — Language Split Doctrine (2026-06-06)

### Added
- **docs/language_split_doctrine.md**: Formal architecture document defining implementation boundaries across programming languages
  - 10 sections: Purpose, Current Hybrid State, Language Responsibility Table (62 modules), Authority Gradient, What Stays TypeScript, What Migrates to Rust First (5 kernels), What Is Future C++/GPU, Cross-Language Conformance Rule, Migration Order, Non-Claims/Boundaries
  - Operating law: "TypeScript orchestrates. Rust verifies. GPU explores. CPU commits. CohBit receipts the boundary."
  - 26 `src/` modules and 20+ package modules mapped to current and target language
  - 5 priority-ordered Rust kernel migrations defined (v11.8–v12.2)
  - Cross-language conformance rule: shared test vectors are the invariant bridge; any mismatch is a hard failure
  - Explicitly references existing Rust reference verifier, SDK conformance vectors, R21 processor map, and Lean 4 proofs

### Resolution
- Written boundary prevents accidental TypeScript→Rust rewrites of orchestration code
- No code migration started; doctrine-first approach ensures deliberate, conformance-gated hardening
- README and version_map updated with doctrine link

---

## v11.6 — Reviewer Readiness / Release Hardening (2026-06-06)

### Added
- **docs/known_gaps.md**: Catalog of 26 gaps across 7 categories (resource enforcement, test coverage, documentation, features, fixtures, integration, operational) with severity and status classification
- **docs/reviewer_guide.md**: 30-minute reviewer onboarding with quick start, integrity verification commands, key design principles, file reading order, and reviewer attention areas
- **docs/runbook.md**: Operational troubleshooting covering installation, test failures, CLI issues, audit issues, teaching issues, SDK verification, persistence, error messages, and cleanup
- **docs/claim_table.md**: 66 architectural claims across 10 categories (core math, gate pipeline, audit, obligations, TLT, teaching, security, resource, persistence, atlas) with runtime-tested/architecture-claim/scaffolded/known-gap status
- **packages/tooling/src/T_resource_governor.ts**: Added 7 new workflow budget entries (lesson-list, lesson-receipts, quiz-generate, polarity-list, polarity-compare, obligations-list, dashboard-view) bringing total to 25 governed workflow types
- **README.md**: Added reviewer guide, claim table, known gaps, and runbook to documentation section

### Resolution
- System is now review-ready: a new reviewer can run the test suite, verify integrity, understand the architecture, see what claims are verified vs. intended, identify known gaps, and troubleshoot issues — all from the docs/ directory.

---

## v11.5 — Documentation Alignment / Reviewer Baseline (2026-06-05)

### Changed
- **README.md**: Rewritten from v2.0 to reflect v10.9 codebase — updated capability stack (v1.x–v11.x), CLI commands (25+), test suite (792/797), two execution paths, 5-package atlas system
- **docs/architecture.md**: Replaced frozen v1.0 module map with current architecture summary + pointer to `full_system_layout_and_flowchart.md`
- **package.json**: Updated description to match current product identity
- **CHANGELOG.md**: Extended from v2.0 through v11.4 to match codebase
- **docs/full_system_layout_and_flowchart.md**: Added package version annotation (10.9.0) alongside audit/layout version (v11.4)
- **docs/version_map.md**: Added version alignment note explaining package/doc versioning relationship; added v11.5 entry

### Resolution
- Resolved documentation drift: README claimed v2.0, architecture.md claimed v1.0, package.json said v10.9.0, full layout said v11.4. All now consistently reference either the package version (10.9.0) or document-level version with explicit relationships stated.

---

## v11.4 — Curriculum Integration (2026-06-05)

### Added
- **Standards traceability matrix**: 12 curriculum modules mapped to 12 standards domains (CIPM, NIST, ISO, OWASP, etc.) in `docs/curriculum/standards_traceability_matrix.md`
- **CLI curriculum commands**: `cohbit-copilot curriculum [list|teach|quiz|trace]`
- **Topic KB expanded**: 12 module entries in `TOPIC_KB` (`src/teaching.ts`)

---

## v11.3 — Apply Snapshot Fix (2026-06-05)

### Fixed
- `applyPatch()` now returns `snapshotFiles: SnapshotFile[]` with per-file `beforeContent` + `beforeHash`
- Wired into `handleApply()` so rollback gate has full pre-state evidence
- Files: `src/fs.ts`, `src/cli.ts`

---

## v11.2 — Gate Record Persistence (2026-06-04)

### Added
- **Disk-backed gate record persistence**: `.cohbit/gate_records/<proposalId>.json` with atomic writes, path traversal rejection, schema-versioned envelopes
- `src/gate_store.ts`: `saveGateRecord()`, `loadGateRecord()`, `updateGateRecord()`, `listGateRecords()`
- CLI session store replaced in-memory `Map<string, GateRecord>` with disk-backed persistence
- Seven-gate lifecycle survives across CLI processes
- `tests/gate_store.test.ts`: 8 gate persistence tests

---

## v11.1 — R21 Processor Runtime (2026-06-04)

### Added
- **R21 processor runtime**: `packages/tooling/src/resource/R21_processor_runtime.ts`
  - `withProcessorSync()` / `withProcessor()` — wrap any operation in processor tracking
  - `aggregateProcessorResults()` — produce per-processor receipt fragments
  - `RuntimeProcessorResult` with `processor`, `result`, and `receiptFragment`
- 8 integrated audit phases wrapped with processor tracking
- `processorFragments[]` emitted in `UnifiedAuditResult` and JSON report
- Budget denial enforced on budget-required processors
- `tests/integrated_pipeline_r21.test.ts`: 5 processor fragment tests

---

## v11.0 — R21 Compute Processor Map (2026-06-03)

### Added
- **R21 compute processor profiles**: `packages/tooling/src/resource/R21_compute_processor_map.ts`
  - 18 processor kinds with curriculum requirements, evidence artifacts, CIA risk class, verification requirements, rollback expectations
- Processor classification: `heuristic|deterministic / CPU|GPU|Hybrid / APT_admissibility|UPT_possibility|CohBit_receipt|future_not_connected`
- Network risk classification: `none|isolated|gated|open`

---

## v10.9 (package version marker)

This is the npm package version as of 2026-06. The feature versions v10.x (teaching mode) and v11.x (R21 processor runtime, gate persistence, curriculum) are code-complete in this package. See `docs/version_map.md` for the canonical feature version history.

---

## v10.x — Teaching Mode / Polarity Memory / Receipts (2026-05 – 2026-06)

### Added
- **v10.6**: Full curriculum with explain proposals, findings, obligations, admissibility quizzes (`trials/v10_6_curriculum_trial.ts`)
- **v10.3**: Learning polarity — positive/negative example classification with lesson memory integration (`packages/tlt-atlas/src/L16_learning_polarity.ts`, `trials/v10_3_polarity_trial.ts`)
- **v10.1**: Teaching mode — structured curriculum with session management, content hashing, TLT integration (`src/teaching.ts`, `trials/v10_1_teaching_fixture_trial.ts`)
  - `teach(topic, audience, corpusPath)` — 3 audiences (internal, public, linkedin)
  - `generateQuiz(topic)` — topic-specific quiz generation
  - `seedLessonsIfEmpty()`, `listLessons()` — lesson memory seeding
  - `listTeachingReceipts()`, `formatTeachingReceipt()` — teaching receipts

### Teaching topics (11)
- proposal vs authority, detection is not repair authority, surface detected vs verified, obligation vs defect, why summaries cannot upgrade evidence, why receipts matter, why unsafe findings are refused, why tests increase confidence, why confidence is low, why a corpus passes clean, what positive signals mean

---

## v9.x — TLT Claim-Boundary Hardening (2026-05)

### Added
- **v9.2**: Summary generator with 5 audience modes (internal/public/technical/linkedin/reviewer) with evidence inheritance (`packages/tlt-atlas/src/T_summary_generator.ts`, `trials/v9_2_summary_generator_trial.ts`)
- **v9.1**: Claim boundary hardening — claim guard with 5-level strength ladder, public/internal boundary enforcement (`packages/tlt-atlas/src/T_claim_guard.ts`, `packages/tlt-atlas/src/T_public_internal_boundary.ts`, `trials/v9_1_claim_boundary_hardening_trial.ts`)
  - 13 violations across 8 adversarial nodes; voice never upgrades graph status
- **v9.0**: TLT bidirectional pipeline — transformer (language→graph), voice (graph→language), atlas feed (candidate pattern submission) (`packages/tlt-atlas/src/T_tlt_transformer.ts`, `T_tlt_voice.ts`, `T_tlt_atlas_feed.ts`)
  - 132 nodes, 162 edges from 11 markdown docs; 382 advisory statements

---

## v8.x — Integrated Audit Pipeline / CLI / Stability (2026-04 – 2026-05)

### Added
- **v8.9**: TLT graph seeding — atlas entries mapped to TLT nodes and edges (`trials/v8_9_tlt_graph_trial.ts`)
- **v8.8**: Lesson memory — operational knowledge persistence (`packages/math-atlas/src/M18_operational_lessons.ts`, `trials/v8_8_lesson_memory_trial.ts`)
- **v8.7**: Canonical pattern memory — `aggregateCanonicalPatternsFromObligations()` with patternHash, hitCount, sourceFiles (`packages/code-atlas/src/L13_canonical_pattern.ts`)
- **v8.6**: Canonical memory hardening — `rebuildAtlasIndex()` prevents duplicate index lines; `computeContentEvidenceHash()` enables change detection (`src/integrated_pipeline.ts`, `packages/code-atlas/src/store.ts`)
- **v8.5**: Safe proposal fixture — clean Rust code baseline proving zero false positives (`sandbox/fixtures/rust-safe-proposal-fixture/`, `trials/v8_5_safe_proposal_fixture_trial.ts`)
- **v8.4**: Rust risk fixture — deliberate unsafe blocks, process commands, filesystem mutations proving P0 detection (`sandbox/fixtures/rust-risk-fixture/`, `trials/v8_4_rust_fixture_trial.ts`)
- **v8.1**: Deterministic identity, obligation persistence, rerun stability (`trials/v8_1_stability_audit.ts`)
- **v8.0**: One-command integrated audit pipeline (`src/integrated_pipeline.ts`, `trials/v8_0_integrated_audit.ts`)
  - 7-phase orchestrator: scan→content→risk→symbols→review→atlas→obligations→proposals→report
  - Budget enforcement, resource receipt, Markdown + JSON report output

---

## v7.x — Obligations / Dashboard / Escalation (2026-04)

### Added
- **v7.3**: Escalation — stale high obligations trigger escalation with severity-weighted priority (`trials/v7_3_escalation_trial.ts`)
- **v7.2**: Dashboard — health panels (open/review/deferred/stale), aging analysis, re-review detection (`trials/v7_2_dashboard_trial.ts`)
- **v7.1**: Obligation lifecycle — state machine (open→under_review→closed) with reconciliation, dedup, change detection (`trials/v7_1_obligation_lifecycle_trial.ts`)

---

## v6.x — Audit-to-Proposal Bridge (2026-04)

### Added
- **v6.2**: Positive path demonstration — end-to-end audit→proposal→review→apply→receipt (`trials/v6_2_positive_path_demo.ts`)
- **v6.1**: Human-reviewed proposal workflow with cryptographic receipt generation (`trials/v6_1_reviewed_proposal_trial.ts`, `src/human_review_receipt.ts`)
- **v6.0**: Finding → patch proposal bridge — converts audit findings to bounded patch proposals with scope, spend, defect, authority (`trials/v6_0_copilot_trial.ts`, `src/finding_to_proposal.ts`)

---

## v5.x — Full Orchestration (2026-04)

### Added
- **v5.0**: Full system audit consolidation with retrieval filtering for atlas memory queries with evidence-level gating (`trials/v5_0_full_system_audit.ts`, `src/retrieval_filter.ts`)

---

## v4.x — Atlas Memory / Repair Routing (2026-03 – 2026-04)

### Added
- **v4.2**: Human review receipt generation — SHA-256 hashed review records with reviewer identity, timestamp, decision (`trials/v4_2_review_receipt_trial.ts`)
- **v4.1**: Repair routing — findings → obligations → repair queue; routes code-atlas repair obligations to tooling repair queue (`src/atlas_repair_routing.ts`, `trials/v4_1_repair_routing_audit.ts`)
- **v4.0**: Memory-aware audit — prior session comparison, churn detection, finding deduplication across runs (`trials/v4_0_memory_aware_audit.ts`)

---

## v3.x — Pro-Grade Audit Engine (2026-03)

### Added
- **v3.7**: 6 audit fixtures in `sandbox/fixtures/` — rust-risk-fixture, rust-safe-proposal-fixture, rust-guarded-unwrap-fixture, rust-test-only-risk-fixture, rust-process-command-fixture, rust-filesystem-risk-fixture
- **v3.6**: Professional report generator (`packages/tooling/src/T_professional_report.ts`)
  - 10-section report: executive summary, repo overview, risk distribution, top review targets, uncovered high-risk files, evidence-rich findings, test coverage, refusal boundary, limitations, JSON output
  - Three modes: internal, technical, public
- **v3.5**: Repo intelligence sub-package (`packages/tooling/src/repo_intelligence/`)
  - `repo_file_index.ts` — source/test/config/doc/generated classification
  - `repo_test_map.ts` — source-to-test mapping (naming convention heuristic)
  - `repo_risk_distribution.ts` — risk by file/module/directory (P0×10+P1×5+P2×2+P3×1), top review targets, uncovered high-risk files
  - `repo_audit_summary.ts`
- **v3.4**: Rust AST-lite parser (`packages/tooling/src/T_rust_ast_lite.ts`)
  - Function boundaries, return types, impl blocks, attributes (#[test], #[derive]), struct/enum/mod/use detection
  - `syntax_checked` evidence level; brace-counting with string/char awareness
- **v3.3**: Evidence-rich finding enricher (`packages/tooling/src/T_rust_finding_enricher.ts`)
  - 18 enriched fields: function context, code windows (5 lines), nearby guard detection, evidence notes, false-positive notes, recommended inspection, suggested evidence
  - Review queue boundary status per finding (claimStatus, mutationStatus, proposalStatus, commitStatus)
- **v3.2**: Rust review queue (`packages/tooling/src/T_rust_review_queue.ts`)
  - Priority P0–P3 triage, deterministic finding IDs via SHA-256, review queue JSON output
- **v3.1**: Calibrated Rust risk scanner — severity×confidence matrix, file context classification (src/test/fixture/example/benchmark/generated/docs), refined path-risk patterns
- **v3.0**: Rust symbol extractor (`packages/tooling/src/T_rust_symbol_extractor.ts`), content reader (`packages/tooling/src/T_content_reader.ts`), regex risk scanner (`packages/tooling/src/T_rust_risk_scanner.ts`)

---

## v2.x — Security / Reproducibility / Self-Audit (2026-02 – 2026-03)

### Added
- **v2.9**: Resource audit, CTRL audit, promotion runners (`trials/v2_9_resource_audit_runner.ts`, `trials/v2_9_ctrl_audit_runner.ts`, `trials/v2_9_promotion_runner.ts`)
- **v2.8**: Memory seeding — atlas entries from audit findings (`trials/v2_8_memory_seeding_runner.ts`)
- **v2.7**: First repo audit runner — scan → route → risk → retrieval → repair → audit (`trials/v2_7_repo_audit_runner.ts`)
- **v2.0**: Security hardening
  - `src/path_safety.ts` — symlink resolution, path traversal prevention, boundary check
  - `src/atomic_write.ts` — temp → rename → hash verify
  - `src/ledger_lock.ts` — concurrent write safety via file locking
  - `src/fs.ts` — snapshot/apply/rollback with security checks
- **v2.0 (tests)**: 10 security test suites (`tests/security_*.ts`)
  - security_path, security_atomic_write, security_concurrency, security_symlink, security_binary_files, security_english, security_proposal, security_ledger, security_rollback, security_windows_paths

---

## v1.x — Core Gate Pipeline & Workspace Intelligence (2026-01 – 2026-02)

### Added
- **v1.7**: Failure-aware repair planner — parses test/build/lint failures into structured repair plans with suggested patch primitives (`src/repair_planner.ts`, `tests/repair.test.ts`)
- **v1.6**: Guided work command — orchestrates full copilot session (`work` CLI command)
- **v1.5**: Workspace-aware bounded patch builder with 6 safe primitives (`src/patch_builder.ts`, `tests/patch_builder.test.ts`)
- **v1.4**: Plan-based test recommendation with three-tier confidence (`src/test_recommender.ts`, `tests/test_recommender.test.ts`)
- **v1.3**: Work planner — converts English tasks to scoped engineering plans (`src/planner.ts`, `tests/planner.test.ts`)
- **v1.2**: Symbol extraction and dependency graph (`src/symbols.ts`, `src/dep_graph.ts`)
- **v1.1**: Workspace and environment awareness (`src/workspace.ts`, `src/environment.ts`)
- **v1.0E**: English command understanding — rule-based operator intent parser, 31/31 capability score (`src/english.ts`, `tests/english.test.ts`)
- **v1.0**: Governed patch workflow prototype
  - Seven-gate lifecycle (Propose→Review→Authorize→Apply→Test→Rollback→Receipt)
  - Core CohBit primitive types (Rational64, Wedge, Receipt)
  - Admissibility law: `V(post) + s ≤ V(pre) + d + a`
  - Deterministic SHA-256 receipt hashing with canonical serialization
  - GMI status verification
  - Session ledger (append-only JSONL)
  - 16 test vectors (8 conformance + 8 hardening)
- **v1.0 (spec)**: Formal mathematical contract (`spec/SPEC.md`) — admissibility inequality, directed triangle inequality, path accounting telescoping, 6 theorems
- **v1.0 (sdk)**: Cross-language SDK conformance — TypeScript (primary), Rust (sha2+serde), Python (stdlib-only). 8 shared test vectors with identical SHA-256 hashes

---

## v0.x — Foundations (2025-12 – 2026-01)

### Added
- **v0.4**: Language-aware Rust trial — cargo test pass/fail, rollback, receipt emission (`trials/v0.4-lang-trials.ts`)
- **v0.2**: Happy path trial — snapshot, apply fix, run tests, produce receipt (`trials/v0.2-trial.ts`)