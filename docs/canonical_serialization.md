# Canonical Serialization Specification — CohBit Receipt (v0.6)

## Purpose

This document defines the deterministic byte-level encoding used to produce a stable SHA-256 receipt hash from a `CohBitReceipt`. Any implementation that reproduces this serialization will produce an identical hash, enabling cross-language receipt verification without trusting the original runtime.

## Format

```
pre:RATIONAL|post:RATIONAL|w:[WEDGE_FIELDS]
```

Where `WEDGE_FIELDS` is a fixed-order, pipe-joined sequence of 11 labeled fields:

```
v:VERSION|d:DOMAIN_ID|p:POLICY_HASH|f:FROM_STATE|a:ACTION_HASH|t:TO_STATE|s:SPEND|e:DEFECT|z:ENVELOPE|u:AUTHORITY|c:CERTIFICATE_HASH
```

### Labels

| Label | Field | Type |
|-------|-------|------|
| `v` | version | string |
| `d` | domainId | 64-char hex |
| `p` | policyHash | 64-char hex |
| `f` | fromState | 64-char hex |
| `a` | actionHash | 64-char hex |
| `t` | toState | 64-char hex |
| `s` | spend | Rational64 |
| `e` | defect | Rational64 |
| `z` | prescribedEnvelope | Rational64 |
| `u` | authority | Rational64 |
| `c` | certificateHash | 64-char hex |

## Rational64 Canonical Form

A `Rational64` value `(numer, denom)` is serialized as:

```
SIGN + REDUCED_NUMER / REDUCED_DENOM
```

1. Compute `g = gcd(abs(numer), denom)`. If `g == 0`, set `g = 1`.
2. `reduced_numer = numer / g`, `reduced_denom = denom / g`.
3. `sign = "-"` if `reduced_numer < 0`, else `""`.
4. Output: `sign + abs(reduced_numer) + "/" + reduced_denom`.

### Examples

| Input | Reduced | Canonical |
|-------|---------|-----------|
| `(2, 2)` | `(1, 1)` | `1/1` |
| `(0, 5)` | `(0, 1)` | `0/1` |
| `(-1, 1)` | `(-1, 1)` | `-1/1` |
| `(3, 1)` | `(3, 1)` | `3/1` |
| `(100, 10)` | `(10, 1)` | `10/1` |

## Hash Computation

```
SHA-256(canonical_string.encode("utf-8"))
```

Output: 64-character lowercase hexadecimal string.

## Required Fields

All 13 fields are required for valid canonical serialization:

- 2 valuation fields: `valuationPre`, `valuationPost`
- 11 wedge fields: all listed above

If any field is missing, the implementation must reject the receipt rather than silently produce a hash from incomplete data.

## Field Ordering

Field ordering within the canonical string is fixed and immutable. Swapping field labels (e.g., `v` and `d`) produces a different canonical string and therefore a different hash. There is no normalization of field order; the order is part of the spec.

## Integer Representation

- `numer` and `denom` are signed 64-bit integers.
- `denom` must be ≥ 1.
- `numer = 0` with any `denom ≥ 1` reduces to `0/1`.
- `denom = 0` is rejected.

## String Encoding

- All hex fields: exactly 64 lowercase hex characters.
- Rational fields: produced by GCD reduction as specified above.
- The canonical string is a UTF-8 encoded byte sequence before hashing.
- No trailing newlines, spaces, or other whitespace are part of the canonical string.
- Whitespace in input values is not trimmed — hex strings are used as-is.

## Extra Fields

Extra fields in the Wedge beyond the 11 specified are **unspecified behavior**. Implementations:
- Must not silently incorporate unknown fields into the canonical string.
- May reject receipts containing extra fields as structurally invalid.
- Must not alter the hash of a valid receipt due to extra fields on a different receipt.

## Stability Guarantee

Given the same `CohBitReceipt` input:

1. `canonical_receipt()` produces the same UTF-8 string.
2. `SHA-256()` produces the same 64-char lowercase hex hash.
3. This holds across TypeScript, Python, and Rust implementations that follow this spec.

## References

- `src/receipt.ts` — TypeScript reference implementation
- `sdks/python/cohbit_copilot/receipt.py` — Python implementation
- `sdks/rust/src/receipt.rs` — Rust implementation
- `sdks/receipt_conformance.json` — 8 shared test vectors
- `test_vectors/canonical_hardening.json` — 8 edge-case hardening vectors