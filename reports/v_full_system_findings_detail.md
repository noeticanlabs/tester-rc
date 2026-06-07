# CohBit-Copilot — Full System Findings Detail

**Audit ID:** FULL_SYSTEM_2026-06-03  
**Ran:** 2026-06-03T23:30:00Z  
**Total Findings:** 12  
**P0: 0 | P1: 3 | P2: 4 | P3: 5**

---

## Finding F-A1 — Architecture Document Module Map Incomplete

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P1 |
| **Category** | Architecture / Documentation |
| **Module** | `docs/architecture.md` |
| **Obligation** | OBL-A1 |

**Description:** The module map table in `docs/architecture.md` lists only 8 core modules: `types.ts`, `receipt.ts`, `gates.ts`, `fs.ts`, `lang.ts`, `proposer.ts`, `ledger.ts`, `cli.ts`. The actual `src/` directory contains 26 `.ts` files. Eighteen modules added between v2.0 and v10.x are not documented in the module map.

**Evidence:**
- `docs/architecture.md` lines 27–38 (Module Map table): 8 rows
- `src/` directory listing: 26 `.ts` files
- Missing modules: `teaching.ts`, `integrated_pipeline.ts`, `atlas_integration.ts`, `atlas_bridge.ts`, `atlas_repair_routing.ts`, `retrieval_filter.ts`, `human_review_receipt.ts`, `finding_to_proposal.ts`, `dep_graph.ts`, `symbols.ts`, `english.ts`, `planner.ts`, `test_recommender.ts`, `patch_builder.ts`, `repair_planner.ts`, `environment.ts`, `ledger_lock.ts`, `workspace.ts`

**Impact:** New contributors cannot understand the full module landscape from the architecture document. System architecture communication is incomplete.

**Recommended Action:** Update the module map table and data flow diagram in `docs/architecture.md` to reflect all 26 core modules, all 5 package atlases, and the CLI command set.

---

## Finding F-A2 — Integrated Pipeline Has Narrow Scope

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P2 |
| **Category** | Architecture / Coverage |
| **Module** | `src/integrated_pipeline.ts` |
| **Obligation** | OBL-P1 |

**Description:** The integrated audit pipeline (`src/integrated_pipeline.ts`, v8.1) only audits Rust fixture content. The pipeline scans workspace → reads content → runs Rust risk scan → extracts Rust symbols → builds Rust review queue → seeds atlas → reconciles obligations. It does not audit TypeScript source files, TLT atlas artifacts, math-atlas artifacts, resource package layers, or any non-Rust code.

The `auditRepository()` function in `packages/tooling/src/T_integrated_audit.ts` similarly only scans, routes, and risk-scores files without language-aware or package-aware analysis.

**Evidence:**
- `src/integrated_pipeline.ts` lines 86–91: Only `scanRustContentBatch()`, `extractRustSymbolBatch()`, `buildReviewQueue()` are called
- `T_integrated_audit.ts` lines 67–69: Risk scan limited to `scanRisks(f, f)` — generic risk scanning only

**Impact:** ~80% of the codebase (TypeScript core, TLT, math-atlas, resource, tooling) is not covered by the automated audit pipeline.

**Recommended Action:** Extend the integrated pipeline to include TypeScript source analysis (import graphs, type conformance), TLT voice/guard validation, math-atlas model family checks, and resource budget enforcement verification.

---

## Finding F-T1 — No Unit Tests for Teaching Subsystem

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Priority** | P1 |
| **Category** | Test Coverage |
| **Module** | `src/teaching.ts` |
| **Obligation** | OBL-T1 |

**Description:** The teaching subsystem (`src/teaching.ts`, v10.x) provides `teach()`, `buildCurriculum()`, session management, and integrates with TLT transformer, summary generator, claim guard, and public/internal boundary modules. It has no unit tests. It is exercised only through trial runners (`trials/v10_1_teaching_fixture_trial.ts`, `trials/v10_3_polarity_trial.ts`, `trials/v10_6_curriculum_trial.ts`).

**Evidence:**
- `src/teaching.ts` imports from `T_tlt_transformer`, `T_summary_generator`, `T_tlt_voice`, `T_claim_guard`, `T_public_internal_boundary`, `M18_operational_lessons`
- No `tests/teaching.test.ts` exists
- Test matrix shows zero unit tests for this module

**Impact:** Regression risk for the teaching subsystem. Integration-trial coverage cannot catch unit-level logic errors in `teach()`, curriculum building, or session management independently.

**Recommended Action:** Add a `tests/teaching.test.ts` file with unit tests for `teach()`, `buildCurriculum()`, session ID generation, content hashing, and TLT integration mocking.

---

## Finding F-T2 — No Direct Unit Tests for `runIntegratedAudit()`

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P3 |
| **Category** | Test Coverage |
| **Module** | `src/integrated_pipeline.ts` |
| **Obligation** | OBL-T2 |

**Description:** The `runIntegratedAudit()` orchestration function is only tested through the v8.0 trial runner (`trials/v8_0_integrated_audit.ts`). While individual phases (scan, route, risk, retrieval, repair, audit) have unit tests in `@cohbit/tooling`, the orchestration function has no isolated test that verifies phase ordering, error propagation, or resource receipt closure.

**Evidence:**
- `src/integrated_pipeline.ts` lines 69–289: `runIntegratedAudit()` has 7 phases with error handling
- No test file directly calls `runIntegratedAudit()` with mocked dependencies

**Impact:** Phase ordering bugs or resource receipt errors in the orchestration layer could go undetected by phase-level unit tests.

**Recommended Action:** Add an isolated unit test for `runIntegratedAudit()` with mocked dependencies for each phase, verifying ordering, error propagation, and receipt closure.

---

## Finding F-T3 — CLI Has Smoke-Only Test Coverage

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P3 |
| **Category** | Test Coverage |
| **Module** | `src/cli.ts` |
| **Obligation** | OBL-T3 |

**Description:** The CLI (`src/cli.ts`) exposes 11 commands: propose, inspect, plan, recommend, build, repair, review, authorize, apply, test, rollback — plus teaching and audit commands. Only `tests/smoke.test.ts` exercises the CLI, and it only validates the module loads. No command-level tests exist for any of the 11 commands.

**Evidence:**
- `src/cli.ts` imports from 20+ modules — all 11 command handlers
- `tests/smoke.test.ts`: single test file, minimal assertions

**Impact:** CLI regression risk. Command argument parsing, error messages, and exit codes are untested.

**Recommended Action:** Add command-level integration tests (or at minimum argument-parsing unit tests) for each CLI command.

---

## Finding F-S1 — ReviewGate Is Function-Call Based, Not Cryptographic

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Priority** | P2 |
| **Category** | Security |
| **Module** | `src/gates.ts` |
| **Obligation** | OBL-S1 |

**Description:** The `review()` gate (`src/gates.ts`) sets a `reviewedBy` string on the gate record but does not require cryptographic attestation of the review. A compromised copilot or process could call `review()` directly without actual human review.

**Evidence:**
- `src/gates.ts` line ~110: `review()` sets `record.reviewedBy = reviewer` (string only)
- No signature verification, no hardware-bound attestation, no multi-factor review

**Impact:** For the current trust model (human-in-the-loop copilot running locally), this is acceptable. For a multi-party or adversarial deployment, it represents a bypass path.

**Recommended Action:** Consider adding optional cryptographic signature verification (e.g., GPG-signed review receipts) that can be enabled for higher-assurance deployments. The current string-based review is appropriate for local copilot use.

---

## Finding F-S2 — No Rate Limiting on Gate Pipeline

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P3 |
| **Category** | Security / Resource |
| **Module** | `src/gates.ts` |
| **Obligation** | OBL-S2 |

**Description:** The gate pipeline does not enforce rate limits, budget caps, or audit trail quotas. The resource package provides `R16_scheduler.ts` and `R17_throttle.ts` which define throttling mechanisms, but they are not wired into `gates.ts`.

**Evidence:**
- `src/gates.ts`: No calls to resource scheduler or throttle
- `packages/resource/src/R16_scheduler.ts`, `R17_throttle.ts`: Exist but not imported by gates
- `src/integrated_pipeline.ts` does enforce compute and time budgets via `R1_compute` and `R5_time`

**Impact:** High-frequency gate pipeline operations could exhaust resources without throttling.

**Recommended Action:** Wire `R16_scheduler` and `R17_throttle` into the gate pipeline entry points (propose, apply, test gates) to enforce rate limits and budget caps.

---

## Finding F-TLT1 — Summary Generator Has No CLI Path

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P3 |
| **Category** | TLT / CLI |
| **Module** | `packages/tlt-atlas/src/T_summary_generator.ts` |
| **Obligation** | OBL-TLT1 |

**Description:** The TLT summary generator provides `generateSummary()` for 5 audience modes (internal, public, technical, linkedin, reviewer) but has no CLI command. It is invoked programmatically only from `src/teaching.ts` and trial runners.

**Evidence:**
- `packages/tlt-atlas/src/T_summary_generator.ts`: `generateSummary()` exported
- `src/cli.ts`: No `summary` or `generate-summary` command
- `src/teaching.ts`: Imports and calls `generateSummary()` internally

**Impact:** Users cannot invoke the summary generator from the CLI, limiting its utility for document review workflows.

**Recommended Action:** Add a `generate-summary` CLI command that accepts a target file/directory and a mode flag (`--mode internal|public|technical|linkedin|reviewer`).

---

## Finding F-R1 — Budget Enforcement Not Wired to Gates

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P3 |
| **Category** | Resource / Governance |
| **Module** | `src/gates.ts` |
| **Obligation** | OBL-S2 |

**Description:** While `R1_compute.ts` provides compute budget creation, authorization, and recording, and the integrated pipeline uses it, the gate pipeline (`gates.ts`) does not check or enforce compute budgets for individual gate operations.

**Evidence:**
- `src/integrated_pipeline.ts` lines 77–79: Creates and authorizes compute budget for the pipeline
- `src/gates.ts`: No budget checks in `propose()`, `review()`, `authorize()`, `apply()`, `test()`, `rollback()`, or `receipt()`

**Impact:** Individual gate operations can run unbounded. Combined with F-S2, this means resource governance is pipeline-level, not gate-level.

**Recommended Action:** Wire compute budget checks into gate pipeline entry points, especially `apply()` (filesystem writes) and `test()` (process execution).

---

## Finding F-X1 — Architecture Document Frozen at v1.0/v9.x

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Priority** | P1 |
| **Category** | Cross-Cutting / Documentation |
| **Module** | `docs/architecture.md` |
| **Obligation** | OBL-A1 |

**Description:** The architecture document covers the v1.0 core module map and v9.0–v9.2 TLT subsystems, but does not reflect v2.0–v8.x core modules or the resource, tooling, or math-atlas packages. The data flow diagram shows only the 7-gate pipeline (P→R→A→A→T→R→R) without the expanded CLI command set.

**Evidence:**
- `docs/architecture.md` Section "Module Map": 8 core modules listed; 18 missing
- `docs/architecture.md` Section "TLT Bidirectional Subsystem": v9.0 documented
- No sections for: teaching subsystem (v10.x), integrated pipeline (v8.x), resource governance, tooling framework, math-atlas

**Impact:** Architecture communication is split between the formal document and implicit code structure. Onboarding friction for new contributors.

**Recommended Action:** Update `docs/architecture.md` to include:
1. Complete module map for all 26 `src/` modules
2. Package architecture overview (code-atlas, tlt-atlas, math-atlas, resource, tooling)
3. Updated data flow showing CLI commands and integrated pipeline
4. Teaching subsystem architecture

---

## Finding F-X2 — Trial Runners Create Temp Files Outside Workspace

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P3 |
| **Category** | Cross-Cutting / Test Infrastructure |
| **Module** | `trials/v0.2-trial.ts`, `trials/v0.4-lang-trials.ts` |
| **Obligation** | OBL-X2 |

**Description:** The v0.2 and v0.4 trial runners create temporary test files in `os.tmpdir()` (e.g., `C:\Users\truea\AppData\Local\Temp\cohbit-v02-*`), which is outside the workspace root (`C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-Copilot`). `path_safety.ts` correctly rejects these paths, causing 5 test failures.

**Evidence:**
- `trials/v0.2-trial.ts` line ~110: `const tmpDir = path.join(os.tmpdir(), ...)` 
- `src/path_safety.ts`: Rejects paths outside `resolveWorkspaceRoot()`
- Test output: `[PathSafety] Skipping unsafe path: ... — Path is outside workspace root`

**Impact:** 5 tests fail (all v0.2/v0.4 legacy trials). The safety system is working correctly, but the test infrastructure doesn't comply with its constraints.

**Recommended Action:** Either:
1. Modify trial runners to create temp directories within the workspace root, or
2. Add a `--allow-temp-dir` bypass flag for trial/test contexts (with explicit security review)

---

## Finding F-X3 — No Package-Level README Files

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Priority** | P2 |
| **Category** | Cross-Cutting / Documentation |
| **Module** | `packages/code-atlas/`, `packages/tlt-atlas/`, `packages/math-atlas/`, `packages/resource/`, `packages/tooling/` |
| **Obligation** | OBL-X3 |

**Description:** All 5 packages have `package.json` files with name, version, and dependencies, but none have README files describing their purpose, layer architecture, public API, or relationship to other packages.

**Evidence:**
- `packages/code-atlas/`: `package.json` exists, no `README.md`
- `packages/tlt-atlas/`: `package.json` exists, no `README.md`
- `packages/math-atlas/`: `package.json` exists, no `README.md`
- `packages/resource/`: `package.json` exists, no `README.md`
- `packages/tooling/`: `package.json` exists, no `README.md`

**Impact:** Package discoverability is poor. Without README files, developers must read source code to understand each package's role.

**Recommended Action:** Add a `README.md` to each package directory describing:
1. Package purpose and design philosophy
2. Layer structure (e.g., L0–L13, M0–M18, R0–R20, T0–T19)
3. Public API surface (key exports)
4. Dependencies on other packages
5. Relationship to CohBit-Copilot core

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Findings | 12 |
| P0 (Critical) | 0 |
| P1 (High) | 3 |
| P2 (Medium) | 4 |
| P3 (Low) | 5 |
| Architecture | 2 |
| Test Coverage | 3 |
| Security | 2 |
| TLT | 1 |
| Resource | 1 |
| Cross-Cutting | 3 |

---

*Findings Detail Report. Each finding includes evidence references and specific recommended actions. No mutation was performed during this audit.*