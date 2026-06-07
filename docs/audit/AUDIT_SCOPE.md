# CohBit Audit Scope

## In Scope
*   **Verification Predicate**: `CohBit::validate` and `is_admissible`.
*   **Accounting Logic**: Checked arithmetic for potential, spend, defect, and authority.
*   **Receipt System**: Canonical serialization (`serde_json` with sorted keys or binary equivalent) and hashing (`sha2`).
*   **Solver Loop**: `CertifiedSolver::governed_step` selection logic.
*   **Geometry Layer**: `CohGeometry` Dijkstra implementation and path cost logic.
*   **Equivalence Layer**: The shared JSON test vectors and the parity between Rust and Lean predicates.

## Out of Scope
*   Production network stack or transport protocols.
*   Physical disk encryption or OS-level security.
*   Advanced cryptographic proof systems (Zero-Knowledge) beyond the provided proof-bearing stubs.
*   Side-channel resistance (unless specific timing attacks are identified in the verifier).

---

# Trusted Computing Base (TCB)

The following components must be trusted for the security of the CohBit substrate:

1.  **Rust Compiler**: Version `1.70+` (stable).
2.  **Core Libraries**: `num-rational`, `serde`, `sha2`.
3.  **Valuation Oracle**: Any implementation of the `ValuationOracle` trait used in the verifier.
4.  **Verification Logic**: The implementation of the Admissibility Law in `rust/src/lib.rs`.
5.  **Canonical Encoding**: The specific byte-layout logic in `payload_hash()`.
6.  **Governance Gate**: The implementation of `GovernanceGate` in `rust/src/ufe/policy.rs` that couples acceptance with operational permission.
