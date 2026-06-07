# Known Failing Tests

Status key: ✅ Fixed | 🔧 Unresolved | 📦 Intentionally Archived | ❌ No Longer Applicable

## Historical Failures (Archived)

All historical test logs have been moved to `reports/archive/`. These represent past states and are not current.

| Log File | Status | Notes |
|----------|--------|-------|
| `reports/archive/phase4_check.txt` | 📦 Archived | Historical compile check |
| `reports/archive/phase4_tests.txt` | 📦 Archived | Historical test run |
| `reports/archive/phase6a_check.txt` | 📦 Archived | `RefusalDisciplineVerifier` compile failure — fixed in later phase |
| `reports/archive/phase6a_tests.txt` | 📦 Archived | Historical test run |
| `reports/archive/phase6a_tests2.txt` | 📦 Archived | Refusal-discipline test failures — resolved |
| `reports/archive/phase6a_tests3.txt` | 📦 Archived | Refusal-discipline test failures — resolved |
| `reports/archive/phase9_tests.txt` | 📦 Archived | Historical test run |
| `reports/archive/test_results.txt` | 📦 Archived | Historical aggregate |

## Current Known Issues

| Issue | Status | Target |
|-------|--------|--------|
| `language_development_ladder_benchmark FAILED` | 🔧 Unresolved | Needs investigation |
| `critical failure: Overclaim accepted as proof` | 🔧 Unresolved | Security audit item |
| Lean sorries in all formalization files | 🔧 Unresolved | Axiomatic proof spine — intentional |
| Test vectors may need update for new nonnegative checks | 🔧 Unresolved | Pending Rust toolchain run |
| Duplicate checkpoint files (`checkpoint_model_v1_6.json` / `checkpoint_model_v1_6_best.json`) | 🔧 Unresolved | Verify if identical; remove redundant if so |

## Test Count Notes

Some test logs showed:
```
0 passed; 0 failed; filtered out
```

These represent filtered/unmatched tests, not true passes. Release reports should count only actually executed tests.

## Verification Commands

```bash
# Run all Rust tests (requires Rust toolchain)
cd rust && cargo test --workspace --all-targets

# Check Lean proof spine
cd lean && lake build

# Audit for sorries
grep -R "sorry" lean/CohBit/ lean/targets/