# CohBit-Copilot — Learning Doctrine

**Version:** v13.3
**Date:** 2026-06-06
**Status:** Architecture Draft

---

## Core Statement

```
CohBit-Copilot learns only when an observed event is:
  classified → cross-checked → persisted → comparable across runs → bounded by evidence.
```

A teaching response is not learning.
A polarity record is not learning.
A lesson stored is not learning.

Learning is the **confirmed, stable, cross-run admission** that a pattern of behavior has
been observed, verified, and persisted with bounded confidence.

---

## When Learning Is Admissible

A learning claim is admissible only when ALL of the following hold:

| Precondition | Check |
|-------------|-------|
| **Classification** | The event has been classified by a deterministic or heuristic processor |
| **Cross-check** | The event has been compared against a previous observation or canonical pattern |
| **Persistence** | The event has been stored in a receipted, hash-verified memory store |
| **Comparability** | The same event can be observed across at least two runs |
| **Evidence boundary** | The event's evidence level is declared and never upgraded by voice or summary |
| **No overclaim** | The claim does not use stronger language than the evidence level supports |
| **Canon safety** | The claim has passed claim-strength and public/internal boundary checks |
| **Limitations stated** | Known weaknesses and unverified assumptions are explicitly recorded |

---

## When Learning Is NOT Admissible

The following are NOT learning:

| Event | Why It's Not Learning |
|-------|----------------------|
| A single teach response | Not cross-checked across runs |
| A polarity record with confidence < 1.0 | Below evidence threshold |
| A lesson without canon-safety status | Not verified against doctrine |
| An atlas entry without reconciliation | Not compared against previous state |
| A processor fragment without evidence level | Missing evidence classification |
| A finding with "high" confidence that hasn't survived re-audit | Not stable across runs |

---

## Evidence Ladder for Learning Claims

| Evidence Level | Can Claim |
|---------------|-----------|
| `none` | Nothing. No learning claim permitted. |
| `surface_detected` | Pattern observed. May be recorded as a review signal. |
| `corpus_extracted` | Pattern matched against corpus. May be recorded as an observation. |
| `cross_run_stable` | Same pattern observed across ≥ 2 runs. May claim "reproducible observation." |
| `verified` | Pattern confirmed by independent verification (e.g., Rust kernel, Lean proof). May claim "verified pattern." |

Voice (summaries, teaching responses) may describe evidence but may NEVER upgrade it.

---

## Learning Receipt

Every admitted learning event must carry a learning receipt:

```
{
  eventId: string,
  classifiedBy: ProcessorKind,
  classificationTimestamp: string,
  crossCheckedAgainst: string | null,
  previousRunAt: string | null,
  evidenceLevel: EvidenceLevel,
  confidence: number,
  canonSafety: 'passed' | 'failed' | 'not_checked',
  limitations: string[],
  admissionStatus: 'admitted' | 'refused' | 'pending',
  refusalReason: string | null,
  storedAt: string,
}
```

---

## Learning Governance

The `src/learning_governance.ts` module enforces these rules programmatically:

- `isLearningAdmissible(event)` → checks all 8 preconditions
- `recordLearningEvent(event)` → gates admission, emits receipt, stores to memory
- `listAdmittedLearning()` → returns only admitted events with cross-run stability
- `refuseAdmission(reason)` → records refusal with specific precondition violation

---

## What CohBit-Copilot Refuses to Claim

The system will NEVER claim:

- It "trained itself" or "learned autonomously"
- It "proved" a finding is a defect
- It "verified" a pattern without independent evidence
- It "closed" an obligation via learning alone
- A single observation constitutes learning
- Voice-upgraded evidence qualifies as learning

---

## Relationship to Other Memory Systems

| Memory System | Learning Relationship |
|--------------|---------------------|
| Obligations | Learning may inform obligation priority, but never closes them |
| Atlas Store | Learning events are stored as atlas entries with `claimStatus: 'receipted'` |
| Canonical Patterns | Learning is confirmed when a pattern appears in ≥ 2 runs |
| Polarity Records | Learning requires positive polarity with confidence ≥ 1.0 |
| Teaching Receipts | Teaching receipt ≠ learning receipt. Teaching is observation, not admission. |
| Processor Fragments | Learning requires at least one deterministic processor in the evidence chain |

---

## Future Hardening

- Add cross-run stability auto-detection that promotes patterns when they survive re-audit
- Add learning canary that warns when previously-stable patterns disappear
- Add learning dashboard that shows admitted vs. pending vs. refused learning events
- Integrate with Rust trust kernels to upgrade evidence from `surface_detected` to `verified`

---

*CohBit-Copilot v13.3 Learning Doctrine. Learning is admitted, not declared. Evidence governs, not voice.*