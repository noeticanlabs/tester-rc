# CohBit-Copilot — Reviewer Guide

**Purpose:** Give a new reviewer everything they need to understand, run, and evaluate CohBit-Copilot in under 30 minutes.  
**Package version:** 10.9.0  
**Generated:** 2026-06-06

---

## 1. What Is This?

CohBit-Copilot is a local offline deterministic teaching copilot for governed code changes. It runs entirely on your machine — no network calls, no LLM endpoints, no telemetry.

It has three execution paths:

| Path | Source | What it does |
|------|--------|-------------|
| **Path A: Governed Patch** | `src/gates.ts` | 7-gate lifecycle for bounded code changes: Propose → Review → Authorize → Apply → Test → Rollback → Receipt |
| **Path B: Integrated Audit** | `src/integrated_pipeline.ts` | 8-phase source code audit: Scan → Content → Risk → Symbols → Review → Atlas → Obligations → Proposals → Report |
| **Path C: Teaching Mode** | `src/teaching.ts` | 12-module curriculum: teach, quiz, polarity, curriculum, lessons |

All three paths are backed by:
- Deterministic SHA-256 receipts (`src/receipt.ts`)
- Append-only session ledger (`src/ledger.ts`)
- Atlas memory system (3 packages, 55 layers)
- Resource governance budgets (`packages/tooling/src/T_resource_governor.ts`)
- Gate record persistence (`src/gate_store.ts`)

---

## 2. Quick Start (60 seconds)

```bash
npm install
npm run build
npm run test:fast
```

Expected: ~400 tests pass in ~15 seconds.

To run the full suite:

```bash
npm run test:all
```

Expected: 792/797 tests passing (~99.4%). 5 failures are known-correct (path_safety rejecting temp dirs outside workspace).

---

## 3. Verify Integrity (5 minutes)

### 3.1 Run the Quick Test Suite

```bash
npm run test:fast
```

### 3.2 Run the Security Suite

```bash
npx vitest run tests/security_path.test.ts tests/security_atomic_write.test.ts tests/security_symlink.test.ts
```

### 3.3 Run the Conformance Suite (Cross-Language Receipts)

These verify that TypeScript, Python, and Rust produce identical SHA-256 receipt hashes from shared test vectors.

```bash
npx vitest run tests/conformance.test.ts tests/hardening.test.ts
```

### 3.4 Run Core Pipeline Tests

```bash
npx vitest run tests/proposer.test.ts tests/ledger.test.ts tests/gate_store.test.ts
```

---

## 4. Key Design Principles

| # | Principle | Where enforced |
|---|-----------|---------------|
| 1 | **Proposal ≠ Authority** | ReviewGate (`gates.ts` line 113) — copilot cannot self-approve |
| 2 | **Mathematical Acceptance ≠ Executable Permission** | AuthorizeGate (`gates.ts` line 153) — admissibility law + policy + budgets |
| 3 | **Patch Applied ≠ Patch Stable** | RollbackGate (`gates.ts` line 336) — pre-state snapshot with hash verification |
| 4 | **Test Passed ≠ Final Commit** | ReceiptGate (`gates.ts` line 359) — only `TESTS_PASSED` can produce receipt |
| 5 | **Admissibility Law** | `isAdmissible()` in `types.ts` — `V(post) + s ≤ V(pre) + d + a` |
| 6 | **Receipt Must Be Deterministic** | `hashReceipt()` in `receipt.ts` — SHA-256 over canonical pipe-joined serialization |
| 7 | **Audit Observes, Does Not Mutate** | `integrated_pipeline.ts` — writes only to `.cohbit/` and `reports/` |
| 8 | **Voice Cannot Upgrade Graph Status** | `T_claim_guard.ts` — 5-level strength ladder |

---

## 5. Key Files to Read (in order)

| # | File | Why |
|---|------|-----|
| 1 | `spec/SPEC.md` | Mathematical contract: admissibility law, safety wedge, receipt spec |
| 2 | `src/types.ts` | All shared types, `isAdmissible()`, Rational64 arithmetic |
| 3 | `src/gates.ts` | 7-gate pipeline — the governed heart of Path A |
| 4 | `src/integrated_pipeline.ts` | 8-phase audit pipeline — the heart of Path B |
| 5 | `src/receipt.ts` | Deterministic SHA-256 hashing, canonical serialization |
| 6 | `docs/full_system_layout_and_flowchart.md` | Complete system architecture with ASCII diagrams |
| 7 | `docs/version_map.md` | Canonical version history and maturity assessment |
| 8 | `docs/known_gaps.md` | Known limitations and their status |
| 9 | `docs/claim_table.md` | Status of every architectural claim |

---

## 6. Important Boundaries to Respect

### What CohBit-Copilot CAN do

- Propose bounded patches (no self-authorization)
- Scan source code for risk patterns (regex + AST-lite)
- Build evidence-rich findings with context
- Manage obligations (open/under_review/closed lifecycle)
- Generate professional audit reports
- Teach governed code discipline (11 topics)
- Persist session history (append-only JSONL)

### What CohBit-Copilot REFUSES to do

- Authorize its own proposals (ReviewGate requires human)
- Certify understanding or promote evidence levels
- Claim findings are verified defects (all findings are `surface_detected`)
- Convert teaching output into canon
- Mutate source code during audit (audit is observation-only)

---

## 7. Project Structure

```
src/                          Core runtime (26 .ts files)
packages/tooling/src/         Audit engine, scanner, router (25+ modules)
packages/code-atlas/src/      Code structure atlas (L0-L13, 16 layers)
packages/tlt-atlas/src/       Language ↔ graph atlas (L0-L16, 20 layers)
packages/math-atlas/src/      Math/formal atlas (M0-M18, 19 layers)
packages/resource/src/        Resource governance (R0-R21, 21 layers)
tests/                        29 test files
trials/                       34 trial runners
reports/                      Generated audit reports
schemas/                      JSON schemas for receipts, GMI status, language receipts
spec/SPEC.md                  Formal mathematical contract
test_vectors/                 16 JSON fixtures (8 conformance + 8 hardening)
reference-verifier/           Rust + Lean 4 reference implementations
sdks/                         Cross-language SDKs (TypeScript, Python, Rust)
```

---

## 8. Test Suite Map

| Command | Coverage | Approx. Tests |
|---------|----------|---------------|
| `npm run test:fast` | Core gate pipeline, English parser, receipts, workspace | ~400 |
| `npm run test:integration` | Environment, planner | 62 |
| `npm run test:trials` | Toolchain trials (Rust, npm, Go) | 12 |
| `npm run test:all` | Full suite | 792/797 (99.4%) |

---

## 9. Verifying Claims

For each claim in `docs/claim_table.md`:

| Claim Status | How to Verify |
|-------------|--------------|
| `runtime-tested` | Run the referenced test file |
| `architecture-claim` | Read the source file referenced |
| `scaffolded` | Check that the file exists with tests but no operational wiring |
| `future-route` | Acknowledged as not yet implemented |
| `known-gap` | Documented limitation |

---

## 10. What to Look For as a Reviewer

### Strengths

- **Deterministic receipts:** Every governed operation produces a SHA-256 receipt. Cross-language conformance verified.
- **Governed by design:** Proposals cannot bypass review. Audit cannot mutate code. Voice cannot upgrade evidence.
- **Memory system:** Atlas packages (55 layers) provide structured memory with canonical patterns, obligation lifecycle, and operational lessons.
- **Self-documenting:** Version map, full layout, known gaps, claim table, and this guide all exist.
- **Honest about gaps:** `docs/known_gaps.md` explicitly catalogs what is scaffolded vs. wired vs. future-route.

### Areas for Review Attention

- **Test coverage:** Teaching mode, CLI, and integrated pipeline lack isolated unit tests (acknowledged in known_gaps.md)
- **ReviewGate attestation:** ReviewGate is function-call only, not cryptographically signed (acknowledged)
- **Resource wiring completeness:** Only R1/R5/R18/R19 fully wired; rest scaffolded (acknowledged)
- **Audit is Rust-only:** Cross-language audit not yet built (acknowledged)

---

*Reviewer Guide. Prepared for external evaluation of CohBit-Copilot v10.9.0.*