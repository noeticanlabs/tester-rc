# First Tester Walkthrough

**v14.6 External Tester RC**

This walkthrough covers all 10 v14.6 success criteria. Follow each step in order. The expected output after each command is described — if your output differs, note it in your feedback form.

**Estimated time:** 15–20 minutes.

---

## 0. Prerequisites

Before starting, make sure you have:

- **Node.js** ≥ 18 (`node --version`)
- **npm** ≥ 9 (`npm --version`)

Install dependencies:
```bash
cd Cohbit-Copilot
npm install
```

✅ **Success criterion 1 met:** Dependencies installed without errors.

---

## 1. Initialize the System

```bash
npx tsx src/cli.ts init
```

Expected output:
```
CohBit-Copilot initialized.
Profile: learner
Network: offline
Config: ~/.cohbit-copilot/config.json
```

Check your profile:
```bash
npx tsx src/cli.ts access status
```

✅ **Success criterion 2 met:** Config created with learner profile, offline mode.

---

## 2. Run the Starter Demo

```bash
npx tsx src/cli.ts demo
```

Expected output:
- Workspace scan results
- Language detection
- Test suite execution
- Session receipt with SHA-256 hash

This demo is **read-only** — it does not modify any source files.

✅ **Success criterion 3 met:** Demo completes and produces a session receipt.

---

## 3. Run the Full Audit Pipeline

```bash
npx tsx src/cli.ts audit
```

Expected output:
```
v8.0 Integrated Audit
Target: .
...
═══ v8.0 Integrated Audit Complete ═══
  Files: [count] | Findings: [count]
  P0: 0 | P1: 0
  Atlas: [count] | Obligations: [count]
  Report: reports/v8_0_integrated_audit.md
  JSON: reports/v8_0_integrated_audit.json
```

Open the report:
```bash
cat reports/v8_0_integrated_audit.md
```

Verify the report contains:
- Boundary status section
- Repository overview
- Findings with severity and confidence
- Atlas memory section
- Obligations section
- Resource accounting
- Limitations section

✅ **Success criterion 4 met:** Audit completes all phases and generates reports.

---

## 4. View Memory Stability

```bash
npx tsx src/cli.ts memory-stability
```

Expected output:
- Atlas entries count
- Obligation status summary
- Lesson count
- Markdown and JSON reports generated

✅ **Success criterion 5 met:** Memory stability report generated.

---

## 5. Explore Profiles

Try switching between profiles:

```bash
npx tsx src/cli.ts access set reviewer
```
```
Profile updated to: reviewer
```

```bash
npx tsx src/cli.ts access set learner
```
```
Profile updated to: learner
```

Read the access control documentation:
```bash
cat docs/access_control.md
```

Key concepts to verify:
- **Learner** can view but not mutate
- **Reviewer** can review but not authorize
- **Operator** can authorize and apply
- **No profile can skip the review gate**

✅ **Success criterion 6 met:** Profile system understood and configurable.

---

## 6. Review Known Gaps

Read the known gaps document:
```bash
cat docs/known_gaps.md
```

Key gaps to verify:
- Audit is Rust-only (v14.6 cannot audit TypeScript/Go/Python for risk patterns)
- Resource enforcement is partial (not all CLI paths are governed)
- ReviewGate is function-call, not cryptographically attested
- This is research/demo-grade, not production-grade
- No CI/CD pipeline
- No published npm package

✅ **Success criterion 7 met:** Known gaps are visible and understandable.

---

## 7. Confirm Offline Operation

Disconnect your machine from the internet.

Run the following commands:
```bash
npx tsx src/cli.ts demo
npx tsx src/cli.ts audit
npx tsx src/cli.ts memory-stability
```

All three should complete successfully without network access.

Check network mode:
```bash
npx tsx src/cli.ts network
```
```
Network mode: offline
```

Reconnect to the internet.

✅ **Success criterion 8 met:** Core operations work fully offline.

---

## 8. Confirm No Source Mutation

Before running this check, note the modification timestamps or hashes of a few source files:

```bash
stat src/cli.ts
stat src/gates.ts
```

Run the demo and audit again:
```bash
npx tsx src/cli.ts demo
npx tsx src/cli.ts audit
```

Verify source files are unchanged:
```bash
stat src/cli.ts
stat src/gates.ts
```

The modification times should be identical (or unchanged).

Check that only `.cohbit/` and `reports/` received new output:
```bash
ls -la .cohbit/
ls -la reports/
```

Source files in `src/`, `packages/`, `tests/`, `docs/` should not have been modified.

✅ **Success criterion 9 met:** No mutation occurs by default during audit or demo.

---

## 9. Explore (Optional)

Try these additional commands:

```bash
# See all available commands
npx tsx src/cli.ts help

# View recent sessions
npx tsx src/cli.ts status

# Explore teaching mode
npx tsx src/cli.ts teach list
npx tsx src/cli.ts teach quiz "Proposal vs Authority"

# Inspect a gate record (if any exist)
npx tsx src/cli.ts recent
```

---

## 10. Submit Feedback

Use the feedback form template:
```bash
cat docs/tester_feedback_form.md
```

Fill it out with your observations from this walkthrough. The most valuable feedback is:

1. **What confused you** — this helps us improve documentation
2. **What didn't work** — this helps us fix bugs
3. **What you didn't trust** — this helps us strengthen the trust boundary messaging
4. **What was missing** — this helps us fill documentation gaps

✅ **Success criterion 10 met:** Feedback form understood and ready to fill.

---

## Summary Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Install dependencies | ☐ |
| 2 | Initialize config | ☐ |
| 3 | Run demo | ☐ |
| 4 | Run audit | ☐ |
| 5 | View memory stability | ☐ |
| 6 | Understand profiles | ☐ |
| 7 | View known gaps | ☐ |
| 8 | Confirm offline operation | ☐ |
| 9 | Confirm no mutation | ☐ |
| 10 | Feedback form ready | ☐ |

---

*First Tester Walkthrough for CohBit-Copilot v14.6 External Tester RC. Last updated 2026-06-07.*