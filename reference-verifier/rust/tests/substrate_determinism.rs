mod common;
use common::{mock_cohbit};
use num_rational::Rational64;
use serde_json;

#[test]
fn receipt_serialization_is_canonical() {
    let r = mock_cohbit();
    
    let bytes1 = serde_json::to_vec(&r).unwrap();
    let bytes2 = serde_json::to_vec(&r).unwrap();
    
    // [PROPERTY D1] Serialization is canonical/deterministic
    assert_eq!(bytes1, bytes2);
}

#[test]
fn receipt_hash_is_invariant_under_replay() {
    let r = mock_cohbit();
    assert_eq!(r.inner().receipt_hash(), r.inner().receipt_hash());

    let r2 = mock_cohbit();
    assert_eq!(r.inner().receipt_hash(), r2.inner().receipt_hash());
}

#[test]
fn mutation_changes_receipt_hash() {
    let r = mock_cohbit();
    let original_hash = *r.inner().receipt_hash();

    let mut input = r.inner().input();
    input.valuation_post += Rational64::from_integer(1);
    
    let r_mut = cohbit::CohBit::new(input).unwrap();
    assert_ne!(*r_mut.inner().receipt_hash(), original_hash);
}
