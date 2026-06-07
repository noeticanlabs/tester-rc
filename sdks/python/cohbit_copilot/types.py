# Cohbit-Copilot Python SDK — Core Types (v0.5)
# Mirrors the TypeScript Rational64, Wedge, and CohBitReceipt structures
# for conformance testing. Not a production client library.

from dataclasses import dataclass


@dataclass
class Rational64:
    """Rational valuation type matching cohbit_receipt.schema.json"""
    numer: int
    denom: int  # minimum 1

    def reduced(self) -> "Rational64":
        import math
        g = math.gcd(abs(self.numer), self.denom)
        return Rational64(self.numer // g, self.denom // g)


@dataclass
class Wedge:
    """11-Term Wedge Law from expanded SPEC.md"""
    version: str
    domain_id: str       # 64-char hex
    policy_hash: str     # 64-char hex
    from_state: str      # 64-char hex
    action_hash: str     # 64-char hex
    to_state: str        # 64-char hex
    spend: Rational64
    defect: Rational64
    prescribed_envelope: Rational64
    authority: Rational64
    certificate_hash: str  # 64-char hex


@dataclass
class CohBitReceipt:
    """Matching cohbit_receipt.schema.json"""
    bit_id: str           # 64-char hex
    valuation_pre: Rational64
    valuation_post: Rational64
    wedge: Wedge