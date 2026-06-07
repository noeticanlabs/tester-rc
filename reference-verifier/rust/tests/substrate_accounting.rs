mod common;
use common::{state_with_value, mock_cohbit};
use cohbit::CohBit;
use cohbit::types::RvStatus;
use num_rational::Rational64;

#[test]
fn coh_law_exact_admissibility() {
    let _x = state_with_value(10);
    let _y = state_with_value(12);
    
    // V(y) + s = V(x) + d + a => 12 + 1 = 10 + 2 + 1 (13 = 13)
    let mut input = mock_cohbit().inner().input();
    input.valuation_pre = Rational64::from_integer(10);
    input.valuation_post = Rational64::from_integer(12);
    input.spend = Rational64::from_integer(1);
    input.defect = Rational64::from_integer(2);
    input.authority = Rational64::from_integer(1);
    input.rv_status = RvStatus::Accept;

    let exact = cohbit::CohBit::new(input).unwrap();
    assert!(exact.inner().is_admissible());

    // Strict violation: 12 + 2 = 14 > 13
    let mut input_fail = exact.inner().input();
    input_fail.spend = Rational64::from_integer(2);
    let fail_res = cohbit::CohBit::new(input_fail);
    assert!(fail_res.is_err()); // Reject by construction
}

#[test]
fn telescoping_admissibility_chain() {
    let v_path = vec![10, 12, 11, 13];
    let s_path = vec![1, 0, 2];
    let d_path = vec![2, 1, 4];
    let a_path = vec![1, 0, 0];

    let mut total_s = Rational64::from_integer(0);
    let mut total_d = Rational64::from_integer(0);
    let mut total_a = Rational64::from_integer(0);

    for i in 0..3 {
        total_s += Rational64::from_integer(s_path[i]);
        total_d += Rational64::from_integer(d_path[i]);
        total_a += Rational64::from_integer(a_path[i]);
        
        let mut input = mock_cohbit().inner().input();
        input.valuation_pre = Rational64::from_integer(v_path[i]);
        input.valuation_post = Rational64::from_integer(v_path[i+1]);
        input.spend = Rational64::from_integer(s_path[i]);
        input.defect = Rational64::from_integer(d_path[i]);
        input.authority = Rational64::from_integer(a_path[i]);
        
        let b = cohbit::CohBit::new(input).unwrap();
        assert!(b.inner().is_admissible());
    }

    // [PROPERTY A3] Telescoping Law: V(xn) + sum s <= V(x0) + sum d + sum a
    let lhs = Rational64::from_integer(v_path[3]) + total_s;
    let rhs = Rational64::from_integer(v_path[0]) + total_d + total_a;

    assert!(lhs <= rhs);
}
