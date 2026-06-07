# CohBit-Copilot v13.5 — Curriculum Reobservation + Drift Check

**Receipt ID:** `RR_4cb10b2494d8`
**Generated:** 2026-06-07T13:26:03.119Z
**Version:** 13.5.0
**Prior Report:** `CR_82a1eb06c11f` (2026-06-07T01:17:54.506Z)

---

## Safe Claim

> CohBit-Copilot v13.5 re-ingests the external curriculum corpus, compares
> results against the v13.4 first-observation baseline, promotes hash-stable
> files to `reobserved` status, and separately reports content drift (changed
> hashes), missing files, new files, and cross-check finding deltas.
> Reobserved status confirms cross-run stability of the observation — it
> does not verify correctness, upgrade evidence, modify canon, or update
> the Teaching KB. All evidence remains capped at `corpus_extracted`.

---

## Summary

### Ingestion

| Metric | Current | Prior (v13.4) |
|--------|---------|---------------|
| Total files ingested | 2761 | CR_82a1eb06c11f |

### File Stability Delta

| Status | Count |
|--------|-------|
| Stable (hash-identical) | 2645 |
| Changed (hash differs)  | 0 |
| New (not in prior)      | 116 |
| Missing (not in current)| 0 |

### Cross-Check Findings

| Result | Current Count |
|--------|---------------|
| match | 0 |
| close_analogue | 3 |
| stale_mapping | 47 |
| gap | 0 |
| conflict | 4 |

### Cross-Check Finding Deltas

| Delta | Count |
|-------|-------|
| unchanged | 42 |
| appeared | 12 |
| disappeared | 1 |
| changed_type | 0 |

### Learning Admissions

| Status | Count |
|--------|-------|
| first_observation | 112 |
| reobserved | 2645 |
| stable_candidate | 0 |
| admitted_learning_record | 0 |
| refused | 4 |

---

## New Files

**Count:** 116

- First principle learning\# Module 0 — Code as State Transition.txt
- First principle learning\# Module 1 — Python Safe File Tool.txt
- First principle learning\# Module 10 — Formal-to-Runtime Bri.txt
- First principle learning\# Module 11 — CICD Gates, Release D.txt
- First principle learning\# Module 2 — TypeScript Receipt Val.txt
- First principle learning\# Module 3 — Secure Coding.txt
- First principle learning\# Module 4 — SQL Persistence, Audit.txt
- First principle learning\# Module 5 — Resource-Aware and Con.txt
- First principle learning\# Module 6 — Governed APIs, Tool Ca.txt
- First principle learning\# Module 7 — Multi-Language Transit.txt
- First principle learning\# Module 8 — Rust High-Integrity Ve.txt
- First principle learning\# Module 9 — Lean Proof Obligations.txt
- First principle learning\# Noetican Labs™ Multi-Language Cod.txt
- First principle learning\# Noetican Labs™ Multi-Language Code mico.txt
- First principle learning\benchmark_spec.json
- First principle learning\Noetican Labs™ Multi-Language Code meso.txt
- First principle learning\principle_cards.json
- First principle learning\README.md
- First principle learning\rust_schema.rs.txt
- First principle learning\test_unseen_variations.jsonl
- First principle learning\train_principles.jsonl
- First principle learning\validation_unseen.jsonl
- First principle learning\Yes. For industry + academic + gove.txt
- language\Bilingual\bilingual_multilingual_corpus.machine_readable.json
- language\Bilingual\bilingual_multilingual_corpus.records.jsonl
- language\Bilingual\bilingual_multilingual_corpus.review.json
- language\Bilingual\bilingual_multilingual_corpus.standard.txt
- language\Bilingual\manifest_checksums.json
- language\Bilingual\SRC-001_HandBookCompleteLight.corpus.txt
- language\Bilingual\SRC-002_L-G-0000668794-0002327269.corpus.txt
*... and 86 more*

---

## Finding Deltas (Non-Unchanged)

- **N/A (internal only)**: gap → none (disappeared)
- **First principle learning\# Module 0 — Code as State Transition.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 1 — Python Safe File Tool.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 10 — Formal-to-Runtime Bri.txt**: none → conflict (appeared)
- **First principle learning\# Module 11 — CICD Gates, Release D.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 2 — TypeScript Receipt Val.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 3 — Secure Coding.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 4 — SQL Persistence, Audit.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 5 — Resource-Aware and Con.txt**: none → conflict (appeared)
- **First principle learning\# Module 6 — Governed APIs, Tool Ca.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 7 — Multi-Language Transit.txt**: none → conflict (appeared)
- **First principle learning\# Module 8 — Rust High-Integrity Ve.txt**: none → stale_mapping (appeared)
- **First principle learning\# Module 9 — Lean Proof Obligations.txt**: none → conflict (appeared)

---

## Admission Detail

### Reobserved (2645)

These files were hash-identical across v13.4 and v13.5 runs. Status promoted from `first_observation` to `reobserved`.

**Reobserved does NOT mean verified.** It only confirms cross-run stability of the observation. Evidence remains capped at `corpus_extracted`.

- `LR_b823eef34748ec3e` — Mathematics\mathematics_corpus_machine_readable.json
- `LR_8811b7c93c49cd38` — Mathematics\mathematics_corpus_records.jsonl
- `LR_7688895b04b19834` — Mathematics\mathematics_corpus_standard.txt
- `LR_4ec7c36c2cbcb05c` — Mathematics\mathematics_review_report.json
- `LR_f1babcb1d35067bc` — Mathematics\mathematics_topic_index.json
- `LR_2297280d495af21b` — Mathematics\SHA256SUMS.json
- `LR_713edb6a228b9870` — Mathematics\SHA256SUMS.txt
- `LR_7f2077c6dad78f91` — Mathematics\sources\SRC-00000_Clay_solution_q1.corpus.txt
- `LR_1f5d85330fa3d048` — Mathematics\sources\SRC-00001_MPPc.corpus.txt
- `LR_e4046d1a81ff02c6` — Mathematics\sources\SRC-00002_Mirror_Symmetry.corpus.txt
  *... and 2635 more*

### First Observation (112)

These files could not be confirmed as stable (drifted, new, or hash mismatch).

- `LR_93266010f30ab013` — First principle learning\# Module 0 — Code as State Transition.txt
- `LR_06637466bf5a1a25` — First principle learning\# Module 1 — Python Safe File Tool.txt
- `LR_768895974cdc20f9` — First principle learning\# Module 11 — CICD Gates, Release D.txt
- `LR_c25727469e822d05` — First principle learning\# Module 2 — TypeScript Receipt Val.txt
- `LR_5e1c7fc2f244de69` — First principle learning\# Module 3 — Secure Coding.txt
- `LR_328a10999cefc443` — First principle learning\# Module 4 — SQL Persistence, Audit.txt
- `LR_f752d15b6936197a` — First principle learning\# Module 6 — Governed APIs, Tool Ca.txt
- `LR_84fb39d1245680db` — First principle learning\# Module 8 — Rust High-Integrity Ve.txt
- `LR_dc967583fbc778ca` — First principle learning\# Noetican Labs™ Multi-Language Cod.txt
- `LR_9a9b5c858fca9495` — First principle learning\# Noetican Labs™ Multi-Language Code mico.txt
  *... and 102 more*

### Refused (4)

- `LR_6775f7b8d6ac7261` — Conflict detected: external corpus differs materially from internal state. Conflicts: CC_M10_45. Becomes a review obligation, not an automatic update.
- `LR_7f67cb153ec00025` — Conflict detected: external corpus differs materially from internal state. Conflicts: CC_M5_50. Becomes a review obligation, not an automatic update.
- `LR_638a4f2e16d46317` — Conflict detected: external corpus differs materially from internal state. Conflicts: CC_M7_52. Becomes a review obligation, not an automatic update.
- `LR_75ca46f558bbf916` — Conflict detected: external corpus differs materially from internal state. Conflicts: CC_M9_54. Becomes a review obligation, not an automatic update.

---

## Attestation

CohBit-Copilot v13.5 re-ingests the external curriculum corpus, compares results against the v13.4 first-observation baseline, promotes hash-stable files to reobserved status, and separately reports content drift (changed hashes), missing files, new files, and cross-check finding deltas. Reobserved status confirms cross-run stability of the observation — it does not verify correctness, upgrade evidence, modify canon, or update the Teaching KB. All evidence remains capped at corpus_extracted.

---

*Generated by CohBit-Copilot v13.5 Curriculum Reobservation + Drift Check Pipeline*
*Receipt ID: RR_4cb10b2494d8*
*Prior Report: CR_82a1eb06c11f*