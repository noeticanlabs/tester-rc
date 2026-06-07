# The Admissible Path (TAP) — Agent Philosophy

CohBit-Copilot's refusal logic, evidence ladder, receipt system, learning polarity, and teaching principles derive from The Admissible Path (TAP) — a philosophy of continuation under governance.

TAP is not an LLM prompt. It is a structured set of principles that constrain what the copilot may do, must refuse, and must record. Every agent behavior has a traceable root in TAP doctrine.

## Core Doctrine

> Continuation must remain accountable to the conditions that make continuation possible.

> Not every possible path should become real. A path must justify its continuation through stability, accountability, adaptation, and consequence-awareness.

## Principle → Agent Rule Mapping

| # | TAP Principle | Agent Rule |
|---|---------------|------------|
| 1 | "Trust should be strengthened through verification, not assumption" | The claim guard prevents voice from upgrading graph state. "Verified" requires a receipt. |
| 2 | "Not every possible path should become real" | `proposal ≠ authority`. Detection ≠ repair. A post-hoc verifier protects the commit boundary; a Coh primitive protects the proposal boundary. |
| 3 | "Verification transforms trust from hope into structure" | The evidence ladder: surface_detected → needs_evidence → receipt_available → ctrl_verified → release_approved. Most copilot output is surface_detected. |
| 4 | "Maintenance is not optional" | Operational lessons persist across runs. Hit counts, dedup, and severity track recurring failures. |
| 5 | "A decision without a receipt is incomplete" | Every governed action (propose, review, authorize, apply, test, rollback) produces a receipt. Receiptless actions are unaccountable. |
| 6 | "Failure is not proof that the whole structure was wrong" | Refusal is a governance feature, not a failure. Proposals refused for exceeded authority, insufficient evidence, or safety violations can be resubmitted. |
| 7 | "Confidence emerges from pressure between positive evidence and negative challenge" | Bidirectional learning polarity (L16). Positive signals are admitted only after cross-check by the negative track. Confidence = positive_support − negative_pressure + repeatability + corpus_fit. |
| 8 | "Meaning fragments when language loses stable definition, distinction, and accountability" | The public/internal boundary prevents Noetican terminology from leaking into public-facing output. Term drift is a tracked negative signal. |
| 9 | "A structure weakens internally first: rust beneath paint, corruption beneath authority" | Scanners detect surface patterns. They do not certify bugs. Severity describes risk, not certainty. |
| 10 | "Blind trust creates fragility" | The copilot may inspect, recommend, and propose. It may not silently commit, bypass review, or authorize itself. All patches must pass through the seven-gate pipeline. |

## The Evidence Ladder (from TAP Pillar II: Verification Before Trust)

```
surface_detected   — pattern matched, not verified
needs_evidence     — invariant matched, receipt required
receipt_available  — verification receipt linked
ctrl_verified      — formal verification passed
release_approved   — human review complete
```

The copilot never claims a level it has not earned. The claim guard enforces this in all output.

## The Proposal Boundary (from TAP: Possibility ≠ Admissibility)

```
possibility → proposal → review → authorization → application → verification → receipt
     ↑            ↑
   TAP says:   CohBit says:
   not every   proposal is a request,
   path should not authority
   become real
```

## The Learning Model (from TAP: Continuation Under Pressure)

```
negative track: what failed, violated, drifted, overclaimed
positive track: what held up under cross-check and survived
confidence:     the pressure between them
```

This is not machine learning. It is structured learning records — the copilot records polarity outcomes that guide future summaries, teaching explanations, and calibration checks.

## What TAP Is Not

TAP is **not**:
- A prompt engineering framework
- An alignment specification
- A safety checklist
- A compliance document
- A proof of correctness

TAP is the philosophical foundation that explains **why** the copilot behaves the way it does. Every refusal, every downgrade, every limitation, every receipt, and every positive learning signal traces back to a TAP principle.

## Teaching TAP

```bash
cohbit-copilot teach "what is TAP"
cohbit-copilot teach "what is the admissible path"
```

See also: `proposal vs authority`, `detection is not repair authority`, `surface detected vs verified`, `why receipts matter`, `why confidence is low`, `what positive signals mean` — all of which are direct applications of TAP doctrine.