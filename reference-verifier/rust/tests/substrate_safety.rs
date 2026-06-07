mod common;
use common::{state_with_value, TestSubstrate};
use num_rational::Rational64;
use cohbit::CohBitInput;
use cohbit::types::{Hash32, DomainId, RvStatus, PlaceholderSignature};

fn mock_cohbit() -> cohbit::AcceptedCohBit {
    let input = CohBitInput {
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
        valuation_pre: Rational64::from_integer(100),
        valuation_post: Rational64::from_integer(95),
        spend: Rational64::from_integer(0),
        defect: Rational64::from_integer(10),
        delta_hat: Rational64::from_integer(10),
        authority: Rational64::from_integer(0),
        step_index: 0,
        prev_receipt_hash: None,
        chain_digest_pre: Hash32([0; 32]),
        rv_status: RvStatus::Accept,
        signature: PlaceholderSignature(vec![0; 64]),
    };
    cohbit::CohBit::new(input).unwrap()
}

#[test]
fn committed_implies_verified() {
    let substrate = TestSubstrate::new(state_with_value(100));
    let solver = substrate.solver();

    // Mixed proposals
    let proposals = vec![
        (state_with_value(90), Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)), // Valid
        (state_with_value(110), Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)), // Invalid Potential
    ];

    if let Some(receipt) = solver.governed_step(&substrate.current_state, proposals) {
        // [PROPERTY S1] Every committed transition must be verified
        assert!(receipt.proof.inner().is_admissible());
        assert_eq!(receipt.proof.inner().rv_status(), RvStatus::Accept);
    }
}

#[test]
fn rejected_displacement_has_no_state_effect() {
    let x0 = state_with_value(10);
    let substrate = TestSubstrate::new(x0.clone());
    let solver = substrate.solver();

    // Invalid proposal
    let invalid_proposals = vec![
        (state_with_value(999), Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
    ];

    let result = solver.governed_step(&substrate.current_state, invalid_proposals);

    // [PROPERTY S2] Rejection is side-effect-free
    assert!(result.is_none());
    assert_eq!(substrate.current_state, x0); // State remains x0
}
