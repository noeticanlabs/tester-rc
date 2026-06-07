# Known Limitations — CohBit-Copilot v1.0

This document describes known gaps, unsupported capabilities, and areas where the system's behavior is intentionally bounded.

## Functional Limitations

| Area | Limitation | Impact |
|------|------------|--------|
| **Patch generation** | Only exact block replacement, file creation, and off-by-one arithmetic patterns | No semantic understanding of code; cannot reason about control flow, types, or dependencies |
| **Test parsers** | Regex-based; may miss framework-specific output variants (e.g., JUnit XML, TAP format) | Some test results may not be individually parsed; summary-level results used as fallback |
| **Multi-file patches** | Proposer generates single-file proposals only | Cannot propose coordinated changes across multiple files |
| **Session persistence** | Gate records are persisted to disk via `gate_store.ts` (`.cohbit/gate_records/`); ledger events are append-only JSONL | Gate records survive across CLI processes. Ledger (`.cohbit/session_ledger.jsonl`) wired for CLI display but not yet for gate transition recording. |
| **Python trial** | Not executed locally due to missing pytest | Python path verified via receipt conformance SDK only |
| **Dotnet trial** | Parser support only; no real workspace trial | Dotnet test runner untested against real `.csproj` projects |
| **Large files** | No size limit enforcement at the snapshot or proposal level beyond `maxBytesChanged` | Very large files may consume excessive memory during snapshot |

## Runtime Limitations

| Area | Limitation | Impact |
|------|------------|--------|
| **Admissibility values** | `valuationPre`/`valuationPost` values are hardcoded as `10→11` in CLI | Real valuation tracking not implemented; admissibility law exercised in conformance tests |
| **Repository awareness** | No `git` integration beyond optional safety check mention | Cannot automatically stage, diff, or revert via version control |
| **Concurrent sessions** | No locking on `.cohbit/session_ledger.jsonl` | Concurrent writes from multiple processes may interleave lines |
| **Memory budget** | Hardcoded to 1,000,000 bytes in CLI | Not configurable per session |

## Specification Limitations

| Area | Limitation | Impact |
|------|------------|--------|
| **Zero denom** | `Rational64(5, 0)` is not rejected by `canonicalRational` — gcd returns 1, producing `5/0` | Documented in hardening tests as a known edge case; spec requires `denom ≥ 1` |
| **Extra Wedge fields** | Unspecified behavior per canonical serialization spec | Implementations must not silently incorporate unknown fields |
| **Signature verification** | `GmiStatus.signatureVerified` is always `false` (v0.4 placeholder) | No cryptographic proof of author identity |

## What Is Not Claimed

- **Autonomous coding agent** — the system proposes only bounded, scope-limited patches; it cannot navigate a large codebase, understand architecture, or refactor
- **General AI developer** — no planning, reasoning, or natural language understanding beyond pattern matching
- **Production security** — not audited; no access control, authentication, or network isolation
- **Formal verification** — Rust reference verifier and Lean proofs are reference material, not applied to the TypeScript runtime
- **Cross-language gate execution** — receipt hashing is portable; full gate pipeline runs only in TypeScript

## Next Verification Steps

1. Run Python trial when pytest is available
2. Add dotnet real-workspace trial
3. Add parser fixtures from real-world test outputs (cargo test verbose, pytest --tb=long, go test -v)
4. Implement zero-denom rejection in all three canonical serialization implementations
5. Add concurrency test for ledger append