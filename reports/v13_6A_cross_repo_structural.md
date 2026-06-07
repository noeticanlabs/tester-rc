# CohBit-Copilot v13.6A — Cross-Repo Structural Confirmation (Tier A)

**Receipt ID:** `XR_cf566347dd23`
**Generated:** 2026-06-07T13:25:54.617Z
**Version:** 13.6A.0

---

## Safe Claim

> CohBit-Copilot v13.6A performs a structural scan of three sibling codebases
> (CohBit-CTRL, AIR-prime, Cohbit-Copilot) and identifies shared architectural
> patterns across them. "Confirmed" means the same structural pattern appears
> across multiple codebases and is eligible for stronger review in Tier B.
> It does not certify correctness, promote canon, verify content, or modify
> any source. This is a structural observation only.

---

## Summary

| Metric | Value |
|--------|-------|
| Total patterns identified | 38 |
| Strong shared (3 repos) | 19 |
| Shared (2 repos) | 5 |
| Repo-specific (1 repo) | 12 |
| Missing expected | 0 |

---

## Repo Scan Overview

### CohBit-CTRL

- **Path:** `C:\Users\truea\OneDrive\Documents\New folder (2)\CohBit-CTRL`
- **Total files:** 12820
- **Top-level dirs:** 15
- **Top-level files:** 6

**Top-level directories:**
  - `.github/`
  - `benches/`
  - `Coh/`
  - `CohBit-primitive-review/`
  - `crates/`
  - `ctrl_out/`
  - `docs/`
  - `lean/`
  - `python_lib/`
  - `receipts/`
  - `reports/`
  - `scripts/`
  - `src/`
  - `target/`
  - `tests/`

**Language presence:**
  - Rust: ✅
  - Lean: ✅
  - TypeScript: ✅
  - Python: ✅
  - JavaScript: ✅

**File extensions (top 10):**
  - `.lean`: 4886
  - `.hash`: 2943
  - `.trace`: 992
  - `.olean`: 990
  - `.c`: 982
  - `.ilean`: 981
  - `.rs`: 532
  - `.md`: 102
  - `.json`: 90
  - `.py`: 55

**Layer naming patterns:**
  - L*: 3 matches
  - T*: 2 matches

### AIR-prime

- **Path:** `C:\Users\truea\OneDrive\Documents\New folder (2)\AIR-prime`
- **Total files:** 9621
- **Top-level dirs:** 9
- **Top-level files:** 7

**Top-level directories:**
  - `.github/`
  - `assets/`
  - `audit/`
  - `docs/`
  - `lean/`
  - `rust/`
  - `scripts/`
  - `test_vectors/`
  - `visualizer/`

**Language presence:**
  - Rust: ✅
  - Lean: ✅
  - TypeScript: ✅
  - Python: ✅
  - JavaScript: ✅

**File extensions (top 10):**
  - `.lean`: 9176
  - `.rs`: 85
  - `.yml`: 63
  - `.md`: 60
  - `(no ext)`: 49
  - `.json`: 33
  - `.py`: 27
  - `.js`: 24
  - `.tsx`: 18
  - `.yaml`: 18

**Layer naming patterns:**
  - L*: 6 matches
  - T*: 2 matches

### Cohbit-Copilot

- **Path:** `C:\Users\truea\OneDrive\Documents\New folder (2)\Cohbit-Copilot`
- **Total files:** 1574
- **Top-level dirs:** 14
- **Top-level files:** 8

**Top-level directories:**
  - `dist/`
  - `docs/`
  - `node_modules/`
  - `packages/`
  - `reference-verifier/`
  - `reports/`
  - `sandbox/`
  - `schemas/`
  - `sdks/`
  - `spec/`
  - `src/`
  - `tests/`
  - `test_vectors/`
  - `trials/`

**Language presence:**
  - Rust: ✅
  - Lean: ✅
  - TypeScript: ✅
  - Python: ✅
  - JavaScript: ✅

**File extensions (top 10):**
  - `.ts`: 553
  - `.map`: 538
  - `.js`: 269
  - `.md`: 79
  - `.rs`: 60
  - `.json`: 44
  - `.lean`: 9
  - `.toml`: 8
  - `(no ext)`: 5
  - `.py`: 3

**Layer naming patterns:**
  - L*: 20 matches
  - M*: 20 matches
  - R*: 20 matches
  - T*: 20 matches

---

## Identified Patterns

### Strong Shared (3 repos) (19)

| Pattern | Repos | Confidence |
|---------|-------|------------|
| Language: rust | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: lean | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: typescript | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: python | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: javascript | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: markdown | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: toml | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Language: json | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: docs/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: src/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: tests/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: test_vectors/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: lean/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: rust/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Directory: examples/ | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Layer naming: L* | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Layer naming: T* | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Atlas-like structures | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |
| Multi-language codebase (≥2 of Rust/Lean/TS/Python) | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `strongly_confirmed` |

### Shared (2 repos) (5)

| Pattern | Repos | Confidence |
|---------|-------|------------|
| Directory: reports/ | CohBit-CTRL, Cohbit-Copilot | `cross_observed` |
| Directory: schemas/ | CohBit-CTRL, Cohbit-Copilot | `cross_observed` |
| Directory: scripts/ | CohBit-CTRL, AIR-prime | `cross_observed` |
| CI/CD configuration | CohBit-CTRL, AIR-prime | `cross_observed` |
| SDK / language bindings | CohBit-CTRL, Cohbit-Copilot | `cross_observed` |

### Repo-Specific (1 repo) (12)

| Pattern | Repos | Confidence |
|---------|-------|------------|
| Directory: receipts/ | CohBit-CTRL | `observed` |
| Directory: spec/ | Cohbit-Copilot | `observed` |
| Directory: benches/ | CohBit-CTRL | `observed` |
| Directory: packages/ | Cohbit-Copilot | `observed` |
| Directory: crates/ | CohBit-CTRL | `observed` |
| Directory: sandbox/ | Cohbit-Copilot | `observed` |
| Directory: trials/ | Cohbit-Copilot | `observed` |
| Verifier/reference infrastructure | Cohbit-Copilot | `observed` |
| Receipt infrastructure | CohBit-CTRL | `observed` |
| SPEC.md or equivalent | AIR-prime | `observed` |
| Layer naming: M* | Cohbit-Copilot | `observed` |
| Layer naming: R* | Cohbit-Copilot | `observed` |

### Unknown / Info (2)

| Pattern | Repos | Confidence |
|---------|-------|------------|
| File count distribution | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `observed` |
| Top-level file count | CohBit-CTRL, AIR-prime, Cohbit-Copilot | `observed` |

---

## Pattern Detail

### P_LANG_RUST_1 — `strongly_confirmed`

- **Pattern:** Language: rust
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** rust source files detected in 3/3 repos

### P_LANG_LEAN_2 — `strongly_confirmed`

- **Pattern:** Language: lean
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** lean source files detected in 3/3 repos

### P_LANG_TYPESCRIPT_3 — `strongly_confirmed`

- **Pattern:** Language: typescript
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** typescript source files detected in 3/3 repos

### P_LANG_PYTHON_4 — `strongly_confirmed`

- **Pattern:** Language: python
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** python source files detected in 3/3 repos

### P_LANG_JAVASCRIPT_5 — `strongly_confirmed`

- **Pattern:** Language: javascript
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** javascript source files detected in 3/3 repos

### P_LANG_MARKDOWN_6 — `strongly_confirmed`

- **Pattern:** Language: markdown
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** markdown source files detected in 3/3 repos

### P_LANG_TOML_7 — `strongly_confirmed`

- **Pattern:** Language: toml
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** toml source files detected in 3/3 repos

### P_LANG_JSON_8 — `strongly_confirmed`

- **Pattern:** Language: json
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** json source files detected in 3/3 repos

### P_DIR_DOCS_9 — `strongly_confirmed`

- **Pattern:** Directory: docs/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `docs/` found in 3/3 repos

### P_DIR_SRC_10 — `strongly_confirmed`

- **Pattern:** Directory: src/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `src/` found in 3/3 repos

### P_DIR_TESTS_11 — `strongly_confirmed`

- **Pattern:** Directory: tests/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `tests/` found in 3/3 repos

### P_DIR_REPORTS_12 — `cross_observed`

- **Pattern:** Directory: reports/
- **Category:** shared_pattern
- **Repos:** CohBit-CTRL, Cohbit-Copilot
- **Description:** Directory `reports/` found in 2/3 repos. Missing: AIR-prime

### P_DIR_RECEIPTS_13 — `observed`

- **Pattern:** Directory: receipts/
- **Category:** repo_specific_pattern
- **Repos:** CohBit-CTRL
- **Description:** Directory `receipts/` found in 1/3 repos. Missing: AIR-prime, Cohbit-Copilot

### P_DIR_SCHEMAS_14 — `cross_observed`

- **Pattern:** Directory: schemas/
- **Category:** shared_pattern
- **Repos:** CohBit-CTRL, Cohbit-Copilot
- **Description:** Directory `schemas/` found in 2/3 repos. Missing: AIR-prime

### P_DIR_SPEC_15 — `observed`

- **Pattern:** Directory: spec/
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Directory `spec/` found in 1/3 repos. Missing: CohBit-CTRL, AIR-prime

### P_DIR_TEST_VECTORS_16 — `strongly_confirmed`

- **Pattern:** Directory: test_vectors/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `test_vectors/` found in 3/3 repos

### P_DIR_SCRIPTS_17 — `cross_observed`

- **Pattern:** Directory: scripts/
- **Category:** shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime
- **Description:** Directory `scripts/` found in 2/3 repos. Missing: Cohbit-Copilot

### P_DIR_BENCHES_18 — `observed`

- **Pattern:** Directory: benches/
- **Category:** repo_specific_pattern
- **Repos:** CohBit-CTRL
- **Description:** Directory `benches/` found in 1/3 repos. Missing: AIR-prime, Cohbit-Copilot

### P_DIR_LEAN_19 — `strongly_confirmed`

- **Pattern:** Directory: lean/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `lean/` found in 3/3 repos

### P_DIR_RUST_20 — `strongly_confirmed`

- **Pattern:** Directory: rust/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `rust/` found in 3/3 repos

### P_DIR_PACKAGES_21 — `observed`

- **Pattern:** Directory: packages/
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Directory `packages/` found in 1/3 repos. Missing: CohBit-CTRL, AIR-prime

### P_DIR_CRATES_22 — `observed`

- **Pattern:** Directory: crates/
- **Category:** repo_specific_pattern
- **Repos:** CohBit-CTRL
- **Description:** Directory `crates/` found in 1/3 repos. Missing: AIR-prime, Cohbit-Copilot

### P_DIR_SANDBOX_23 — `observed`

- **Pattern:** Directory: sandbox/
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Directory `sandbox/` found in 1/3 repos. Missing: CohBit-CTRL, AIR-prime

### P_DIR_TRIALS_24 — `observed`

- **Pattern:** Directory: trials/
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Directory `trials/` found in 1/3 repos. Missing: CohBit-CTRL, AIR-prime

### P_DIR_EXAMPLES_25 — `strongly_confirmed`

- **Pattern:** Directory: examples/
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Directory `examples/` found in 3/3 repos

### P_FEAT_VERIFIERPRESENCE_26 — `observed`

- **Pattern:** Verifier/reference infrastructure
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Verifier/reference infrastructure detected in 1/3 repos

### P_FEAT_RECEIPTINFRASTRUCTURE_27 — `observed`

- **Pattern:** Receipt infrastructure
- **Category:** repo_specific_pattern
- **Repos:** CohBit-CTRL
- **Description:** Receipt infrastructure detected in 1/3 repos

### P_FEAT_SPECPRESENCE_28 — `observed`

- **Pattern:** SPEC.md or equivalent
- **Category:** repo_specific_pattern
- **Repos:** AIR-prime
- **Description:** SPEC.md or equivalent detected in 1/3 repos

### P_FEAT_CICDPRESENCE_29 — `cross_observed`

- **Pattern:** CI/CD configuration
- **Category:** shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime
- **Description:** CI/CD configuration detected in 2/3 repos

### P_FEAT_SDKPRESENCE_30 — `cross_observed`

- **Pattern:** SDK / language bindings
- **Category:** shared_pattern
- **Repos:** CohBit-CTRL, Cohbit-Copilot
- **Description:** SDK / language bindings detected in 2/3 repos

### P_LAYER_L_31 — `strongly_confirmed`

- **Pattern:** Layer naming: L*
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Layer prefix "L" detected in 3/3 repos
- **Curriculum reference:** Curriculum: Code Invariant Atlas, Mathematics Atlas

### P_LAYER_T_32 — `strongly_confirmed`

- **Pattern:** Layer naming: T*
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Layer prefix "T" detected in 3/3 repos
- **Curriculum reference:** Curriculum: Code Invariant Atlas, Mathematics Atlas

### P_LAYER_M_33 — `observed`

- **Pattern:** Layer naming: M*
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Layer prefix "M" detected in 1/3 repos
- **Curriculum reference:** Curriculum: Code Invariant Atlas, Mathematics Atlas

### P_LAYER_R_34 — `observed`

- **Pattern:** Layer naming: R*
- **Category:** repo_specific_pattern
- **Repos:** Cohbit-Copilot
- **Description:** Layer prefix "R" detected in 1/3 repos
- **Curriculum reference:** Curriculum: Code Invariant Atlas, Mathematics Atlas

### P_ATLAS_35 — `strongly_confirmed`

- **Pattern:** Atlas-like structures
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Atlas-like directory structures found in 3/3 repos
- **Curriculum reference:** Curriculum: Code Invariant Atlas, Bilingual Atlas

### P_MULTILANG_36 — `strongly_confirmed`

- **Pattern:** Multi-language codebase (≥2 of Rust/Lean/TS/Python)
- **Category:** strong_shared_pattern
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Multi-language codebase pattern found in 3/3 repos
- **Curriculum reference:** Curriculum: Module 7 — Multi-Language Transition Interoperability

### P_FILECOUNT_37 — `observed`

- **Pattern:** File count distribution
- **Category:** unknown
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** File counts: CohBit-CTRL: 12820, AIR-prime: 9621, Cohbit-Copilot: 1574

### P_TOPLEVEL_38 — `observed`

- **Pattern:** Top-level file count
- **Category:** unknown
- **Repos:** CohBit-CTRL, AIR-prime, Cohbit-Copilot
- **Description:** Top-level files: CohBit-CTRL: 6, AIR-prime: 7, Cohbit-Copilot: 8

---

## Tier B Recommendation

**Recommended:** ✅ YES

**Reason:** Sufficient shared structure: 19 strongly shared + 5 shared patterns. Tier B content-aware comparison recommended.

| Threshold | Required | Actual |
|-----------|----------|--------|
| Strong shared patterns | ≥ 5 | 19 |
| Shared patterns | ≥ 10 | 5 |

---

## Attestation

CohBit-Copilot v13.6A performs a structural scan of three sibling codebases (CohBit-CTRL, AIR-prime, Cohbit-Copilot) and identifies shared architectural patterns across them. "Confirmed" means the same structural pattern appears across multiple codebases and is eligible for stronger review in Tier B. It does not certify correctness, promote canon, verify content, or modify any source. This is a structural observation only.

---

*Generated by CohBit-Copilot v13.6A Cross-Repo Structural Confirmation Pipeline*
*Receipt ID: XR_cf566347dd23*