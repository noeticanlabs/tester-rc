# CohBit-Copilot Quickstart

**v14.6 External Tester RC**

This guide gets you from zero to a working CohBit-Copilot in three steps. No cloud. No API keys. No network requirement.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **TypeScript** (installed via npm)
- **Rust and Go are optional** — the core TypeScript system works without them. Only the Rust trust kernel bridges and Go-language test trials need those toolchains.

---

## Step 1: Install Dependencies

```bash
cd Cohbit-Copilot
npm install
```

Expected output: packages installed, no errors.

---

## Step 2: Initialize Configuration

```bash
npx tsx src/cli.ts init
```

This creates `~/.cohbit-copilot/config.json` with default settings:
- Profile: `learner` (read-only access, safest for first use)
- Network mode: `offline` (no external calls)
- Session tracking: enabled

You'll see a confirmation message. If you want to change your profile later:
```bash
npx tsx src/cli.ts access set reviewer   # or: learner | operator
```

---

## Step 3: Run the Starter Demo

```bash
npx tsx src/cli.ts demo
```

This walks through a self-contained governed patch lifecycle:
1. Scans the workspace
2. Detects language
3. Runs the test suite
4. Produces a session receipt

The demo does **not** mutate any source files. It's a read-then-report flow.

---

## Sanity Check: Run the Test Suite

```bash
npx vitest run
```

Expected: ~950 tests pass. Some tests may skip or fail if Rust or Go toolchains aren't installed — this is expected and documented in `docs/known_gaps.md`.

---

## Next Steps

| You want to... | Command |
|----------------|---------|
| Run a full audit | `npx tsx src/cli.ts audit` |
| View memory stability | `npx tsx src/cli.ts memory-stability` |
| Explore teaching mode | `npx tsx src/cli.ts teach` |
| See all commands | `npx tsx src/cli.ts help` |
| Understand the system | `docs/external_tester_guide.md` |
| Walk through everything | `docs/first_tester_walkthrough.md` |
| Know what the system can't do | `docs/known_gaps.md` |

---

## Troubleshooting

If something doesn't work, check:
1. **Node version**: `node --version` should be ≥ 18
2. **npm install errors**: Delete `node_modules/` and re-run `npm install`
3. **CLI not found**: Make sure you're in the `Cohbit-Copilot` directory
4. **More help**: See `docs/runbook.md`

---

*Quickstart for CohBit-Copilot v14.6 External Tester RC. Last updated 2026-06-07.*