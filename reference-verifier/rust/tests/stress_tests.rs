use cohbit::{CohBit, CohBitInput};
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;

#[test]
#[should_panic] // [KNOWN LIMIT] i64 Rational will overflow on extreme denominators
fn bp1_rational64_overflow_limit() {
    // Attempt to multiply two rationals that would overflow i64 numerator
    let a = Rational64::new(i64::MAX / 2, 1);
    let b = Rational64::new(3, 1);
    let _c = a * b; // This should panic or overflow
}

#[test]
fn bp2_big_rational_admissibility_resilience() {
    // [PROVED] BigRational in is_admissible() protects against overflow during verification.
    
    let mut input = default_input();
    
    // Use values that would overflow i64 if added/multiplied
    // i64::MAX is ~9e18. 
    input.valuation_pre = Rational64::from_integer(i64::MAX - 100);
    input.valuation_post = Rational64::from_integer(i64::MAX - 200);
    input.defect = Rational64::from_integer(100);
    input.delta_hat = Rational64::from_integer(100); // Fix: Must match defect
    input.spend = Rational64::from_integer(50);
    
    let res = CohBit::new(input);
    assert!(res.is_ok(), "BigRational gate failed to protect extreme boundary values! Error: {:?}", res.err());
    println!("BP-2 Resilience: BigRational successfully handled near-i64::MAX boundary.");
}

#[test]
#[should_panic] // [BREAKING POINT] Rational64 will crash on numerator overflow
fn bp4_numerator_overflow_break() {
    // Force numerator overflow
    let a = Rational64::from_integer(i64::MAX);
    let b = Rational64::from_integer(1);
    let _c = a + b; // i64::MAX + 1 -> OVERFLOW
}

#[test]
fn bp3_memory_bloat_limit() {
    // Test a 1MB signature (the maximum allowed)
    let mut input = default_input();
    input.signature = PlaceholderSignature(vec![0; 1024 * 1024]);
    
    let start = std::time::Instant::now();
    let bit = CohBit::new(input).unwrap();
    let duration = start.elapsed();
    
    println!("BP-3 Memory Bloat (1MB): Mass = {}, Latency = {:?}", bit.inner().memory_mass(), duration);
    assert!(bit.inner().memory_mass() >= 1024 * 1024);
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
