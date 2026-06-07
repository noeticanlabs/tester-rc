# CohBit Security Checklist

The following checklist must be satisfied before a release is marked as "Audit-Hardened".

## 1. Core Admissibility
- [ ] No invalid displacement can commit to state.
- [ ] Rejected proposals cause zero side-effects on state.
- [ ] Defect and Authority are separately enforced (d != a).
- [ ] Admissibility law uses **checked arithmetic**, rejecting on overflow.

## 2. Receipt Integrity
- [ ] Receipt serialization is strictly canonical.
- [ ] Receipt hash binds all fields: source, target, spend, defect, authority, proof, policy, and version.
- [ ] Malformed or mutated receipts are rejected by the parser or verifier.
- [ ] Unknown version fields cause rejection.
- [ ] Duplicate keys in serialized data cause rejection.

## 3. Solver & Geometry
- [ ] Solver selects only from the set of verified candidates.
- [ ] Empty future set correctly returns a Safe Halt.
- [ ] Geometry distance treats unreachable states as infinity (None).
- [ ] Dijkstra path cost correctly aggregates spend and defect.

## 4. Systems & Supply Chain
- [ ] Dependency audit passes (`cargo audit`).
- [ ] Dependency license and maintenance audit passes (`cargo deny`).
- [ ] Unsafe Rust usage is forbidden or explicitly audited (`cargo geiger`).
- [ ] CI runs adversarial and property test suites on every commit.

## 5. Fuzzing & Stress
- [ ] Parser fuzzed for 24h with zero panics.
- [ ] Verifier fuzzed for 24h with zero false-positives.
- [ ] Fuzz corpus includes valid, invalid, and mutated artifacts.

## 6. Documentation
- [ ] Threat model is updated.
- [ ] TCB is explicitly listed.
- [ ] Audit scope is defined.
