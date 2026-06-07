# Cohbit-Copilot Python SDK — Conformance Tests (v0.5)
# Verifies 8 canonical receipt hashes match the TypeScript reference.

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from cohbit_copilot.types import Rational64, Wedge, CohBitReceipt
from cohbit_copilot.receipt import hash_receipt

VECTORS_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'receipt_conformance.json')


def load_vectors():
    with open(VECTORS_PATH, 'r') as f:
        return json.load(f)


def build_receipt(inp: dict) -> CohBitReceipt:
    return CohBitReceipt(
        bit_id="",
        valuation_pre=Rational64(**inp["valuationPre"]),
        valuation_post=Rational64(**inp["valuationPost"]),
        wedge=Wedge(
            version=inp["version"],
            domain_id=inp["domainId"],
            policy_hash=inp["policyHash"],
            from_state=inp["fromState"],
            action_hash=inp["actionHash"],
            to_state=inp["toState"],
            spend=Rational64(**inp["spend"]),
            defect=Rational64(**inp["defect"]),
            prescribed_envelope=Rational64(**inp["prescribedEnvelope"]),
            authority=Rational64(**inp["authority"]),
            certificate_hash=inp["certificateHash"],
        ),
    )


def test_all_vectors():
    vectors = load_vectors()
    results = []
    for v in vectors:
        receipt = build_receipt(v["input"])
        computed = hash_receipt(receipt)
        expected = v["hash_expected"]
        passed = computed == expected
        results.append((v["name"], passed, computed, expected))
    return results


def main():
    results = test_all_vectors()
    passed = sum(1 for _, p, _, _ in results if p)
    total = len(results)

    print(f"\nPython SDK Conformance: {passed}/{total} vectors match\n")

    all_pass = True
    for name, ok, computed, expected in results:
        status = "PASS" if ok else "FAIL"
        if not ok:
            all_pass = False
        print(f"  [{status}] {name}")
        if not ok:
            print(f"          Expected: {expected}")
            print(f"          Got:      {computed}")

    print()
    if all_pass:
        print("SUCCESS: All Python vectors match TypeScript reference.")
    else:
        print("ERROR: Some vectors do NOT match.")
        sys.exit(1)


if __name__ == '__main__':
    main()