# CohBit Fuzzing Plan

## Targets
1. **`receipt_parse`**: Arbitrary byte fuzzing of the canonical serialization/parsing logic.
2. **`cohbit_verify`**: Structured fuzzing of the `CohBit` admissibility and structural validation gates.
3. **`solver_step`**: Structured fuzzing of the `CertifiedSolver` selecting only from verified candidates.

## Campaigns
- **Smoke Fuzz**: 30 seconds per target. Run in CI on every commit.
- **Audit Fuzz**: 24 hours per target. Run before major releases or external audits.
- **Adversarial Campaign**: 1 week continuous on a dedicated instance.

## Invariants to Protect
- False-positive avoidance: No malformed input should ever produce an `Accept` result.
- Panic freedom: No input should cause the verifier to crash (DoS resistance).
- Determinism: Re-parsing the same bytes must produce the same result.
