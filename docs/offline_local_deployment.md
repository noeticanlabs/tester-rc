# Offline & Local Deployment

**v14.6 External Tester RC**

CohBit-Copilot v14.6 operates fully offline by default. This document confirms what that means and how the network boundary works.

---

## Default Behavior: Fully Offline

Out of the box, after `npm install` and `npx tsx src/cli.ts init`:

- **No API keys required**
- **No network calls made**
- **No cloud services contacted**
- **No telemetry sent**
- **No external package downloads at runtime**

All computation happens locally. All persistence writes to the `.cohbit/` directory inside the project workspace.

---

## Network Boundary

The system has a `network_boundary.ts` module that controls whether outbound connections are permitted.

### Checking Current Mode

```bash
npx tsx src/cli.ts network
```

Expected output for a fresh install:

```
Network mode: offline
```

### Changing Network Mode

```bash
npx tsx src/cli.ts network set online
```

```
Network mode: online
```

```bash
npx tsx src/cli.ts network set offline
```

```
Network mode: offline
```

### What Online Mode Enables

When network mode is set to `online`, the system may:

- Check for newer versions of the Rust trust kernel binaries
- Potentially support remote audit targets (not yet implemented as of v14.6)

Online mode does **not**:

- Send telemetry
- Phone home
- Upload source code
- Share audit findings

### Safe Default

The default is `offline`. A tester who never runs `network set online` will never produce outbound traffic. This is verifiable: no network API is imported in the default execution path.

---

## Persistence: What Goes Where

| Location | Contents |
|----------|----------|
| `~/.cohbit-copilot/config.json` | User profile, network mode, session settings |
| `.cohbit/gate_records/` | Per-proposal JSON with full gate lifecycle state |
| `.cohbit/session_ledger.jsonl` | Append-only JSONL of all committed events |
| `.cohbit/obligations/` | Persisted obligation store (audit findings lifecycle) |
| `.cohbit/atlas/` | Code Atlas memory entries, canonical patterns, lessons |
| `reports/` | Audit reports in Markdown and JSON |

All persistence is:
- **Local filesystem only**
- **Human-readable** (JSON, JSONL, Markdown)
- **No database required**

---

## What a Tester Needs to Install

### Required

| Tool | Min Version | Why |
|------|------------|-----|
| Node.js | 18+ | Runtime for the TypeScript copilot |
| npm | 9+ | Package manager |
| TypeScript (tsx) | Latest | `npx tsx` executes `.ts` files directly |

These are the only hard dependencies. Everything else is bundled via `npm install`.

### Optional

| Tool | Why |
|------|-----|
| Rust (cargo) | Compile Rust trust kernel bridges for optional hardened verification |
| Go | Run Go-language test trials (`v0.4-lang-trials.ts`) |
| Python 3 | Python SDK conformance testing (`sdks/python/`) |
| Lean 4 | Formal proof verification (`reference-verifier/lean/`) |

These are **not required** for the core audit pipeline, demo, teaching mode, memory stability, or CLI operations.

---

## Verifying Offline Operation

To confirm the system requires no network:

1. Disconnect your machine from the internet
2. Run `npx tsx src/cli.ts demo`
3. Run `npx tsx src/cli.ts audit`
4. Run `npx tsx src/cli.ts memory-stability`

All should complete successfully.

---

*Offline & Local Deployment for CohBit-Copilot v14.6 External Tester RC. Last updated 2026-06-07.*