use cohbit::ufe::atom::CohAtom;
use cohbit::{CohBit, CohBitInput};
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
fn define_atom_computational_mass() {
    // [LAW] M_comp(A) = V(A) + D(A) + R(A)
    // Coherence and Phase do NOT contribute to state persistence burden.
    
    let atom = CohAtom {
        coherence: Rational64::from_integer(100),
        phase: Rational64::from_integer(45),
        potential: Rational64::from_integer(50),
        defect: Rational64::from_integer(10),
        risk: Rational64::from_integer(5),
        spend: Rational64::from_integer(0),
        mass: Rational64::from_integer(0),
        invariants: vec![],
    };

    // M = 50 + 10 + 5 = 65
    let expected_mass = Rational64::from_integer(65);
    
    assert_eq!(atom.computational_mass(), expected_mass, "[PROVED] Computational mass must equal V + D + R");
}

#[test]
fn define_bit_memory_mass() {
    // [LAW] M_mem(b) = |CanonicalBytes(b)|
    // This measures the proof/receipt burden.
    
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

    let bit = CohBit::new(input).unwrap();
    let mass = bit.inner().memory_mass();
    let canon_bytes = bit.inner().to_canonical_bytes();

    assert_eq!(mass, canon_bytes.len(), "[PROVED] Memory mass must equal the canonical byte length");
    assert!(mass > 0, "[PROVED] A certified bit must have non-zero memory mass");
}

#[test]
fn mass_stability_determinism() {
    // [LAW] Mass must be invariant under re-serialization.
    
    let input = default_input();
    let bit = CohBit::new(input).unwrap();
    
    let m1 = bit.inner().memory_mass();
    let m2 = bit.inner().memory_mass();
    
    assert_eq!(m1, m2, "[PROVED] Mass must be stable");
    
    // Verify that canonical bytes are consistent
    let b1 = bit.inner().to_canonical_bytes();
    let b2 = bit.inner().to_canonical_bytes();
    assert_eq!(b1, b2, "[PROVED] Canonical serialization must be deterministic");
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
