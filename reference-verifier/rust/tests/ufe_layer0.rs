use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::projection::{Projection, HiddenRealization};
use cohbit::CohBitInput;
use cohbit::CohBit;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

// Helper to create a mock CohBit
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

fn mock_atom() -> CohAtom {
    CohAtom {
        coherence: Rational64::from_integer(100),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(100),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(0),
        mass: Rational64::from_integer(0),
        invariants: vec![Rational64::from_integer(1)],
    }
}

#[test]
fn test_cohatom_construction() {
    let atom = mock_atom();
    assert_eq!(atom.coherence, Rational64::from_integer(100));
    assert_eq!(atom.potential, Rational64::from_integer(100));
}

#[test]
fn test_observable_receipt_construction() {
    let atom_n = mock_atom();
    let mut atom_n_plus_1 = atom_n.clone();
    atom_n_plus_1.coherence = Rational64::from_integer(95);
    
    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: Rational64::from_integer(0),
        projection_risk: Rational64::from_integer(0),
    };
    let receipt = Projection::project(
        &hidden,
        atom_n,
        atom_n_plus_1,
        Rational64::from_integer(0),
        mock_cohbit()
    );
    
    assert_eq!(receipt.from_atom.coherence, Rational64::from_integer(100));
    assert_eq!(receipt.to_atom.coherence, Rational64::from_integer(95));
}
