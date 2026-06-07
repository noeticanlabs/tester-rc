mod common;
use common::{state_with_value, TestSubstrate, mock_cohbit};
use num_rational::Rational64;

#[test]
fn solver_verifies_before_optimizing() {
    let substrate = TestSubstrate::new(state_with_value(10));
    let solver = substrate.solver();

    let atom_x = state_with_value(10);
    
    let proposals = vec![
        // Inadmissible but "low cost" (V=100)
        (state_with_value(100), Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
        // Admissible but "higher cost" (V=9, Spend=0)
        (state_with_value(9), Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
    ];

    let result = solver.governed_step(&atom_x, proposals).unwrap();
    
    // [PROPERTY SV1] Solver selects the best *admissible* proposal
    assert_eq!(result.to_atom.coherence, Rational64::from_integer(9));
}

#[test]
fn solver_output_is_always_verified() {
    let substrate = TestSubstrate::new(state_with_value(10));
    let solver = substrate.solver();

    let atom_x = state_with_value(10);
    let proposals = vec![
        (state_with_value(8), Rational64::from_integer(1), Rational64::from_integer(0), Rational64::from_integer(0)),
    ];

    let result = solver.governed_step(&atom_x, proposals).unwrap();
    
    // [PROPERTY SV2] Solver output is always verified
    assert!(result.proof.inner().is_admissible());
    assert_eq!(result.proof.inner().rv_status(), cohbit::types::RvStatus::Accept);
}
