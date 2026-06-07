# CohBit Security Model

## 1. Overview
CohBit is designed as a high-integrity substrate where every state transition must be verified before commitment. The security model is based on the "Reject-by-Construction" principle: a displacement is only a CohBit if it satisfies a formal admissibility law and a deterministic receipt validity check.

## 2. Threat Model

### T1 — Malicious Proposer
*   **Description**: An attacker submits proposed displacements that violate the Coh Law (e.g., unauthorized potential creation).
*   **Target**: The Admissibility Gate ($V(y) + s \le V(x) + d + a$).
*   **Mitigation**: Mandatory verifier check before state mutation. Result-by-construction enforcement.

### T2 — Receipt Forger
*   **Description**: An attacker attempts to mutate fields (source, target, spend, defect, authority) after a receipt has been signed or hashed.
*   **Target**: The Cryptographic Identity Binding.
*   **Mitigation**: Deterministic payload hashing that binds all load-bearing fields.

### T3 — Serialization / Parser Attacker
*   **Description**: An attacker submits malformed or non-canonical byte sequences to trigger panics, ambiguous parsing, or duplicate key exploits.
*   **Target**: The Receipt Parser and Canonical Encoder.
*   **Mitigation**: Strict canonical encoding (DER/Canonical JSON) and "panic-free" parsing targets in fuzzing.

### T4 — Solver Manipulator
*   **Description**: An attacker provides a mix of valid and invalid proposals, attempting to lure the solver into choosing an invalid but "cheap" transition.
*   **Target**: The Solver Selection Logic.
*   **Mitigation**: "Verify First, Optimize Second" policy. Inadmissible candidates are filtered before cost comparison.

### T5 — Supply-Chain Attacker
*   **Description**: An attacker compromises a library dependency to inject malicious logic into the verifier path.
*   **Target**: Dependencies (`num-rational`, `serde`, `sha2`).
*   **Mitigation**: Dependency auditing (`cargo audit`, `cargo deny`), feature minimization, and `cargo geiger` reviews.

### T6 — Resource Exhaustion (DoS)
*   **Description**: An attacker submits oversized receipts or creates graphs that trigger exponential search times in Dijkstra.
*   **Target**: Memory and CPU limits.
*   **Mitigation**: Bounded field sizes and fixed-depth geometry searches.

### T7 — Policy Bypasser
*   **Description**: A developer or runtime implementer bypasses operational constraints by calling the mathematical verifier directly, ignoring the policy layer.
*   **Target**: The Operational Governance Layer ($M_{\mathrm{mem}}, M_{\mathrm{comp}}$ caps).
*   **Mitigation**: Mandate the use of the **Governance Gate** as the only TCB-sanctioned path to commitment.

## 3. Trust Boundaries
*   **TCB (Trusted Computing Base)**: The Rust `CohBit::validate` function, the `ValuationOracle`, and the cryptographic hash implementation.
*   **Untrusted Inputs**: `CohBitInput` and raw byte sequences representing receipts.

## 4. Security Goals
*   **Integrity**: No invalid displacement can ever be committed to the state log.
*   **Determinism**: The same receipt must always produce the same hash and verifier outcome.
*   **Auditability**: Every committed transition must carry a valid, machine-checkable receipt.
