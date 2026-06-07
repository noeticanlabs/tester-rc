# Noetican Labs Multi-Language Coding Doctrine & Curriculum
## v0.3 Standards Traceability Matrix

**Status:** Working draft — standards-alignment target only
**Purpose:** Map each curriculum module to the 12 standards domains and their anchors
**Claim:** We are NOT claiming Noetican Labs is certified against these standards.
**Next:** Compress into beginner, intermediate, professional, and high-assurance tracks

---

## Standards Domain Legend

| # | Domain | Standard Anchors |
|---|--------|-----------------|
| D0 | Computing Foundations | ACM/IEEE CS2023 |
| D1 | Software Lifecycle | ISO 12207, NIST SSDF |
| D2 | Secure Coding | OWASP, CERT, CWE |
| D3 | Testing & Verification | ISO 29119, NIST SSDF |
| D4 | Software Quality | ISO 25010 |
| D5 | Cybersecurity Governance | NIST CSF, NIST 800-53 |
| D6 | Information Security Mgmt | ISO 27001 |
| D7 | Supply Chain Integrity | SLSA, OpenSSF, SBOM |
| D8 | Cloud/Government | FedRAMP, NIST 800-171 |
| D9 | AI/Copilot Safety | NIST AI RMF, ISO 42001, OWASP LLM Top 10 |
| D10 | High-Assurance Systems | DO-178C, IEC 61508, MISRA |
| D11 | Noetican Transition Governance | TTC/GTC/GTD, CohBit, CTRL, receipts, Atlas |

---

## Module-to-Standards Traceability

### M0 — Code as State Transition
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D0 | ACM/IEEE CS2023 | Software development fundamentals | Code = proposed state transition, not syntax | initial_state, transition, final_state |
| D1 | ISO 12207 | Software implementation processes | Execution = attempted realization | verification_method, side_effects |
| D11 | CohBit, CTRL | Proposal vs commit governance | Commit = accepted state change; Receipt = evidence | transition_map, receipt_id |

### M1 — Python Safe File Tool
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D2 | OWASP Secure Coding | File integrity | Atomic writes prevent data corruption | checksum_before, checksum_after |
| D3 | ISO 29119 | Functional testing | Verify written content matches intended state | verification_result, rollback_path |
| D4 | ISO 25010 | Reliability, fault tolerance | Handle disk-full, permission-denied, partial-write | error_handler, recovery_path |
| D11 | CohBit receipts | File operation auditability | Every file mutation is a receipted transition | file_receipt_id, operation, path |

### M2 — TypeScript Receipt Validator
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D0 | ACM/IEEE CS2023 | Type systems, static analysis | Compile-time verification of receipt structure | schema_version, type_errors |
| D2 | CWE-20, CWE-502 | Input validation, deserialization | Tampered or malformed receipts must be rejected | validation_result, tampering_detected |
| D3 | ISO 29119 | Test design — valid, invalid, edge cases | Test receipts against schema, hash, and evidence integrity | test_cases_run, test_results |
| D11 | CohBit SDK | Receipt conformance | Hash-linked receipt chains with schema enforcement | receipt_id, parent_receipt_id, chain_valid |

### M3 — Secure Coding and CIA Lab
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D2 | OWASP Top 10, CWE, CERT | Injection, XSS, path traversal, deserialization | Code against known weakness classes with verifiable defenses | cwe_id, exploit_blocked, defense_method |
| D3 | NIST SSDF (PW.8) | Security testing | Demonstrate exploit, verify defense, test functionality | exploit_result, defense_result |
| D5 | NIST CSF (Protect) | Data security, protective technology | Confidentiality, Integrity, Availability as transition constraints | cia_check, protection_status |
| D10 | MISRA (inspiration) | Defensive coding discipline | Input validation at every trust boundary | boundary_count, boundaries_validated |

### M4 — SQL Persistence, Audit Tables, and Rollback
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D1 | NIST SSDF (PW.6) | Secure data persistence | Transactions that all succeed or all fail | transaction_id, commit_status |
| D2 | OWASP, CWE-89 | SQL injection prevention | Parameterized queries, no string concatenation | query_pattern, injection_risk |
| D5 | NIST CSF (Identify, Protect) | Asset management, data security | Audit tables record who changed what, when, why | audit_record_id, actor, mutation, reason |
| D11 | CohBit receipts | Audit trail governance | Database-level receipts with transaction boundaries | persistence_receipt, rollback_receipt |

### M5 — Resource-Aware and Constrained Computing
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D2 | CWE-400, CWE-770 | Resource exhaustion, uncontrolled allocation | Ungoverned resource consumption is a DoS vulnerability | resource_budget, actual_usage, overrun |
| D4 | ISO 25010 | Performance efficiency, capacity | Set budgets, enforce timeouts, degrade gracefully | timeout_ms, degradation_path |
| D11 | CohBit resource receipts | Resource budget governance | Every computation tracked against declared budget | budget_id, compute_ms, memory_bytes |

### M6 — Governed APIs, Tool Calls, and Automation
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D2 | OWASP LLM Top 10 | Excessive agency, insecure output handling | API output is surface_detected until independently verified | response_validation, trust_level |
| D5 | NIST CSF (Protect, Detect) | Access control, anomaly detection | Rate limiting, scope control, error handling | scope_check, rate_limit_status |
| D6 | ISO 27001 (A.9) | Access control | Every API call requires explicit authority and scope | authority_id, scope, auth_result |
| D9 | NIST AI RMF (Map, Measure) | AI risk measurement | Tool calls must be governed, receipted, and bounded | tool_call_id, governance_status |

### M7 — Multi-Language Transition Interoperability
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D0 | ACM/IEEE CS2023 | Programming language paradigms | Schema contracts as language-neutral type bridges | schema_hash, language_pair |
| D3 | ISO 29119 | Integration testing | Round-trip fidelity testing across language boundaries | round_trip_result, fidelity_score |
| D4 | ISO 25010 | Interoperability, compatibility | Schema evolution, serialization format, error propagation | schema_version, compatibility_check |
| D11 | CohBit boundary receipts | Cross-language governance | Boundary receipt per crossing, semantic fidelity verification | boundary_id, source_lang, target_lang |

### M8 — Rust High-Integrity Verifier and Receipt Hashing
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D2 | CERT, CWE | Memory safety, concurrency | Rust ownership model enforces safety at compile time | unsafe_block_count, safety_justification |
| D3 | NIST SSDF (PW.8) | Static analysis, fuzzing | Hash-linked receipts with type-state patterns | receipt_chain_hash, state_proof |
| D10 | MISRA, ISO 26262 | Safe language subset | Unsafe blocks must be minimal, documented, encapsulated | unsafe_audit_result, capsule_safety |
| D11 | CohBit verifier | Cryptographic receipt integrity | SHA-256 receipt hashing, authority at type level | receipt_hash, authority_type |

### M9 — Lean Proof Obligations and CTRL Theorem-Repair
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D3 | ISO 29119 | Formal verification | Proof checked by Lean for all possible inputs | proof_status, assumptions_declared |
| D10 | DO-178C (Level A) | Formal methods, verification independence | CTRL loop governs proof lifecycle alongside code | theorem_id, proof_break_reason, repair_method |
| D11 | CohBit CTRL | Governed formal verification | Proof debt tracked as obligation; every proof receipted | proof_receipt_id, proof_debt_items |

### M10 — Formal-to-Runtime Bridge and Atlas Memory
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D1 | NIST SSDF (PW.4) | Reusable components, build integrity | Extraction reproducibility and deterministic builds | extraction_hash, build_reproducibility |
| D7 | SLSA (L3) | Provenance, artifact integrity | Proof hash → extraction hash → binary hash chain | proof_hash, extraction_hash, binary_hash |
| D10 | DO-178C | Traceability, tool qualification | Every transformation from spec to binary receipted | transformation_receipt_id, tool_version |
| D11 | CohBit Atlas | Memory-linked governance | Atlas memory records link proof to running code | atlas_record_id, memory_link |

### M11 — CI/CD Gates, Release Discipline, and Governed Packages
| Domain | Standard | Requirement Area | Noetican Translation | Receipt Fields |
|--------|----------|-----------------|---------------------|----------------|
| D1 | NIST SSDF (PW.2, PW.4) | Release practices, build environment | Every release passes explicit gates with evidence | gate_results, gate_approval |
| D5 | NIST CSF (Respond, Recover) | Response planning, recovery | Release is a governed transition, not a build artifact | release_id, authorization |
| D7 | SLSA (L3-L4), SBOM | Supply chain provenance, artifact signing | Verifiable provenance chain with SBOM | sbom_hash, provenance_url, signature |
| D11 | CohBit release receipts | Governed deployment | Automation executes; governance authorizes | release_receipt_id, gate_chain |

---

## Coverage Summary

| Domain | Standard Family | M0 | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 |
|--------|----------------|----|----|----|----|----|----|----|----|----|----|----|----|
| D0 | ACM/IEEE CS2023 | ✓ |   | ✓ |   |   |   |   | ✓ |   |   |   |   |
| D1 | ISO 12207, NIST SSDF | ✓ |   |   |   | ✓ |   |   |   |   |   | ✓ | ✓ |
| D2 | OWASP, CERT, CWE |   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |   | ✓ |   |   |   |
| D3 | ISO 29119, NIST SSDF |   | ✓ | ✓ | ✓ |   |   |   | ✓ | ✓ | ✓ |   |   |
| D4 | ISO 25010 |   | ✓ |   |   |   | ✓ |   | ✓ |   |   |   |   |
| D5 | NIST CSF, NIST 800-53 |   |   |   | ✓ | ✓ |   | ✓ |   |   |   |   | ✓ |
| D6 | ISO 27001 |   |   |   |   |   |   | ✓ |   |   |   |   |   |
| D7 | SLSA, OpenSSF, SBOM |   |   |   |   |   |   |   |   |   |   | ✓ | ✓ |
| D8 | FedRAMP, NIST 800-171 | — | — | — | — | — | — | — | — | — | — | — | — |
| D9 | NIST AI RMF, ISO 42001 |   |   |   |   |   |   | ✓ |   |   |   |   |   |
| D10 | DO-178C, IEC 61508, MISRA |   |   |   | ✓ |   |   |   |   | ✓ | ✓ | ✓ |   |
| D11 | CohBit, CTRL, Atlas | ✓ | ✓ | ✓ |   | ✓ | ✓ |   | ✓ | ✓ | ✓ | ✓ | ✓ |

**Key:** ✓ = Directly mapped | — = Not yet mapped | blank = No direct mapping (covered indirectly or deferred)

---

## Maturity Tracking

Each module can be assessed at one of four maturity levels:

| Level | Label | Description |
|-------|-------|-------------|
| L0 | Draft | Module content exists as text; not yet field-tested |
| L1 | Field-Tested | Module has been taught to at least one learner |
| L2 | Evidence-Backed | Learner receipts and quiz results collected and analyzed |
| L3 | Standards-Verified | External reviewer confirms alignment with target standard |

All 12 modules are currently at **L0 (Draft)**. The curriculum explicitly states: "Proof Status: Not proven as a curriculum yet."

---

## Next Steps

1. **Tracks Compression:** Distill the 12 modules into four tracks:
   - **Beginner/Build Track:** M0, M1, M2, M3, M4
   - **Professional Track:** M0-M7, M11
   - **High-Integrity Systems Track:** M0-M11
   - **CohBit-Copilot Track:** M0-M11 (with emphasis on M2, M3, M6, M8-M11)

2. **Field Testing:** Run M0 with a real learner, collect receipts, move to L1

3. **D8 Gap:** Develop government/cloud module content (FedRAMP, NIST 800-171 mapping)

4. **Micro Layer:** Build detailed lesson plans, exercises, rubrics, and receipt templates (explicit next step called out in meso framework)