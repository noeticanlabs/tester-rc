# CohBit-Copilot Version Map

**Status:** Reviewer-reference document — canonical source of version truth  
**Purpose:** Track the evolution of CohBit-Copilot from governed patch prototype to offline deterministic teaching copilot.  
**Generated:** 2026-06-04  
**Updated:** 2026-06-05 (v11.5 alignment)  
**Audit ID:** VMAP_2026_06_04

> **Version Alignment Note (v11.5):**  
> The npm package version (`package.json`) is **10.9.0**. The feature/layout versions documented here (v11.0–v11.4) are code-complete in that package. The package version has not been bumped to match the documented features because v11.x additions (R21 processors, gate persistence, curriculum) were implemented incrementally without a release cut.  
>   
> The `README.md` now reflects v10.9.0. `docs/full_system_layout_and_flowchart.md` is annotated with both the package version (10.9.0) and audit/layout version (v11.4). `docs/architecture.md` points here as the canonical version reference.  
>   
> **Resolution:** Feature versions track code evolution. Package version tracks npm releases. They are expected to diverge between release cuts. A future v11.5 or v12.0 release will align them.

---

## 1. Executive Summary

CohBit-Copilot has evolved through 10 major version lines from a governed patch workflow prototype (v0.x) into a full-stack development copilot with audit memory, atlas-backed pattern recognition, claim-boundary language control, and teaching capability.

The system is best framed as:

> **CohBit-Copilot is a governed development copilot with audit memory, atlas-backed pattern recognition, claim-boundary language control, and teaching capability.**

It is not an autonomous coding assistant. Its strength is governed assistance: proposed changes are scanned, reviewed, routed, remembered, and bounded before they become trusted work.

### Architecture Maturity

| Layer | Grade | Status |
|-------|-------|--------|
| Core gate pipeline | A | Production-quality, 792/797 tests passing |
| Audit engine (v3.x) | A- | Regex + AST-lite + evidence-rich + repo intelligence + professional reports + fixture battery |
| Code Atlas memory (v4–v8) | A- | Canonical patterns, obligation lifecycle, dashboard, escalation |
| TLT language layer (v9.x) | A- | Transformer, voice, claim guard, public/internal boundary, 5-mode summary generator |
| Teaching layer (v10.x) | B+ | Curriculum, polarity, quiz, lesson receipts — emerging, needs unit tests |
| Resource/tooling integration | B | Budgets defined (R0–R20), partially wired (integrated pipeline only) |
| Production readiness | Not claimed | Research/demo readiness: strong |

---

## 2. Version Timeline

### v0.x — Governance / Runtime Foundation

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v0.2** | `trials/v0.2-trial.ts` | Happy path trial: snapshot, apply fix, run tests, produce receipt (JS-based). 5 tests fail due to path_safety correctly rejecting temp dirs outside workspace root | ✅ Runtime |
| **v0.4** | `trials/v0.4-lang-trials.ts` | Language-aware Rust trial: cargo test pass/fail, rollback, receipt emission | ✅ Runtime |

### v1.x — Core Gate Pipeline & Workspace Intelligence

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v1.0** | `src/types.ts`, `src/receipt.ts`, `src/gates.ts` | Governed patch workflow: 7-gate lifecycle (Propose→Review→Authorize→Apply→Test→Rollback→Receipt). Rational64 arithmetic, `isAdmissible()` law, deterministic SHA-256 receipts. 16 test vectors, 8 spec obligations | ✅ Live |
| **v1.0E** | `src/english.ts`, `tests/english.test.ts` | Rule-based English command understanding: 55 tests, 31/31 capability score. Intent recognition, constraint detection, target extraction, unsafe rejection | ✅ Live |
| **v1.0 (spec)** | `spec/SPEC.md` | Formal mathematical contract: admissibility inequality V(post)+s ≤ V(pre)+d+a, directed triangle inequality, path accounting telescoping | ✅ Canon |
| **v1.0 (sdk)** | `sdks/` | TypeScript (primary), Python (stdlib-only), Rust (sha2+serde). Cross-language receipt conformance: 8 shared test vectors | ✅ Live |
| **v1.1** | `src/workspace.ts`, `src/environment.ts` | Workspace scanning + environment review. File classification, language detection | ✅ Live |
| **v1.2** | `src/symbols.ts`, `src/dep_graph.ts` | Symbol extraction + dependency graph. Cross-language symbol detection, transitive dependency chains | ✅ Live |
| **v1.3** | `src/planner.ts`, `tests/planner.test.ts` | Work planner: converts English tasks to scoped engineering plans with resource estimates | ✅ Live |
| **v1.4** | `src/test_recommender.ts`, `tests/test_recommender.test.ts` | Three-tier confidence test recommendations based on dependency graph + file classification | ✅ Live |
| **v1.5** | `src/patch_builder.ts`, `tests/patch_builder.test.ts` | 6 safe primitives for bounded patches: create, modify, delete, rename, move, template | ✅ Live |
| **v1.7** | `src/repair_planner.ts`, `tests/repair.test.ts` | Failure-aware repair: parses test/build/lint failures into structured repair plans with suggested patch primitives | ✅ Live |

### v2.x — Security / Reproducibility / Self-Audit

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v2.0** | `src/path_safety.ts`, `src/atomic_write.ts`, `src/ledger_lock.ts`, `src/fs.ts` | Security hardening: symlink resolution, path traversal prevention, atomic writes (temp → rename → hash verify), ledger lock file for concurrent write safety | ✅ Live |
| **v2.0 (tests)** | `tests/security_*.ts` (10 files) | Security test suite: Windows paths, symlinks, binary files, concurrency, English safety, ledger integrity, proposal safety, rollback | ✅ Live |
| **v2.7** | `trials/v2_7_repo_audit_runner.ts` | First repo audit runner: scan → route → risk → retrieval → repair → audit | ✅ Trial |
| **v2.8** | `trials/v2_8_memory_seeding_runner.ts` | Memory seeding: atlas entries from audit findings | ✅ Trial |
| **v2.9** | `trials/v2_9_*` | Resource audit, CTRL audit, promotion runners | ✅ Trial |

### v3.x — Pro-Grade Audit Engine

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v3.0** | `T_content_reader.ts`, `T_rust_symbol_extractor.ts`, `T_rust_risk_scanner.ts` | Content reader + Rust symbol extraction + regex risk scanner with severity/confidence calibration | ✅ Live |
| **v3.1** | `T_rust_risk_scanner.ts` (calibrated) | Severity×confidence matrix, file context classification (src/test/fixture/example/benchmark/generated/docs), refined path-risk patterns | ✅ Live |
| **v3.2** | `T_rust_review_queue.ts` | Priority P0–P3 triage, deterministic finding IDs via SHA-256, review queue JSON output, triage audit runner | ✅ Live |
| **v3.3** | `T_rust_finding_enricher.ts`, `T_rust_review_queue.ts` (extended) | Evidence-rich findings: function context, code windows (5 lines), nearby guard detection (is_some, is_ok, match, if_let, ok_or, unwrap_or, ?), evidence notes, false-positive notes, recommended inspection, suggested evidence. ReviewQueueItem extended with 18 enriched fields + boundary status (claimStatus, mutationStatus, proposalStatus, commitStatus) | ✅ Live |
| **v3.4** | `T_rust_ast_lite.ts` | Lightweight structural parser: function boundaries (name, line, endLine), return types, impl blocks, attributes (#[test], #[derive]), struct/enum/mod/use detection. `syntax_checked` evidence level. Brrace-counting with string/char awareness | ✅ Live |
| **v3.5** | `repo_intelligence/` (5 files) | Repo-level: file index (source/test/config/doc/generated classification), source-to-test mapping (naming convention heuristic), risk distribution by file/module/directory (P0×10+P1×5+P2×2+P3×1), top review targets, uncovered high-risk files (risk score>0, no tests) | ✅ Live |
| **v3.6** | `T_professional_report.ts` | 10-section professional report: executive summary, repo overview, risk distribution (severity×confidence matrix + priority table + top 10 modules), top review targets, uncovered high-risk files, evidence-rich findings (P0+P1), test coverage suggestions, refusal/proposal boundary, limitations, machine-readable JSON output. TLT integration hooks (tltVerify flag). Three modes: internal, technical, public | ✅ Live |
| **v3.7** | 6 fixtures in `sandbox/fixtures/` | Audit fixture battery: rust-risk-fixture (unsafe/process/fs→P0), rust-safe-proposal-fixture (clean baseline), rust-guarded-unwrap-fixture (guarded→P2/P3 proved: P0=0,P1=0,P2=2), rust-test-only-risk-fixture (test→P3), rust-process-command-fixture, rust-filesystem-risk-fixture | ✅ Live |

### v4.x — Atlas Memory / Repair Routing

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v4.0** | `trials/v4_0_memory_aware_audit.ts` | Memory-aware audit: prior session comparison, churn detection, finding deduplication across runs | ✅ Trial |
| **v4.1** | `src/atlas_repair_routing.ts`, `trials/v4_1_repair_routing_audit.ts` | Repair routing: findings → obligations → repair queue. Routes code-atlas repair obligations to tooling repair queue | ✅ Live |
| **v4.2** | `trials/v4_2_review_receipt_trial.ts` | Human review receipt generation: SHA-256 hashed review records with reviewer identity, timestamp, and decision | ✅ Trial |

### v5.x — Full Orchestration

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v5.0** | `trials/v5_0_full_system_audit.ts`, `src/retrieval_filter.ts` | Full system audit consolidation: retrieval filtering for atlas memory queries with evidence-level gating | ✅ Trial |

### v6.x — Audit-to-Proposal Bridge

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v6.0** | `trials/v6_0_copilot_trial.ts`, `src/finding_to_proposal.ts` | Finding → patch proposal bridge. Converts audit findings into bounded patch proposals with scope, estimated spend/defect/authority | ✅ Live |
| **v6.1** | `trials/v6_1_reviewed_proposal_trial.ts`, `src/human_review_receipt.ts` | Human-reviewed proposal workflow with cryptographic receipt generation | ✅ Live |
| **v6.2** | `trials/v6_2_positive_path_demo.ts` | Positive path demonstration: end-to-end audit→proposal→review→apply→receipt | ✅ Trial |

### v7.x — Obligations / Dashboard / Escalation

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v7.1** | `trials/v7_1_obligation_lifecycle_trial.ts` | Obligation state machine: open → under_review → closed with reconciliation, dedup, change detection | ✅ Trial |
| **v7.2** | `trials/v7_2_dashboard_trial.ts` | Dashboard: health panels (open/review/deferred/stale), aging analysis, re-review detection | ✅ Trial |
| **v7.3** | `trials/v7_3_escalation_trial.ts` | Escalation: stale high obligations trigger escalation with severity-weighted priority | ✅ Trial |

### v8.x — Integrated Audit / CLI / Stability

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v8.0** | `src/integrated_pipeline.ts`, `trials/v8_0_integrated_audit.ts` | One-command audit pipeline: scan→content→risk→symbols→review→atlas→obligations→proposals→report. 7-phase orchestrator with budget enforcement | ✅ Live |
| **v8.1** | `trials/v8_1_stability_audit.ts`, `src/integrated_pipeline.ts` (v8.1) | Deterministic identity, obligation persistence, rerun stability. Content evidence hashes for change detection | ✅ Live |
| **v8.4** | `trials/v8_4_rust_fixture_trial.ts`, `sandbox/fixtures/rust-risk-fixture/` | Rust risk fixture: deliberate unsafe blocks, process commands, filesystem mutations — proves P0 detection | ✅ Live |
| **v8.5** | `trials/v8_5_safe_proposal_fixture_trial.ts`, `sandbox/fixtures/rust-safe-proposal-fixture/` | Safe proposal fixture: clean Rust code baseline — proves zero false positives on clean code | ✅ Live |
| **v8.6** | `src/integrated_pipeline.ts` lines 96–98, `packages/code-atlas/src/store.ts` | Canonical memory hardening: `rebuildAtlasIndex()` prevents duplicate index lines. Content evidence hash persistence (`computeContentEvidenceHash()`) enables obligation evidence-change detection | ✅ Live |
| **v8.7** | `src/integrated_pipeline.ts` lines 120–122, `packages/code-atlas/src/L13_canonical_pattern.ts` | Canonical pattern memory: `aggregateCanonicalPatternsFromObligations()` stores patternHash, hitCount, sourceFiles, sourceModules, obligationRefs, receiptRefs. Patterns deduplicated by hash. Persisted to code-atlas store | ✅ Live |
| **v8.8** | `trials/v8_8_lesson_memory_trial.ts`, `packages/math-atlas/src/M18_operational_lessons.ts` | Lesson memory: operational knowledge persistence — records lessons with lessonId, domain, insight, evidence, and timestamp | ✅ Live |
| **v8.9** | `trials/v8_9_tlt_graph_trial.ts` | TLT graph seeding: atlas entries → TLT graph nodes and edges for bidirectional language pipeline | ✅ Trial |

### v9.x — TLT Claim-Boundary Hardening

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v9.0** | `T_tlt_transformer.ts`, `T_tlt_voice.ts`, `T_tlt_atlas_feed.ts` | Language↔graph bidirectional pipeline: 132 nodes, 162 edges from 11 markdown docs. Voice categories: claim_annotation, risk_advisory, definition_clarification, proof_debt, overclaim_warning, next_step_advisory | ✅ Live |
| **v9.1** | `T_claim_guard.ts`, `T_public_internal_boundary.ts` | Claim strength ladder (surface_detected→needs_evidence→receipt_available→ctrl_verified→release_approved). Voice cannot upgrade graph status. 13 violations detected across 8 adversarial nodes | ✅ Live |
| **v9.2** | `T_summary_generator.ts` | 5 audience modes (internal/public/technical/linkedin/reviewer) with evidence inheritance. All modes pass canonSafety. Auto-limitation extraction, terminology boundary enforcement | ✅ Live |

### v11.x — R21 Live Wiring / Gate Persistence / Curriculum

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| | **v11.0** | `packages/tooling/src/resource/R21_compute_processor_map.ts` | R21 compute processor profiles: 18 processor kinds with curriculum requirements, evidence artifacts, CIA risk class, verification requirements, rollback expectations | ✅ Live |
| | **v11.1** | `packages/tooling/src/resource/R21_processor_runtime.ts`, `src/integrated_pipeline.ts` | R21 processor runtime: `withProcessorSync()`, `withProcessor()`, `aggregateProcessorResults()`. 7 integrated audit phases wrapped with processor tracking. `processorFragments[]` emitted in `UnifiedAuditResult` and JSON report. Budget denial enforced on budget-required processors | ✅ Live |
| | **v11.2** | `src/gate_store.ts`, `src/cli.ts` | Disk-backed gate record persistence: `.cohbit/gate_records/<proposalId>.json` with atomic writes, path traversal rejection, schema-versioned envelopes. CLI session store replaced `Map<string, GateRecord>` with `saveGateRecord`/`loadGateRecord`. Seven-gate lifecycle survives across CLI processes | ✅ Live |
| | **v11.3** | `src/fs.ts`, `src/cli.ts` | Apply snapshot return fix: `applyPatch()` now returns `snapshotFiles: SnapshotFile[]` with per-file `beforeContent` + `beforeHash`. Wired into `handleApply()` so rollback gate has full pre-state evidence | ✅ Live |
| | **v11.4** | `docs/curriculum/standards_traceability_matrix.md`, `src/teaching.ts`, `src/cli.ts` | Curriculum integration: 12 module entries in `TOPIC_KB`, `cohbit-copilot curriculum [list|teach|quiz|trace]` CLI commands, v0.3 standards traceability matrix mapping all modules to 12 standards domains | ✅ Live |
| | **v11.5** | `tests/integrated_pipeline_r21.test.ts`, `tests/gate_store.test.ts` | R21 + gate store test suites: 5 processor fragment tests, 8 gate persistence tests | ✅ Written |

### v10.x — Teaching Mode / Polarity Memory / Receipts

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v10.1** | `trials/v10_1_teaching_fixture_trial.ts`, `src/teaching.ts` | Teaching mode: structured curriculum with session management, content hashing, TLT integration. Teaches proposals, findings, obligations, admissibility | ✅ Live (trial-only, no unit tests) |
| **v10.3** | `trials/v10_3_polarity_trial.ts`, `L16_learning_polarity.ts` | Learning polarity: positive/negative example classification with lesson memory integration | ✅ Live |
| **v10.6** | `trials/v10_6_curriculum_trial.ts` | Full curriculum: explain proposals, findings, obligations, admissibility quizzes | ✅ Trial |

### v12.x — Rust Trust Kernel (2026-06)

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v11.7** | `docs/language_split_doctrine.md` | Language Split Doctrine: formal architecture defining implementation boundaries across languages | ✅ Live |
| **v11.8** | `src/rust_receipt_gate.ts`, `sdks/rust/tests/conformance.rs` | Rust Kernel 1: Canonical receipt verification via process-based bridge | ✅ Live |
| **v11.9** | `src/rust_path_safety_gate.ts`, `sdks/rust/src/bin/path_gate.rs` | Rust Kernel 2: Path safety validation (traversal, null byte, ADS, symlink) | ✅ Live |
| **v12.0** | `src/rust_id_gate.ts`, `sdks/rust/src/bin/id_gate.rs`, `test_vectors/id_conformance.json` | Rust Kernel 3: Deterministic ID verification (finding, obligation, processor) | ✅ Live |
| **v12.1** | `src/rust_scanner_gate.ts`, `sdks/rust/src/bin/scanner_gate.rs` | Rust Kernel 4: Audit scanner core candidate (5 risk patterns) | ✅ Live |
| **v12.2** | `src/rust_policy_gate.ts`, `sdks/rust/src/bin/policy_gate.rs` | Rust Kernel 5: Policy/admissibility gate (7 deterministic preconditions) | ✅ Live |
| **v12.4** | `trials/v12_4_full_trust_kernel_smoke.ts` | Full trust kernel integration smoke test | ✅ Trial |

### v13.x — Curriculum Hardening / Learning Doctrine (2026-06)

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v13.4** | `trials/v13_4_curriculum_review.ts`, `reports/v13_4_curriculum_review.md` | Curriculum review: professional audit of teaching curriculum | ✅ Trial |
| **v13.5** | `trials/v13_5_curriculum_reobservation.ts` | Curriculum reobservation: audit of curriculum content stability | ✅ Trial |
| **v13.6** | `trials/v13_6A_cross_repo_structural.ts`, `trials/v13_6B_content_confirmation.ts` | Cross-repo structural + content confirmation | ✅ Trial |
| **v13.7** | `trials/v13_7_stable_candidate_review.ts` | Stable candidate review pipeline | ✅ Trial |
| **v13.8** | `trials/v13_8_admission_review.ts` | Admission review gating | ✅ Trial |
| **v13.9** | `trials/v13_9_curriculum_gap_mapping.ts` | Curriculum gap mapping — cross-repo structural comparison | ✅ Trial |
| — | `docs/learning_doctrine.md`, `src/memory_stability.ts`, `src/learning_` | Learning doctrine documentation, memory stability reporting | ✅ Live |

### v14.x — Copilot Onboarding / Repair Pipeline (2026-06)

| Version | Module(s) | What | Status |
|---------|-----------|------|--------|
| **v14.0** | `src/access_control.ts`, `trials/v14_0_human_admission_gate.ts` | Human admission gate: profile-based access control | ✅ Live |
| **v14.1B** | `trials/v14_1B_philosophy_corpus_trial.ts`, `packages/tlt-atlas/src/philosophy/` | Philosophy corpus ingestion and language bridge | ✅ Live |
| **v14.2** | `src/onboarding.ts`, `src/system_explain.ts`, `src/command_hub.ts`, `src/demo_runner.ts`, `src/network_boundary.ts` | External tester RC: init, start, system, access, demo, network CLI commands | ✅ Live |
| **v14.3** | `trials/v14_3A_repair_proposal_smoke.ts`, `src/finding_to_proposal.ts` | AST-guided repair proposal bridge from audit findings | ✅ Live |
| **v14.4** | `src/repair_review.ts` | Repair review UX: list/show/explain/approve/reject repair tasks | ✅ Live |
| **v14.5** | `src/cli.ts`, `packages/tooling/src/T_resource_governor.ts` | Comprehensive v14.x tie-off: repair-review + propose-repair CLI, resource governance wrapping, CHANGELOG/version_map/known_gaps refresh, package.json 14.5.0 | ✅ Live |

---

## 3. Corrected v8 Entries

v8.6 and v8.7 were previously omitted from version maps. They are foundational to atlas memory integrity.

### v8.6 — Canonical Memory Hardening

- **Files:** `src/integrated_pipeline.ts` (lines 96–98), `packages/code-atlas/src/store.ts`
- **What:** `rebuildAtlasIndex()` called after each atlas seeding to prevent duplicate index lines. `computeContentEvidenceHash()` generates deterministic content fingerprints for obligation evidence-change detection (lines 107–111)
- **Why it matters:** Without index dedup, rerun stability breaks. Without content evidence hashes, obligations cannot detect when underlying code has changed vs. when a finding is identical across runs
- **Verified:** `rebuildAtlasIndex` exported from `packages/code-atlas/src/store.ts`, dynamically imported and called in pipeline

### v8.7 — Canonical Pattern Memory

- **Files:** `src/integrated_pipeline.ts` (lines 120–122), `packages/code-atlas/src/L13_canonical_pattern.ts`
- **What:** `aggregateCanonicalPatternsFromObligations()` extracts recurring risk patterns from obligations, stores them as canonical patterns with patternHash, hitCount, sourceFiles, sourceModules, obligationRefs, receiptRefs. Patterns are deduplicated by hash
- **Why it matters:** This is the bridge from "finding" to "pattern" — the system learns which risk patterns recur across the codebase, enabling pattern-based retrieval and teaching
- **Verified:** Function dynamically imported from `src/atlas_integration.js`, backed by L13 store

---

## 4. Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ v10.x  TEACHING MODE                                            │
│        teach(), curriculum(), quiz(), explain(), polarity()      │
│        Session management, content hashing, TLT integration      │
├──────────────────────────────────────────────────────────────────┤
│ v9.x   TLT LANGUAGE SUBSYSTEM                                   │
│        Transformer (ears) → Voice (structured) → Feed (review)   │
│        Claim Guard (strength ladder) → Public/Internal Boundary  │
│        Summary Generator (5 modes, evidence inheritance)         │
├──────────────────────────────────────────────────────────────────┤
│ v8.x   INTEGRATED AUDIT PIPELINE                                │
│        scan→content→risk→symbols→review→atlas→obligations→      │
│        proposals→report. One command.                              │
│        Atlas memory (v8.6 harden, v8.7 patterns)                   │
├──────────────────────────────────────────────────────────────────┤
│ v7.x   OBLIGATION LIFECYCLE + DASHBOARD                         │
│        open→under_review→closed, reconciliation, escalations    │
├──────────────────────────────────────────────────────────────────┤
│ v6.x   AUDIT-TO-PROPOSAL BRIDGE                                 │
│        Finding → bounded patch proposal, human review receipt   │
├──────────────────────────────────────────────────────────────────┤
│ v5.x   FULL SYSTEM AUDIT + RETRIEVAL FILTER                     │
├──────────────────────┬───────────────────────────────────────────┤
│ v4.x   MEMORY-AWARE   │ v3.3–v3.7  PRO-GRADE AUDIT ENGINE (⬆)  │
│        + REPAIR        │ Enricher, AST-lite, Repo Intel,          │
│        ROUTING          │ Professional Report, Fixtures            │
├──────────────────────┼───────────────────────────────────────────┤
│ v3.0–3.2 CTRL        │ v2.x   SECURITY + ATOMIC WRITES         │
│ Automated Pipeline    │ Path safety, symlink, concurrency         │
├──────────────────────┴───────────────────────────────────────────┤
│ v1.0–v1.7  CORE GATE PIPELINE + WORKSPACE INTELLIGENCE          │
│ 7-gate lifecycle, Rational64, English parser, symbols, deps,    │
│ planner, patch builder, repair planner                           │
├──────────────────────────────────────────────────────────────────┤
│ v0.x   FOUNDATION                                               │
│ Receipt hashing, admissibility law, trial runners                │
└──────────────────────────────────────────────────────────────────┘
```

### Operating Law (All Versions)

```
Audit may detect, classify, explain, prioritize, and recommend evidence.
Audit may not certify defects, authorize repairs, promote evidence, or mutate code.
Findings are review signals, not verified defects.
No claim may exceed its evidence level.
```

---

## 5. Cross-Cutting Packages

| Package | File Count | Layers | Status |
|---------|-----------|--------|--------|
| `src/` (core runtime) | 26 `.ts` | Receipt, ledger, gates, proposer, CLI, teaching, pipeline, atlas integration, security, workspace intelligence | ✅ Live |
| `packages/tooling/` | 25 + 6 (v3.5) + 1 (v3.6) | Scanner, router, risk scanner, validator, repair queue, receipt engine, adapters, retrieval guard, benchmark, integrated audit, policy gate, content reader, Rust symbol extractor, Rust risk scanner, Rust review queue, Rust finding enricher, Rust AST-lite, repo intelligence (5 files), professional report | ✅ Live |
| `packages/code-atlas/` | 16 (L0–L13 + store + index) | Artifact taxonomy, language surface, parse/AST, invariants, transitions, risk constraints, projection, verifier, receipt, repair obligation, memory graph, query, governance, canonical patterns | ✅ Live |
| `packages/tlt-atlas/` | 20 (L0–L16 + T_ modules + index) | Artifact taxonomy, language surface, phrase parse, semantic unit, intent, meaning invariant, tone register, domain context, bilingual projection, ambiguity risk, verifier, receipt, repair, memory graph, retrieval, governance, learning polarity + claim guard, public/internal boundary, voice, transformer, feed, summary generator | ✅ Live |
| `packages/math-atlas/` | 19 (M0–M18 + index) | Artifact taxonomy, representation, model family, object structure, relation, invariant, assumption, mapping, analogy, evidence, simulation, formalization, risk/misuse, receipt, repair, memory graph, retrieval, governance, operational lessons | ✅ Live |
| `packages/resource/` | 21 (R0–R20 + index) | Registry, compute, memory, storage, tokens, time, tool calls, human attention, network, proof search, benchmark, repair, receipt storage, energy, authority, risk, scheduler, throttle, receipt, dashboard, forecast | ✅ Scaffolded (partially wired) |

---

## 6. v3.3–v3.7 Audit Progression

| Version | Progression | Key Capability |
|---------|-------------|----------------|
| **v3.0–v3.2** | "Found `unwrap()`" | Pattern detection only |
| **v3.3** | "Found `unwrap()` in `extract_value()`, no nearby guard, recommend returning `Result`, add None-input test" | Evidence-rich findings with structural context, code windows, guard detection, evidence/false-positive notes, inspection guidance, suggested evidence |
| **v3.4** | "Found it in a `pub fn`, not a `#[test] fn`, returning `String`" | Function boundaries, return types, impl context, attribute parsing. `syntax_checked` evidence level |
| **v3.5** | "Found it in module X, 3 other findings in this file, no test coverage, rank #2 in review priority" | Repo-level: file index, source-to-test mapping, risk distribution, top review targets, uncovered high-risk files |
| **v3.6** | Professional report with 10 sections, boundary status per finding, TLT claim guard hooks | Executive summary, repo overview, risk distribution, top review targets, uncovered HRF, evidence-rich findings, test coverage suggestions, refusal boundary, limitations, JSON output |
| **v3.7** | 6 controlled fixtures proving audit behaviors | unsafe→P0, guarded unwrap→P2/P3, test patterns→P3, process command→P0, FS writes→P0, clean repo→baseline |

---

## 7. Maturity Assessment

### Working / Wired (Runtime-Tested)

- 7-gate governed patch pipeline (v1.0)
- Rational64 arithmetic with GCD reduction (v1.0)
- Deterministic SHA-256 receipt hashing (v1.0)
- Cross-language SDK conformance (v1.0)
- English command understanding — 31/31 capability score (v1.0E)
- Workspace scanning + environment review (v1.1)
- Symbol extraction + dependency graph (v1.2)
- Work planner (v1.3)
- Test recommender (v1.4)
- Patch builder with 6 primitives (v1.5)
- Failure-aware repair planner (v1.7)
- Path safety (symlink resolution, boundary check, traversal prevention) (v2.0)
- Atomic writes (temp→rename→hash verify) (v2.0)
- Ledger lock (concurrent write safety) (v2.0)
- 10 security test suites (v2.0)
- Rust regex risk scanner with severity×confidence calibration (v3.0–v3.2)
- Priority P0–P3 triage with deterministic finding IDs (v3.2)
- Evidence-rich finding enricher (v3.3)
- Rust AST-lite structural parser (v3.4)
- Repo intelligence: file index, test map, risk distribution (v3.5)
- Professional report generator (v3.6)
- 6 audit fixtures (v3.7)
- Integrated audit pipeline with budget enforcement (v8.0)
- Obligation lifecycle + dashboard + escalation (v7.x)
- Content evidence hashing + atlas index dedup (v8.6)
- Canonical pattern memory (v8.7)
- Operational lesson memory (v8.8)
- TLT transformer, voice, claim guard, public/internal boundary (v9.0–v9.1)
- TLT summary generator (5 modes) (v9.2)
- Teaching mode: curriculum, polarity, quizzes (v10.x)

### Working but Partial

- Test suite: 792/797 tests passing. 5 failures are path_safety working correctly (temp dirs outside workspace). 34 trial files are `tsx` runners, not vitest tests
- Teaching mode: Trial-only coverage. No unit tests for `teach()`, `buildCurriculum()`, session management
- CLI: Smoke-only test coverage. 11 commands, no command-level tests
- Integrated pipeline: Trial-only test coverage. No isolated unit test for `runIntegratedAudit()`
- Source-to-test mapping: heuristic (naming conventions), not symbol-level

### Scaffolded (Implemented, Not Wired)

- Resource package (R0–R20): All 21 layers implemented with tests, but only R1/R5/R18/R19 are wired into the integrated pipeline. Gates, CLI, teaching, and TLT do not pass through resource authorization
- Architecture document: Frozen at v1.0 module map. 18 core modules undocumented
- Package READMEs: 5 packages have `package.json` but no README

### Future / Intentionally Deferred

- Symbol-level source-to-test mapping
- Command-level CLI tests
- Cryptographic review attestation (ReviewGate is function-call, not signature-verified)
- Gate-level rate limiting and budget enforcement
- TLT summary generator CLI command
- TypeScript audit scanner (currently Rust-only)
- Cross-language audit pipeline extension

---

## 8. Current Product Identity

**Best internal framing:**

> CohBit-Copilot is a governed development copilot built around bounded patch workflows, audit findings, atlas memory, obligations, receipts, claim boundaries, and teaching feedback.

**Best public framing:**

> CohBit-Copilot explores a safer way to use AI-assisted development: proposed changes are scanned, reviewed, routed, remembered, and bounded before they become trusted work.

**Product classification:** Offline deterministic teaching copilot for governed code changes.

**Not:** Autonomous coding assistant, production deployment tool, security certification platform.

---

## 9. Known Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Resource enforcement not fully wired | Medium | Gates, CLI, teaching, TLT do not pass through R1/R5 budget authorization |
| Teaching receipts need package docs | Medium | Teaching mode is functional but undocumented as a standalone feature |
| Audit reports need professional polish | Medium | v3.6 report generator exists but needs TLT claim guard integration for public mode |
| Fixture suite needs expansion | Low | 6 fixtures cover Rust patterns; TypeScript and docs-overclaim fixtures are pending |
| Architecture doc outdated | Medium | `docs/architecture.md` frozen at v1.0. Version map replaces it, but per-module documentation is incomplete |
| External reviewer package pending | Low | No standalone reviewer documentation for third-party evaluation |

---

## 10. Next Roadmap

### v11.0 — Resource-Aware Governed Operation

**Goal:** Every auditable operation path must pass through resource authorization before execution and resource recording after execution.

**Live paths to wire:**
- `audit` (integrated pipeline — partially done)
- `dashboard`
- `obligations`
- `teach`
- `quiz`
- `lesson polarity`
- `lesson receipts`
- `summary generation`
- `TLT ingestion`

**Core flow:**
```
createComputeBudget → authorizeCompute → run operation → recordCompute → emit resource receipt → dashboard/report
```

**v11.0 operating law:**
> No auditable operation should consume meaningful resources without budget, authorization, recording, and receipt.

### v11.1 — Professional Audit Report (with TLT)
- Wire TLT claim guard into v3.6 report generator for public mode
- Add per-section evidence level tracking
- Add terminology boundary enforcement for LinkedIn/public modes

### v11.2 — Starter Kit Release Candidate
- Package READMEs for all 5 packages
- Update `docs/architecture.md` from version map
- Teaching mode unit tests
- CLI command-level tests
- External reviewer package

---

*Version Map. Reference document. Verified against codebase: `src/integrated_pipeline.ts`, `packages/code-atlas/src/store.ts`, `packages/code-atlas/src/L13_canonical_pattern.ts`. All version claims correspond to existing files, trial runners, or reports.*