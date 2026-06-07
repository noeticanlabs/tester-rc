# v2.0.1 Reproducibility Report

## Environment

| Field | Value |
|---|---|
| Node.js | v25.9.1 (per @types/node) |
| TypeScript | 6.0.3 |
| Vitest | 3.1.0 |
| OS | Windows 11 |
| Shell | cmd.exe |

## Verification Results

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Fast unit suite | `npm run test:fast` | ✅ 239/239 |
| 2 | Integration suite | `npm run test:integration` | ✅ 62/62 |
| 3 | Full suite | `npm run test:all` | ✅ 313/313 |
| 4 | TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| 5 | Rust SDK test | `cargo test --manifest-path sdks/rust/Cargo.toml` | ✅ 1/1 |
| 6 | Rust linter | `cargo clippy --manifest-path sdks/rust/Cargo.toml` | ✅ 1 pre-existing warning |

## CLI Smoke Tests

| # | Command | Result |
|---|---|---|
| 1 | `cohbit-copilot env` | ✅ Environment report displayed |
| 2 | `cohbit-copilot inspect` | ✅ Workspace summary displayed (142 files) |
| 3 | `cohbit-copilot plan "add a test"` | ✅ Work plan generated (8 likely files, 5 suggested tests) |
| 4 | `cohbit-copilot test-recommend "add a test"` | ✅ Test recommendations displayed |
| 5 | `cohbit-copilot work "inspect ledger only"` | ✅ Work session displayed (English parse → environment → plan → tests → next commands) |

## Known Artifacts

- **Pre-existing Rust clippy warning**: `useless_vec` in `sdks/rust/src/receipt.rs:33` (unrelated to v2.0)
- **Python SDK trials**: Skipped when pytest is unavailable (local environment has pytest=false)
- **Go SDK trials**: Skipped when go toolchain is not available or slow to respond

## Clean-Machine Notes

For a fresh clone, the only required steps are:

```bash
git clone <repo>
cd Cohbit-Copilot
npm install        # installs typescript, vitest, @types/node
npm run test:fast  # 239 tests, ~17s
npm run test:all   # 313 tests, ~180s
npx tsc --noEmit  # type check
```

No global dependencies required. No `.env` files. No database. No network calls in tests (except toolchain trials which spawn local npm/cargo/go subprocesses).

## Reproducibility Claim

The v2.0 release candidate is reproducible with zero setup beyond `npm install`. All 313 tests pass deterministically. TypeScript compiles clean. Rust SDK conformance passes. CLI commands execute correctly.