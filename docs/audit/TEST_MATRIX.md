# CohBit Test Matrix

## 1. Unit Tests
- `rust/src/lib.rs`: `is_admissible`, `validate`, `payload_hash`.
- `rust/src/ufe/solver.rs`: `governed_step` (basic logic).
- `rust/src/ufe/geometry.rs`: `Dijkstra` (short path correctness).

## 2. Adversarial Tests (`rust/tests/adversarial.rs`)
- [x] Unauthorized potential creation (Rejects).
- [x] Exact boundary Coh Law (Accepts).
- [x] State root mismatch (Rejects).
- [x] Tampered receipt hash (Rejects).

## 3. Property Tests (`rust/tests/properties.rs`)
- [x] `accepted_implies_admissible`: Master invariant check.
- [x] `solver_output_is_always_verified`: Verifier-before-optimizer check.
- [x] `path_accounting_telescopes`: Cumulative balance check.

## 4. Substrate Property Tests (`rust/tests/substrate_*.rs`)
- [x] `substrate_safety`: Committed-implies-verified.
- [x] `substrate_persistence`: Safe-halt on deadlock.
- [x] `substrate_geometry`: Directed triangle inequality.

## 5. Policy & Governance Tests (`rust/tests/substrate_policy.rs`)
- [x] `oversized_memory_mass_rejects`: M_mem cap enforcement.
- [x] `memory_mass_path_budget_enforced`: Trace-level M_mem sum check.
- [x] `canonical_bytes_determinism`: Stable serialization check.

## 6. Formal Verification (`lean/CohBit/*.lean`)
- [x] `Spec.lean`: Core predicate formalization.
- [x] `Adversarial.lean`: Lean mirror of boundary conditions.
- [x] `SubstrateSafety.lean`: Formal safety theorems.
