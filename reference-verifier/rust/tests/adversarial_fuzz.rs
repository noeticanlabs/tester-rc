use cohbit::{CohBit, CohBitInput};
use cohbit::types::{RvStatus};
use num_rational::Rational64;
use arbitrary::{Arbitrary, Unstructured};
use rand::RngCore;

#[test]
fn fuzz_reject_by_construction_gate() {
    let mut rng = rand::thread_rng();
    let mut data = [0u8; 4096];
    let iterations = 10000;
    
    let mut accepted_count = 0;
    let mut rejected_count = 0;

    for _ in 0..iterations {
        rng.fill_bytes(&mut data);
        let mut u = Unstructured::new(&data);
        
        if let Ok(input) = CohBitInput::arbitrary(&mut u) {
            // Force status to Accept to test the admissibility gate itself
            let mut input = input;
            input.rv_status = RvStatus::Accept;
            
            // Attempt to construct
            let bit_res = CohBit::new(input.clone());
            
            match bit_res {
                Ok(accepted) => {
                    accepted_count += 1;
                    let bit = accepted.inner();
                    // [INVARIANT] If accepted, MUST be admissible
                    assert!(bit.is_admissible(), "Accepted bit is NOT admissible! Gate bypassed.");
                    // [INVARIANT] If accepted, MUST be structurally valid
                    assert!(bit.is_structurally_valid().is_ok(), "Accepted bit is structurally invalid!");
                },
                Err(_) => {
                    rejected_count += 1;
                    // Note: We don't assert anything here because rejection is expected for random data
                }
            }
        }
    }

    println!("Fuzzing complete: {} accepted, {} rejected.", accepted_count, rejected_count);
}

#[test]
fn fuzz_near_admissibility_boundary() {
    let mut rng = rand::thread_rng();
    let iterations = 5000;
    
    for _ in 0..iterations {
        let v_pre = Rational64::from_integer(rng.next_u32() as i64);
        let defect = Rational64::from_integer(rng.next_u32() as i64 % 1000);
        let authority = Rational64::from_integer(0);
        let spend = Rational64::from_integer(rng.next_u32() as i64 % 500);
        
        // Construct V_post to be exactly on the boundary or slightly off
        let boundary_v_post = v_pre + defect + authority - spend;
        
        for offset in [-1, 0, 1] {
            let v_post = boundary_v_post + Rational64::from_integer(offset);
            
            let mut input = default_input();
            input.valuation_pre = v_pre;
            input.valuation_post = v_post;
            input.defect = defect;
            input.delta_hat = defect; // Ensure delta_hat matches
            input.spend = spend;
            
            let res = CohBit::new(input);
            
            if offset > 0 {
                // Should REJECT because V_post > boundary
                assert!(res.is_err(), "Near-admissibility gate bypassed with offset +1! V_pre={}, V_post={}, d={}, s={}", v_pre, v_post, defect, spend);
            } else {
                // Should ACCEPT because V_post <= boundary
                assert!(res.is_ok(), "Near-admissibility gate failed to accept valid boundary with offset {}!", offset);
            }
        }
    }
}

// --- Helpers ---

fn default_input() -> CohBitInput {
    use cohbit::types::{DomainId, Hash32, PlaceholderSignature};
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
