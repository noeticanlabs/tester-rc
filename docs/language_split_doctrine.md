# CohBit-Copilot — Language Split Doctrine

```
TypeScript orchestrates.
Rust verifies.
GPU explores.
CPU commits.
CohBit receipts the boundary.
```

**Status:** Formal architecture document — implementation boundary for all future language choices  
**Version:** v11.7  
**Generated:** 2026-06-06  
**Package version:** 10.9.0

---

## 1. Purpose

This document defines the implementation boundary for CohBit-Copilot across programming languages. Its purpose is to prevent accidental rewrites of orchestration code that should remain in TypeScript, and to guide the deliberate migration of authority-bearing deterministic kernels toward Rust.

**A language boundary is an authority boundary.** The choice of language for a given module is not merely an implementation preference — it reflects the trust model for that module's output. Fast orchestration may live in TypeScript. Authority-bearing deterministic checks should migrate toward Rust. No language choice grants authority by itself. Only gated, receipted, evidence-labeled outputs may influence committed state.

---

## 2. Current Hybrid State

CohBit-Copilot already operates across four languages with a clear, existing boundary:

### TypeScript / Node.js — Control Plane

| Module | Role | Authority Level |
|--------|------|----------------|
| `src/cli.ts` | 25+ command handlers, operator interface | May route, may coordinate |
| `src/gates.ts` | 7-gate governed patch lifecycle | May enforce state machine, may not self-authorize |
| `src/integrated_pipeline.ts` | 8-phase audit orchestrator | May observe, enrich, report; may not mutate source |
| `src/teaching.ts` | 12-module teaching curriculum | May explain, may quiz; may not certify |
| `src/receipt.ts` | Canonical receipt serialization + SHA-256 hashing | Deterministic but in orchestration language |
| `src/types.ts` | Shared types, `isAdmissible()`, Rational64 arithmetic | Type-level enforcement |
| `src/ledger.ts` | Append-only JSONL session persistence | May record, may not mutate history |
| `src/gate_store.ts` | Disk-backed gate record persistence | May persist, may not fabricate |
| `src/fs.ts` | Snapshot, apply, rollback with security checks | May execute scoped I/O |
| `packages/tlt-atlas/` | Language ↔ graph pipeline, claim guard, voice, summary generator, learning polarity | May structure, may warn; may not upgrade evidence |
| `packages/code-atlas/` | Code structure atlas (L0–L13), canonical patterns | May store, may query |
| `packages/math-atlas/` | Math/formal atlas (M0–M18), operational lessons | May model, may record lessons |
| `packages/resource/` | Resource governance (R0–R21) | May budget, may track; partial wiring |
| `packages/tooling/` | Scanner, router, risk scanner, validator, repair queue, receipt engine, professional reports | May detect patterns, may recommend; may not certify defects |

### Rust — Deterministic Trust Kernel (Existing)

| Module | Role | Authority Level |
|--------|------|----------------|
| `reference-verifier/rust/` | Type-safe admissibility law verification, acceptance gating, hardened receipt validation | May verify deterministic facts within scope |
| `sdks/rust/` | Receipt hashing, canonical serialization, conformance testing | Must produce identical hashes to TypeScript and Python |
| `sandbox/fixtures/` (6 fixtures) | Controlled Rust audit targets for scanner verification | Test-only; no runtime authority |

### Python — Research / Testing Glue (Existing)

| Module | Role | Authority Level |
|--------|------|----------------|
| `sdks/python/` | Receipt hashing with stdlib only, conformance testing | Must produce identical hashes |

### Lean 4 — Formal Reference Layer (Existing)

| Module | Role | Authority Level |
|--------|------|----------------|
| `reference-verifier/lean/` | Formal proofs of safety, persistence, geometry | Formal reference; not live runtime |

### C++ / GPU — Future Only (Not Implemented)

| Module | Role | Authority Level |
|--------|------|----------------|
| None | Reserved for heavy heuristic acceleration only | Outputs must pass deterministic CPU gates before influencing authority-bearing state |

---

## 3. Language Responsibility Table

For every module in the system, this table defines which language owns it now and which language should own it at maturity.

### Core Runtime (`src/`)

| File | Current | Target | Rationale |
|------|---------|--------|-----------|
| `cli.ts` | TypeScript | **TypeScript** | Orchestration surface; must iterate fast |
| `gates.ts` | TypeScript | TypeScript (orchestration) + Rust (policy kernel) | State machine stays TS; admissibility check migrates to Rust |
| `integrated_pipeline.ts` | TypeScript | **TypeScript** | Workflow coordinator; calls Rust kernels |
| `teaching.ts` | TypeScript | **TypeScript** | Teaching, explanation, quiz generation |
| `receipt.ts` | TypeScript | **Rust (canonical)** | Core trust primitive; must be hardened |
| `types.ts` | TypeScript | TypeScript (type defs) + Rust (admissibility fn) | Types stay; `isAdmissible()` kernel migrates |
| `ledger.ts` | TypeScript | **TypeScript** | JSONL persistence; append-only structure is self-verifying |
| `gate_store.ts` | TypeScript | **TypeScript** | JSON persistence with atomic writes |
| `fs.ts` | TypeScript | TypeScript (orchestration) + Rust (path safety kernel) | Apply/rollback orchestration stays TS; safety checks migrate |
| `lang.ts` | TypeScript | **TypeScript** | Language detection, test command routing |
| `proposer.ts` | TypeScript | **TypeScript** | Bounded patch proposal generation |
| `english.ts` | TypeScript | **TypeScript** | Natural language command parsing |
| `workspace.ts` | TypeScript | **TypeScript** | File scanning, classification |
| `environment.ts` | TypeScript | **TypeScript** | Environment review, tool detection |
| `symbols.ts` | TypeScript | TypeScript + Rust (parser-backed extraction) | TS stays for routing; Rust for extraction kernels |
| `dep_graph.ts` | TypeScript | **TypeScript** | Dependency graph traversal |
| `planner.ts` | TypeScript | **TypeScript** | Work planning from natural language |
| `test_recommender.ts` | TypeScript | **TypeScript** | Test command recommendation |
| `patch_builder.ts` | TypeScript | **TypeScript** | Safe patch primitives |
| `repair_planner.ts` | TypeScript | **TypeScript** | Failure parsing, repair plan generation |
| `path_safety.ts` | TypeScript | **Rust** | Security boundary; must be hardened |
| `atomic_write.ts` | TypeScript | TypeScript + Rust (verify kernel) | TS orchestrates writes; Rust verifies |
| `ledger_lock.ts` | TypeScript | **TypeScript** | File locking for concurrent safety |
| `atlas_bridge.ts` | TypeScript | **TypeScript** | Cross-atlas routing |
| `atlas_integration.ts` | TypeScript | **TypeScript** | Atlas seeding, enrichment, reconciliation |
| `atlas_repair_routing.ts` | TypeScript | **TypeScript** | Obligation → repair queue routing |
| `finding_to_proposal.ts` | TypeScript | **TypeScript** | Audit finding → patch proposal conversion |
| `human_review_receipt.ts` | TypeScript | **TypeScript** | Human review record generation |
| `retrieval_filter.ts` | TypeScript | **TypeScript** | Evidence-level gated retrieval |

### Packages

| Package | Current | Target | Rationale |
|---------|---------|--------|-----------|
| `tooling/src/T_rust_risk_scanner.ts` | TypeScript (regex) | **Rust** (parser-backed) | Audit kernel; regex is transitional |
| `tooling/src/T_rust_ast_lite.ts` | TypeScript (brace-counting) | **Rust** (real parser) | Structural analysis; must be reliable |
| `tooling/src/T_rust_review_queue.ts` | TypeScript | TypeScript (orchestration) + Rust (deterministic IDs) | Queue logic stays TS; finding IDs migrate |
| `tooling/src/T_rust_finding_enricher.ts` | TypeScript | **TypeScript** | Evidence enrichment is orchestration |
| `tooling/src/T_rust_symbol_extractor.ts` | TypeScript | TypeScript + Rust (parser) | TS routes; Rust extracts |
| `tooling/src/T_content_reader.ts` | TypeScript | **TypeScript** | File I/O with budget enforcement |
| `tooling/src/T_professional_report.ts` | TypeScript | **TypeScript** | Report formatting; must iterate fast |
| `tooling/src/T_resource_governor.ts` | TypeScript | **TypeScript** | Budget orchestration; calls Rust processor validators |
| `tooling/src/repo_intelligence/` | TypeScript | **TypeScript** | File index, test map, risk distribution |
| `tooling/src/resource/R21_processor_runtime.ts` | TypeScript | TypeScript (orchestration) + Rust (record validation) | Runtime stays TS; validation migrates |
| `tooling/src/resource/R21_compute_processor_map.ts` | TypeScript | **TypeScript** | Processor classification; declarative |
| `code-atlas/` (L0–L13) | TypeScript | **TypeScript** | Atlas registries; structural memory |
| `tlt-atlas/` (L0–L16) | TypeScript | **TypeScript** | Language semantics; must iterate fast |
| `math-atlas/` (M0–M18) | TypeScript | **TypeScript** | Mathematical modeling; formal reference |
| `resource/` (R0–R21) | TypeScript | TypeScript (orchestration) + Rust (processor validation) | Budget orchestration stays TS; validation migrates |

---

## 4. Authority Gradient

Trust increases as you move from TypeScript → Rust → Lean. Orchestration freedom increases in reverse.

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHORITY GRADIENT                             │
│                                                                  │
│  HIGH TRUST                                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Lean 4 — Formal Reference                                  │  │
│  │  - Mathematical proofs (safety, persistence, geometry)      │  │
│  │  - Not live runtime                                         │  │
│  │  - Defines "what correctness means"                         │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Rust — Deterministic Trust Kernel                          │  │
│  │  - Receipt verification                                     │  │
│  │  - Path safety                                              │  │
│  │  - Admissibility law enforcement                            │  │
│  │  - Deterministic ID generation                              │  │
│  │  - Parser-backed audit kernels                              │  │
│  │  - May verify deterministic facts; may NOT authorize commits│  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  C++ / GPU — Heuristic Acceleration (Future)                │  │
│  │  - Must pass deterministic CPU gates                        │  │
│  │  - Outputs are advisory until gated                         │  │
│  │  - Never directly connected to authority-bearing state      │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  TypeScript — Control Plane                                 │  │
│  │  - CLI, workflow orchestration                              │  │
│  │  - Teaching, TLT, reports                                   │  │
│  │  - Atlas registries, persistence                            │  │
│  │  - May route, explain, report; may NOT self-authorize       │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Python — Research / Testing Glue                           │  │
│  │  - Conformance testing                                      │  │
│  │  - Research/glue code                                       │  │
│  │  - Must produce identical receipt hashes                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│  LOW TRUST                                                       │
└──────────────────────────────────────────────────────────────────┘
```

**Key rules of the gradient:**

1. Higher-trust languages may verify facts produced by lower-trust languages
2. Lower-trust languages may call higher-trust kernels but may not override their results
3. The cross-language conformance bridge (shared test vectors) is the invariant that binds the gradient
4. GPU/C++ outputs are always "proposed" — they must pass a Rust deterministic gate before influencing any authority-bearing state
5. Lean defines what correctness means; Rust enforces it at runtime; TypeScript orchestrates around it

---

## 5. What Stays TypeScript

These modules are permanently owned by TypeScript. They will not be rewritten in Rust.

| Module | Why It Stays TypeScript |
|--------|------------------------|
| `cli.ts` | Operator interface; must support rapid iteration, JSON handling, markdown output |
| `teaching.ts` | Natural language explanation; curriculum generation; quiz formatting |
| `integrated_pipeline.ts` | Workflow coordinator; calls kernels, assembles reports |
| `planner.ts`, `test_recommender.ts`, `patch_builder.ts`, `repair_planner.ts` | Heuristic planning from natural language; not deterministic |
| `english.ts` | Natural language parsing; rule-based, not formal |
| `ledger.ts`, `gate_store.ts` | JSON/JSONL persistence; append-only structure is self-verifying |
| `T_professional_report.ts` | Markdown/JSON report formatting; presentation layer |
| `T_resource_governor.ts` | Budget orchestration; calls Rust processor validators |
| All atlas packages (code/tlt/math) | Structural memory registries; declarative data |
| TLT modules (transformer, voice, claim guard, summary generator) | Language semantics; advisory output only |
| `repo_intelligence/` | File classification, risk distribution heuristics |
| `lang.ts`, `workspace.ts`, `environment.ts` | Environment detection; file scanning |
| `atlas_bridge.ts`, `atlas_integration.ts` | Cross-atlas routing; memory seeding |

---

## 6. What Migrates to Rust First

Priority-ordered list of kernels that should be hardened in Rust. Each migration preserves the TypeScript interface for callers.

### Kernel 1 — Canonical Receipt Verification (v11.8)

| Aspect | Detail |
|--------|--------|
| **Current state** | `src/receipt.ts` (TypeScript) — canonical serialization + SHA-256 hashing |
| **Rust target** | `reference-verifier/rust/` (extended) — hardened receipt verifier |
| **Why first** | Already cross-language tested; 8 shared conformance vectors; central to trust |
| **Success criteria** | 1. TypeScript and Rust produce identical hashes. 2. `receipt_conformance.json` remains authoritative. 3. Any mismatch fails tests. 4. Rust verifier does not authorize commits. 5. Rust verifier emits verification evidence only. |
| **TypeScript surface** | TypeScript calls Rust verifier via comparison; keeps serialization for report formatting |

### Kernel 2 — Path Safety / Scoped Filesystem Validation (v11.9)

| Aspect | Detail |
|--------|--------|
| **Current state** | `src/path_safety.ts` (TypeScript) — symlink resolution, path traversal prevention |
| **Rust target** | New `reference-verifier/rust/src/path_safety.rs` |
| **Why second** | Security boundary; must be verifiable; already heavily tested (10 security test suites) |
| **Success criteria** | 1. All 10 security test suites pass against Rust kernel. 2. No path traversal bypass possible. 3. Windows path handling preserved. |

### Kernel 3 — Deterministic ID + Processor Record Validation (v12.0)

| Aspect | Detail |
|--------|--------|
| **Current state** | SHA-256 finding IDs in TypeScript (`T_rust_review_queue.ts`), R21 processor records in TypeScript |
| **Rust target** | New `reference-verifier/rust/src/deterministic_id.rs` + processor record validator |
| **Why third** | IDs are trust anchors linking findings to receipts; must be deterministic |
| **Success criteria** | 1. Finding IDs match between TS and Rust. 2. Processor record validation gates budget exceeding. |

### Kernel 4 — Audit Scanner Core Candidate (v12.1)

| Aspect | Detail |
|--------|--------|
| **Current state** | `T_rust_risk_scanner.ts` (regex-based), `T_rust_ast_lite.ts` (brace-counting) |
| **Rust target** | Parser-backed Rust audit scanner using `syn` or similar |
| **Why fourth** | Regex is transitional; real parser gives reliable structural analysis |
| **Success criteria** | 1. Parser-backed scanner matches regex scanner on 6 fixture battery. 2. False-positive rate demonstrably lower. 3. `syntax_checked` evidence level replaces `surface_detected` for structural findings. |

### Kernel 5 — Policy / Admissibility Gate Kernel (v12.2)

| Aspect | Detail |
|--------|--------|
| **Current state** | `src/gates.ts` authorize() (TypeScript) — admissibility check + policy hash binding + memory budget |
| **Rust target** | New `reference-verifier/rust/src/policy_gate.rs` |
| **Why fifth** | Policy enforcement is the commit boundary; must be verifiable |
| **Success criteria** | 1. Admissibility check matches TypeScript exactly. 2. Policy hash binding enforced. 3. Memory budget check enforced. |

---

## 7. What Is Future C++ / GPU Only

These are intentionally deferred and gated.

| Capability | Language | Gate Required |
|------------|----------|---------------|
| GPU-accelerated heuristic code exploration | C++ / CUDA | Must pass Rust deterministic CPU gate |
| Local model inference runtime | C++ | Must pass Rust output validator |
| Native desktop shell | C++ | Orchestration stays in TypeScript; C++ is shell only |
| Low-level OS integration | C++ | Must respect Rust path safety kernel boundaries |

**Critical rule:** GPU or C++ outputs are always **proposed**, never **authoritative**. They must pass a deterministic Rust CPU gate before influencing any authority-bearing state. This is the implementation of:

```
GPU explores.
CPU commits.
```

---

## 8. Cross-Language Conformance Rule

**The shared conformance vectors are the invariant bridge between languages.**

### Current Conformance Bridge

| Asset | Role |
|-------|------|
| `sdks/receipt_conformance.json` | 8 shared test vectors with expected SHA-256 hashes |
| `sdks/compute_hashes.test.ts` | TypeScript conformance test |
| `sdks/rust/tests/conformance.rs` | Rust conformance test |
| `sdks/python/tests/test_conformance.py` | Python conformance test |

### Conformance Rule

```
1. Any kernel migrated to Rust MUST produce identical output to the TypeScript original
   for all shared conformance vectors.

2. The conformance vectors are the canonical truth for cross-language equivalence.

3. If a Rust kernel and TypeScript original disagree on a conformance vector,
   the kernel migration is NOT complete — regardless of which output is "more correct."

4. New conformance vectors may be added to expand coverage, but existing vectors
   must never be modified to accommodate a migration.

5. The conformance test suite runs as part of CI. Any mismatch is a hard failure.
```

---

## 9. Migration Order

```
v11.7 — Language Split Doctrine (this document)
v11.8 — Rust Kernel 1: Canonical Receipt Verifier
v11.9 — Rust Kernel 2: Path Safety / Scoped Filesystem Validation
v12.0 — Rust Kernel 3: Deterministic ID + Processor Record Validation
v12.1 — Rust Kernel 4: Audit Scanner Core Candidate
v12.2 — Rust Kernel 5: Policy / Admissibility Gate Kernel
```

At each step, TypeScript retains its interface. Rust kernels are called by TypeScript, not instead of TypeScript. The CLI, teaching mode, TLT pipeline, reports, atlas registries, and workflow orchestration remain TypeScript throughout.

---

## 10. Non-Claims / Boundaries

This doctrine does NOT claim:

1. **Rust is required for correctness.** The TypeScript implementation is correct for its current scope. Rust migration increases verifiability, not correctness.

2. **TypeScript is deprecated.** TypeScript is the permanent home for orchestration, teaching, TLT, reports, and atlas registries.

3. **Every TypeScript function should become Rust.** Only authority-bearing deterministic kernels migrate. Heuristic, natural language, formatting, and coordination code stays TypeScript.

4. **The system is insecure without Rust.** The security boundary is already enforced in TypeScript with 10 security test suites. Rust hardens, not replaces.

5. **C++/GPU will definitely be added.** They are reserved for future acceleration needs. The system is complete without them.

6. **Lean proofs will run at runtime.** Lean is the formal reference layer. It defines what correctness means. It is not compiled into the runtime.

7. **Python is required for production.** Python is research/testing glue. The system runs without it.

---

## Operating Law

```
A language boundary is an authority boundary.

Fast orchestration may live in TypeScript.
Authority-bearing deterministic checks should migrate toward Rust.
No language choice grants authority by itself.
Only gated, receipted, evidence-labeled outputs may influence committed state.

TypeScript orchestrates.
Rust verifies.
GPU explores.
CPU commits.
CohBit receipts the boundary.
```

---

*Language Split Doctrine. Formal architecture document. Defines the implementation boundary for all future language choices in CohBit-Copilot. Version v11.7.*