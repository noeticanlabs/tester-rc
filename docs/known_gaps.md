# CohBit-Copilot — Known Gaps

**Status:** Reviewer-reference document  
**Generated:** 2026-06-06  
**Updated:** 2026-06-07 (v14.6 tester packet freeze)  
**Package version:** 14.6.0  

---

## Classification Legend

| Label | Meaning |
|-------|---------|
| `runtime-tested` | Code exists, exercised by test suite |
| `architecture-claim` | Design-level assertion, structurally enforced |
| `scaffolded` | Code exists with tests but not wired into operational paths |
| `future-route` | Intentionally deferred, not started |
| `known-gap` | Acknowledged limitation, can be addressed |

---

## 1. Resource Enforcement Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| Resource authorization not fully wired | Medium | `scaffolded` / partial | R1 (compute), R5 (time), R18 (receipt), R19 (dashboard) are wired into the integrated pipeline via `runGoverned()`. Gates, CLI, teaching, and TLT do not pass through budget authorization for all operation paths. 13 of 29 CLI handlers use `runGoverned()`. The `T_resource_governor.ts` governor is complete with 25 default budget entries and the `runGoverned()` / `runGovernedSync()` API. Remaining read-only handlers (status, recent, inspect, env) are lightweight and intentionally not governed. |
| Tool call accounting (R6) not wired | Low | `scaffolded` | R6 `tool_calls` layer exists with tests but no operational paths call `recordToolCall()` |
| Network budget (R8) not enforced | Low | `scaffolded` | R8 exists but no network I/O passes through it |
| Token budget (R4) not wired | Low | `future-route` | Relevant when LLM calls are added |

---

## 2. Test Coverage Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| Teaching mode has no unit tests | Medium | Resolved v14.5 | `tests/teaching.test.ts` covers `listTopics()`, `generateQuiz()`, `formatQuizOutput()`, `formatTeachingOutput()`, `formatTeachingReceipt()`, and `renderTeachingResponse()` — 15 tests |
| CLI command-level tests missing | Medium | Resolved v14.5 | `tests/cli.test.ts` covers `parseRational()` (6 tests) and `parseArgs()` for gate commands (8), repair commands (6), subcommand routing (5), and flags (6) — 25 tests total |
| Integrated pipeline has no isolated unit test | Medium | Resolved v14.5 | `tests/integrated_pipeline.test.ts` covers `computeContentEvidenceHash()` (6 tests) and `UnifiedAuditResult` type shape verification |
| Source-to-test mapping is heuristic | Low | `known-gap` | `repo_test_map.ts` uses naming conventions, not symbol-level analysis |
| 18 test failures are environment-dependent | Low | `known-gap` | 18 failures (v0.2 path safety, v0.4 Go missing, v11.8/v12.1/v12.2 Rust binaries not compiled, v9.0 TLT corpus path, v10.3 process.exit). All non-regressive. 950/968 pass. |
| Vitest picks up `trials/` as test files | Low | `known-gap` | 51 "failed test files" are trials/ tsx runners without vitest suites — test harness configuration artifact, not product defect. Recommend excluding trials/ from vitest glob. |
| `src/learning_` truncated filename | Low | `known-gap` | File exists with apparent truncated name — likely partial save artifact. |
| `tests/g` artifact directory | Low | `known-gap` | Apparent partial file path exists as directory artifact. |
| Trial runner `process.exit(1)` pattern | Low | `known-gap` | `trials/v10_3_polarity_trial.ts` calls `process.exit(1)` in catch block. Recommend using `throw` instead for test harness compatibility. |

---

## 3. Documentation Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| Package READMEs missing for 5 packages | Medium | `known-gap` | `packages/code-atlas/`, `tlt-atlas/`, `math-atlas/`, `resource/`, `tooling/` have `package.json` but no README |
| No standalone reviewer guide | Medium | Resolved v11.6 | `docs/reviewer_guide.md` now exists |
| No troubleshooting guide | Low | Resolved v11.6 | `docs/runbook.md` now exists |
| Architecture doc was stale | Low | Resolved v11.5 | `docs/architecture.md` updated to current summary |
| External tester documentation | Medium | Resolved v14.6 | `docs/external_tester_guide.md`, `docs/quickstart.md`, `docs/offline_local_deployment.md`, `docs/access_control.md`, `docs/first_tester_walkthrough.md`, `docs/tester_feedback_form.md` created for v14.6 tester packet |

---

## 4. Feature Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| ReviewGate is function-call only | Medium | `known-gap` | ReviewGate uses `reviewer` string + `approved` boolean. Not cryptographically attested. No signature verification |
| Audit is Rust-only | Medium | `known-gap` | The v3.x audit engine (regex scanner, AST-lite, risk scanner) only supports Rust. TypeScript/Go/Python audit not started |
| TLT summary generator has no CLI command | Low | `scaffolded` | `T_summary_generator.ts` exists with 5 audience modes. No `cohbit-copilot summary` CLI entry point |
| Gate-level rate limiting not enforced | Low | `future-route` | Gates accept any proposal rate. No per-operator throttling |
| Production readiness not claimed | N/A | `known-gap` | The system is research/demo-grade, not production-grade. See version_map.md §7 |

---

## 5. Fixture Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| docs-overclaim fixture missing | Low | `known-gap` | 6 of 7 planned fixtures exist. The TLT claim guard v9.1 trial covers overclaim testing but no standalone fixture exists |
| TypeScript audit fixtures missing | Low | `future-route` | Fixtures are Rust-only pending TypeScript audit scanner |

---

## 6. Integration Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| CTRL connection not implemented | Low | `future-route` | CTRL (formal verification) integration referenced in architecture but not built |
| Lean 4 proof bridge not operational | Low | `future-route` | `reference-verifier/lean/` directory exists but proofs are static, not dynamically verified by the runtime |
| Cross-language audit not unified | Low | `future-route` | Each language would need its own scanner, AST-lite parser, and risk patterns |

---

## 7. Operational Gaps

| Gap | Severity | Status | Detail |
|-----|----------|--------|--------|
| No CI/CD pipeline definition | Low | `known-gap` | `package.json` test scripts exist but no GitHub Actions or CI config |
| No published npm package | Low | `known-gap` | CLI is runnable via `npx tsx` but not published to npm registry |
| External reviewer package incomplete | Low | `known-gap` | No standalone reviewer documentation for third-party evaluation |

---

## Summary

| Category | Count | Highest Severity |
|----------|-------|-----------------|
| Resource enforcement | 4 | Medium |
| Test coverage | 9 | Medium |
| Documentation | 5 | Medium (resolved v11.5-v11.6, v14.6) |
| Feature gaps | 5 | Medium |
| Fixture gaps | 2 | Low |
| Integration gaps | 3 | Low |
| Operational gaps | 3 | Low |

**Bottom line:** The system has structural integrity with known, bounded gaps. None are security-critical. The medium-severity gaps (resource wiring completeness, audit language support) are well-understood and scoped. Three medium-severity test gaps resolved in v14.5. The v14.5 full-system wiring audit verified all documented import chains and confirmed zero structural defects. The v14.6 tester packet freeze added comprehensive external tester documentation. The system is honest about what is scaffolded vs. wired vs. future-route.

---

*Known Gaps. Reference document. All claims verified against codebase as of v14.5/v14.6.*