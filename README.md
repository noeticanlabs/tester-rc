# CohBit-Copilot Tester Release Candidate

**This is an external tester release candidate.**

It is offline-first and learner-mode by default.
It is not production software.
It does not claim verified defect detection.
It does not autonomously repair code.
It does not upload source code.
It does not mutate files by default.

---

## What This Is

CohBit-Copilot is an offline-first governed development and teaching copilot.

It helps users audit local repositories, inspect findings, understand evidence boundaries, receive governed repair suggestions, and learn code-change discipline.

It does not require cloud access.
It does not upload source code.
It does not mutate files by default.
It does not certify defects.
It does not replace human review.

---

## What This Is Not

- **Not a production security scanner** — audit is Rust-only in v14.6; TypeScript/Go/Python not yet supported
- **Not an autonomous repair tool** — finds patterns, does not auto-fix defects
- **Not formally verified end-to-end** — the Lean 4 proofs are static, not dynamically verified by runtime
- **Not a replacement for human code review** — audit findings are signals, not verdicts
- **Not production-grade** — research/demo readiness: strong; production readiness: not claimed

---

## Offline / Local Guarantee

No cloud capability is required for core use.
No source code is uploaded.
No hidden telemetry.
No external model calls.
No network dependency.
Local LAN support is future/optional and disabled by default.

If you run it offline, the core demo still works.

---

## Quickstart

```bash
npm install
npx tsx src/cli.ts init
npx tsx src/cli.ts system explain
npx tsx src/cli.ts access show
npx tsx src/cli.ts demo starter
npx tsx src/cli.ts audit .
npx tsx src/cli.ts memory stability
```

### Windows PowerShell Note

On PowerShell, `npx` may require execution policy adjustment:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Alternatively, run commands from `cmd.exe`.

---

## First Commands (Approved Tester Path)

| Step | Command | What It Does |
|------|---------|--------------|
| 1 | `npm install` | Install dependencies |
| 2 | `npx tsx src/cli.ts init` | Create safe learner config |
| 3 | `npx tsx src/cli.ts system explain` | Explain the system |
| 4 | `npx tsx src/cli.ts access show` | Show your access profile |
| 5 | `npx tsx src/cli.ts demo starter` | Walk through governed patch lifecycle |
| 6 | `npx tsx src/cli.ts audit .` | Run integrated audit pipeline |
| 7 | `npx tsx src/cli.ts memory stability` | View atlas memory report |

Optional after the above:

```bash
npx tsx src/cli.ts teach "proposal vs authority"
npx tsx src/cli.ts teach "surface detected vs verified"
npx tsx src/cli.ts obligations
npx tsx src/cli.ts dashboard
```

---

## Safe Default Config

On `init`, the system generates this default config:

```json
{
  "profile": "learner",
  "allowApply": false,
  "allowNetwork": false,
  "allowRustTrustKernels": true,
  "reportFormat": "markdown+json",
  "defaultEvidenceCeiling": "surface_detected",
  "deploymentMode": "individual_local",
  "networkMode": "offline",
  "allowLan": false,
  "allowCloud": false,
  "telemetry": "disabled",
  "externalModelCalls": false
}
```

Default tester mode is **learner**.
No apply authority by default.
No cloud by default.
No telemetry.
No external model calls.

---

## Access Profiles

| Profile | Audit | Teach | View Reports | Propose | Apply | Receipt |
|---------|:-----:|:-----:|:------------:|:-------:|:-----:|:-------:|
| observer | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| learner | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| reviewer | ✅ | ✅ | ✅ | proposal-only | ❌ | ❌ |
| operator | ✅ | ✅ | ✅ | ✅ | gated | gated |
| maintainer | ✅ | ✅ | ✅ | ✅ | gated | gated |

Denied commands explain why they were denied.

---

## No-Mutation Default

The CLI may propose, audit, inspect, recommend, run tests, and classify failures. It may not silently commit, bypass review, or authorize itself.

The integrated audit pipeline observes, enriches, and reports. It does not authorize, apply, verify, or commit source code changes. It writes side effects only to `.cohbit/` and `reports/`.

All patches must pass through the seven-gate pipeline: Propose → Review → Authorize → Apply → Test → Rollback → Receipt.

---

## Trust Kernels

Rust trust kernels provide evidence only.

They verify:
1. Receipt identity
2. Path safety
3. Deterministic IDs
4. Audit scanner evidence
5. Policy/admissibility preconditions

They do not authorize commits, apply patches, close obligations, or replace the TypeScript gate lifecycle.

→ [Trust Kernel Report](docs/trust_kernel_report.md)

---

## What to Test

Each tester should complete these 10 tasks:

| # | Task | Command |
|---|------|---------|
| 1 | Clone or unzip repo | — |
| 2 | Install dependencies | `npm install` |
| 3 | Initialize | `npx tsx src/cli.ts init` |
| 4 | System explain | `npx tsx src/cli.ts system explain` |
| 5 | Access show | `npx tsx src/cli.ts access show` |
| 6 | Demo | `npx tsx src/cli.ts demo starter` |
| 7 | Audit | `npx tsx src/cli.ts audit .` |
| 8 | Memory stability | `npx tsx src/cli.ts memory stability` |
| 9 | Read known gaps | `docs/known_gaps.md` |
| 10 | Fill feedback form | `docs/tester_feedback_form.md` |

**Do not apply patches during first test.**

---

## Known Gaps

`docs/known_gaps.md` is current and visible. It includes:
- Known non-blocking trial typecheck issues
- Environment-dependent Rust/Go toolchain tests
- Hardcoded corpus-path archived trials
- Trial glob noise
- Stray artifact cleanup
- No full semantic/compiler verification claim
- No production security scanner claim

→ [Known Gaps](docs/known_gaps.md)

---

## Feedback Form

→ [Tester Feedback Form](docs/tester_feedback_form.md)

Sections include: environment, install friction, command success/failure, concept clarity, trust/no-mutation confidence, audit usefulness, teaching usefulness, offline/local confidence, confusing terms, bugs/errors/logs, would you use this again, top 3 improvements.

---

## Documentation Map

| Document | Purpose |
|----------|---------|
| [Quickstart](docs/quickstart.md) | Minimal 3-step install → init → demo |
| [External Tester Guide](docs/external_tester_guide.md) | Overview and what to expect |
| [First Tester Walkthrough](docs/first_tester_walkthrough.md) | Step-by-step walkthrough |
| [Offline / Local Deployment](docs/offline_local_deployment.md) | Confirms no cloud/network requirement |
| [Access Control](docs/access_control.md) | Five profiles: observer through maintainer |
| [Known Gaps](docs/known_gaps.md) | What the system cannot yet do |
| [Feedback Form](docs/tester_feedback_form.md) | Structured evaluation template |
| [Trust Kernel Report](docs/trust_kernel_report.md) | Five-kernel Rust verification architecture |
| [Full System Layout & Flowchart](docs/full_system_layout_and_flowchart.md) | Complete architecture reference |
| [Limitations](docs/limitations.md) | Known constraints and boundaries |
| [Runbook](docs/runbook.md) | Operational troubleshooting |
| [Authority Boundary](docs/authority_boundary.md) | What the copilot may and may not do |
| [Gate Lifecycle](docs/gate_lifecycle.md) | Seven-gate pipeline documentation |
| [Architecture](docs/architecture.md) | High-level architecture summary |

---

## Required Fixtures

Minimum fixtures included for tester RC:

- `sandbox/fixtures/rust-risk-fixture/` — multiple risk pattern source
- `sandbox/fixtures/rust-safe-proposal-fixture/` — clean Rust source (no risks)
- `sandbox/fixtures/rust-guarded-unwrap-fixture/` — guarded unwrap patterns
- `sandbox/fixtures/rust-test-only-risk-fixture/` — risks isolated to test code
- `sandbox/fixtures/rust-process-command-fixture/` — process command risks
- `sandbox/fixtures/rust-filesystem-risk-fixture/` — filesystem access risks

The demo runs against fixtures before touching a tester's real repo.

---

## Test Suite

| Script | Scope |
|--------|-------|
| `npm run test` | Full deterministic suite |
| `npm run test:core` | Core tests + packages |
| `npm run test:fast` | Fast deterministic unit suite |
| `npm run test:integration` | Slower workspace + planner tests |
| `npm run demo` | Run governed patch demo |
| `npm run audit` | Run integrated audit against working directory |
| `npm run start` | Start interactive session |

---

## Branch / Tag Policy

```
main              = stable internal branch
tester-rc         = tester branch (this snapshot)
dev               = active development
```

This release candidate is tagged: **v14.6-rc**

---

## System Status

| Metric | Result |
|--------|--------|
| Static wiring (14 checkpoints) | All passed |
| Test suite | 950/968 passing (98.1%) |
| Conformance + Hardening | 55/55 passing (100%) |
| Receipt determinism | Verified (SHA-256 canonical) |
| Admissibility law enforcement | Verified (`V(post)+s ≤ V(pre)+d+a`) |
| Integrated pipeline (8 phases) | Completed |
| Known gaps | 14 documented, none security-critical |

Full audit report: `reports/v14_5_wiring_runtime_audit.md`

---

*CohBit-Copilot Tester Release Candidate v14.6-rc. Private, invite-only. Not for public distribution.*