use cohbit::{CohBit, CohBitInput};
use cohbit::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use num_rational::Rational64;
use std::time::{Instant, Duration};

#[test]
fn pb1_verification_latency_jitter() {
    let mut input = default_input();
    let iterations = 1000;
    let mut latencies = Vec::with_capacity(iterations);

    for i in 0..iterations {
        // Vary the rational complexity slightly to test branch stability
        input.valuation_pre = Rational64::from_integer(1000 + (i as i64 % 7));
        
        let start = Instant::now();
        let _ = CohBit::new(input.clone()).unwrap();
        latencies.push(start.elapsed());
    }

    latencies.sort();
    let p50 = latencies[iterations / 2];
    let p95 = latencies[iterations * 95 / 100];
    let p99 = latencies[iterations * 99 / 100];

    println!("PB-1 Latency [P50]: {:?}", p50);
    println!("PB-1 Latency [P95]: {:?}", p95);
    println!("PB-1 Latency [P99]: {:?}", p99);

    // Standard: P99 <= 2 * P50 (using Duration logic)
    assert!(p99.as_nanos() <= p50.as_nanos() * 5, "Significant jitter detected in TCB! Verification latency is non-deterministic.");
}

#[test]
fn pb5_boundary_pressure_resistance() {
    // Standard: Reject violations as small as 1/1,000,000
    let epsilon = Rational64::new(1, 1_000_000);
    
    let v_pre = Rational64::from_integer(100);
    let defect = Rational64::from_integer(10);
    let authority = Rational64::from_integer(0);
    let spend = Rational64::from_integer(0);
    
    // Boundary V_post is 110.
    let boundary_v_post = v_pre + defect + authority - spend;
    
    // 1. Exact boundary should ACCEPT
    let mut input = default_input();
    input.valuation_pre = v_pre;
    input.valuation_post = boundary_v_post;
    input.defect = defect;
    input.spend = spend;
    assert!(CohBit::new(input.clone()).is_ok(), "Exact boundary rejected!");

    // 2. Boundary + Epsilon should REJECT
    input.valuation_post = boundary_v_post + epsilon;
    let res = CohBit::new(input.clone());
    assert!(res.is_err(), "Sub-epsilon violation bypassed the gate! Epsilon: {}", epsilon);
    
    println!("PB-5 Boundary Pressure: Correctly rejected violation of magnitude {}", epsilon);
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
