# Cohbit-Copilot Python SDK — Receipt Hashing (v0.5)
# Deterministic canonical serialization + SHA-256 matching TypeScript implementation.
# Zero external dependencies — uses only stdlib hashlib + math.

import hashlib
import math
from .types import Rational64, Wedge, CohBitReceipt


# ─── Canonical Serialization ───────────────────────────────────
# SPEC.md Canonical Mandate: M_mem is defined strictly over the byte
# length of the canonical serialization.

def _canonical_rational(r: Rational64) -> str:
    """Reduce to simplest form via GCD for deterministic serialization."""
    g = math.gcd(abs(r.numer), r.denom)
    if g == 0:
        g = 1
    sign = -1 if r.numer < 0 else 1
    return f"{sign * abs(r.numer) // g}/{r.denom // g}"


def _canonical_wedge(w: Wedge) -> str:
    """Fixed-order pipe-joined fields matching TypeScript canonicalWedge()."""
    return "|".join([
        f"v:{w.version}",
        f"d:{w.domain_id}",
        f"p:{w.policy_hash}",
        f"f:{w.from_state}",
        f"a:{w.action_hash}",
        f"t:{w.to_state}",
        f"s:{_canonical_rational(w.spend)}",
        f"e:{_canonical_rational(w.defect)}",
        f"z:{_canonical_rational(w.prescribed_envelope)}",
        f"u:{_canonical_rational(w.authority)}",
        f"c:{w.certificate_hash}",
    ])


def canonical_receipt(r: CohBitReceipt) -> str:
    """Canonical receipt string matching TypeScript canonicalReceipt()."""
    return "|".join([
        f"pre:{_canonical_rational(r.valuation_pre)}",
        f"post:{_canonical_rational(r.valuation_post)}",
        f"w:[{_canonical_wedge(r.wedge)}]",
    ])


# ─── Receipt Hashing ───────────────────────────────────────────
def hash_receipt(receipt: CohBitReceipt) -> str:
    """Deterministic SHA-256 hash matching TypeScript hashReceipt()."""
    canonical = canonical_receipt(receipt)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()