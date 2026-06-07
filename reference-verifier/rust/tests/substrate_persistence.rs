mod common;
use common::{state_with_value, TestSubstrate, mock_cohbit};
use cohbit::ufe::geometry::CohGeometry;
use cohbit::ufe::projection::Projection;
use cohbit::ufe::projection::HiddenRealization;
use num_rational::Rational64;

#[test]
fn empty_future_set_returns_safe_halt() {
    let substrate = TestSubstrate::new(state_with_value(10));
    let solver = substrate.solver();

    let invalid_proposals = vec![
        (state_with_value(120), Rational64::from_integer(0), Rational64::from_integer(0), Rational64::from_integer(0)),
    ];

    let result = solver.governed_step(&substrate.current_state, invalid_proposals);

    // [PROPERTY P1] Empty future set = Safe Halt
    assert!(result.is_none());
}

#[test]
fn persistence_iff_accepted_outgoing_displacement_exists() {
    let x = state_with_value(10);
    let y = state_with_value(8);

    let start_hash = x.canonical_hash().0;
    let end_hash = y.canonical_hash().0;

    let mut geom = CohGeometry {
        receipts: vec![],
        weights: cohbit::ufe::variational::ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    // No receipts yet
    assert!(geom.calculate_distance(start_hash, end_hash).is_none());

    // Add an accepted receipt
    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: Rational64::from_integer(0),
        projection_risk: Rational64::from_integer(0),
    };
    let receipt = Projection::project(&hidden, x, y, Rational64::from_integer(0), mock_cohbit());
    geom.receipts.push(receipt);

    // [PROPERTY P2] Persistence iff verified outgoing exists
    assert!(geom.calculate_distance(start_hash, end_hash).is_some());
}
