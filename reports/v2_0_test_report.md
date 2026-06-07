# v2.0 Test Report

## Overall Results

| Metric | Value |
|---|---|
| Total test files | 17 |
| Total tests | 313 |
| Passing | 313 |
| Failing | 0 |
| Skipped | 0 |

## Per-File Results

| File | Tests | Status |
|---|---|---|
| `tests/conformance.test.ts` | 46 | ✅ |
| `tests/english.test.ts` | 61 | ✅ |
| `tests/hardening.test.ts` | 9 | ✅ |
| `tests/ledger.test.ts` | 8 | ✅ |
| `tests/proposer.test.ts` | 12 | ✅ |
| `tests/smoke.test.ts` | 1 | ✅ |
| `tests/symbols.test.ts` | 8 | ✅ |
| `tests/dep_graph.test.ts` | 7 | ✅ |
| `tests/workspace.test.ts` | 7 | ✅ |
| `tests/test_recommender.test.ts` | 22 | ✅ |
| `tests/patch_builder.test.ts` | 25 | ✅ |
| `tests/work.test.ts` | 15 | ✅ |
| `tests/repair.test.ts` | 18 | ✅ |
| `tests/environment.test.ts` | 8 | ✅ |
| `tests/planner.test.ts` | 54 | ✅ |
| `trials/v0.2-trial.ts` | 6 | ✅ |
| `trials/v0.4-lang-trials.ts` | 6 | ✅ |

## Test Suite Breakdown by Layer

| Layer | Tests | Description |
|---|---|---|
| v1.0 Core | 56 | Conformance vectors, admissibility law, gate lifecycle |
| v1.0E English | 61 | Intent recognition, constraint detection, target extraction, unsafe rejection |
| v1.1 Workspace | 7 | File classification, language detection, directory scanning |
| v1.2 Symbols | 15 | Symbol extraction (TS/Rust/Go/Python), dependency graph |
| v1.3 Planner | 54 | Intent inference, file routing, constraint carry-through, risk assessment |
| v1.4 Recommender | 22 | File-to-test mapping, tier priority, per-language commands |
| v1.5 Patch Builder | 25 | Six primitives, validation, scope enforcement, mutation safety |
| v1.6 Work Command | 15 | English parse, constraint detection, unsafe rejection, plan routing |
| v1.7 Repair | 18 | Failure parsing, TS error parsing, plan generation, fault tolerance |
| Integration | 16 | Environment (8) + Planner (54) — run separately with longer timeout |
| Trials | 12 | Real npm/cargo/go subprocess trials |

## Static Analysis

| Tool | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `cargo clippy` | 1 pre-existing warning (unrelated) |

## Notes

- All tests were run with `testTimeout: 60000ms` and `hookTimeout: 30000ms` to accommodate slow toolchain subprocesses.
- Python SDK tests are skipped when pytest is unavailable. Rust SDK conformance is verified.
- The test suite is split into `npm run test:fast` (239 tests, ~15s), `npm run test:integration` (62 tests, ~160s), and `npm run test:trials` (12 tests) for developer convenience.