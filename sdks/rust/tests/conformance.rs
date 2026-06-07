// Cohbit-Copilot Rust SDK — Conformance Test (v0.5)
// Verifies 8 canonical receipt hashes match the TypeScript reference.

use cohbit_copilot_sdk::types::{Rational64, Wedge, CohBitReceipt};
use cohbit_copilot_sdk::receipt::hash_receipt;
use serde::Deserialize;

#[derive(Deserialize)]
struct TestVector {
    name: String,
    #[allow(dead_code)]
    description: String,
    input: VectorInput,
    hash_expected: String,
}

#[derive(Deserialize)]
struct VectorInput {
    valuationPre: RationalInput,
    valuationPost: RationalInput,
    version: String,
    domainId: String,
    policyHash: String,
    fromState: String,
    actionHash: String,
    toState: String,
    spend: RationalInput,
    defect: RationalInput,
    prescribedEnvelope: RationalInput,
    authority: RationalInput,
    certificateHash: String,
}

#[derive(Deserialize)]
struct RationalInput {
    numer: i64,
    denom: i64,
}

fn load_vectors() -> Vec<TestVector> {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../receipt_conformance.json");
    let data = std::fs::read_to_string(path).expect("Failed to read receipt_conformance.json");
    serde_json::from_str(&data).expect("Failed to parse receipt_conformance.json")
}

fn build_receipt(inp: &VectorInput) -> CohBitReceipt {
    CohBitReceipt {
        bit_id: String::new(),
        valuation_pre: Rational64 { numer: inp.valuationPre.numer, denom: inp.valuationPre.denom },
        valuation_post: Rational64 { numer: inp.valuationPost.numer, denom: inp.valuationPost.denom },
        wedge: Wedge {
            version: inp.version.clone(),
            domain_id: inp.domainId.clone(),
            policy_hash: inp.policyHash.clone(),
            from_state: inp.fromState.clone(),
            action_hash: inp.actionHash.clone(),
            to_state: inp.toState.clone(),
            spend: Rational64 { numer: inp.spend.numer, denom: inp.spend.denom },
            defect: Rational64 { numer: inp.defect.numer, denom: inp.defect.denom },
            prescribed_envelope: Rational64 { numer: inp.prescribedEnvelope.numer, denom: inp.prescribedEnvelope.denom },
            authority: Rational64 { numer: inp.authority.numer, denom: inp.authority.denom },
            certificate_hash: inp.certificateHash.clone(),
        },
    }
}

#[test]
fn test_all_vectors() {
    let vectors = load_vectors();
    assert!(!vectors.is_empty(), "No test vectors loaded");

    let mut passed = 0;
    let total = vectors.len();

    for v in &vectors {
        let receipt = build_receipt(&v.input);
        let computed = hash_receipt(&receipt);
        let ok = computed == v.hash_expected;

        if ok {
            passed += 1;
        } else {
            eprintln!(
                "FAIL [{}]:\n  Expected: {}\n  Got:      {}",
                v.name, v.hash_expected, computed
            );
        }
    }

    println!("\nRust SDK Conformance: {}/{} vectors match\n", passed, total);

    if passed == total {
        println!("All Rust vectors match TypeScript reference.");
    } else {
        panic!("{}/{} vectors do NOT match", total - passed, total);
    }
}

// ─── v11.8 Rust Receipt Gate Payload Test ─────────────────────
// Reads a single-vector payload from sdks/rust/gate_payload.json
// and verifies the hash. Used by the TypeScript bridge.

#[test]
fn test_gate_payload() {
    let gate_path = concat!(env!("CARGO_MANIFEST_DIR"), "/gate_payload.json");
    let data = match std::fs::read_to_string(gate_path) {
        Ok(d) => d,
        Err(_) => {
            println!("VERIFIED skipped (no gate_payload.json)");
            return;
        }
    };
    let payloads: Vec<TestVector> = serde_json::from_str(&data)
        .expect("Failed to parse gate_payload.json");

    assert!(!payloads.is_empty(), "Gate payload is empty");

    for v in &payloads {
        let receipt = build_receipt(&v.input);
        let computed = hash_receipt(&receipt);

        if computed == v.hash_expected {
            println!("VERIFIED {}", computed);
        } else {
            eprintln!(
                "MISMATCH expected:{} got:{}",
                v.hash_expected, computed
            );
            panic!(
                "Gate payload MISMATCH: expected {}, got {}",
                v.hash_expected, computed
            );
        }
    }
}
