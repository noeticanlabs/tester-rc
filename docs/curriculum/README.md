# Noetican Labs Multi-Language Coding Doctrine & Curriculum

**Version:** v0.1
**Status:** Draft — not yet field-tested
**Source:** `dictionary/Doctrine curriuclum/`

## Overview

The curriculum teaches software engineering through the lens of **governed state transitions**. Every module treats code as a proposal to change state, execution as attempted realization, commits as accepted state changes, and receipts as evidence-bearing memory.

The curriculum is organized into 12 modules spanning 15 doctrine layers, anchored in industry, academic, and government-grade standards.

## Architecture

```
Macro Layer (14 layers)
  └── Meso Layer (teachable units: ML-[layer].[unit])
       └── Micro Layer (lesson plans, exercises, rubrics — not yet built)
```

## Module Map

| Module | Name | Track | Standards |
|--------|------|-------|-----------|
| M0 | Code as State Transition | All | ACM CS2023, ISO 12207 |
| M1 | Python Safe File Tool | Beginner, Professional | OWASP, ISO 29119, ISO 25010 |
| M2 | TypeScript Receipt Validator | Beginner, Professional, CohBit | ACM CS2023, CWE-20/502, ISO 29119 |
| M3 | Secure Coding and CIA Lab | Beginner, Professional, CohBit | OWASP, CWE, CERT, NIST CSF, MISRA |
| M4 | SQL Persistence, Audit Tables | Beginner, Professional, CohBit | NIST SSDF, OWASP, NIST CSF |
| M5 | Resource-Aware Computing | All | CWE-400/770, ISO 25010 |
| M6 | Governed APIs, Tool Calls | Beginner, Professional, CohBit | OWASP LLM, NIST CSF, ISO 27001, NIST AI RMF |
| M7 | Multi-Language Interoperability | Professional, High-Integrity, CohBit | ACM CS2023, ISO 29119, ISO 25010 |
| M8 | Rust High-Integrity Verifier | High-Integrity, Professional, CohBit | CERT, CWE, NIST SSDF, MISRA |
| M9 | Lean Proof Obligations, CTRL | High-Integrity, CohBit | ISO 29119, DO-178C |
| M10 | Formal-to-Runtime Bridge | High-Integrity, CohBit | NIST SSDF, SLSA, DO-178C |
| M11 | CI/CD Gates, Release Discipline | Professional, High-Integrity, CohBit | NIST SSDF, NIST CSF, SLSA |

## Learning Tracks

- **Beginner / Builder:** M0 → M1 → M2 → M3 → M4
- **Professional:** M0–M7 + M11
- **High-Integrity Systems:** M0–M11
- **CohBit-Copilot:** M0–M11 (emphasis M2, M3, M6, M8–M11)

## Noetican Spine

All modules trace to this foundation:

```
Possibility → Constraint → Verification → Maintenance → Governed Continuation
```

## Codebase Integration

The curriculum is integrated into CohBit-Copilot through:

1. **Teaching Engine** (`src/teaching.ts`): Each module has a `TopicEntry` in `TOPIC_KB` with doctrine, explanation, workflow, evidence boundary, common mistake, refusal rationale, and reflection question
2. **CLI** (`src/cli.ts`): `cohbit-copilot curriculum [list|teach|quiz|trace]` commands
3. **TLT Pipeline** (`trials/v10_6_curriculum_trial.ts`): Full ingestion → graph → summaries → polarity pipeline against the curriculum corpus
4. **Standards Traceability** (`docs/curriculum/standards_traceability_matrix.md`): v0.3 matrix mapping each module to 12 standards domains

## Limitations

- Curriculum is v0.1 draft status — not yet field-tested
- Micro layer (lesson plans, exercises, rubrics, receipt templates) is not yet built
- D8 (FedRAMP/NIST 800-171 Cloud/Government) domain has no direct module mapping
- We do not claim Noetican Labs is certified against listed standards

## See Also

- `docs/curriculum/standards_traceability_matrix.md` — Full v0.3 traceability matrix
- `docs/teaching_mode.md` — Teaching mode design and operating laws
- `docs/teaching_starter_pack.md` — Getting started with teaching mode
- `docs/examples/` — Teaching output examples
- `reports/sample_teaching_session.md` — Sample session output