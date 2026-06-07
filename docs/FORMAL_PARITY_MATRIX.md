# Formal Parity Matrix

Maps Lean theorems to Rust implementations, test vectors, and expected verification outcomes.

## Coh Admissibility Law

| Lean Theorem | Rust Function | Test Vector | Expected |
|-------------|---------------|-------------|----------|
| Coh law inequality | `CohBit::validate()` | `test_vectors/valid_identity.json` | Accept |
| Coh law inequality | `CohBit::validate()` | `test_vectors/valid_boundary_exact_equality.json` | Accept |
| Coh law inequality | `CohBit::validate()` | `test_vectors/reject_bad_margin.json` | Reject |
| Coh law inequality | `CohBit::validate()` | `test_vectors/reject_negative_spend.json` | Reject (NegativeSpend) |
| Coh law inequality | `CohBit::validate()` | `test_vectors/reject_authority_cap_exceeded.json` | Reject |
| Coh law inequality | `CohBit::validate()` | `test_vectors/reject_state_root_mismatch.json` | Reject |
| Coh law inequality | `CohBit::validate()` | `test_vectors/reject_chain_digest_mismatch.json` | Reject |

## Nonnegative Accounting (v0.4.0)

| Lean Theorem | Rust Function | Validation |
|-------------|---------------|------------|
| Spend >= 0 | `CohBit::validate()` | `NegativeSpend` error variant |
| Defect >= 0 | `CohBit::validate()` | `NegativeDefect` error variant |
| Authority >= 0 | `CohBit::validate()` | `NegativeAuthority` error variant |
| Valuation pre >= 0 | `CohBit::validate()` | `NegativeValuationPre` error variant |
| Valuation post >= 0 | `CohBit::validate()` | `NegativeValuationPost` error variant |

## GMI Hash Integrity

| Lean Theorem | Rust Function | Status |
|-------------|---------------|--------|
| Hash parity | `GmiNodeClient::submit_receipt()` | `hash_verified: true` |
| Signature verification | Not yet implemented | `signature_verified: false` |

## Pending Parity Items

| Category | Lean | Rust | Gap |
|----------|------|------|-----|
| Signature verification | Not formalized | Not implemented | Both pending |
| Receipt canonical framing | Not formalized | Uses plain concatenation | Hash ambiguity risk |
| Chain replay protection | Not formalized | Not enforced | Security gap |
| Float-free consensus | Formalized (Rational64) | Implemented (Rational64) | Parity achieved |

## L10 — Governed Learning

| Category | Lean | Rust | Gap |
|----------|------|------|-----|
| Bounded adaptation threshold | Not formalized | `DualModelRuntime` — bounded-manifold check aspirational | Learning rate bound not enforced |
| Learning update gate chain | Not formalized | `EvolutionaryTrainer` — no formal gate chain | Learning commits bypass admissibility check |
| Learning rollback | Not formalized | Not implemented | No rollback mechanism |
| Learning receipt integration | Not formalized | Not implemented | Learning updates produce no receipts |
| GRU training | Not formalized | `cohtwin_gru.rs`, `cohtwin_training.rs` | GRU has no commit authority (by design) ✅ |

## L11 — Audit & Correction

| Category | Lean | Rust | Gap |
|----------|------|------|-----|
| Audit trail | Not formalized | Audit trail (partial) | No formal pattern detection |
| Audit debt tracking | Not formalized | Not implemented | No `Debt_A(t)` metric |
| Correction routing | Not formalized | `CorrectionPath` aspirational | No `Finding → CorrRoute → Layer` flow |
| Defect escalation | Not formalized | Not implemented | No `DefectScore` threshold escalation |
| Pattern detection | Not formalized | Not implemented | No recurring weakness detection |

## L12 — Canon / Semantic Stability

| Category | Lean | Rust | Gap |
|----------|------|------|-----|
| Canon candidate admission | Not formalized | Not implemented | No `CanonAdmit(k̂)` gate |
| Master Lexicon | Not formalized | Not implemented | No term definition registry |
| Master Notation Register | Not formalized | Not implemented | No symbol domain/codomain registry |
| Claim type registry | Not formalized | Not implemented | No `Type(q)` assignment in code |
| Version/deprecation enforcement | Not formalized | Manual versioning only | No automated version gates |
| Public-claim register | Not formalized | Not implemented | No evidence-mapped public claims |
| Periodic canon audit | Not formalized | Not implemented | No `Audit_K(K_t)` workflow |
| Canon drift detection | Not formalized | Not implemented | No `K_pressure(t)` metric |
