# CohBit Known Limitations

The following limitations are explicitly documented to guide reviewers and avoid misinterpretation of the substrate's current capabilities.

## Prototype Boundaries
- **Audit-Ready, Not Production-Ready**: This is a high-integrity substrate prototype. It requires independent review and performance stress-testing before production use.
- **Mocked Signatures**: The `PlaceholderSignature` is currently a byte-array stub. In a production environment, this MUST be replaced by a robust cryptographic signature (e.g., Ed25519) and PKI.
- **Arithmetic Sensitivity**: While using `Rational64`, extreme values could still trigger intermediate overflows. Production implementations should use arbitrary-precision arithmetic (`BigInt`) or hardened fixed-point logic.
- **Side-Channel Resistance**: No explicit claims are made regarding resistance to timing attacks or power analysis in the verifier code.
- **Lean-to-Rust Bridge**: Parity between Lean and Rust is enforced via shared test vectors and manual spec-alignment, not via automated formal extraction (e.g., Lean-to-C).
- **Network Scope**: Network-level adversaries (BGP hijacking, eclipse attacks) are out of scope unless the substrate is integrated with a specific P2P protocol.
- **Policy Extensibility**: The current Policy layer is optimized for dual-mass governance (memory and computation). Additional operational parameters like Time-to-Live (TTL), jurisdictional affinity, or real-time verification latency are planned but not yet implemented.
