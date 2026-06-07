#![allow(dead_code)]
use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::valuation::PhysicalValuation;
use cohbit::ufe::solver::CertifiedSolver;
use cohbit::ufe::mesh::{Mesh, GlobalBudgets};
use cohbit::ufe::variational::ActionWeights;
use cohbit::CohBitInput;
use cohbit::CohBit;
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

pub fn default_atom() -> CohAtom {
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

pub fn state_with_value(v: i64) -> CohAtom {
    CohAtom { 
        coherence: Rational64::from_integer(v), 
        potential: Rational64::from_integer(v),
        ..default_atom() 
    }
}

pub fn mock_cohbit() -> cohbit::AcceptedCohBit {
    mock_cohbit_with_policy(&cohbit::ufe::policy::Policy::default())
}

pub fn mock_cohbit_with_policy(policy: &cohbit::ufe::policy::Policy) -> cohbit::AcceptedCohBit {
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
        policy_hash: policy.hash(),
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
    CohBit::new(input).unwrap()
}

pub fn default_mesh() -> Mesh {
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
        use cohbit::ufe::CohBitBridge;
        CohBitBridge::create_bit(
            DomainId(Hash32([0; 32])),
            from_atom,
            to_atom,
            defect,
            spend,
            authority,
            0,
            None,
            Hash32([0; 32]),
        )
    }
}

pub struct TestSubstrate {
    pub current_state: CohAtom,
    pub oracle: PhysicalValuation,
    pub mesh: Mesh,
    pub prover: MockProver,
}

impl TestSubstrate {
    pub fn new(initial: CohAtom) -> Self {
        Self {
            current_state: initial,
            oracle: PhysicalValuation,
            mesh: default_mesh(),
            prover: MockProver,
        }
    }

    pub fn solver(&self) -> CertifiedSolver<'_, PhysicalValuation, MockProver> {
        CertifiedSolver {
            mesh: &self.mesh,
            oracle: &self.oracle,
            prover: &self.prover,
            weights: ActionWeights::default(),
            glue_overhead: Rational64::from_integer(0),
        }
    }
}
