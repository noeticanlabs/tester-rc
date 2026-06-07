# CohBit-Copilot External Tester Guide

**v14.6 External Tester RC**

Welcome and thank you for evaluating CohBit-Copilot. This guide explains what the system is, what to expect, and where to find everything you need.

---

## What Is CohBit-Copilot?

CohBit-Copilot is a **governed development copilot** — a tool for proposing, auditing, and remembering code changes under explicit constraints. It is not an autonomous coding assistant.

**Key characteristics:**

- **Proposes, does not self-approve.** The copilot can suggest bounded patches, but every change must pass through human review, authorization, application, testing, and deterministic receipting before it becomes trusted work.
- **Offline by default.** No API keys. No cloud. No network requirement. All persistence is local and human-readable.
- **Audit-first.** The integrated audit pipeline scans, classifies, and enriches findings across a codebase. It observes and reports — it does not authorize, apply, verify, or commit source code changes.
- **Memory-backed.** Atlas memory stores patterns, obligations, lessons, and canonical patterns across sessions.
- **Bounded by documented gaps.** This is research/demo-grade software, not a production security scanner. Known limitations are documented and visible.

---

## System Status: External Tester RC

CohBit-Copilot v14.6 is an **External Tester Release Candidate** — structurally sound, runtime-audited, with bounded documented gaps.

**The v14.5 wiring and runtime audit confirmed:**

| Metric | Result |
|--------|--------|
| Static wiring (14 checkpoints) | All passed |
| Test suite | 950/968 passing (98.1%) |
| Conformance + Hardening | 55/55 passing (100%) |
| Receipt determinism | Verified (SHA-256 canonical) |
| Admissibility law enforcement | Verified (`V(post)+s ≤ V(pre)+d+a`) |
| Integrated pipeline (8 phases) | Completed against this repo |
| Known gaps | 14 documented, none security-critical |

Full audit report: `reports/v14_5_wiring_runtime_audit.md`

---

## What You Will Test

As a v14.6 tester, you should walk through these capabilities:

| # | Capability | Command | Expected Outcome |
|---|-----------|---------|-----------------|
| 1 | Install dependencies | `npm install` | Clean install, no errors |
| 2 | Initialize | `npx tsx src/cli.ts init` | Config created, learner profile set |
| 3 | Run demo | `npx tsx src/cli.ts demo` | Governed patch lifecycle display |
| 4 | Run audit | `npx tsx src/cli.ts audit` | 8-phase pipeline completes, reports generated |
| 5 | View memory stability | `npx tsx src/cli.ts memory-stability` | Atlas memory report |
| 6 | Understand profiles | `npx tsx src/cli.ts access status` | See current profile; try switching |
| 7 | View known gaps | Read `docs/known_gaps.md` | Understand what the system cannot do |
| 8 | Confirm offline | Disconnect internet; repeat steps 3–5 | All should complete |
| 9 | Confirm no mutation | Check source files after steps 3–4 | No files changed by audit or demo |
| 10 | Fill feedback form | Use `docs/tester_feedback_form.md` | Structured evaluation submitted |

---

## Document Map

| Document | Purpose |
|----------|---------|
| `docs/quickstart.md` | Minimal 3-step install → init → demo |
| `docs/first_tester_walkthrough.md` | Step-by-step walkthrough covering all 10 criteria |
| `docs/offline_local_deployment.md` | Confirms no cloud/network requirement |
| `docs/access_control.md` | Three profiles: learner, reviewer, operator |
| `docs/known_gaps.md` | What the system cannot yet do |
| `docs/limitations.md` | Known constraints and boundaries |
| `docs/tester_feedback_form.md` | Structured feedback template |
| `reports/v14_5_wiring_runtime_audit.md` | Full wiring and runtime audit report |
| `docs/architecture.md` | High-level architecture (reference) |
| `docs/full_system_layout_and_flowchart.md` | Complete system layout (reference) |
| `docs/runbook.md` | Troubleshooting guide |
| `docs/reviewer_guide.md` | Reviewer-focused operations |
| `docs/teaching_mode.md` | Teaching mode documentation |
| `docs/teaching_starter_pack.md` | Teaching mode onboarding |

---

## What We're Looking For

We want honest friction data, not praise. The most valuable feedback identifies:

1. **Installation friction** — what didn't work or wasn't clear during setup
2. **Conceptual clarity** — did you understand what the system does and doesn't do
3. **Trust boundary clarity** — did you understand the no-mutation boundary and profile system
4. **Finding-to-defect distinction** — did you understand that audit findings are review signals, not verified defects
5. **Audit output usefulness** — was the audit report useful to you
6. **Teaching mode usefulness** — was the teaching mode helpful
7. **Confusion points** — where did the documentation or output confuse you
8. **Missing documentation** — what did you need to know that wasn't documented

---

## What This System Is Not

- **Not a production security scanner** — audit is Rust-only in v14.6; TypeScript/Go/Python not yet supported
- **Not an autonomous repair tool** — finds patterns, does not auto-fix defects
- **Not formally verified end-to-end** — the Lean 4 proofs are static, not dynamically verified by runtime
- **Not a replacement for human code review** — audit findings are signals, not verdicts
- **Not production-grade** — research/demo readiness: strong; production readiness: not claimed

---

## Getting Started

1. Start with `docs/quickstart.md` (3 steps)
2. Then follow `docs/first_tester_walkthrough.md` (full walkthrough)
3. Fill out `docs/tester_feedback_form.md` when done

Thank you for testing CohBit-Copilot v14.6.

---

*External Tester Guide for CohBit-Copilot v14.6 External Tester RC. Last updated 2026-06-07.*