mod common;
use common::{mock_cohbit};
use cohbit::CohBit;
use cohbit::types::{DomainId, Hash32};
use num_rational::Rational64;

#[test]
fn mutation_of_domain_changes_hash() {
    let r = mock_cohbit();
    let mut input = r.inner().input();
    input.domain = DomainId(Hash32([9u8; 32]));
    
    match cohbit::CohBit::new(input) {
        Ok(bit) => assert_ne!(bit.inner().receipt_hash(), r.inner().receipt_hash()),
        Err(_) => panic!("Valid mutation failed"),
    }
}

#[test]
fn mutation_of_bit_id_changes_hash() {
    let r = mock_cohbit();
    let mut input = r.inner().input();
    input.bit_id = Hash32([9u8; 32]);
    
    match cohbit::CohBit::new(input) {
        Ok(bit) => assert_ne!(bit.inner().receipt_hash(), r.inner().receipt_hash()),
        Err(_) => panic!("Valid mutation failed"),
    }
}

#[test]
fn mutating_valuation_invalidates_receipt() {
    let r = mock_cohbit();
    let mut input = r.inner().input();
    
    input.valuation_post += Rational64::from_integer(1000);
    
    let r_mut = cohbit::CohBit::new(input);
    assert!(r_mut.is_err()); // This should definitely fail admissibility
}
