use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::geometry::CohGeometry;
use cohbit::ufe::projection::{ObservableReceipt, Projection, HiddenRealization};
use cohbit::CohBitInput;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
fn geometry_calculates_optimal_directed_path() {
    let atom_x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    let atom_y = CohAtom { coherence: Rational64::from_integer(20), ..default_atom() };
    let atom_z = CohAtom { coherence: Rational64::from_integer(30), ..default_atom() };

    let hash_x = atom_x.canonical_hash().0;
    let hash_y = atom_y.canonical_hash().0;
    let hash_z = atom_z.canonical_hash().0;

    // X -> Y (spend 3, defect 1) cost 4
    let r_xy = mock_receipt(atom_x.clone(), atom_y.clone(), 3, 1);
    // Y -> Z (spend 2, defect 2) cost 4
    let r_yz = mock_receipt(atom_y.clone(), atom_z.clone(), 2, 2);
    // X -> Z (spend 10, defect 0) cost 10
    let r_xz = mock_receipt(atom_x.clone(), atom_z.clone(), 10, 0);

    let graph = CohGeometry {
        receipts: vec![r_xy, r_yz, r_xz],
        weights: cohbit::ufe::variational::ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    let d_xz = graph.calculate_distance(hash_x, hash_z).unwrap(); // 4 + 4 = 8 (via Y)
    assert_eq!(d_xz, Rational64::from_integer(8));
}

// --- Helpers ---

fn mock_receipt(from: CohAtom, to: CohAtom, spend: i64, defect: i64) -> ObservableReceipt {
    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: Rational64::from_integer(defect),
        projection_risk: Rational64::from_integer(0),
    };
    Projection::project(&hidden, from, to, Rational64::from_integer(spend), mock_cohbit())
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
