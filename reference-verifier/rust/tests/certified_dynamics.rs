use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::valuation::PhysicalValuation;
use cohbit::ufe::solver::CertifiedSolver;
use cohbit::ufe::mesh::{Mesh, GlobalBudgets};
use cohbit::ufe::variational::ActionWeights;
use cohbit::CohBitInput;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

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
        let input = CohBitInput {
            valuation_pre: from_atom.potential,
            valuation_post: to_atom.potential,
            spend,
            defect,
            authority,
            ..default_input()
        };
        cohbit::CohBit::new(input).unwrap()
    }
}

#[test]
fn solver_selects_optimal_displacement_under_authority_cap() {
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

    let atom_x = CohAtom { 
        coherence: Rational64::from_integer(100), 
        potential: Rational64::from_integer(100),
        ..default_atom() 
    };
    
    let proposals_auth = vec![
        // Requires 20 authority (V_post=110, V_pre=100, Defect=5, Spend=10) => 110 + 10 = 120 <= 100 + 5 + 20
        (
            CohAtom { 
                coherence: Rational64::from_integer(110), 
                potential: Rational64::from_integer(110),
                ..default_atom() 
            }, 
            Rational64::from_integer(10), 
            Rational64::from_integer(5), 
            Rational64::from_integer(20)
        ),
        // Requires 5 authority (V_post=95, V_pre=100, Defect=0, Spend=10) => 95 + 10 = 105 <= 100 + 0 + 5
        (
            CohAtom { 
                coherence: Rational64::from_integer(95), 
                potential: Rational64::from_integer(95),
                ..default_atom() 
            }, 
            Rational64::from_integer(10), 
            Rational64::from_integer(0), 
            Rational64::from_integer(5)
        ),
    ];

    let accepted_auth = solver.governed_step(&atom_x, proposals_auth).unwrap();
    assert_eq!(accepted_auth.to_atom.coherence, Rational64::from_integer(95));
}

#[test]
fn solver_handles_admissibility_deadlock() {
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

    let atom_x = CohAtom { 
        coherence: Rational64::from_integer(100), 
        potential: Rational64::from_integer(100),
        ..default_atom() 
    };
    
    // No proposal is admissible: 120 + 0 > 100 + 0 + 0
    let proposals_deadlock = vec![
        (
            CohAtom { 
                coherence: Rational64::from_integer(120), 
                potential: Rational64::from_integer(120),
                ..default_atom() 
            }, 
            Rational64::from_integer(0), 
            Rational64::from_integer(0), 
            Rational64::from_integer(0)
        ),
    ];
    let result = solver.governed_step(&atom_x, proposals_deadlock);
    assert!(result.is_none()); // Deadlock!
}

// --- Helpers ---

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
