# CohBit-Copilot — Full System Layout & Flow Chart

**Generated:** 2026-06-05  
**Source:** Codebase audit of `src/`, `packages/`, `spec/`, `schemas/`, `docs/`  
**Audit ID:** FSYS_2026_06_05

> **Version Note:**  
> Package version (npm): **10.9.0**  
> Audit/layout version: **v11.4**  
> The layout document tracks architecture evolution independently of the npm package version.  
> The feature versions documented in v11.0–v11.4 are code-complete in the v10.9.0 package but  
> the package version has not yet been bumped to match. See `docs/version_map.md` for the  
> canonical version history. v11.5 (documentation alignment) resolves this.

---
## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              COHBIT-COPILOT SYSTEM (v11.4)                               │
│                         Governed Development Copilot + Audit Memory                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────┐    ┌──────────────────────────────────────────────────────────────────┐   │
│  │   USER   │────│  CLI INTERFACE (src/cli.ts)                                       │   │
│  │ (Operator)│    │  25+ commands: propose, review, authorize, apply, test, rollback, │   │
│  └──────────┘    │                receipt, audit, obligations, dashboard, teach,      │   │
│        │         │                curriculum, quiz, plan, work, repair, atlas, env...  │   │
│        │         └───────────┬──────────────┬──────────────┬──────────────┬───────────┘   │
│        │                     │              │              │              │               │
│        ▼                     ▼              ▼              ▼              ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│  │                       TWO MAJOR EXECUTION PATHS                                   │     │
│  ├─────────────────────────────────┬───────────────────────────────────────────────┤     │
│  │  PATH A: GOVERNED PATCH        │  PATH B: INTEGRATED AUDIT                       │     │
│  │  (gates.ts)                    │  (integrated_pipeline.ts)                        │     │
│  │  7-gate sequential lifecycle   │  7-phase parallel pipeline                       │     │
│  │  Propose→Review→Authorize      │  Scan→Content→Risk→Symbols→Review→               │     │
│  │  →Apply→Test→Rollback→Receipt  │  Atlas→Obligations→Proposals→Report              │     │
│  └─────────────┬───────────────────┴───────────────────────┬─────────────────────────┘     │
│                │                                           │                               │
│                └───────────────────┬───────────────────────┘                               │
│                                    │                                                       │
│                                    ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│  │                         SHARED INFRASTRUCTURE                                     │     │
│  │                                                                                   │     │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │     │
│  │  │ types.ts │ │receipt.ts│ │ ledger.ts │ │gate_store│ │   fs.ts  │ │ lang.ts  │  │     │
│  │  │ Rational  │ │ SHA-256  │ │ append-   │ │   disk-   │ │ snapshot │ │ detect   │  │     │
│  │  │ 64,Wedge  │ │ canonical│ │ only JSONL│ │  backed   │ │ /apply/  │ │ language │  │     │
│  │  │isAdmiss.  │ │ hashing  │ │ sessions  │ │persistence│ │ rollback │ │ test cmd │  │     │
│  │  └──────────┘ └──────────┘ └───────────┘ └──────────┘ └──────────┘ └──────────┘  │     │
│  └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                    │                                                       │
│                                    ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│  │                         5 CROSS-CUTTING PACKAGES                                   │     │
│  │                                                                                   │     │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────┐          │     │
│  │  │  CODE ATLAS   │  │   TLT ATLAS   │  │  MATH ATLAS   │  │  TOOLING  │          │     │
│  │  │  (16 layers)  │  │  (20 layers)  │  │  (19 layers)  │  │ (25+ mod) │          │     │
│  │  │  L0 - L13     │  │  L0 - L16     │  │  M0 - M18     │  │  T0 - T_* │          │     │
│  │  │               │  │               │  │               │  │           │          │     │
│  │  │ Code structure│  │ Language↔Graph│  │ Math/Formal   │  │ Scanning  │          │     │
│  │  │ Invariants    │  │ Claim guard   │  │ Simulation    │  │ Routing   │          │     │
│  │  │ Transitions   │  │ Voice gen     │  │ Formalization │  │ Validation│          │     │
│  │  │ Risk/Repair   │  │ Tone register │  │ Risk/Misuse   │  │ Repair    │          │     │
│  │  │ Memory graph  │  │ Memory graph  │  │ Memory graph  │  │ Receipting│          │     │
│  │  │ Governance    │  │ Governance    │  │ Governance    │  │ Reporting │          │     │
│  │  └───────────────┘  └───────────────┘  └───────────────┘  └───────────┘          │     │
│  │                                                                                   │     │
│  │  ┌───────────────────────────────────────────────────────────────┐               │     │
│  │  │                   RESOURCE PACKAGE (R0 - R21)                  │               │     │
│  │  │  Registry | Compute | Memory | Storage | Tokens | Time        │               │     │
│  │  │  Tool Calls | Human Attention | Network | Proof Search        │               │     │
│  │  │  Benchmark | Repair | Receipt Storage | Energy                │               │     │
│  │  │  Authority | Risk | Scheduler | Throttle | Receipt             │               │     │
│  │  │  Dashboard | Forecast | Processor Profiles | Processor Runtime│               │     │
│  │  └───────────────────────────────────────────────────────────────┘               │     │
│  └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Theoretical Foundation Layer (Canon / Reference)

```
┌────────────────────────────────────────────────────────────────────┐
│                      CANON / REFERENCE LAYER                        │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │   spec/SPEC.md      │  │  Formal Mathematical Contract         │ │
│  │   (CohBit Primitive) │  │  - Admissibility Law:                │ │
│  │                     │  │    V(post) + s ≤ V(pre) + d + a       │ │
│  │  Defines:           │  │  - 11-Term Safety Wedge (W)           │ │
│  │  - State space X    │  │  - Type-safe coupling mandate:        │ │
│  │  - CohBit candidate │  │    [CANDIDATE] → [MATHEMATICAL]       │ │
│  │  - Accepted CohBit  │  │    → [OPERATIONAL] → [COMMITMENT]    │ │
│  │  - CohGeometry      │  │  - Path accounting: telescopes        │ │
│  │  - Solver spec      │  │  - Directed Coh distance              │ │
│  │  - Receipt spec     │  │  - Theorem stack (6 theorems)         │ │
│  └─────────────────────┘  └──────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ schemas/            │  │  JSON Schema Formalizations           │ │
│  │  - cohbit_receipt   │  │  - Receipt structure                  │ │
│  │  - gmi_status       │  │  - Gate status authentication         │ │
│  │  - language_receipt │  │  - Language decision record           │ │
│  └─────────────────────┘  └──────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ test_vectors/       │  │  16 JSON Fixtures                     │ │
│  │  - 8 conformance    │  │  - valid_identity                     │ │
│  │  - 8 hardening      │  │  - valid_boundary_exact_equality      │ │
│  │                     │  │  - reject_* cases (6 rejection paths) │ │
│  └─────────────────────┘  └──────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ reference-verifier/ │  │  Cross-Language Reference             │ │
│  │  - rust/            │  │  - Hardened Rust implementation       │ │
│  │  - lean/            │  │  - Lean 4 formal proofs               │ │
│  └─────────────────────┘  └──────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ sdks/               │  │  Cross-Language SDK Conformance       │ │
│  │  - TypeScript        │  │  - 3 languages, 8 shared test vectors│ │
│  │  - Python (stdlib)  │  │  - Identical SHA-256 hashes           │ │
│  │  - Rust (sha2+serde)│  │  - receipt_conformance.json           │ │
│  └─────────────────────┘  └──────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. PATH A: Governed Patch Pipeline (7-Gate Lifecycle)

### 3.1 Flow Chart

```
                                    ┌─────────────────────┐
                                    │    USER / OPERATOR  │
                                    │  (issues command)   │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   English Parser    │
                                    │   (english.ts)      │
                                    │   Intent → mutation │
                                    │   permission mapping│
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────▼──────────────────────────┐
                    │                                                   │
                    │   ═══════════ 7-GATE PIPELINE ═══════════════     │
                    │              (gates.ts)                           │
                    │                                                   │
                    │   ┌─────────────────────────────────────────┐    │
                    │   │                                        │    │
              ┌─────────┴──┐                              ┌──────┴──────┐
              │  GATE 1    │                              │ Gate Store  │
              │  PROPOSE   │◄──── ProposalInput ──────────│  (persist)  │
              │            │     description, files,      │             │
              │  Creates   │     spend, defect,           │ .cohbit/    │
              │  PatchPro- │     authority, policyHash    │ gate_records│
              │  posal +   │                              │ /<id>.json  │
              │  GateRecord│                              │             │
              └─────┬──────┘                              └─────────────┘
                    │ status = PROPOSED
                    │
              ┌─────▼──────┐
              │  GATE 2    │     Boundary: Proposal ≠ Authority
              │  REVIEW    │     Copilot cannot self-approve.
              │            │
              │  Human/    │◄──── reviewer, approved, comments
              │  Verifier  │
              │  Inspection│
              └─────┬──────┘
                    │
               ┌────┴────┐
               ▼         ▼
          APPROVED    REJECTED → terminal (no recovery)
          REVIEW_     REVIEW_
          PASSED      REJECTED
               │
          ┌────▼────┐
          │ GATE 3  │     Boundary: Mathematical Acceptance ≠
          │AUTHORIZE│               Executable Permission
          │         │
          │ Checks: │     - Admissibility law: V(post)+s ≤ V(pre)+d+a
          │ 1. Policy│     - Policy hash binding
          │    Hash  │     - Memory mass ≤ B_mem
          │ 2. Admiss│     - Trace mass ≤ B_trace
          │ 3. Mem   │
          │    Budget│
          └────┬────┘
               │
          ┌────┴────┐
          ▼         ▼
     AUTHORIZED  AUTHORIZATION_DENIED → terminal
          │
     ┌────▼────┐
     │ GATE 4  │     Boundary: Patch Applied ≠ Patch Stable
     │  APPLY  │
     │         │     - Snapshots pre-state (beforeContent + hash)
     │ Writes  │     - Applies patch to filesystem via fs.ts
     │ patch   │     - Records pre/post hashes for rollback
     │ to disk │
     └────┬────┘
          │
     ┌────┴────┐
     ▼         ▼
  APPLIED   APPLY_FAILED → try rollback
     │
┌────▼────────┐
│  GATE 5     │     Boundary: Test Passed ≠ Final Commit
│  TEST       │
│             │     - Detects language (lang.ts)
│ Runs test   │     - Runs appropriate test command
│ suite       │     - Parses output for pass/fail
│             │     - Classifies failures (classifyFailure)
└────┬────────┘
     │
┌────┴────────────┐
▼                 ▼
TESTS_PASSED    TESTS_FAILED
│                 │
│            ┌────▼────────┐
│            │  GATE 6     │
│            │  ROLLBACK   │
│            │             │
│            │ Restores    │  - Uses pre-state snapshot
│            │ files to    │  - Hash verification
│            │ pre-patch   │  - RollbackResult
│            │ state       │
│            └────┬────────┘
│                 │
│            ROLLED_BACK
│
┌────▼────────┐
│  GATE 7     │     Boundary: receipt_hash_is_deterministic
│  RECEIPT    │
│             │     - buildReceipt() → CohBitReceipt
│ Commits     │     - SHA-256 canonical serialization
│ determin-   │     - Memory mass computed
│ istic       │     - Auto-stores Code Atlas entry
│ receipt     │     - GateRecord finalized
└────┬────────┘
     │
 RECEIPTED ───────► Session Ledger (ledger.ts)
                    append-only JSONL

                    ┌──────────────────┐
                    │  Session Ledger  │
                    │  (ledger.ts)     │
                    │                  │
                    │ .cohbit/         │
                    │ session_ledger   │
                    │ .jsonl           │
                    │                  │
                    │ - SessionLedger  │
                    │   Entry          │
                    │ - GateRecord     │
                    │ - LanguageReceipt│
                    │ - CommittedAt    │
                    └──────────────────┘
```

### 3.2 Gate State Machine

```
              PROPOSED
                 │
                 ▼
            REVIEW_PASSED ──────────► REVIEW_REJECTED (terminal)
                 │
                 ▼
             AUTHORIZED ────────────► AUTHORIZATION_DENIED (terminal)
                 │
                 ▼
              APPLIED ──────────────► APPLY_FAILED
                 │
                 ▼
            TESTS_PASSED ◄──────────TESTS_FAILED──► ROLLED_BACK
                 │                                       │
                 ▼                                       │
             RECEIPTED ◄─────────────────────────────────┘
```

### 3.3 Key Types Flow

```
ProposalInput ──► propose() ──► GateRecord{status:PROPOSED, proposal:PatchProposal}
                                     │
                              review(record, reviewer, approved, comments)
                                     │
                              GateRecord{status:REVIEW_PASSED, review:ReviewResult}
                                     │
                    authorize(record, AuthInput, CohBitReceipt)
                                     │
                    GateRecord{status:AUTHORIZED, authorization:GmiStatus}
                                     │
                         apply(record, ApplyInput)
                                     │
                    GateRecord{status:APPLIED, applySnapshot:ApplySnapshot}
                                     │
                       runTests(record, TestResult[])
                                     │
                    GateRecord{status:TESTS_PASSED|TESTS_FAILED, testResults}
                                     │
              rollback(record)  ◄────┘ (if TESTS_FAILED)
              commitReceipt(record)
                                     │
              GateRecord{status:RECEIPTED, receipt:CohBitReceipt}
```

---

## 4. PATH B: Integrated Audit Pipeline

### 4.1 Flow Chart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATED AUDIT PIPELINE (v8.1)                          │
│                   src/integrated_pipeline.ts                                 │
│                                                                             │
│  OPERATING LAW: The pipeline observes, enriches, and reports.               │
│  It does NOT authorize, apply, verify, or commit source code changes.       │
│  It writes side effects only to .cohbit/ and reports/.                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: SCAN + CONTENT                                              │   │
│  │                                                                      │   │
│  │  scanWorkspace(root)              ──► WorkspaceSummary               │   │
│  │  readContentFiles(files)          ──► ContentReadResult              │   │
│  │    (T_content_reader.ts)              - artifacts[], budgetUsed       │   │
│  │    - max 50MB, 500 files                                               │   │
│  │    - binary file rejection                                             │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 2: RUST SCAN + TRIAGE                                          │   │
│  │                                                                      │   │
│  │  2a. scanRustContentBatch(content) ──► RustRiskResult                │   │
│  │      (T_rust_risk_scanner.ts)           - severity×confidence matrix  │   │
│  │      - regex-based pattern detection    - unsafe blocks, FS writes,   │   │
│  │      - calibrated severity (High/Med)     process commands            │   │
│  │                                                                      │   │
│  │  2b. extractRustSymbolBatch(content) ──► RustSymbolResult             │   │
│  │      (T_rust_symbol_extractor.ts)        - function boundaries        │   │
│  │      - syscall/symbol detection          - tests, modules             │   │
│  │                                                                      │   │
│  │  2c. buildReviewQueue(findings)     ──► ReviewQueue                  │   │
│  │      (T_rust_review_queue.ts)           - priority P0-P3 triage      │   │
│  │      - deterministic finding IDs         - severity/confidence        │   │
│  │      - evidence enrichment (v3.3)        - enriched fields (18)       │   │
│  │      - boundary status per finding                                    │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 3: ATLAS MEMORY                                                │   │
│  │                                                                      │   │
│  │  seedAtlasFromFindings(items)    ──► AtlasSeedResult                 │   │
│  │    (atlas_integration.ts)            - entriesWritten, edges          │   │
│  │    - stores Code Atlas L0-L9 entries                                 │   │
│  │                                                                      │   │
│  │  rebuildAtlasIndex()          ──► deduplicated index                 │   │
│  │    (code-atlas/store.ts)        (v8.6 — prevents duplicate lines)    │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 3.5: LOAD PREVIOUS STATE                                       │   │
│  │                                                                      │   │
│  │  loadObligationStore()   ──► PersistedObligationStore | null         │   │
│  │    Loads previous obligations for cross-run reconciliation           │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 4: ENRICH + RECONCILE OBLIGATIONS                              │   │
│  │                                                                      │   │
│  │  enrichFindings(priorityFindings)  ──► EnrichedFinding[]             │   │
│  │                                                                      │   │
│  │  computeContentEvidenceHash(text)  ──► content evidence hash map     │   │
│  │    (enables change detection between runs)                            │   │
│  │                                                                      │   │
│  │  reconcileObligations(             ──► ReconciliationResult          │   │
│  │    enriched,                          - newCount, existingCount      │   │
│  │    contentHashes,                     - changedCount (content        │   │
│  │    previousStore)                       evidence hash detected)     │   │
│  │                                       - closedPreserved              │   │
│  │                                       - duplicatesPrevented          │   │
│  │                                                                      │   │
│  │  persistObligationStore(root)     ──► writes .cohbit/obligations     │   │
│  │                                                                      │   │
│  │  aggregateCanonicalPatternsFrom   ──► PatternResult                   │   │
│  │  Obligations() (v8.7)                - patternHash, hitCount,        │   │
│  │    (L13_canonical_pattern.ts)          sourceFiles, sourceModules    │   │
│  │    - recurring risk patterns          - deduplicated by hash         │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 5: DASHBOARD + ESCALATION                                      │   │
│  │                                                                      │   │
│  │  generateDashboard()       ──► Dashboard                             │   │
│  │    - health: total, open, underReview, deferred, resolved            │   │
│  │    - aging: staleHigh[], reReviewNeeded[]                            │   │
│  │                                                                      │   │
│  │  escalateStaleObligations() ──► Escalation[]                         │   │
│  │    - stale high-priority obligations                                 │   │
│  │                                                                      │   │
│  │  generateObligationReport() ──► ObligationReport                     │   │
│  │    - byStatus, openObligations, staleObligations                     │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 6: PROPOSAL BRIDGE                                             │   │
│  │                                                                      │   │
│  │  buildProposalsFromFindings(     ──► BoundedProposalResult[]         │   │
│  │    priorityFindings,                 - status: 'proposed'|'no_patch' │   │
│  │    contentMap)                       - gateReady: boolean            │   │
│  │    (finding_to_proposal.ts)          - proposal: PatchProposal       │   │
│  │    - converts findings to bounded                                    │   │
│  │      patch proposals with scope                                     │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 7: RESOURCE ACCOUNTING + RECEIPT                               │   │
│  │                                                                      │   │
│  │  createComputeBudget()          ──► budget with limits               │   │
│  │  createTimeBudget()             ──► time tracking                    │   │
│  │  authorizeCompute()             ──► authorized budget                 │   │
│  │                                                                      │   │
│  │  R21 Processor Runtime (wrapping 8 phases):                          │   │
│  │    withProcessorSync("content_read", ...)                            │   │
│  │    withProcessorSync("rust_risk_scan", ...)                          │   │
│  │    withProcessorSync("rust_ast_lite_parse", ...)                     │   │
│  │    withProcessorSync("review_queue_build", ...)                      │   │
│  │    withProcessorSync("obligation_reconcile", ...)                    │   │
│  │    withProcessorSync("receipt_emit", ...)                            │   │
│  │    withProcessorSync("resource_accounting", ...)                     │   │
│  │                                                                      │   │
│  │  aggregateProcessorResults()     ──► R21Summary                      │   │
│  │                                                                      │   │
│  │  createResourceReceipt()         ──► ResourceReceipt                 │   │
│  │  closeResourceReceipt()                                              │   │
│  │  createResourceHealth()          ──► ResourceHealth                  │   │
│  └──────────────────────────────────────┬──────────────────────────────┘   │
│                                         │                                   │
│  ┌──────────────────────────────────────▼──────────────────────────────┐   │
│  │ PHASE 8: REPORT GENERATION                                           │   │
│  │                                                                      │   │
│  │  Outputs:                                                            │   │
│  │  - reports/v8_0_integrated_audit.md  (Markdown report)               │   │
│  │  - reports/v8_0_integrated_audit.json (JSON report)                  │   │
│  │                                                                      │   │
│  │  Report sections:                                                    │   │
│  │    - Boundary Status (evidence level, mutation status)               │   │
│  │    - Repository (files, language, content read)                      │   │
│  │    - Findings (severity×confidence, priority)                        │   │
│  │    - Atlas Memory (entries, edges)                                   │   │
│  │    - Obligations (by status, open, stale)                            │   │
│  │    - Dashboard (health, aging, escalations)                          │   │
│  │    - Proposals (generated, gate-ready)                               │   │
│  │    - Reconciliation (new, existing, changed, duplicates)             │   │
│  │    - Symbols (total, functions, tests)                               │   │
│  │    - Resource (compute, content budget, health)                      │   │
│  │    - Limitations                                                    │   │
│  │                                                                      │   │
│  │  UnifiedAuditResult returned with all summary fields +               │   │
│  │  reconciliation + processorFragments[]                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow Map (Path B)

```
targetPath
    │
    ▼
scanWorkspace('.')
    │
    ├──► sourceFiles[]  ──┐
    ├──► testFiles[]    ──┤
    ├──► configFiles[]  ──┼──► readContentFiles(readableFiles)
    ├──► docsFiles[]    ──┘        │
    │                              ▼
    │                       ContentReadResult
    │                              │
    │                    ┌─────────┼─────────┐
    │                    ▼         ▼         ▼
    │         scanRustContent  extractRust  buildReviewQueue
    │         Batch()          SymbolBatch() ()
    │              │              │              │
    │              ▼              ▼              ▼
    │       RustRiskResult  RustSymbolResult  ReviewQueue
    │              │                            │
    │              └────────────┬───────────────┘
    │                           │
    │                           ▼
    │              seedAtlasFromFindings(queue.items)
    │                           │
    │                           ▼
    │                    AtlasSeedResult
    │                           │
    │                    rebuildAtlasIndex()  ← v8.6
    │                           │
    │              loadObligationStore()  ← previous run state
    │                           │
    │              ┌────────────┼────────────┐
    │              ▼            ▼            ▼
    │    enrichFindings  computeContent  reconcileObligations()
    │    ()              EvidenceHash()       │
    │              │            │            ▼
    │              │            │     ReconciliationResult
    │              │            │            │
    │              └────────────┴─── persistObligationStore()
    │                           │
    │              aggregateCanonicalPatternsFromObligations() ← v8.7
    │                           │
    │              ┌────────────┼────────────┐
    │              ▼            ▼            ▼
    │       generateDashboard escalateStale generateObligation
    │       ()                 Obligations() Report()
    │              │            │            │
    │              ▼            ▼            ▼
    │        Dashboard     Escalation[]  ObligationReport
    │                           │
    │              buildProposalsFromFindings()
    │                           │
    │                           ▼
    │                    BoundedProposalResult[]
    │                           │
    │              ┌────────────┼────────────┐
    │              ▼            ▼            ▼
    │    createResource  createResource  createResource
    │    Receipt()       Health()        Accounting (R21)
    │         │              │              │
    │         ▼              ▼              ▼
    │   ResourceReceipt  ResourceHealth  R21Summary
    │                           │
    │                    ┌──────┴──────┐
    │                    ▼             ▼
    │          Write .md report  Write .json report
    │                    │             │
    │                    └──────┬──────┘
    │                           ▼
    │                    UnifiedAuditResult
```

---

## 5. TLT Language Subsystem (v9.0 - v9.2)

```
┌────────────────────────────────────────────────────────────────────────┐
│                    TLT BIDIRECTIONAL LANGUAGE PIPELINE                   │
│                    (packages/tlt-atlas/)                                │
│                                                                        │
│  OPERATING LAW:                                                        │
│    Copilot orchestrates.                                               │
│    TLT Transformer = language → graph (ears)                           │
│    TLT Voice = graph → language (structured voice)                     │
│    TLT Atlas = structural reference map both consult                   │
│    TLT Atlas Feed = submits candidate patterns back to Atlas            │
│    TLT Atlas/canon = decides what becomes canonical                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                         TLT ATLAS (L0-L16)                        │ │
│  │                          Structural Map                          │ │
│  │                                                                  │ │
│  │  L0: Artifact taxonomy       L8:  Bilingual projection           │ │
│  │  L1: Language surface        L9:  Ambiguity risk                 │ │
│  │  L2: Phrase parse            L10: Verifier                       │ │
│  │  L3: Semantic unit           L11: Receipt                        │ │
│  │  L4: Intent                  L12: Repair                         │ │
│  │  L5: Meaning invariant       L13: Memory graph                   │ │
│  │  L6: Tone register           L14: Retrieval                      │ │
│  │  L7: Domain context          L15: Governance                     │ │
│  │                              L16: Learning polarity              │ │
│  └──────────────────────────────────────────┬───────────────────────┘ │
│                                             │                          │
│               ┌─────────────────────────────┼───────────────────────┐ │
│               │                             │                       │ │
│               ▼                             ▼                       │ │
│  ┌───────────────────────┐     ┌───────────────────────┐           │ │
│  │   TLT TRANSFORMER     │     │     TLT VOICE         │           │ │
│  │   (T_tlt_transformer) │     │     (T_tlt_voice)     │           │ │
│  │                       │     │                       │           │ │
│  │  Markdown/Text ──►    │     │  Graph Nodes+Edges ──►│           │ │
│  │  TltGraphNode[] +     │     │  VoiceStatement[]     │           │ │
│  │  TltGraphEdge[]       │     │                       │           │ │
│  │                       │     │  Categories:          │           │ │
│  │  "Ears" — transforms  │     │  - claim_annotation   │           │ │
│  │  raw language into    │     │  - risk_advisory      │           │ │
│  │  typed graph structure│     │  - definition_clarify │           │ │
│  │                       │     │  - proof_debt         │           │ │
│  │  Node types:          │     │  - overclaim_warning  │           │ │
│  │  claim, definition,   │     │  - next_step_advisory │           │ │
│  │  assumption, risk,    │     │  - domain_context_note│           │ │
│  │  dependency,          │     │  - dependency_notice  │           │ │
│  │  tone_marker,         │     │  - graph_summary      │           │ │
│  │  ambiguity,           │     │                       │           │ │
│  │  domain_context       │     │  "Structured voice" — │           │ │
│  │                       │     │  renders graph as     │           │ │
│  │  Edge types:          │     │  disciplined advisory │           │ │
│  │  depends_on, supports,│     │  language             │           │ │
│  │  contradicts, refines,│     │                       │           │ │
│  │  contextualizes,      │     │                       │           │ │
│  │  receipted_by         │     │                       │           │ │
│  └───────────┬───────────┘     └───────────┬───────────┘           │ │
│              │                             │                       │ │
│              └──────────┬──────────────────┘                       │ │
│                         │                                          │ │
│                         ▼                                          │ │
│              ┌───────────────────────┐                             │ │
│              │   TLT ATLAS FEED     │                             │ │
│              │   (T_tlt_atlas_feed) │                             │ │
│              │                      │                             │ │
│              │  Candidate patterns  │                             │ │
│              │  → Atlas review      │                             │ │
│              │                      │                             │ │
│              │  Feedback loop —     │                             │ │
│              │  TLT may propose     │                             │ │
│              │  Atlas updates.      │                             │ │
│              │  Atlas/canon rules   │                             │ │
│              │  decide.             │                             │ │
│              └───────────────────────┘                             │ │
│                                                                   │ │
│  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │              CLAIM BOUNDARY HARDENING (v9.1)                    │ │ │
│  │                                                                │ │ │
│  │  ┌──────────────────┐    ┌──────────────────┐                  │ │ │
│  │  │  T_claim_guard   │    │ T_public_internal │                 │ │ │
│  │  │                  │    │    _boundary      │                  │ │ │
│  │  │  Strength ladder:│    │                  │                  │ │ │
│  │  │  surface_detected│    │ Prevents Noetican│                 │ │ │
│  │  │  → needs_evidence│    │ terminology leaks│                 │ │ │
│  │  │  → receipt_avail │    │ in public context │                 │ │ │
│  │  │  → ctrl_verified │    │                  │                  │ │ │
│  │  │  → release_approv│    │ Public↔Internal  │                 │ │ │
│  │  │                  │    │ boundary enforcement              │ │ │
│  │  │  Voice NEVER     │    │                  │                  │ │ │
│  │  │  upgrades graph  │    │ Rewrite suggestions                │ │ │
│  │  │  status          │    │ for public mode   │                  │ │ │
│  │  └──────────────────┘    └──────────────────┘                  │ │ │
│  └────────────────────────────────────────────────────────────────┘ │ │
│                                                                   │ │
│  ┌────────────────────────────────────────────────────────────────┐ │ │
│  │              SUMMARY GENERATOR (v9.2)                           │ │ │
│  │              (T_summary_generator.ts)                           │ │ │
│  │                                                                │ │ │
│  │  5 audience modes with evidence inheritance:                   │ │ │
│  │                                                                │ │ │
│  │  Mode      │ Internal Terms│ Claim Strength │ Limitation│ Evid│ │ │
│  │  ──────────┼──────────────┼───────────────┼──────────┼─────│ │ │
│  │  internal  │ allowed      │ flagged        │ not incl │ rel │ │ │
│  │  public    │ rewritten    │ downgraded     │ auto-incl│ rec │ │ │
│  │  technical │ allowed      │ flagged        │ auto-incl│ ctrl│ │ │
│  │  linkedin  │ removed      │ downgraded     │ auto-incl│ need│ │ │
│  │  reviewer  │ allowed      │ flagged        │ auto-incl│ rel │ │ │
│  │                                                                │ │
│  │  Guarantees:                                                   │ │
│  │  - Public never uses stronger language than evidence permits   │ │
│  │  - Internal terms rewritten in public mode                     │ │
│  │  - Draft findings remain described as draft                    │ │
│  │  - No canon promotion from voice output                        │ │
│  └────────────────────────────────────────────────────────────────┘ │ │
│                                                                   │ │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 6. Teaching Mode Subsystem (v10.x)

```
┌───────────────────────────────────────────────────────────────┐
│                   TEACHING MODE (v10.x)                        │
│                   src/teaching.ts                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Topic Knowledge Base (TOPIC_KB)                          │ │
│  │  12 modules:                                              │ │
│  │  M0: Code as State Transition                             │ │
│  │  M1: Python Safe File Tool                                │ │
│  │  M2: TypeScript Receipt Validator                         │ │
│  │  M3: Secure Coding + CIA Lab                              │ │
│  │  M4: SQL Persistence, Audit Tables, and Rollback          │ │
│  │  M5: Resource-Aware and Constrained Computing             │ │
│  │  M6: Governed APIs, Tool Calls, and Automation           │ │
│  │  M7: Multi-Language Transition Interoperability           │ │
│  │  M8: Rust High-Integrity Verifier                         │ │
│  │  M9: Lean Proof Obligations and CTRL Theorem Repair      │ │
│  │  M10: Formal-to-Runtime Bridge and Atlas Memory           │ │
│  │  M11: CI/CD Gates, Release Discipline, Governed Packages │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  teach(topic, audience, corpusPath) → TeachingResponse    │ │
│  │    - 3 audiences: internal, public, linkedin              │ │
│  │    - TLT claim guard integration                          │ │
│  │    - TLT voice output with evidence-level boundaries      │ │
│  │    - Fallback summaries when no corpus match              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  generateQuiz(topic) → QuizQuestion[]                     │ │
│  │    - Topic-specific quiz generation                       │ │
│  │    - Format: question, options, correct answer            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Lesson Memory (v8.8)                                     │ │
│  │  (M18_operational_lessons.ts)                             │ │
│  │    - lessonId, domain, insight, evidence, timestamp       │ │
│  │    - Operational knowledge persistence                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Learning Polarity (v10.3)                                │ │
│  │  (L16_learning_polarity.ts)                               │ │
│  │    - Positive/negative example classification             │ │
│  │    - Polarity comparison across runs                      │ │
│  │    - Corpus hash-based deduplication                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Standards Traceability Matrix (v11.4)                    │ │
│  │  docs/curriculum/standards_traceability_matrix.md         │ │
│  │    - 12 curriculum modules mapped to 12 standards domains │ │
│  │    - CIPM, NIST, ISO, OWASP, etc.                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 7. Atlas Memory Architecture (3 Atlas Packages)

```
┌────────────────────────────────────────────────────────────────────┐
│                     THREE ATLAS PACKAGES                             │
│              Shared memory architecture for the copilot              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────┐  ┌─────────────────────────┐         │
│  │    CODE ATLAS           │  │    TLT ATLAS            │         │
│  │    (packages/code-atlas)│  │    (packages/tlt-atlas) │         │
│  │                         │  │                         │         │
│  │  L0:  Artifact          │  │  L0:  Artifact          │         │
│  │  L1:  Language surface  │  │  L1:  Language surface  │         │
│  │  L2:  Parse/AST         │  │  L2:  Phrase parse      │         │
│  │  L3:  Invariants        │  │  L3:  Semantic unit     │         │
│  │  L4:  Transitions       │  │  L4:  Intent            │         │
│  │  L5:  Risk constraints  │  │  L5:  Meaning invariant │         │
│  │  L6:  Projection        │  │  L6:  Tone register     │         │
│  │  L7:  Verifier          │  │  L7:  Domain context    │         │
│  │  L8:  Receipt           │  │  L8:  Bilingual proj.   │         │
│  │  L9:  Repair obligation │  │  L9:  Ambiguity risk    │         │
│  │  L10: Memory graph      │  │  L10: Verifier          │         │
│  │  L11: Query             │  │  L11: Receipt           │         │
│  │  L12: Governance        │  │  L12: Repair            │         │
│  │  L13: Canonical patterns│  │  L13: Memory graph      │         │
│  │                         │  │  L14: Retrieval         │         │
│  │  + store.ts (persistence)│ │  L15: Governance        │         │
│  │                         │  │  L16: Learning polarity │         │
│  │                         │  │                         │         │
│  │  Domain:                │  │  Domain:                │         │
│  │  - Code structure       │  │  - Language semantics   │         │
│  │  - AST/parse trees      │  │  - Meaning/tone/context │         │
│  │  - Risk patterns        │  │  - Claim boundaries     │         │
│  │  - Repair obligations   │  │  - Voice generation     │         │
│  └─────────────────────────┘  └─────────────────────────┘         │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │    MATH ATLAS                                                │   │
│  │    (packages/math-atlas)                                     │   │
│  │                                                              │   │
│  │  M0:  Artifact           M10: Simulation                     │   │
│  │  M1:  Representation     M11: Formalization                  │   │
│  │  M2:  Model family       M12: Risk/Misuse                    │   │
│  │  M3:  Object structure   M13: Receipt                        │   │
│  │  M4:  Relation           M14: Repair                         │   │
│  │  M5:  Invariant          M15: Memory graph                   │   │
│  │  M6:  Assumption         M16: Retrieval                      │   │
│  │  M7:  Mapping            M17: Governance                     │   │
│  │  M8:  Analogy            M18: Operational lessons            │   │
│  │  M9:  Evidence                                              │   │
│  │                                                              │   │
│  │  Domain:                                                     │   │
│  │  - Mathematical formalization                                │   │
│  │  - Model families, object structures, relations              │   │
│  │  - Simulations, formal proofs                                │   │
│  │  - Evidence, analogy, mapping                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │    CROSS-ATLAS BRIDGE (src/atlas_bridge.ts)                   │  │
│  │    - classifyPatchFile() → CodeAtlasEntry                     │  │
│  │    - buildAtlasEntry() → bridges gate records to atlas        │  │
│  │    - mapCommandToSemantics() → command→TLT mapping            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Tooling Package Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    TOOLING PACKAGE                                   │
│                (packages/tooling/src/)                              │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ T0: Registry│  │ T3: Scanner│  │ T4: Ingestion│ │ T5: Router │  │
│  │ Type registry│  │ File scanner│ │ Content ingest│ │ Risk router│  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │T6:Validator│  │T7:RskScanner│ │T8:RepairQueue│ │T9:RecptEngine│ │
│  │ Pattern val.│  │ Risk scanner│ │ Repair queue │ │ Receipt eng │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │T12:Code Adpt│ │T13:Lang Adpt│ │T14:Math Adpt│ │T15:RtrvlGuard│ │
│  │ Code adapter│  │ Lang adapter│ │ Math adapter│ │ Retrieval grd│  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ T17: Audit │  │T19:Benchmark│ │T_policy_gate│ │T_integrated │  │
│  │ Audit engine│  │ Benchmark  │ │ Policy gate │ │ _audit      │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Rust-Specific Audit Modules (v3.x)                          │  │
│  │                                                              │  │
│  │  T_content_reader.ts        — Read + classify content files  │  │
│  │  T_rust_symbol_extractor.ts — Extract Rust symbols           │  │
│  │  T_rust_risk_scanner.ts     — Regex-based Rust risk scanner  │  │
│  │  T_rust_review_queue.ts     — P0-P3 priority queue           │  │
│  │  T_rust_finding_enricher.ts — 18-field evidence enrichment   │  │
│  │  T_rust_ast_lite.ts         — Lightweight Rust AST parser    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Report & Resource Modules                                    │  │
│  │                                                              │  │
│  │  T_professional_report.ts   — 10-section audit report        │  │
│  │  T_resource_governor.ts     — Resource budget enforcement    │  │
│  │  R21_processor_runtime.ts   — Per-phase processor tracking   │  │
│  │  R21_compute_processor_map.ts — 18 processor profiles        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Repo Intelligence (v3.5)                                     │  │
│  │                                                              │  │
│  │  repo_file_index.ts         — Source/test/config classification│ │
│  │  repo_test_map.ts           — Source-to-test mapping        │  │
│  │  repo_risk_distribution.ts  — Risk by file/module/directory │  │
│  │  repo_audit_summary.ts      — Top review targets, uncovered │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 9. Complete File-to-File Dependency Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      SOURCE FILE DEPENDENCY GRAPH                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  types.ts ◄──────────────────────────────────────────────────────────────┤
│  (all types, Rational64, isAdmissible, Wedge, GateRecord, etc.)          │
│      │                                                                   │
│      ├──── receipit.ts ─────┬──── gates.ts ──────┬──── proposer.ts       │
│      │    (SHA-256 hashing) │    (7-gate pipeline)│    (bounded patches)  │
│      │         │            │         │           │                       │
│      │         │            │         │           │                       │
│      │    ledger.ts         │    gate_store.ts    │                       │
│      │    (append-only      │    (disk-backed     │                       │
│      │     JSONL sessions)  │     persistence)    │                       │
│      │         │            │         │           │                       │
│      │         │            │    cli.ts ◄─────────┼── proposer.ts         │
│      │         │            │    (25+ commands)   │                       │
│      │         │            │         │           │                       │
│      │         │            │         ▼           │                       │
│      │         │            │  ┌─────────────┐    │                       │
│      │         │            │  │ CLI commands │    │                       │
│      │         │            │  │ dispatch     │    │                       │
│      │         │            │  └──────┬──────┘    │                       │
│      │         │            │         │           │                       │
│      ├──── workspace.ts ────┤         │           │                       │
│      │    (scan + classify) │         │           │                       │
│      │         │            │         │           │                       │
│      ├──── environment.ts ──┤         │           │                       │
│      │    (tool review)     │         │           │                       │
│      │         │            │         │           │                       │
│      ├──── symbols.ts ──────┤         │           │                       │
│      │    (extract symbols) │         │           │                       │
│      │         │            │         │           │                       │
│      ├──── dep_graph.ts ────┤         │           │                       │
│      │    (dependency graph)│         │           │                       │
│      │         │            │         │           │                       │
│      ├──── english.ts ──────┤         │           │                       │
│      │    (natural lang)    │         │           │                       │
│      │         │            │         │           │                       │
│      ├──── planner.ts ──────┤         │           │                       │
│      │    (work planner)    │         │           │                       │
│      │         │            │         │           │                       │
│      ├── test_recommender ──┤         │           │                       │
│      │    (test suggestions)│         │           │                       │
│      │         │            │         │           │                       │
│      ├── patch_builder.ts ──┤         │           │                       │
│      │    (6 patch primitives)│        │           │                       │
│      │         │            │         │           │                       │
│      ├── repair_planner.ts ─┤         │           │                       │
│      │    (failure→repair)  │         │           │                       │
│      │         │            │         │           │                       │
│      ├──── lang.ts ─────────┤         │           │                       │
│      │    (language detect) │         │           │                       │
│      │         │            │         │           │                       │
│      └──── fs.ts ───────────┤         │           │                       │
│          (snapshot/apply/   │         │           │                       │
│           rollback/test)    │         │           │                       │
│                              │        │           │                       │
│      ┌───────────────────────┘        │           │                       │
│      │                                │           │                       │
│      ▼                                ▼           │                       │
│  integrated_pipeline.ts ◄──────────────────────────┘                       │
│  (v8.1 audit orchestrator)                                                 │
│      │                                                                     │
│      ├── packages/tooling/src/T_content_reader.ts                          │
│      ├── packages/tooling/src/T_rust_risk_scanner.ts                       │
│      ├── packages/tooling/src/T_rust_symbol_extractor.ts                   │
│      ├── packages/tooling/src/T_rust_review_queue.ts                       │
│      ├── packages/tooling/src/T_rust_finding_enricher.ts                   │
│      ├── packages/tooling/src/T_rust_ast_lite.ts                           │
│      ├── packages/tooling/src/repo_intelligence/* (5 files)                │
│      ├── packages/tooling/src/T_professional_report.ts                     │
│      ├── packages/tooling/src/T_resource_governor.ts                       │
│      ├── packages/tooling/src/resource/R21_processor_runtime.ts            │
│      ├── packages/resource/src/R1_compute.ts                               │
│      ├── packages/resource/src/R5_time.ts                                  │
│      ├── packages/resource/src/R18_receipt.ts                              │
│      ├── packages/resource/src/R19_dashboard.ts                            │
│      ├── packages/code-atlas/src/store.ts                                  │
│      ├── packages/code-atlas/src/L3_invariant.ts                           │
│      ├── packages/code-atlas/src/L4_transition.ts                          │
│      ├── packages/code-atlas/src/L13_canonical_pattern.ts                  │
│      ├── packages/math-atlas/src/M18_operational_lessons.ts                │
│      ├── packages/tlt-atlas/src/T_claim_guard.ts                           │
│      ├── packages/tlt-atlas/src/T_public_internal_boundary.ts              │
│      ├── packages/tlt-atlas/src/T_tlt_voice.ts                             │
│      ├── packages/tlt-atlas/src/T_tlt_transformer.ts                       │
│      ├── packages/tlt-atlas/src/T_tlt_atlas_feed.ts                        │
│      ├── packages/tlt-atlas/src/T_summary_generator.ts                     │
│      ├── packages/tlt-atlas/src/L16_learning_polarity.ts                   │
│      ├── src/atlas_bridge.ts                                               │
│      ├── src/atlas_integration.ts                                          │
│      ├── src/atlas_repair_routing.ts                                       │
│      ├── src/finding_to_proposal.ts                                        │
│      ├── src/human_review_receipt.ts                                       │
│      ├── src/retrieval_filter.ts                                           │
│      └── src/teaching.ts                                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  CLI.ts depends on ALL of the above (src/ modules) directly,         │  │
│  │  plus:                                                               │  │
│  │  - gate_store.ts (disk-backed gate record persistence)               │  │
│  │  - packages/tooling/src/T_resource_governor.ts (runGoverned wrapper) │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Data Persistence Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                 PERSISTENCE LAYER                              │
│             (.cohbit/ directory)                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  .cohbit/                                                     │
│  ├── gate_records/                                            │
│  │   └── <proposalId>.json                                    │
│  │       {                                                    │
│  │         schemaVersion: "1.0",                              │
│  │         proposalId: "prop-...",                            │
│  │         gateRecord: GateRecord,                            │
│  │         writtenAt: ISO8601,                                │
│  │         hash: SHA-256                                      │
│  │       }                                                    │
│  │       (Atomic writes: temp → rename → hash verify)         │
│  │       (Path traversal rejection)                           │
│  │                                                           │
│  ├── session_ledger.jsonl                                     │
│  │   (Append-only JSONL, one line per event)                  │
│  │   {                                                        │
│  │     sessionId, gateRecord, languageReceipt?,               │
│  │     committedAt                                            │
│  │   }                                                        │
│  │   (Skip corrupted lines on read)                           │
│  │   (Ledger lock file for concurrent write safety)           │
│  │                                                           │
│  ├── obligations/                                             │
│  │   (PersistedObligationStore)                               │
│  │   {                                                        │
│  │     obligations: ObligationRecord[],                       │
│  │     lastReconciled: ISO8601,                               │
│  │     totalRuns: number                                      │
│  │   }                                                        │
│  │   (Cross-run reconciliation)                               │
│  │   (Content evidence hash change detection)                 │
│  │                                                           │
│  ├── atlas/                                                  │
│  │   (Code Atlas store)                                       │
│  │   - L0-L9 entries from audit findings                      │
│  │   - L13 canonical patterns                                 │
│  │   - M18 operational lessons                                │
│  │   - Index deduplication (v8.6)                             │
│  │                                                           │
│  └── reports/                                                │
│      ├── v8_0_integrated_audit.md                             │
│      ├── v8_0_integrated_audit.json                           │
│      └── ...                                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 11. Resource Governance Layer (R0–R21)

```
┌───────────────────────────────────────────────────────────────┐
│              RESOURCE PACKAGE LAYERS                           │
│           (packages/resource/src/)                             │
│                                                               │
│  R0:  Registry          — Resource type registration          │
│  R1:  Compute           — CPU time budgets, authorization     │
│  R2:  Memory            — RAM usage tracking                  │
│  R3:  Storage           — Disk usage tracking                 │
│  R4:  Tokens            — Token consumption (LLM calls)       │
│  R5:  Time              — Wall-clock time budgets             │
│  R6:  Tool Calls        — External tool call accounting       │
│  R7:  Human Attention   — Review/approval effort tracking     │
│  R8:  Network           — Network I/O budgets                 │
│  R9:  Proof Search      — Formal verification effort          │
│  R10: Benchmark         — Performance measurement            │
│  R11: Repair            — Repair operation accounting         │
│  R12: Receipt Storage   — Receipt persistence accounting      │
│  R13: Energy            — Energy consumption estimation       │
│  R14: Authority         — Auth delegation tracking            │
│  R15: Risk              — Risk budget allocation              │
│  R16: Scheduler         — Task scheduling constraints         │
│  R17: Throttle          — Rate limiting                       │
│  R18: Receipt           — Resource receipt generation         │
│  R19: Dashboard         — Resource health dashboard           │
│  R20: Forecast          — Resource consumption forecasting    │
│  R21: Processor Runtime — Per-phase processor tracking        │
│      (R21_compute_processor_map.ts) — 18 processor profiles   │
│                                                               │
│  STATUS: 21 layers scaffolded with tests. Only R1/R5/R18/R19  │
│          wired into the integrated pipeline.                   │
│          Gates, CLI, teaching, and TLT do not pass through     │
│          resource authorization (known gap, v11.0 roadmap).   │
└───────────────────────────────────────────────────────────────┘
```

---

## 12. Security Model

```
┌───────────────────────────────────────────────────────────────┐
│                     SECURITY LAYER (v2.0)                      │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ path_safety.ts   │  │ atomic_write.ts  │                  │
│  │ - Symlink resol. │  │ - Temp→rename    │                  │
│  │ - Path traversal │  │ - Hash verify    │                  │
│  │   prevention     │  │ - Overwrite safe │                  │
│  │ - Boundary check │  │                  │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ ledger_lock.ts   │  │ english.ts       │                  │
│  │ - Concurrent     │  │ - Unsafe rejection│                 │
│  │   write safety   │  │ - Mutation       │                  │
│  │ - File locking   │  │   permission map │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                               │
│  Test coverage: 10 security test suites                       │
│  - security_path.test.ts                                     │
│  - security_atomic_write.test.ts                              │
│  - security_concurrency.test.ts                              │
│  - security_symlink.test.ts                                  │
│  - security_binary_files.test.ts                             │
│  - security_english.test.ts                                  │
│  - security_proposal.test.ts                                 │
│  - security_ledger.test.ts                                  │
│  - security_rollback.test.ts                                 │
│  - security_windows_paths.test.ts                            │
└───────────────────────────────────────────────────────────────┘
```

---

## 13. Complete System Flow Chart (Unified)

```
                              ┌──────────┐
                              │   USER   │
                              └────┬─────┘
                                   │
                          ┌────────▼────────┐
                          │  CLI (cli.ts)   │
                          │  25+ commands   │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐  ┌──────▼───────┐  ┌────────▼─────────┐
    │ GOVERNED PATCH     │  │ INTEGRATED   │  │ TEACHING MODE    │
    │ PATH (Path A)      │  │ AUDIT PATH   │  │ PATH             │
    │                    │  │ (Path B)     │  │                  │
    │ Propose→Review→    │  │ Scan→Content │  │ teach()          │
    │ Authorize→Apply→   │  │ →Risk→Symbols│  │ curriculum()     │
    │ Test→Rollback→     │  │ →Review→Atlas│  │ quiz()           │
    │ Receipt            │  │ →Obligations │  │ polarity()       │
    │                    │  │ →Proposals   │  │ lesson/receipts  │
    │ Output:            │  │ →Report      │  │                  │
    │ GateRecord +       │  │              │  │ Output:          │
    │ CohBitReceipt      │  │ Output:      │  │ TeachingResponse │
    │                    │  │ UnifiedAudit │  │ QuizQuestion[]   │
    └────────┬───────────┘  │ Result       │  │ PolarityRecord[] │
             │              └──────┬───────┘  └────────┬─────────┘
             │                     │                   │
             │    ┌────────────────┼───────────────────┘
             │    │                │
             ▼    ▼                ▼
    ┌─────────────────────────────────────────────┐
    │            SHARED INFRASTRUCTURE             │
    │                                             │
    │  types.ts   receipt.ts   ledger.ts          │
    │  gate_store.ts  fs.ts  lang.ts              │
    │  atlas_bridge.ts  atlas_integration.ts      │
    │  workspace.ts  environment.ts               │
    │  symbols.ts  dep_graph.ts                   │
    │  english.ts  planner.ts                     │
    │  test_recommender.ts  patch_builder.ts      │
    │  repair_planner.ts  proposer.ts             │
    │  path_safety.ts  atomic_write.ts            │
    │  ledger_lock.ts  gate_store.ts              │
    │  retrieval_filter.ts  finding_to_proposal.ts│
    │  human_review_receipt.ts                    │
    │  atlas_repair_routing.ts                    │
    └────────────────────┬────────────────────────┘
                         │
    ┌────────────────────┼────────────────────────┐
    │                    │                        │
    ▼                    ▼                        ▼
┌──────────┐    ┌──────────────┐    ┌──────────────────────┐
│  ATLAS   │    │   TOOLING    │    │     RESOURCE         │
│ PACKAGES │    │   PACKAGE    │    │     PACKAGE          │
│          │    │              │    │                      │
│ code-    │    │ T0-T19       │    │ R0-R21               │
│ atlas    │    │ Rust audit   │    │ Compute, memory,     │
│ tlt-     │    │ modules      │    │ storage, tokens,     │
│ atlas    │    │ Repo intel   │    │ time, energy,        │
│ math-    │    │ Reports      │    │ authority, risk,     │
│ atlas    │    │ Policy gates │    │ scheduler, throttle, │
│          │    │ Resource gov │    │ receipt, dashboard,  │
│ 16+      │    │ Processor    │    │ forecast             │
│ 20+      │    │ runtime      │    │                      │
│ 19 layers│    │              │    │ 21 layers            │
└────┬─────┘    └──────┬───────┘    └──────────┬───────────┘
     │                 │                       │
     └─────────────────┼───────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │    PERSISTENCE LAYER   │
          │    .cohbit/            │
          │                        │
          │  gate_records/         │
          │  session_ledger.jsonl  │
          │  obligations/          │
          │  atlas/                │
          │  reports/              │
          └────────────────────────┘
```

---

## 14. Key Design Principles (Summary)

| # | Principle | Enforcement |
|---|-----------|-------------|
| 1 | **Proposal ≠ Authority** | ReviewGate is mandatory; copilot cannot self-approve |
| 2 | **Mathematical Acceptance ≠ Executable Permission** | AuthorizeGate enforces policy + admissibility + budgets |
| 3 | **Patch Applied ≠ Patch Stable** | RollbackGate + ApplySnapshot with pre-state hashes |
| 4 | **Test Passed ≠ Final Commit** | ReceiptGate is separate; only TESTS_PASSED → RECEIPTED |
| 5 | **Defect ≠ Authority** | `d` (tolerated error) and `a` (granted resource) are distinct fields |
| 6 | **Admissibility Law** | `V(post) + s ≤ V(pre) + d + a` checked before receipt build |
| 7 | **Receipt Must Be Deterministic** | SHA-256 over canonical pipe-joined serialization with GCD reduction |
| 8 | **Memory Mass Defined Over Canonical Bytes** | `M_mem(b) = |CanonicalBytes(b)|` — no non-canonical encodings |
| 9 | **Audit Observes, Does Not Mutate** | Integrated pipeline is read-only to source; writes only to .cohbit/ and reports/ |
| 10 | **Voice Cannot Upgrade Graph Status** | TLT claim guard enforces strength ladder; voice output is always advisory |
| 11 | **Evidence Level Limits Claims** | surface_detected → needs_evidence → receipt_available → ctrl_verified → release_approved |
| 12 | **Append-Only JSONL Ledger** | No database; human-readable; skip corrupted lines |
| 13 | **Self-Contained Rollback** | beforeContent from snapshot; no git dependency |
| 14 | **Type-Safe Coupling** | Only displacements passing Admissibility + Policy gates reach commitment boundary |

---

## 15. Metrics Summary (as of v11.4)

| Metric | Value |
|--------|-------|
| Core source modules (src/) | 26 `.ts` files |
| Tooling package modules | 25+ `.ts` files |
| Code Atlas layers | 16 (L0–L13 + store + index) |
| TLT Atlas layers | 20 (L0–L16 + T_ modules + index) |
| Math Atlas layers | 19 (M0–M18 + index) |
| Resource layers | 21 (R0–R21 + index) |
| CLI commands | 25+ |
| Test vectors | 16 JSON fixtures |
| SDK languages | 3 (TypeScript, Python, Rust) |
| Security test suites | 10 |
| Test passing rate | 792/797 (99.4%) |
| Admissibility law | `V(post) + s ≤ V(pre) + d + a` |
| Receipt hash | SHA-256 (canonical pipe-joined serialization) |
| Gate lifecycle | 7 gates (Propose→Review→Authorize→Apply→Test→Rollback→Receipt) |
| Audit pipeline phases | 8 (Scan→Content→Risk→Symbols→Review→Atlas→Obligations→Proposal→Report) |
| TLT audience modes | 5 (internal, public, technical, linkedin, reviewer) |
| Curriculum modules | 12 (M0–M11) |

---

*Full System Layout and Flow Chart. Generated from source code audit of the CohBit-Copilot codebase. All claims correspond to verified files and module structures.*