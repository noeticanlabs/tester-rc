# CohBit-Copilot Architecture (Current)

> **Note:** This document has been superseded. For the complete system architecture, see:
> - [`docs/full_system_layout_and_flowchart.md`](full_system_layout_and_flowchart.md) — 15-section comprehensive layout with ASCII diagrams
> - [`docs/version_map.md`](version_map.md) — canonical version history and maturity assessment

Package version: **10.9.0** | Audit/layout version: v11.4

---

## Architecture Summary

CohBit-Copilot operates through three major subsystems:

```
┌─────────────────────────────────────────────────────────────┐
│                       CLI (cli.ts)                          │
│                       25+ commands                          │
├─────────────────┬───────────────────┬───────────────────────┤
│  PATH A         │  PATH B           │  PATH C               │
│  Governed Patch │  Integrated Audit │  Teaching Mode        │
│  (gates.ts)     │  (integrated_     │  (teaching.ts)        │
│  7-gate         │   pipeline.ts)    │  12-module curriculum │
│  lifecycle      │  8-phase pipeline │  teach/quiz/polarity  │
└────────┬────────┴────────┬──────────┴───────────┬───────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    SHARED INFRASTRUCTURE │
              │  types.ts  receipt.ts   │
              │  ledger.ts gate_store.ts│
              │  fs.ts  lang.ts  ...    │
              └────────────┬────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌──────────┐    ┌──────────────┐    ┌──────────────────────┐
│  ATLAS   │    │   TOOLING    │    │     RESOURCE         │
│ PACKAGES │    │   PACKAGE    │    │     PACKAGE          │
│          │    │              │    │                      │
│ code-    │    │ T0-T19       │    │ R0-R21               │
│ atlas    │    │ Rust audit   │    │ Compute, memory,     │
│ (16 lyrs)│    │ modules      │    │ time, energy, risk,  │
│ tlt-     │    │ Repo intel   │    │ scheduler, receipt,  │
│ atlas    │    │ Reports      │    │ dashboard, forecast  │
│ (20 lyrs)│    │ Policy gates │    │ (21 layers)          │
│ math-    │    │ Processor    │    │                      │
│ atlas    │    │ runtime      │    │                      │
│ (19 lyrs)│    │              │    │                      │
└────┬─────┘    └──────┬───────┘    └──────────┬───────────┘
     │                 │                       │
     └─────────────────┼───────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │    PERSISTENCE LAYER   │
          │    .cohbit/            │
          │  gate_records/         │
          │  session_ledger.jsonl  │
          │  obligations/          │
          │  atlas/                │
          │  reports/              │
          └────────────────────────┘
```

---

## Execution Paths

### Path A: Governed Patch Pipeline (7-Gate Lifecycle)

```
Propose → Review → Authorize → Apply → Test → Rollback → Receipt
```

The copilot may propose bounded patches but cannot self-approve. Each gate enforces a specific boundary:

| Gate | Boundary |
|------|----------|
| ProposeGate | Copilot may propose; bounded proposals only |
| ReviewGate | Proposal ≠ Authority; human inspection required |
| AuthorizeGate | Mathematical Acceptance ≠ Executable Permission; admissibility law + policy + budgets |
| ApplyGate | Patch Applied ≠ Patch Stable; pre-state snapshot for rollback |
| TestGate | Test Passed ≠ Final Commit |
| RollbackGate | Restores from pre-state snapshot with hash verification |
| ReceiptGate | Deterministic SHA-256 receipt; receipt_hash_is_deterministic |

### Path B: Integrated Audit Pipeline (8-Phase)

```
Scan → Content → Risk → Symbols → Review → Atlas → Obligations → Proposals → Report
```

The pipeline observes, enriches, and reports. It does NOT authorize, apply, verify, or commit source code changes.

### Path C: Teaching Mode

```
teach(topic, audience) → TLT claim guard → TLT voice → TeachingResponse
generateQuiz(topic) → QuizQuestion[]
```

Three audience modes (internal, public, linkedin) with TLT claim boundary hardening.

---

## Key Design Principles

| # | Principle | Enforcement |
|---|-----------|-------------|
| 1 | **Proposal ≠ Authority** | ReviewGate is mandatory |
| 2 | **Mathematical Acceptance ≠ Executable Permission** | AuthorizeGate enforces policy + admissibility + budgets |
| 3 | **Patch Applied ≠ Patch Stable** | RollbackGate + ApplySnapshot with pre-state hashes |
| 4 | **Test Passed ≠ Final Commit** | ReceiptGate is separate |
| 5 | **Defect ≠ Authority** | `d` (tolerated error) and `a` (granted resource) are distinct |
| 6 | **Admissibility Law** | `V(post) + s ≤ V(pre) + d + a` |
| 7 | **Deterministic Receipt** | SHA-256 over canonical pipe-joined serialization with GCD reduction |
| 8 | **Memory Mass Over Canonical Bytes** | `M_mem(b) = |CanonicalBytes(b)|` |
| 9 | **Audit Observes, Does Not Mutate** | Pipeline writes only to .cohbit/ and reports/ |
| 10 | **Voice Cannot Upgrade Graph Status** | TLT claim guard strength ladder |
| 11 | **Evidence Limits Claims** | surface_detected → needs_evidence → receipt_available → ctrl_verified → release_approved |
| 12 | **Append-Only JSONL Ledger** | No database; human-readable |
| 13 | **Self-Contained Rollback** | beforeContent from snapshot; no git dependency |
| 14 | **Type-Safe Coupling** | Only Admissibility + Policy passing displacements reach commitment |

---

## Package Overview

| Package | Layers | Role |
|---------|--------|------|
| `src/` (core runtime) | 26 `.ts` files | Receipt, ledger, gates, proposer, CLI, teaching, pipeline, atlas integration, security, workspace intelligence |
| `packages/tooling/` | 25+ modules | Scanner, router, risk scanner, validator, repair queue, receipt engine, adapters, retrieval guard, benchmark, integrated audit, policy gate, content reader, Rust modules, repo intelligence, professional reports, processor runtime |
| `packages/code-atlas/` | 16 (L0–L13 + store + index) | Code structure, invariants, transitions, risk constraints, projection, verifier, receipt, repair obligation, memory graph, query, governance, canonical patterns |
| `packages/tlt-atlas/` | 20 (L0–L16 + T_ modules + index) | Language surface, phrase parse, semantic unit, intent, meaning invariant, tone register, domain context, bilingual projection, ambiguity risk, verifier, receipt, repair, memory graph, retrieval, governance, learning polarity, claim guard, public/internal boundary, voice, transformer, feed, summary generator |
| `packages/math-atlas/` | 19 (M0–M18 + index) | Artifact, representation, model family, object structure, relation, invariant, assumption, mapping, analogy, evidence, simulation, formalization, risk/misuse, receipt, repair, memory graph, retrieval, governance, operational lessons |
| `packages/resource/` | 21 (R0–R21 + index) | Registry, compute, memory, storage, tokens, time, tool calls, human attention, network, proof search, benchmark, repair, receipt storage, energy, authority, risk, scheduler, throttle, receipt, dashboard, forecast, processor runtime |

---

## Metrics (v10.9)

| Metric | Value |
|--------|-------|
| Core source modules | 26 `.ts` |
| Tooling modules | 25+ `.ts` |
| Total Atlas layers | 55 (16 + 20 + 19) |
| Resource layers | 21 |
| CLI commands | 25+ |
| Test vectors | 16 JSON fixtures |
| SDK languages | 3 (TypeScript, Python, Rust) |
| Security test suites | 10 |
| Test passing rate | 792/797 (99.4%) |
| Gate lifecycle | 7 gates |
| Audit pipeline phases | 8 |

---

*For the complete system layout, dependencies, data flow maps, and subsystem diagrams, see [`docs/full_system_layout_and_flowchart.md`](full_system_layout_and_flowchart.md).*