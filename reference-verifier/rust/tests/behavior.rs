use cohbit::error::CohBitReject;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use cohbit::CohBit;
use cohbit::CohBitInput;
use num_rational::Rational64;
use serde_json::Value;
use std::fs;

fn mock_input() -> CohBitInput {
    CohBitInput {
        version: 1,
        domain: DomainId(Hash32([0; 32])),
        bit_id: Hash32([1; 32]),
        from_state: Hash32([2; 32]),
        to_state: Hash32([3; 32]),
        action_hash: Hash32([4; 32]),
        prior_state_root: Hash32([5; 32]),
        verifier_id: Hash32([6; 32]),
        canon_profile_hash: Hash32([10; 32]),
        policy_hash: Hash32([11; 32]),
        certificate_hash: Hash32([7; 32]),
        valuation_pre: Rational64::from_integer(10),
        valuation_post: Rational64::from_integer(8),
        spend: Rational64::from_integer(3),
        defect: Rational64::from_integer(1),
        delta_hat: Rational64::from_integer(2),
        authority: Rational64::from_integer(0),
        step_index: 0,
        prev_receipt_hash: None,
        chain_digest_pre: Hash32([0; 32]),
        rv_status: RvStatus::Accept,
        signature: PlaceholderSignature(vec![0; 64]),
    }
}

fn reject_from_name(name: &str) -> CohBitReject {
    match name {
        "NonCanonicalEncoding" => CohBitReject::NonCanonicalEncoding,
        "BadReceiptHash" => CohBitReject::BadReceiptHash,
        "BadSignature" => CohBitReject::BadSignature,
        "CertificateRejected" => CohBitReject::CertificateRejected,
        "DefectExceedsDeltaHat" => CohBitReject::DefectExceedsDeltaHat,
        "NegativeMargin" => CohBitReject::NegativeMargin,
        "AuthorityExceedsCap" => CohBitReject::AuthorityExceedsCap,
        "StateHashMismatch" => CohBitReject::StateHashMismatch,
        "ChainIndexMismatch" => CohBitReject::ChainIndexMismatch,
        "ChainDigestMismatch" => CohBitReject::ChainDigestMismatch,
        "PreviousReceiptMismatch" => CohBitReject::PreviousReceiptMismatch,
        "ExecutionMismatch" => CohBitReject::ExecutionMismatch,
        "UnsupportedVersion" => CohBitReject::UnsupportedVersion,
        other => panic!("Unknown reject code in golden vector: {other}"),
    }
}

fn tampered_raw_bit(input_json: &Value) -> Option<CohBit> {
    let has_tamper = input_json["chain_digest_post_tamper"].is_string()
        || input_json["receipt_hash_tamper"].is_string()
        || input_json["state_root_override"].is_string();

    if !has_tamper {
        return None;
    }

    let mut raw_json = serde_json::to_value(
        CohBit::new(serde_json::from_value::<CohBitInput>(input_json.clone()).unwrap()).unwrap(),
    )
    .unwrap();

    if let Some(s) = input_json["chain_digest_post_tamper"].as_str() {
        raw_json["chain_digest_post"] = Value::String(s.to_string());
    }

    if let Some(s) = input_json["receipt_hash_tamper"].as_str() {
        raw_json["receipt_hash"] = Value::String(s.to_string());
    }

    if let Some(s) = input_json["state_root_override"].as_str() {
        raw_json["prior_state_root"] = Value::String(s.to_string());
    }

    Some(serde_json::from_value(raw_json).unwrap())
}

#[test]
fn test_long_chain_stability() {
    let mut chain = Vec::new();
    let mut current_input = mock_input();
    current_input.valuation_pre = Rational64::from_integer(1000);
    current_input.valuation_post = Rational64::from_integer(1000);
    current_input.spend = Rational64::from_integer(1);
    current_input.defect = Rational64::from_integer(1);

    for i in 0..100 {
        let bit = CohBit::new(current_input.clone()).unwrap();
        current_input.from_state = *bit.inner().to_state();
        current_input.to_state = Hash32([i as u8; 32]);
        current_input.prev_receipt_hash = Some(*bit.inner().receipt_hash());
        current_input.step_index = bit.inner().step_index() + 1;
        current_input.chain_digest_pre = *bit.inner().chain_digest_post();
        chain.push(bit);
    }

    assert!(cohbit::Verifier::verify_chain(&chain).is_ok());
}

#[test]
fn test_golden_vectors() {
    let paths = fs::read_dir("../test_vectors").expect("Could not read test_vectors directory");

    for path in paths {
        let path = path.unwrap().path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = fs::read_to_string(&path).expect("Could not read vector file");
            let vector: serde_json::Value =
                serde_json::from_str(&content).expect("Invalid JSON in vector");

            let is_valid = vector["expected"]["valid"].as_bool().unwrap_or(true);
            let input_json = &vector["input"];
            
            if input_json.is_null() {
                continue; // Skip files that are not structured vectors (e.g. adversarial_cases.json)
            }
            let expected_error = vector["expected"]["error"].as_str().map(reject_from_name);

            if is_valid {
                let input: CohBitInput = serde_json::from_value(input_json.clone()).unwrap();
                let bit = CohBit::new(input).unwrap_or_else(|err| {
                    panic!("Valid vector {:?} failed constructor: {:?}", path, err)
                });

                if let Some(admissible) = vector["expected"]["admissible"].as_bool() {
                    assert_eq!(
                        bit.inner().is_admissible(),
                        admissible,
                        "Vector {:?} admissibility mismatch",
                        path
                    );
                }
            } else {
                let actual_error = if let Some(bit) = tampered_raw_bit(input_json) {
                    bit.validate()
                        .expect_err("Tampered golden vector unexpectedly validated")
                } else {
                    let input: CohBitInput = serde_json::from_value(input_json.clone()).unwrap();
                    CohBit::new(input).expect_err("Invalid golden vector unexpectedly constructed")
                };

                assert_eq!(
                    Some(actual_error),
                    expected_error,
                    "Invalid vector {:?} produced the wrong reject code",
                    path
                );
            }
        }
    }
}

#[test]
fn test_memory_mass_determinism() {
    let input = mock_input();
    let bit = CohBit::new(input).unwrap();

    assert_eq!(bit.inner().memory_mass(), bit.inner().to_canonical_bytes().len());
    assert_eq!(bit.inner().memory_mass(), bit.inner().memory_mass());
    
    // Test that JSON serialization is also deterministic
    let j1 = serde_json::to_string(bit.inner()).unwrap();
    let j2 = serde_json::to_string(bit.inner()).unwrap();
    assert_eq!(j1, j2);
}

#[test]
fn test_computational_mass_consistency() {
    let input = mock_input();
    let bit = CohBit::new(input).unwrap();
    
    // M = V + D + R (in the primitive, we assume risk is 0 for simplicity if not in a solver context)
    // Actually CohAtom has a risk field.
    let expected = *bit.inner().valuation_pre() + *bit.inner().defect();
    // Since CohBit doesn't have a risk field (it's in the atom), 
    // computational mass is primarily for atoms.
    // Let's test the atom directly.
    use cohbit::ufe::atom::CohAtom;
    let atom = CohAtom {
        coherence: Rational64::from_integer(1),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(10),
        defect: Rational64::from_integer(2),
        spend: Rational64::from_integer(1),
        risk: Rational64::from_integer(3),
        mass: Rational64::from_integer(0),
        invariants: vec![],
    };
    
    assert_eq!(atom.computational_mass(), Rational64::from_integer(15)); // 10 + 2 + 3
}
