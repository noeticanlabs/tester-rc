use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::projection::{HiddenRealization, Projection, ReceiptVerifier};
use cohbit::CohBitInput;
use cohbit::CohBit;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
fn test_projection_safe_certification() {
    // Hidden realization with subgrid noise (cost = 10)
    let hidden = HiddenRealization {
        fields: vec![],
        unresolved_energy: Rational64::from_integer(10),
        projection_risk: Rational64::from_integer(1),
    };

    let atom_pre = CohAtom { potential: Rational64::from_integer(100), ..default_atom() };
    let atom_post = CohAtom { potential: Rational64::from_integer(95), ..default_atom() };
    
    // Project to receipt
    let receipt = Projection::project(
        &hidden,
        atom_pre,
        atom_post,
        Rational64::from_integer(5),
        mock_cohbit()
    );

    // Verify projection safety: hat{delta} (10) >= actual (10)
    // V_post (95) + C (5) <= V_pre (100) + hat{delta} (10) => 100 <= 110 (Ok)
    assert!(ReceiptVerifier::verify_projection_safety(&receipt, Rational64::from_integer(10), Rational64::from_integer(100)));
}

#[test]
fn test_projection_gap_failure() {
    let hidden = HiddenRealization {
        fields: vec![],
        unresolved_energy: Rational64::from_integer(5), // Hidden cost is 5
        projection_risk: Rational64::from_integer(1),
    };

    let atom_pre = CohAtom { potential: Rational64::from_integer(100), ..default_atom() };
    let atom_post = CohAtom { potential: Rational64::from_integer(95), ..default_atom() };
    
    // Receipt under-declares envelope (e.g., due to bad calibration)
    let mut receipt = Projection::project(&hidden, atom_pre, atom_post, Rational64::from_integer(0), mock_cohbit());
    receipt.envelope_defect = Rational64::from_integer(2); // Breach! hat{delta} < actual cost (5)

    assert!(!ReceiptVerifier::verify_projection_safety(&receipt, Rational64::from_integer(5), Rational64::from_integer(100)));
}

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
    };
    cohbit::CohBit::new(input).unwrap()
}

fn default_atom() -> CohAtom {
    CohAtom {
        coherence: Rational64::from_integer(0),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(0),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(0),
        mass: Rational64::from_integer(0),
        invariants: vec![],
    }
}
