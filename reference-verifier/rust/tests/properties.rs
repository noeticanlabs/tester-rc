mod common;
use common::{mock_cohbit};
use cohbit::CohBit;
use cohbit::CohBitInput;
use proptest::prelude::*;
use num_rational::Rational64;

proptest! {
    #[test]
    fn accepted_implies_admissible(
        v_pre in 0..10000i64,
        v_post in 0..10000i64,
        spend in 0..10000i64,
        defect in 0..10000i64,
        authority in 0..10000i64,
    ) {
        let mut input = mock_cohbit().inner().input();
        input.valuation_pre = Rational64::from_integer(v_pre);
        input.valuation_post = Rational64::from_integer(v_post);
        input.spend = Rational64::from_integer(spend);
        input.defect = Rational64::from_integer(defect);
        input.authority = Rational64::from_integer(authority);
        input.delta_hat = input.defect; // Keep it structurally valid

        let bit_res = CohBit::new(input);

        if let Ok(accepted) = bit_res {
            let bit = accepted.inner();
            // [MASTER PROPERTY] Any accepted CohBit MUST be admissible
            assert!(bit.is_admissible());
            
            // Check the law manually
            let lhs = *bit.valuation_post() + *bit.spend();
            let rhs = *bit.valuation_pre() + *bit.defect() + *bit.authority();
            assert!(lhs <= rhs);
        }
    }
}
