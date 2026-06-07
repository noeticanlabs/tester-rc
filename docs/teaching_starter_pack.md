# Teaching Starter Pack — CohBit-Copilot v10.5

A guided walkthrough for learning disciplined code judgment through CohBit-Copilot's Teaching Mode and governed workflow. No prior knowledge of the framework required.

## Prerequisites

```bash
npm install
npm run build
```

All commands below use `npx tsx src/cli.ts`. If you have a global install, substitute `cohbit-copilot`.

## Part 1: Learn the Discipline (Teach)

Run these five lessons to understand the core governance concepts behind the tool:

### 1. Proposal vs Authority

```bash
npx tsx src/cli.ts teach "proposal vs authority"
```

**What you learn:** The copilot can detect patterns and suggest changes. It cannot apply them without human review. Detection is not permission.

**Key boundary:** A proposal is formed from `surface_detected` evidence. It becomes authorized only after human review.

### 2. Detection Is Not Repair Authority

```bash
npx tsx src/cli.ts teach "detection is not repair authority"
```

**What you learn:** The scanner finds patterns, not bugs. Severity describes risk, not certainty. A finding must survive triage, obligation, and review before becoming actionable.

**Key boundary:** The copilot classifies findings but does not upgrade their status. Only human review and testing can move a finding toward verified.

### 3. Surface Detected vs Verified

```bash
npx tsx src/cli.ts teach "surface detected vs verified"
```

**What you learn:** Evidence exists on a ladder: `surface_detected` → `needs_evidence` → `receipt_available` → `ctrl_verified` → `release_approved`. Most copilot output is `surface_detected`.

**Key boundary:** The claim guard prevents voice from upgrading graph state. "Verified" is used only when a verification receipt exists.

### 4. Obligation vs Defect

```bash
npx tsx src/cli.ts teach "obligation vs defect"
```

**What you learn:** An obligation is a recognized responsibility to investigate — not a confirmed defect. Obligations are managed, not auto-executed.

**Key boundary:** The copilot creates obligations but does not close them. Closure requires human review.

### 5. Why Summaries Cannot Upgrade Evidence

```bash
npx tsx src/cli.ts teach "why summaries cannot upgrade evidence"
```

**What you learn:** Voice may explain graph state. Voice may not upgrade graph state. A summary describes what the graph contains; it cannot add certainty.

---

## Part 2: Audit Real Code

Run the integrated audit against a fixture that contains real governance risks:

```bash
npx tsx src/cli.ts audit sandbox/fixtures/rust-risk-fixture
```

**What happens:** The pipeline scans the Rust fixture, extracts symbols, runs risk scanners, matches invariants, builds a TLT graph, generates findings, creates obligations, and writes a report.

### Check the dashboard

```bash
npx tsx src/cli.ts dashboard
```

### List obligations

```bash
npx tsx src/cli.ts obligations
```

**What you learn:** Findings appear as review signals, not verified defects. Each obligation has a status, priority, and aging. The dashboard shows what is open, stale, deferred, and resolved.

---

## Part 3: Understand Confidence (Polarity)

Now that you've seen what governance looks like in action, learn why the system assigns different confidence levels to different material.

### Why Confidence Is Low

```bash
npx tsx src/cli.ts teach "why confidence is low"
```

**What you learn:** Confidence = positive_support − negative_pressure + repeatability + corpus_fit. Low confidence means negative pressure (violations, proof debt, overclaims) outweighs positive signals. The TAP corpus has low confidence because it is governance-dense — this is correct, not an error.

### Why a Corpus Passes Clean

```bash
npx tsx src/cli.ts teach "why a corpus passes clean"
```

**What you learn:** The English Dictionary corpus (14.8MB CSV) produced 2 definition nodes, 0 warnings, 0 violations. This is not "nothing happened" — it proves the system does not hallucinate governance findings from irrelevant reference data. Clean passes calibrate the system.

### What Positive Signals Mean

```bash
npx tsx src/cli.ts teach "what positive signals mean"
```

**What you learn:** Positive signals like `correct_semantic_firewall` and `correct_downgrade` are earned — they survive cross-check by the negative track before admission. TAP has 6 admitted positive signals but 3 were blocked by negative cross-check. The system distinguishes "correct behavior under pressure" from "nice language stored."

---

## Part 4: Quiz Yourself

```bash
npx tsx src/cli.ts quiz "proposal vs authority"
npx tsx src/cli.ts quiz "what positive signals mean"
npx tsx src/cli.ts quiz "why confidence is low"
```

Each quiz asks a reflection question, provides a hint, and reveals the key doctrinal concept. The system does not grade your answer — it invites reflection.

---

## Part 5: See Operational Lessons

```bash
npx tsx src/cli.ts lesson list
```

The system persists 9 pre-seeded operational lessons about real build/formalization failures (Lean 4 regression, Unicode λ parse, cascade failure classification, etc.). These aggregate operational experience across runs.

---

## What the System Refuses to Do

Throughout all of the above, Teaching Mode:

- Does **not** promote graph status or evidence levels
- Does **not** certify understanding
- Does **not** authorize repairs, apply patches, or close obligations
- Does **not** convert teaching output into canon

---

## Next Steps

- Run `cohbit-copilot audit .` on your own project
- Compare the polarity of your project's output against the TAP and Dictionary baselines
- Use `cohbit-copilot teach` to explain any concept you're uncertain about
- Read [docs/teaching_mode.md](teaching_mode.md) for the full reference