use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::projection::{ObservableReceipt, Projection, HiddenRealization};
use cohbit::ufe::variational::{GeodesicSelector, ActionWeights};
use cohbit::CohBitInput;
use cohbit::CohBit;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
fn test_geodesic_selection_by_defect() {
    let atom_x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    let atom_y = CohAtom { coherence: Rational64::from_integer(20), ..default_atom() };
    let mut atom_z = CohAtom { coherence: Rational64::from_integer(30), ..default_atom() };
    atom_z.risk = Rational64::from_integer(10);

    let hash_x = atom_x.canonical_hash().0;
    let hash_z = atom_z.canonical_hash().0;

    // Path 1: X -> Y -> Z (Total defect = 15)
    // We must ensure atom_y has risk=10 to match r_xy's destination
    let mut atom_y_hardened = atom_y.clone();
    atom_y_hardened.risk = Rational64::from_integer(10);

    let r_xy = mock_receipt(atom_x.clone(), atom_y.clone(), Rational64::from_integer(5), Rational64::from_integer(0), Rational64::from_integer(10));
    let r_yz = mock_receipt(atom_y_hardened, atom_z.clone(), Rational64::from_integer(10), Rational64::from_integer(0), Rational64::from_integer(10));
    
    // Path 2: X -> Z Direct (Total defect = 20)
    let r_xz = mock_receipt(atom_x.clone(), atom_z.clone(), Rational64::from_integer(20), Rational64::from_integer(0), Rational64::from_integer(10));

    let selector = GeodesicSelector {
        receipts: vec![r_xy.clone(), r_yz.clone(), r_xz],
        weights: ActionWeights::default(), // alpha_delta = 1
        glue_overhead: Rational64::from_integer(0),
    };

    let geodesic = selector.find_geodesic(hash_x, hash_z).unwrap();
    
    // Should select Path 1 (X -> Y -> Z) as it has defect 15 < 20
    assert_eq!(geodesic.len(), 2);
    assert_eq!(geodesic[0].envelope_defect, Rational64::from_integer(5));
    assert_eq!(geodesic[1].envelope_defect, Rational64::from_integer(10));
}

#[test]
fn test_geodesic_selection_by_risk() {
    let atom_x = CohAtom { coherence: Rational64::from_integer(10), risk: Rational64::from_integer(0), ..default_atom() };
    let atom_y = CohAtom { coherence: Rational64::from_integer(20), risk: Rational64::from_integer(50), ..default_atom() }; // High risk Y
    let atom_z = CohAtom { coherence: Rational64::from_integer(30), risk: Rational64::from_integer(10), ..default_atom() };

    let hash_x = atom_x.canonical_hash().0;
    let hash_z = atom_z.canonical_hash().0;

    // Path 1: X -> Y -> Z (Low defect = 10, High risk = 50)
    let r_xy = mock_receipt(atom_x.clone(), atom_y.clone(), Rational64::from_integer(5), Rational64::from_integer(0), Rational64::from_integer(50));
    let r_yz = mock_receipt(atom_y.clone(), atom_z.clone(), Rational64::from_integer(5), Rational64::from_integer(0), Rational64::from_integer(10));
    
    // Path 2: X -> Z Direct (High defect = 30, Low risk = 10)
    let r_xz = mock_receipt(atom_x.clone(), atom_z.clone(), Rational64::from_integer(30), Rational64::from_integer(0), Rational64::from_integer(10));

    // Weight risk heavily (alpha_risk = 10, alpha_delta = 1)
    let weights = ActionWeights {
        alpha_delta: Rational64::from_integer(1),
        alpha_risk: Rational64::from_integer(10),
        ..ActionWeights::default()
    };

    let selector = GeodesicSelector {
        receipts: vec![r_xy, r_yz, r_xz.clone()],
        weights,
        glue_overhead: Rational64::from_integer(0),
    };

    let geodesic = selector.find_geodesic(hash_x, hash_z).unwrap();
    
    // Path 1 action: (1 * 10) + (10 * 60) = 610 (approx, simplified)
    // Path 2 action: (1 * 30) + (10 * 10) = 130
    // Should select Path 2 (Direct X -> Z) despite higher defect because risk is lower.
    assert_eq!(geodesic.len(), 1);
    assert_eq!(geodesic[0].envelope_defect, Rational64::from_integer(30));
}

fn mock_receipt(from: CohAtom, to: CohAtom, defect: Rational64, spend: Rational64, risk: Rational64) -> ObservableReceipt {
    let mut to_with_risk = to;
    to_with_risk.risk = risk;
    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: defect,
        projection_risk: risk, // We'll use the provided risk for testing
    };
    Projection::project(&hidden, from, to_with_risk, spend, mock_cohbit())
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
