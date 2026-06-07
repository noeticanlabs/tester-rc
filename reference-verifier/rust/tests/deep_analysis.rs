use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::valuation::PhysicalValuation;
use cohbit::ufe::solver::CertifiedSolver;
use cohbit::ufe::mesh::{Mesh, GlobalBudgets};
use cohbit::ufe::variational::ActionWeights;
use cohbit::{CohBit, CohBitInput};
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
fn analyze_long_term_numerical_stability() {
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

    let mut current_atom = CohAtom { 
        coherence: Rational64::from_integer(1000), 
        potential: Rational64::from_integer(1000),
        ..default_atom() 
    };
    
    let mut total_defect = Rational64::from_integer(0);
    let num_steps = 1000;
    
    println!("Step | Coherence | Defect | Total Accumulated Defect");
    println!("-----|-----------|--------|-------------------------");

    for i in 0..num_steps {
        // Simulate a transition with a small residual cost (defect)
        let step_defect = Rational64::new(1, 10); // 0.1 defect per step
        let next_coherence = current_atom.coherence - Rational64::new(1, 100); // 0.01 loss
        
        let proposals = vec![
            (
                CohAtom { coherence: next_coherence, potential: current_atom.potential, ..default_atom() },
                Rational64::from_integer(0),
                step_defect,
                Rational64::from_integer(0),
            ),
        ];

        let receipt = solver.governed_step(&current_atom, proposals).unwrap();
        
        current_atom = receipt.to_atom.clone();
        total_defect += receipt.envelope_defect;

        if i % 100 == 0 || i == num_steps - 1 {
            println!("{:4} | {:9} | {:6} | {}", i, current_atom.coherence, receipt.envelope_defect, total_defect);
        }
    }

    // Verify that coherence hasn't drifted due to precision loss
    // Start: 1000, 1000 steps * 0.01 loss = 10 loss. Expected: 990.
    assert_eq!(current_atom.coherence, Rational64::from_integer(990), "Coherence drift detected! Rational arithmetic failed.");
    assert_eq!(total_defect, Rational64::from_integer(100), "Defect accumulation mismatch.");
    
    println!("Final Stability Ratio (Defect/Coherence): {}", total_defect / current_atom.coherence);
}

#[test]
fn analyze_archival_density() {
    let mut total_memory_mass = 0;
    let num_steps = 100;
    
    let mut input = default_input();
    
    for i in 0..num_steps {
        input.step_index = i as u64;
        let bit = CohBit::new(input.clone()).unwrap();
        total_memory_mass += bit.inner().memory_mass();
    }
    
    let final_atom = CohAtom {
        potential: Rational64::from_integer(1000),
        defect: Rational64::from_integer(50),
        risk: Rational64::from_integer(10),
        ..default_atom()
    };
    
    let state_mass = final_atom.computational_mass();
    
    println!("Trace Length: {} steps", num_steps);
    println!("Total Memory Mass (Trace): {} bytes", total_memory_mass);
    println!("State Computational Mass: {}", state_mass);
    
    let ratio = Rational64::from_integer(total_memory_mass as i64) / state_mass;
    println!("Archival Ratio (Bytes/Mass): {}", ratio);
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
        valuation_pre: Rational64::from_integer(1000),
        valuation_post: Rational64::from_integer(990),
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
            epsilon_d: Rational64::from_integer(1000),
            budget_c: Rational64::from_integer(1000),
            risk_crit: Rational64::from_integer(500),
            gamma_phi: Rational64::from_integer(100),
        },
    }
}
