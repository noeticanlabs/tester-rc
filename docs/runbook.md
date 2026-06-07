# CohBit-Copilot — Runbook

**Purpose:** Operational troubleshooting for common issues when running CohBit-Copilot.  
**Package version:** 10.9.0  
**Generated:** 2026-06-06

---

## 1. Installation Issues

### `npm install` fails

**Check:** Node.js version ≥ 18.

```bash
node --version
```

**Fix:** Install Node.js 18+ from https://nodejs.org

### `npm run build` fails

**Check:** TypeScript is installed.

```bash
npx tsc --version
```

**Fix:** `npm install` should have pulled typescript as a devDependency. If not:

```bash
npm install
```

### `npm test` fails with "Cannot find module"

**Fix:** Rebuild:

```bash
npm run build
npm test
```

---

## 2. Test Failures

### 792/797 tests pass — what are the 5 failures?

The 5 known failures are in security path tests. They occur when test temp directories are created outside the workspace root boundary. This is **correct behavior** — `path_safety.ts` is intentionally rejecting paths it cannot verify.

**To verify:** Run only the non-path tests:

```bash
npm run test:fast
```

All ~400 tests in the fast suite should pass.

### Test timeouts

If tests timeout, increase the timeout in `vitest.config.ts` or run individual test files:

```bash
npx vitest run tests/smoke.test.ts
```

---

## 3. CLI Issues

### `npx tsx src/cli.ts` fails

**Check:** Dependencies are installed:

```bash
npm install
```

**Check:** TypeScript is compiled:

```bash
npm run build
```

### PowerShell `npx` issues

On PowerShell, `npx tsx` may require execution policy adjustment:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Alternatively, use `cmd.exe`:

```cmd
npx tsx src/cli.ts audit .
```

### Command produces no output

Some commands (`audit`, `obligations`, `dashboard`) produce output to `reports/` and `.cohbit/` rather than stdout. Check:

```bash
ls reports/
ls .cohbit/
```

### `.cohbit/` directory not created

The `.cohbit/` directory is created automatically when you run commands like `audit` or `propose`. It stores:

```
.cohbit/
  gate_records/       Gateway state persistence
  session_ledger.jsonl  Session history
  obligations/        Obligation state
  atlas/              Atlas memory entries
```

---

## 4. Audit Issues

### `cohbit-copilot audit .` takes too long

The audit pipeline reads files up to 50MB / 500 files. On large repos, run against a specific fixture:

```bash
npx tsx src/cli.ts audit sandbox/fixtures/rust-risk-fixture
```

### Audit produces no findings

If the target has no Rust files, the current audit engine will produce 0 findings (audit is Rust-only — see `docs/known_gaps.md`).

### Audit report not found

Reports are written to `reports/v8_0_integrated_audit.md` and `reports/v8_0_integrated_audit.json`.

---

## 5. Teaching Issues

### `cohbit-copilot teach` returns a fallback summary

The teaching system uses a corpus at a hardcoded path: `C:\Users\truea\...\dictionary\TAP`. If that path doesn't exist on your machine, teaching falls back to generating a summary from the internal knowledge base. The system prints the fallback summary.

**To configure:** Edit `src/cli.ts` handleTeach() to point to your local corpus path.

### `cohbit-copilot quiz` has no matching topic

Try one of the known topics:

```bash
cohbit-copilot quiz "proposal vs authority"
cohbit-copilot quiz "why confidence is low"
cohbit-copilot quiz "what positive signals mean"
```

---

## 6. SDK/Verification Issues

### Cross-language receipt hashes don't match

If the TypeScript, Python, and Rust receipt hashes differ, check:

1. Python: `python sdks/python/tests/test_conformance.py` — requires Python 3.10+
2. Rust: `cd sdks/rust && cargo test` — requires Rust toolchain

All three should produce identical SHA-256 hashes for the 8 shared test vectors in `sdks/receipt_conformance.json`.

---

## 7. Persistence Issues

### Session history is empty

Session history is stored in `.cohbit/session_ledger.jsonl`. If this file is deleted, history is lost. Re-run commands like `propose` / `audit` to regenerate.

### Gate records lost between CLI invocations

Gate records are persisted to `.cohbit/gate_records/<proposalId>.json` (since v11.2). If you're using an older version, gate records were in-memory and lost on process exit.

---

## 8. Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Resource governor: ...` | Budget exceeded or denied | Check `T_resource_governor.ts` DEFAULT_BUDGETS for the workflowId |
| `Cannot review: current status is ...` | Pipeline state machine violation | Review requires `PROPOSED` status |
| `Cannot authorize: current status is ...` | Authorization requires `REVIEW_PASSED` status |
| `Cannot apply: current status is ...` | Apply requires `AUTHORIZED` status |
| `Cannot test: current status is ...` | Test requires `APPLIED` status |
| `Cannot commit receipt: current status is ...` | Receipt requires `TESTS_PASSED` status |
| `Admissibility check failed` | V(post) + s > V(pre) + d + a | Check spend/defect/authority values |
| `Policy hash mismatch` | Receipt declares different policy hash than proposal | Ensure proposal and authorization use same policy |

---

## 9. Cleanup

### Reset all state

```bash
rm -rf .cohbit/
rm -rf reports/
```

### Rebuild from clean

```bash
rm -rf dist/
rm -rf node_modules/
npm install
npm run build
npm run test:fast
```

---

*Runbook. Operational reference for CohBit-Copilot v10.9.0.*