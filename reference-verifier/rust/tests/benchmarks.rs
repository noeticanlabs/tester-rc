use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::valuation::PhysicalValuation;
use cohbit::ufe::solver::{CertifiedSolver, BitProver};
use cohbit::ufe::mesh::{Mesh, GlobalBudgets};
use cohbit::ufe::variational::{ActionWeights, GeodesicSelector};
use cohbit::{CohBit, CohBitInput};
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;
use std::time::Instant;

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
fn benchmark_solver_throughput() {
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

    let start_atom = CohAtom { coherence: Rational64::from_integer(100), ..default_atom() };
    
    // Scale from 10 to 1000 proposals
    for size in [10, 100, 1000] {
        let mut proposals = Vec::with_capacity(size);
        for i in 0..size {
            // Mix of admissible and inadmissible proposals
            let val = 100 - (i as i64 % 20);
            proposals.push((
                CohAtom { coherence: Rational64::from_integer(val), ..default_atom() },
                Rational64::from_integer(0),
                Rational64::from_integer(10),
                Rational64::from_integer(0),
            ));
        }

        let start_time = Instant::now();
        let _result = solver.governed_step(&start_atom, proposals);
        let duration = start_time.elapsed();
        
        println!("Solver Benchmark [{} proposals]: {:?}", size, duration);
    }
}

#[test]
fn benchmark_geodesic_scaling() {
    // Build a deep chain of receipts and measure search time
    let mut receipts = Vec::new();
    let num_layers = 100;
    
    for i in 0..num_layers {
        let from = CohAtom { 
            coherence: Rational64::from_integer(i as i64), 
            potential: Rational64::from_integer(1000 - (i as i64 * 10)),
            ..default_atom() 
        };
        let to = CohAtom { 
            coherence: Rational64::from_integer((i + 1) as i64), 
            potential: Rational64::from_integer(1000 - ((i as i64 + 1) * 10)),
            ..default_atom() 
        };
        
        // Add multiple paths per layer to increase complexity
        for j in 0..3 {
            let prover = MockProver;
            let proof = prover.prove(&from, &to, Rational64::from_integer(j + 1), Rational64::from_integer(0), Rational64::from_integer(0));
            receipts.push(cohbit::ufe::projection::ObservableReceipt {
                from_atom: from.clone(),
                to_atom: to.clone(),
                spend: Rational64::from_integer(j + 1),
                envelope_defect: Rational64::from_integer(0),
                projection_risk: Rational64::from_integer(0),
                proof,
            });
        }
    }

    let start_atom = CohAtom { coherence: Rational64::from_integer(0), potential: Rational64::from_integer(1000), ..default_atom() };
    let end_atom = CohAtom { 
        coherence: Rational64::from_integer(num_layers as i64), 
        potential: Rational64::from_integer(1000 - (num_layers as i64 * 10)),
        ..default_atom() 
    };

    let selector = GeodesicSelector {
        receipts,
        weights: ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    let start_hash = start_atom.canonical_hash().0;
    let end_hash = end_atom.canonical_hash().0;

    let start_time = Instant::now();
    let geodesic = selector.find_geodesic(start_hash, end_hash).unwrap();
    let duration = start_time.elapsed();

    println!("Geodesic Scaling [{} layers, 3 paths/layer]: {:?}", num_layers, duration);
    assert_eq!(geodesic.len(), num_layers);
}

// --- Helpers ---

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
        name: "bench".to_string(),
        global_budgets: GlobalBudgets {
            epsilon_d: Rational64::from_integer(100),
            budget_c: Rational64::from_integer(100),
            risk_crit: Rational64::from_integer(50),
            gamma_phi: Rational64::from_integer(10),
        },
    }
}
