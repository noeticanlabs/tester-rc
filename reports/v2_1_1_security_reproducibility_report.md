# v2.1.1 Security Reproducibility Report

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
| 1 | Full test suite (all 359) | `npm run test:all` | ✅ 359/359 |
| 2 | TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| 3 | Rust SDK test | `cargo test --manifest-path sdks/rust/Cargo.toml` | ✅ 1/1 |
| 4 | CLI: env | `npx tsx src/cli.ts env` | ✅ Environment report displayed |
| 5 | CLI: inspect | `npx tsx src/cli.ts inspect` | ✅ Workspace summary displayed |
| 6 | CLI: plan | `npx tsx src/cli.ts plan "fix unsafe path handling"` | ✅ Work plan generated |
| 7 | CLI: repair | `npx tsx src/cli.ts repair "src/x.ts(1,1): error TS2304:"` | ✅ Repair plan generated |
| 8 | CLI: work | `npx tsx src/cli.ts work "inspect ledger only"` | ✅ Work session orchestrated |

## Security Smoke Tests

| # | Check | Result |
|---|---|---|
| 1 | Path traversal blocked | ✅ `validateProposalStructure()` rejects malformed paths |
| 2 | Unsafe English blocked | ✅ `parseOperatorEnglish("apply without authorization").confidence === 'unsafe'` |
| 3 | Ledger corruption safe | ✅ `loadRecentSessions()` handles corrupted JSONL lines |
| 4 | Malformed proposal rejected | ✅ Structural validation rejects null proposals, empty files, bad actions |
| 5 | Duplicate session IDs safe | ✅ Multiple events with same ID append without crash |
| 6 | Rollback hash mismatch | ✅ Produces warnings, doesn't crash |

## Security Test Suite

| File | Tests | Coverage |
|---|---|---|
| `tests/security_path.test.ts` | 10 | Path traversal, workspace boundary, file existence |
| `tests/security_proposal.test.ts` | 10 | Malformed proposals, valid proposals, boundary checks |
| `tests/security_ledger.test.ts` | 8 | Corrupted lines, duplicate IDs, fault tolerance |
| `tests/security_rollback.test.ts` | 8 | Hash mismatch, partial apply, snapshot integrity |
| `tests/security_english.test.ts` | 10 | Unsafe detection, constraint enforcement, fault tolerance |

## Known Artifacts

- **Pre-existing Rust clippy warning**: `useless_vec` in `sdks/rust/src/receipt.rs:33` (unrelated to v2.1)
- **Python SDK trials**: Skipped when pytest is unavailable
- **Null byte path behavior**: Node.js on Windows does not throw on `path.resolve()` with null bytes; defense is at `isWithinScope()` boundary check
- **Empty snapshot rollback**: Returns `success: false` when no files exist to restore (correct behavior)

## Reproducibility Claim

The v2.1 security-hardened release candidate is reproducible with zero setup beyond `npm install`. All 359 tests pass deterministically, all 46 security-specific tests verify hardened behavior across paths, proposals, ledger, rollback, and English parsing. TypeScript compiles clean. Rust SDK conformance passes.

## Security Hardening Summary

| Area | Mechanism | Verified |
|---|---|---|
| Path traversal | `isWithinScope()` with `path.resolve()` boundary check | ✅ |
| Malformed proposals | `validateProposalStructure()` blocks null, empty, bad actions | ✅ |
| Unsafe English | 3 new patterns: apply-without-auth, skip-verification, push-to-main | ✅ |
| Ledger resilience | Corrupted lines skipped, duplicates append safely, large payloads handled | ✅ |
| Rollback integrity | Hash mismatch warnings, missing file tolerance, snapshot hash format validation | ✅ |