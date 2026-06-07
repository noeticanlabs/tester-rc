# Noetican Labs™ — CohBit-Copilot Technical Brief

**Tester Release Candidate: v14.6-rc**
**Public-facing informational overview. Internal implementation details may differ by release candidate.**

## TTC Stack + CohBit Stack

**Informational brief for CohBit-Copilot testers and technical reviewers**

### Purpose

This brief gives a compact explanation of the transition-control stack, the receipt stack, and how both are used inside CohBit-Copilot.

CohBit-Copilot is framed as a local-first, reviewable, AI-assisted workflow system. It is not presented as a replacement for human judgment, a cloud agent, or an autonomous execution platform.

Its purpose is to help a user propose, inspect, audit, and remember work through governed transitions and durable receipts.

The architecture can be explained through two connected stacks:

**The TTC Stack**
The transition-control side. It turns raw input into typed, bounded, testable transition candidates before anything is treated as actionable.

**The CohBit Stack**
The receipt-and-continuity side. It records what was proposed, checked, accepted, rejected, repaired, or deferred.

| Layer             | Plain-language role                                          | In the Copilot                                                                                      |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **TTC Stack**     | Defines and governs possible transitions before realization. | Helps structure prompts, audits, proposed edits, proof tasks, repo actions, and reviewer decisions. |
| **CohBit Stack**  | Records the realized motion and its accountability trail.    | Creates receipts, traces, stability records, repair obligations, and review memory.                 |
| **Copilot Layer** | The assisting interface above both stacks.                   | Lets LLMs or tools propose while the governed stack checks, records, and constrains.                |

### Core framing

```text
LLMs may propose.
Tools may compute.
CTRL may assist theorem repair/proving.
But CohBit-Copilot should make meaningful transitions reviewable, bounded, receipted, and accountable.
```

---

## 1. Tester RC Status

```text
Release: v14.6-rc
Status: Private external tester release candidate
Default profile: learner
Mutation: disabled by default
Cloud dependency: none for core use
Telemetry: disabled
External model calls: disabled
Offline/local use: default
```

The tester RC is meant for controlled external review, not public production use.

---

## 2. Offline / Local Boundary

CohBit-Copilot is designed as an offline-first workflow.

Core tester use requires:

```text
No cloud account.
No API key.
No telemetry.
No source-code upload.
No external model calls.
No network dependency for the core loop.
```

Future local LAN or enterprise-local server workflows may be supported, but they should remain explicit, permissioned, and receipted.

```text
Offline is default.
LAN is permissioned.
Cloud is not part of the core product.
```

---

## 3. The TTC Stack: Transition-Control Architecture

The TTC stack gives a disciplined route from untrusted input to an admissible candidate action.

It prevents raw input from becoming output directly.

Instead, the system asks:

```text
What kind of transition is being proposed?
What constraints govern it?
What alternatives exist?
What must be checked before realization?
```

### TTC flow

```text
RAW
Untrusted input or request

  ↓

RPT
Projection into structured seed

  ↓

TTC
Transition type and rules

  ↓

UPT
Possible typed transitions

  ↓

GTG
Governed transition geometry

  ↓

GTD
Governed transition dynamics

  ↓

CPT
Candidate proof/test gate

  ↓

ALIGN
Safety, policy, project fit

  ↓

REALIZE
Commit only eligible motion
```

### Stage table

| Stage       | Question it answers                             | What it prevents                                                                        |
| ----------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| **RAW**     | What did we receive?                            | Treating untrusted text, files, prompts, or tool output as truth.                       |
| **RPT**     | How should the input be represented?            | Ambiguous inputs entering the system without bounds, source, or context.                |
| **TTC**     | What type of transition is being requested?     | Mixing code changes, proofs, summaries, edits, and actions under one vague instruction. |
| **UPT**     | What possible transitions are available?        | Collapsing too early into one answer without alternatives.                              |
| **GTG**     | How are options related and constrained?        | Losing the structure of dependencies, risks, and tradeoffs.                             |
| **GTD**     | How does the candidate evolve under pressure?   | Approving something that becomes unstable when context changes.                         |
| **CPT**     | Can the candidate pass required tests?          | Letting plausible but unchecked outputs move forward.                                   |
| **ALIGN**   | Is it admissible for this project and boundary? | Technically correct but unsafe, overbroad, unlicensed, or mispositioned action.         |
| **REALIZE** | Which checked transition becomes real?          | Unreviewed mutation, opaque automation, and drift.                                      |

---

## 4. What TTC Means in Practice

TTC can be read as the transition typing and control layer.

In practice, it gives the Copilot a way to classify work before acting.

A theorem repair request is not the same as:

* a LinkedIn post
* a repo audit
* a license note
* a local file operation
* a test-run summary
* a teaching explanation
* a public-facing claim

Each transition type should have its own admissibility requirements.

| Transition type           | Example request                                        | Minimum admissibility check                                              |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Text / communication**  | Draft an outreach reply or public post.                | Tone, claim discipline, audience fit, no trade-secret leakage.           |
| **Code / repo action**    | Audit a repo, suggest a patch, run tests.              | Local-first behavior, no mutation by default, file scope, test evidence. |
| **Proof / theorem work**  | Repair Lean theorem or map a lemma dependency.         | Statement clarity, dependency map, proof status, failure reason, trace.  |
| **Research architecture** | Explain TTC, CohBit, PhaseLoom, GMI, or AIR.           | Canonical spine fit, no overclaim, internal vs public distinction.       |
| **Tool usage**            | Call a verifier, parser, audit tool, or local command. | Permission boundary, input/output receipt, reproducibility note.         |
| **Memory / trace**        | Remember a decision or preserve a receipt.             | Why it matters, retention rule, correction path.                         |

The TTC stack is valuable because it makes the Copilot slower in the right places.

It does not merely ask:

```text
What can be generated?
```

It asks:

```text
What kind of transition is this, and what must be true before this transition should continue?
```

This matters for local-first AI-assisted workflows because the risky part is often not the language model itself. The risky part is letting a suggestion become a file mutation, a public claim, a theorem status, a design decision, or a remembered fact without a typed review path.

| TTC discipline            | Result inside CohBit-Copilot                                                          |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **Type before action**    | The system distinguishes draft, audit, patch, proof, repair, and publish transitions. |
| **Generate alternatives** | The system can preserve rejected or deferred paths instead of hiding them.            |
| **Gate by context**       | A local learner profile can behave differently from an expert automation profile.     |
| **Commit with receipt**   | Realized outputs carry evidence of why they were allowed to continue.                 |

---

## 5. The CohBit Stack: Receipts, Continuity, and Review Memory

The CohBit stack begins after a candidate transition has been structured and checked.

Its job is to turn an accepted transition into an accountable unit of motion.

A CohBit is not just a token or a log line. It is a small, reviewable record of a governed transition and the conditions attached to it.

### CohBit flow

```text
REALIZATION
A checked candidate is selected

  ↓

CohBit
Atomic transition receipt

  ↓

ACS
Atomic control/use loop

  ↓

CohTrace
Sequence of receipts over time

  ↓

CohAtom
Stable repeated pattern

  ↓

CohField
Ecology of coherent patterns
```

### Component table

| Component    | Purpose                              | Plain-language meaning                                                               |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------ |
| **CohBit**   | Atomic motion and receipt primitive. | A bounded record of what changed, why it was allowed, and what evidence supports it. |
| **ACS**      | Atomic control system around use.    | The minimum loop for propose, check, accept, reject, repair, or defer.               |
| **CohTrace** | Historical chain of CohBits.         | A durable trail of work, decisions, failures, and repairs.                           |
| **CohAtom**  | Compressed stable recurrence.        | A pattern that has repeated enough to become a reusable unit.                        |
| **CohField** | Ecology of coherent patterns.        | A map of how stable units relate across a project, repo, manuscript, or toolchain.   |

### Key distinction

```text
TTC governs candidate transition space.
CohBit records realized, reviewable transition motion.
```

The Copilot uses both so that assistance is not just generated — it is typed, checked, receipted, and recoverable.

---

## 6. How Both Stacks Are Used in CohBit-Copilot

CohBit-Copilot uses the TTC stack before commitment and the CohBit stack after commitment.

That creates a two-sided workflow:

```text
structured possibility on the front end
accountable continuity on the back end
```

| Workflow step          | TTC role                                                        | CohBit role                                           |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| **User asks for help** | Classify request type and boundary.                             | Start a traceable interaction context.                |
| **Copilot proposes**   | Generate candidate transitions, not final truth.                | Attach proposal metadata if preserved.                |
| **System checks**      | Apply gates: tests, rules, policy, scope, safety, proof status. | Record pass/fail, uncertainty, and repair needs.      |
| **Human reviews**      | Choose, reject, narrow, or request repair.                      | Receipt the decision and reviewer stance.             |
| **Action is realized** | Only an eligible transition may commit.                         | Create CohBit receipt for the committed motion.       |
| **Project continues**  | Future transitions inherit context and constraints.             | CohTrace, CohAtom, and CohField build durable memory. |

---

## 7. Example: A Repo Audit Request

| Phase                    | What happens                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **RAW / RPT**            | The repo path, files, command, and requested audit scope are parsed into a structured seed.                                       |
| **TTC**                  | The system identifies this as an audit transition, not a mutation transition.                                                     |
| **UPT / GTG / GTD**      | Possible findings, risks, dependencies, and repair paths are mapped.                                                              |
| **CPT / ALIGN**          | Evidence is checked: tests, lint, proof status, local-first constraints, and no-cloud/no-apply rules.                             |
| **REALIZATION / CohBit** | The final audit result becomes a receipt-bearing transition: what was inspected, what passed, what failed, and what remains open. |
| **CohTrace**             | Future audits can see whether the same issue recurs, was repaired, or became stable enough to compress into a reusable pattern.   |

---

## 8. Rust Trust Kernels in the Stack

CohBit-Copilot includes Rust trust kernels as local verification lanes.

They support the stack by checking deterministic facts that should not depend only on language generation or orchestration.

| Kernel                          | What it verifies                                                                          | Authority boundary                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Receipt verification**        | Canonical receipt identity and hash agreement.                                            | Evidence only. Does not commit.                            |
| **Path safety**                 | File paths remain in allowed scope.                                                       | Evidence only. Does not mutate.                            |
| **Deterministic IDs**           | Stable identity for findings, obligations, processors, and receipts.                      | Evidence only. Does not prove correctness.                 |
| **Audit scanner evidence**      | Independent Rust-side risk pattern detection.                                             | Evidence only. Does not certify defect.                    |
| **Policy / admissibility gate** | Deterministic preconditions such as policy hash, file scope, and review-required actions. | Evidence only. Does not replace TypeScript gate lifecycle. |

### Trust-kernel law

```text
Rust verifies.
TypeScript orchestrates.
CohBit receipts.
Human authority remains at the commitment boundary.
```

---

## 9. What Reviewers Should Look For

This brief is meant to help standards, substrate, infrastructure, verification, and local-first reviewers understand what to examine in the tester release.

The question is not merely whether the Copilot can produce useful text.

The deeper question is whether it makes AI-assisted work more reviewable, bounded, and auditable.

| Review area                 | Useful reviewer question                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Transition typing**       | Does the system clearly distinguish proposals, audits, patches, proof tasks, summaries, and publication-facing claims? |
| **Receipt quality**         | Can a reviewer tell what happened, what was checked, what was rejected, and what still needs repair?                   |
| **Local-first behavior**    | Does the system avoid cloud dependency, hidden mutation, telemetry, or unreviewed apply-by-default behavior?           |
| **Standards compatibility** | Could the receipt and transition model connect to trusted substrate, agent infrastructure, or governance records?      |
| **Semantic integrity**      | Does the system preserve meaning across prompts, files, audits, repairs, and repeated use?                             |
| **Human authority**         | Does the human reviewer remain the commitment authority for meaningful transitions?                                    |

---

## 10. Suggested First-Run Commands

```bash
npm install
npx tsx src/cli.ts init
npx tsx src/cli.ts system explain
npx tsx src/cli.ts access show
npx tsx src/cli.ts demo starter
npx tsx src/cli.ts audit .
npx tsx src/cli.ts memory stability
```

Optional:

```bash
npx tsx src/cli.ts teach "proposal vs authority"
npx tsx src/cli.ts teach "why receipts matter"
npx tsx src/cli.ts dashboard
npx tsx src/cli.ts obligations
```

---

## 11. Suggested External Positioning

CohBit-Copilot can be described as a local-first, receipt-bearing copilot architecture for reviewable AI-assisted workflows.

Its goal is to let intelligent systems assist without letting their suggestions become opaque, unbounded, or unaccountable actions.

```text
The TTC stack provides transition discipline before commitment.
The CohBit stack provides continuity and accountability after commitment.
Together, they support a Copilot model where assistance is useful precisely because it remains inspectable.
```

---

## 12. Not Claiming / Claiming Instead

| Not claiming                                     | Claiming instead                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Autonomous agent replacement for human judgment. | Human-reviewed copilot workflow with typed transitions and receipts.                       |
| General AI framework.                            | Governed computation and review infrastructure that can be used by AI-assisted tools.      |
| Proof of universal safety.                       | Practical accountability layer: boundaries, checks, traces, and repair obligations.        |
| Cloud automation platform.                       | Local-first tester release candidate for inspectable workflows.                            |
| Verified defect detection.                       | Evidence-labeled audit findings that remain review signals until stronger evidence exists. |
| Automatic repair authority.                      | Bounded repair proposals that require gate review and human decision.                      |

---

## 13. One-Sentence Positioning

**CohBit-Copilot is a local-first, receipt-bearing copilot architecture that uses the TTC stack to govern transitions before commitment and the CohBit stack to preserve accountability after commitment.**