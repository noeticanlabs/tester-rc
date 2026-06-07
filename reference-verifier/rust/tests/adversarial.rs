use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::valuation::{PhysicalValuation, ValuationOracle};
use cohbit::ufe::solver::{CertifiedSolver, BitProver};
use cohbit::ufe::mesh::{Mesh, GlobalBudgets};
use cohbit::ufe::variational::ActionWeights;
use cohbit::ufe::geometry::CohGeometry;
use cohbit::ufe::projection::{ObservableReceipt, Projection, HiddenRealization};
use cohbit::CohBitInput;
use cohbit::CohBit;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
fn rejects_unauthorized_potential_creation() {
    let oracle = PhysicalValuation;
    let x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    let y = CohAtom { coherence: Rational64::from_integer(20), ..default_atom() }; // V(y) = 20

    let v_x = oracle.valuate(&x);
    let v_y = oracle.valuate(&y);

    // V(y) + s <= V(x) + d + a  => 20 + 0 <= 10 + 0 + 0 (False)
    let bit_res = mock_cohbit_with_values_res(v_x, v_y, 0, 0, 0, RvStatus::Accept);
    assert!(bit_res.is_err());
}

#[test]
fn accepts_exact_boundary_coh_law() {
    let oracle = PhysicalValuation;
    let x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    let y = CohAtom { coherence: Rational64::from_integer(12), ..default_atom() };

    let v_x = oracle.valuate(&x);
    let v_y = oracle.valuate(&y);

    // V(y) + s <= V(x) + d + a => 12 + 1 <= 10 + 2 + 1 => 13 <= 13 (True)
    let bit = mock_cohbit_with_values(v_x, v_y, 1, 2, 1, RvStatus::Accept);
    assert!(bit.inner().is_admissible());
}

#[test]
fn rejects_invalid_receipt_even_if_inequality_holds() {
    let _x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    let _y = CohAtom { coherence: Rational64::from_integer(9), ..default_atom() };

    let input = CohBitInput {
        valuation_pre: Rational64::from_integer(10),
        valuation_post: Rational64::from_integer(9),
        rv_status: RvStatus::Reject, // Verifier rejects!
        ..default_input()
    };
    
    // CohBit::new will fail if status is Reject
    let bit_res = CohBit::new(input);
    assert!(bit_res.is_err());
}

#[test]
fn receipt_hash_is_deterministic() {
    let input = default_input();
    let bit = cohbit::CohBit::new(input).unwrap();
    
    let h1 = bit.inner().receipt_hash().clone();
    let h2 = bit.inner().receipt_hash().clone();
    
    assert_eq!(h1, h2);
}

pub struct MockProver;
impl cohbit::ufe::solver::BitProver for MockProver {
    fn prove(
        &self,
        from_atom: &CohAtom,
        to_atom: &CohAtom,
        spend: Rational64,
        defect: Rational64,
        authority: Rational64,
    ) -> cohbit::AcceptedCohBit {
        mock_cohbit_with_values(from_atom.potential, to_atom.potential, *spend.numer(), *defect.numer(), *authority.numer(), RvStatus::Accept)
    }
}

#[test]
fn solver_returns_none_on_empty_future_set() {
    let oracle = PhysicalValuation;
    let mesh = default_mesh();
    let prover = MockProver;
    let solver = CertifiedSolver {
        mesh: &mesh,
        oracle: &oracle,
        prover: &prover,
        weights: ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    let atom_x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    
    // All proposals are inadmissible
    let proposals = vec![
        (CohAtom { coherence: Rational64::from_integer(100), ..default_atom() }, Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
    ];

    let result = solver.governed_step(&atom_x, proposals);
    assert!(result.is_none()); // F(x) = {} => Safe Halt
}

#[test]
fn solver_ignores_low_cost_invalid_displacement() {
    let oracle = PhysicalValuation;
    let mesh = default_mesh();
    let prover = MockProver;
    let solver = CertifiedSolver {
        mesh: &mesh,
        oracle: &oracle,
        prover: &prover,
        weights: ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    let atom_x = CohAtom { coherence: Rational64::from_integer(10), ..default_atom() };
    
    let proposals = vec![
        // Inadmissible but "low cost" (V=100)
        (CohAtom { coherence: Rational64::from_integer(100), ..default_atom() }, Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
        // Admissible but "higher cost" (V=9, Spend=0)
        (CohAtom { coherence: Rational64::from_integer(9), ..default_atom() }, Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
    ];

    let result = solver.governed_step(&atom_x, proposals).unwrap();
    assert_eq!(result.to_atom.coherence, Rational64::from_integer(9));
}

#[test]
fn directed_triangle_inequality_holds() {
    let atom_x = CohAtom { coherence: Rational64::from_integer(100), potential: Rational64::from_integer(100), ..default_atom() };
    let atom_y = CohAtom { coherence: Rational64::from_integer(90), potential: Rational64::from_integer(90), ..default_atom() };
    let atom_z = CohAtom { coherence: Rational64::from_integer(80), potential: Rational64::from_integer(80), ..default_atom() };

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
        weights: ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    let d_xz = graph.calculate_distance(hash_x, hash_z).unwrap(); // 4 + 4 = 8
    let d_xy = graph.calculate_distance(hash_x, hash_y).unwrap(); // 4
    let d_yz = graph.calculate_distance(hash_y, hash_z).unwrap(); // 4

    assert!(d_xz <= d_xy + d_yz);
    assert_eq!(d_xz, Rational64::from_integer(8));
}

// --- Helpers ---

fn mock_cohbit_with_values_res(v_pre: Rational64, v_post: Rational64, spend: i64, defect: i64, authority: i64, status: RvStatus) -> Result<cohbit::AcceptedCohBit, cohbit::error::CohBitReject> {
    let input = CohBitInput {
        valuation_pre: v_pre,
        valuation_post: v_post,
        spend: Rational64::from_integer(spend),
        defect: Rational64::from_integer(defect),
        authority: Rational64::from_integer(authority),
        rv_status: status,
        ..default_input()
    };
    cohbit::CohBit::new(input)
}

fn mock_cohbit_with_values(v_pre: Rational64, v_post: Rational64, spend: i64, defect: i64, authority: i64, status: RvStatus) -> cohbit::AcceptedCohBit {
    mock_cohbit_with_values_res(v_pre, v_post, spend, defect, authority, status).unwrap()
}

fn mock_receipt(from: CohAtom, to: CohAtom, spend: i64, defect: i64) -> ObservableReceipt {
    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: Rational64::from_integer(defect),
        projection_risk: Rational64::from_integer(0),
    };
    let prover = MockProver;
    let proof = prover.prove(&from, &to, Rational64::from_integer(spend), Rational64::from_integer(defect), Rational64::from_integer(0));
    Projection::project(&hidden, from, to, Rational64::from_integer(spend), proof)
}

fn mock_cohbit() -> cohbit::AcceptedCohBit {
    cohbit::CohBit::new(default_input()).unwrap()
}

fn default_input() -> CohBitInput {
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
    }
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

fn default_mesh() -> Mesh {
    Mesh {
        name: "test".to_string(),
        global_budgets: GlobalBudgets {
            epsilon_d: Rational64::from_integer(100),
            budget_c: Rational64::from_integer(100),
            risk_crit: Rational64::from_integer(50),
            gamma_phi: Rational64::from_integer(10),
        },
    }
}

