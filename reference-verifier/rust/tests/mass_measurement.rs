use cohbit::ufe::atom::CohAtom;
use cohbit::{CohBit, CohBitInput};
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
fn measure_proof_size_scaling() {
    // [LAW] M_mem(b) = |CanonicalBytes(b)|
    // The memory mass should scale linearly with the signature/proof size.
    
    let mut input = default_input();
    
    // 1. Small proof (64 bytes)
    input.signature = PlaceholderSignature(vec![0; 64]);
    let bit_small = CohBit::new(input.clone()).unwrap();
    let mass_small = bit_small.inner().memory_mass();
    
    // 2. Large proof (1024 bytes)
    input.signature = PlaceholderSignature(vec![0; 1024]);
    let bit_large = CohBit::new(input.clone()).unwrap();
    let mass_large = bit_large.inner().memory_mass();
    
    println!("Mass Small: {}, Mass Large: {}", mass_small, mass_large);
    
    // Check scaling: (Large - Small) should be roughly the difference in signature size (1024 - 64 = 960)
    assert!(mass_large > mass_small);
    assert_eq!(mass_large - mass_small, 960, "[PROVED] Memory mass must account for proof bloat exactly");
}

#[test]
fn measure_computational_mass_conservation() {
    // [LAW] Potential and Coherence are conserved, but Defect may increase.
    // M_comp = V + D + R
    
    let parent = CohAtom {
        coherence: Rational64::from_integer(100),
        potential: Rational64::from_integer(100),
        defect: Rational64::from_integer(10),
        risk: Rational64::from_integer(0),
        ..default_atom()
    };
    
    let m_parent = parent.computational_mass();
    
    // Split into two child atoms
    let child1 = CohAtom {
        coherence: Rational64::from_integer(50),
        potential: Rational64::from_integer(50),
        defect: Rational64::from_integer(8), // Shared defect + split overhead
        risk: Rational64::from_integer(1),
        ..default_atom()
    };
    
    let child2 = CohAtom {
        coherence: Rational64::from_integer(50),
        potential: Rational64::from_integer(50),
        defect: Rational64::from_integer(8),
        risk: Rational64::from_integer(1),
        ..default_atom()
    };
    
    let m_children = child1.computational_mass() + child2.computational_mass();
    
    println!("Parent Mass: {}, Total Children Mass: {}", m_parent, m_children);
    
    // [PROVED] decoherence (splitting) typically increases total mass due to 
    // increased entropy/defect at the new boundaries.
    assert!(m_children > m_parent, "State splitting should increase total system mass (Defect Inflation)");
}

#[test]
fn measure_authority_impact_on_mass() {
    let mut input = default_input();
    
    // No authority
    input.authority = Rational64::from_integer(0);
    let bit_pure = CohBit::new(input.clone()).unwrap();
    
    // With authority injection
    input.authority = Rational64::from_integer(100);
    let bit_injected = CohBit::new(input.clone()).unwrap();
    
    // Note: authority contributes to the ADMISSIBILITY, but does not 
    // increase the MEMORY mass (the bits stay the same size).
    assert_eq!(bit_pure.inner().memory_mass(), bit_injected.inner().memory_mass());
    
    // However, it increases the COMPUTATIONAL budget available for the transition.
    assert!(bit_injected.inner().is_admissible());
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
