# Noetican Labs™ — CohBit-Copilot

**Tester Release Candidate: v14.6-rc**
**Private external tester review brief**

## CohBit-Copilot

**Local-first tester brief for reviewable AI-assisted workflows**

### Purpose

This brief explains what CohBit-Copilot is, what CohBit means inside the system, what the tester release candidate is intended to demonstrate, and what kind of feedback is most valuable from a standards, substrate, infrastructure, or reviewer perspective.

CohBit-Copilot is not being presented as a cloud agent, autonomous coding system, or replacement for human judgment. It is a local-first workflow prototype for making AI-assisted work more reviewable, bounded, receipted, and accountable.

---

## 1. Executive Summary

CohBit-Copilot is a local-first assistant workflow prototype designed around reviewability, receipts, and bounded action.

Instead of treating an assistant output as finished truth, the system treats each meaningful move as a proposed transition that must be visible, inspectable, and accountable before it becomes part of a continuing workflow.

### Core tester status

```text
Release: v14.6-rc
Status: Private external tester release candidate
Default profile: learner
Mutation: disabled by default
Network: offline by default
Cloud dependency: none for core use
Telemetry: disabled
External model calls: disabled
```

### Key properties

**Local-first**
The tester release candidate is intended to run in a local development environment. No cloud account, API key, telemetry service, or source-code upload is required for the core review loop.

**Receipted**
Important actions produce structured records that help explain what was proposed, what was checked, what was accepted, and what remains unresolved.

**Reviewable**
The user remains in the decision path. The copilot assists but does not silently mutate project state by default.

**Standards-oriented**
The design is intended to support durable semantics, traceable work products, trusted infrastructure patterns, and reviewable workflow evidence rather than opaque automation.

The narrow tester goal is not to prove the full Noetican stack. It is to let outside reviewers inspect whether the transition + receipt model feels coherent, useful, and compatible with trusted agentic infrastructure.

---

## 2. Working Definitions

| Term                  | Meaning in this brief                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CohBit**            | The atomic transition/receipt primitive: a bounded unit of meaningful motion that can be inspected after it occurs or before it is committed.                                                        |
| **Copilot**           | The intelligent assistant layer that proposes, explains, audits, or helps repair work. It does not replace the receipt layer.                                                                        |
| **CTRL**              | A tool/API direction for automated Lean proving and theorem repair. CTRL is a tool used by workflows; it is not the whole governance system.                                                         |
| **Receipt**           | A structured record of a proposed or completed transition: source, intent, checks, outcome, obligations, and remaining uncertainty.                                                                  |
| **Atlas / PhaseLoom** | Supporting memory/trace layers for storing durable patterns, obligations, prior decisions, and workflow history.                                                                                     |
| **Trust Kernel**      | A local Rust verification lane that produces evidence for receipt identity, path safety, deterministic IDs, audit scanner comparison, or admissibility preconditions. It does not authorize commits. |

---

## 3. Architecture View

CohBit-Copilot separates proposal, verification, receipt, and memory.

The important point is that the assistant is not treated as the authority. It is a proposer and helper inside a governed workflow.

```text
1. User / Project Context
   Task, repo, document, theorem, or workflow need.

        ↓

2. Copilot Proposal Layer
   Suggests edits, audits, explanations, tests, theorem repairs, or next actions.

        ↓

3. CohBit Transition Layer
   Frames a proposed move as a bounded transition with intent, inputs, constraints, and expected effect.

        ↓

4. Verification / Review Gates
   Human review, local checks, tests, policy checks, proof tools, or standards checks.

        ↓

5. Receipt + Trace Memory
   Records outcome, obligations, unresolved debt, and reusable evidence for future review.
```

### Design principle

```text
LLMs propose.
Review gates decide.
CohBit receipts.
The memory layer remembers.
```

This keeps the workflow legible and avoids pretending that a generated answer is automatically a trusted state change.

---

## 4. Access-Control Profiles

The tester RC defaults to **learner** mode.

| Profile        | Audit | Teach | View Reports |       Propose | Apply | Receipt |
| -------------- | ----: | ----: | -----------: | ------------: | ----: | ------: |
| **observer**   |   yes |   yes |          yes |            no |    no |      no |
| **learner**    |   yes |   yes |          yes |            no |    no |      no |
| **reviewer**   |   yes |   yes |          yes | proposal-only |    no |      no |
| **operator**   |   yes |   yes |          yes |           yes | gated |   gated |
| **maintainer** |   yes |   yes |          yes |           yes | gated |   gated |

Denied commands should explain why they were denied.

Default tester mode is intentionally conservative:

```text
Audit allowed.
Teaching allowed.
Reports allowed.
Apply denied.
Receipt authority denied.
Cloud disabled.
Telemetry disabled.
```

---

## 5. Rust Trust Kernels

CohBit-Copilot includes Rust trust-kernel integrations that provide independent evidence for selected trust-critical facts.

They verify:

1. Receipt identity
2. Path safety
3. Deterministic IDs
4. Audit scanner evidence
5. Policy / admissibility preconditions

They do **not** authorize commits, apply patches, close obligations, promote evidence, or replace the TypeScript gate lifecycle.

```text
TypeScript orchestrates.
Rust verifies.
CohBit receipts the boundary.
```

Rust verifier output is evidence, not authority.

---

## 6. What the Tester RC Should Demonstrate

The tester release candidate should demonstrate:

**Safe initialization**
A fresh local setup creates a learner/default profile that avoids uncontrolled mutation.

**System explanation**
The tester can ask the system to explain its workflow boundaries, receipt logic, access profiles, and offline posture.

**Audit flow**
The tester can run an audit over a local folder or example project and receive structured output.

**Receipt visibility**
The tester can see what was checked, what passed, what failed, and what remains as debt or obligation.

**No silent mutation**
The default mode prefers review, explanation, and receipts over automatically changing project files.

**Offline/local operation**
The tester can run the core workflow without cloud credentials, telemetry, or source-code upload.

---

## 7. Suggested First-Run Command Sequence

```bash
npm install
npx tsx src/cli.ts init
npx tsx src/cli.ts system explain
npx tsx src/cli.ts access show
npx tsx src/cli.ts demo starter
npx tsx src/cli.ts audit .
npx tsx src/cli.ts memory stability
```

Optional teaching commands:

```bash
npx tsx src/cli.ts teach "proposal vs authority"
npx tsx src/cli.ts teach "surface detected vs verified"
npx tsx src/cli.ts obligations
npx tsx src/cli.ts dashboard
```

---

## 8. Why This Is Different From a Generic Agent Stack

A common agent stack is often described as:

```text
LLM + RAG + tools + memory = agent
```

CohBit-Copilot uses a different emphasis. The copilot may use language models, retrieval, tools, and memory, but the system identity is not the model itself.

The identity is the governed transition loop.

| Generic agent pattern                                 | CohBit-Copilot pattern                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Model output is often treated as the central product. | A proposed transition plus its receipt is the central product.                 |
| Memory may store conversation or retrieved context.   | Memory stores obligations, traces, evidence, and prior decisions.              |
| Tools execute tasks.                                  | Tools are invoked inside reviewable, bounded transitions.                      |
| Success may mean task completion.                     | Success means useful completion with visible checks, debt, and accountability. |

---

## 9. Feedback Requested

The most useful feedback is not whether the project has every feature yet.

The most useful feedback is whether the model of transition, receipt, and review is clear enough to support trusted workflows.

Please focus feedback on:

**Terminology**
Does CohBit clearly communicate atomic transition + receipt, or does the name create confusion with COBIT or other standards terms?

**Standards fit**
Does the receipt structure feel compatible with semantic integrity, durable substrates, audit logs, or trust infrastructure?

**Boundary quality**
Are the default safety limits clear enough for tester use?

**Evidence quality**
Are the receipts detailed enough to help someone review what happened without reading the entire codebase?

**Adoption path**
What minimum documentation would make this easier for a standards/substrate reviewer to evaluate?

**Offline confidence**
Is it clear that the tester RC does not require cloud access, telemetry, or source-code upload?

---

## 10. Suggested 20-Minute Test Pass

1. Read the README and tester guide first.
2. Note any confusing claims or missing definitions.
3. Run the safe initialization path.
4. Confirm the default mode does not apply risky changes automatically.
5. Run the system explanation command.
6. Compare the explanation against the actual repo behavior.
7. Run one demo or audit command.
8. Inspect the receipt or report output.
9. Run memory stability.
10. Write down where the transition/receipt model helped clarity and where it felt like overhead.

---

## 11. Current Scope and Non-Claims

This tester brief should be read as an early engineering/research handoff, not a production security certification.

The project is a release candidate for outside review of the workflow model.

It is **not** claiming:

* full autonomous agent safety
* formal proof of every system behavior
* replacement of human review or standards work
* CTRL as the whole architecture
* a cloud automation platform
* verified defect detection
* autonomous repair
* production security scanner status
* general AI framework status

It is claiming instead:

* local-first tester workflow
* reviewable assistant behavior
* bounded transition model
* receipt-bearing audit and proposal flow
* evidence-aware memory
* human authority over meaningful transitions

---

## 12. One-Sentence Positioning

**CohBit-Copilot is a local-first, reviewable assistant workflow where proposed actions become bounded transitions and every meaningful transition can leave a receipt.**

Prepared for private external tester review.