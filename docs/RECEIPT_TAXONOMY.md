# Receipt Taxonomy

CohBit uses multiple receipt-like structures across different layers. This document defines which are security-critical and which are auxiliary.

## Security-Critical Receipts

| Type | Rust Struct | Lean Counterpart | Description |
|------|-------------|-----------------|-------------|
| **CoreReceipt** | `CohBit` / `CohBitInput` | `CohBit.SubstrateAccounting` | The atomic certified displacement — the canonical receipt governing admissibility |
| **LanguageReceipt** | `LanguageReceipt` | Not yet formalized | A language-swarm receipt carrying typed candidate + decision |

## Auxiliary Records

| Type | Rust Struct | Description |
|------|-------------|-------------|
| **TrainingRecord** | `LanguageTrainingRecord` | Training/evaluation record, not a runtime receipt |
| **TelemetryReceipt** | `NsStepReceipt` | Solver step telemetry; not consensus-critical |
| **GmiCommitStatus** | `GmiStatus` | Status returned by GMI node client; local mock currently |

## Ledger Records

| Type | File | Format |
|------|------|--------|
| **LocalReceiptLedger** | `local_receipt_ledger.jsonl` | JSONL — local audit trail |
| **BenchGmiLedger** | `bench_gmi_ledger.jsonl` | JSONL — benchmark telemetry |
| **TelemetryLedger** | `transformer_telemetry_ledger.jsonl` | JSONL — transformer telemetry |

## Relationship

```
Proposal
  → LanguageCandidate (validated by language swarm)
    → LanguageReceipt (signed by GMI)
      → CoreReceipt / CohBit (the smallest sealed unit)
        → AcceptedCohBit (passed validation)
          → ExecutableCohBit (ready for state transition)
```

Only `CohBit` and `AcceptedCohBit` are security-critical primitives. `LanguageReceipt` is the bridge from language-level verification to primitive-level sealing.