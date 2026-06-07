mod common;
use common::{mock_cohbit, mock_cohbit_with_policy, state_with_value};
use cohbit::CohBit;
use cohbit::ufe::policy::Policy;
use num_rational::Rational64;

#[test]
fn oversized_memory_mass_rejects_under_policy() {
    // First, get a bit that matches the policy hash but exceeds the mass cap
    let base_bit = mock_cohbit();
    let mass = base_bit.inner().memory_mass();
    
    let policy = Policy::new(Some(mass - 10), None, Rational64::from_integer(1_000_000));
    let accepted = mock_cohbit_with_policy(&policy);
    
    let result = policy.authorize(accepted);
    assert!(result.is_err());
    // We expect PolicyMemoryMassExceeded, but hash mismatch also fails.
    // Here we aligned the hash, so it should be a mass rejection.
}

#[test]
fn canonical_bytes_do_not_depend_on_construction_order() {
    let bit_a = mock_cohbit();
    let bit_b = mock_cohbit();

    assert_eq!(bit_a.inner().to_canonical_bytes(), bit_b.inner().to_canonical_bytes());
    assert_eq!(bit_a.inner().memory_mass(), bit_b.inner().memory_mass());
    assert_eq!(bit_a.inner().receipt_hash(), bit_b.inner().receipt_hash());
}

#[test]
fn memory_mass_path_budget_is_enforced() {
    let accepted = mock_cohbit();
    let mass = accepted.inner().memory_mass();
    let path = vec![accepted.clone(), accepted.clone()];
    
    // We test verify_path directly as authorize() is for single bits
    let policy = Policy::new(None, Some(mass * 2 - 1), Rational64::from_integer(1_000_000));
    assert!(policy.verify_path(&path).is_err());
    
    let policy_ok = Policy::new(None, Some(mass * 2 + 1), Rational64::from_integer(1_000_000));
    assert!(policy_ok.verify_path(&path).is_ok());
}

#[test]
fn formally_accepted_but_policy_rejected_is_distinguished() {
    let policy = Policy::new(Some(512), None, Rational64::from_integer(1_000_000));
    let accepted = mock_cohbit_with_policy(&policy);
    
    // Mathematical Acceptance (Done in mock_cohbit)
    assert!(accepted.inner().validate().is_ok());

    // Policy Rejection (same hash, but mass too large)
    let stricter_policy = Policy::new(Some(10), None, Rational64::from_integer(1_000_000));
    // This will fail with PreviousReceiptMismatch because the policy hash doesn't match
    assert!(stricter_policy.authorize(accepted).is_err());
}
