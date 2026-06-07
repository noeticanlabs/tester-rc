mod common;
use common::{state_with_value, mock_cohbit};
use cohbit::ufe::geometry::CohGeometry;
use cohbit::ufe::projection::{Projection, HiddenRealization};
use num_rational::Rational64;

#[test]
fn directed_triangle_inequality_holds() {
    let x = state_with_value(10);
    let y = state_with_value(20);
    let z = state_with_value(30);

    let hash_x = x.canonical_hash().0;
    let hash_y = y.canonical_hash().0;
    let hash_z = z.canonical_hash().0;

    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: Rational64::from_integer(0),
        projection_risk: Rational64::from_integer(0),
    };
    
    // x -> y cost 5
    let r_xy = Projection::project(&hidden, x.clone(), y.clone(), Rational64::from_integer(5), mock_cohbit());
    // y -> z cost 10
    let r_yz = Projection::project(&hidden, y.clone(), z.clone(), Rational64::from_integer(10), mock_cohbit());
    // x -> z cost 20
    let r_xz = Projection::project(&hidden, x.clone(), z.clone(), Rational64::from_integer(20), mock_cohbit());

    let geom = CohGeometry {
        receipts: vec![r_xy, r_yz, r_xz],
        weights: cohbit::ufe::variational::ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    let d_xy = geom.calculate_distance(hash_x, hash_y).unwrap();
    let d_yz = geom.calculate_distance(hash_y, hash_z).unwrap();
    let d_xz = geom.calculate_distance(hash_x, hash_z).unwrap();

    // [PROPERTY G3] d(x,z) <= d(x,y) + d(y,z)
    // 15 (via y) vs 20 (direct) => 15 <= 20
    assert!(d_xz <= d_xy + d_yz);
    assert_eq!(d_xz, Rational64::from_integer(15));
}

#[test]
fn geometry_is_directed_not_symmetric() {
    let x = state_with_value(10);
    let y = state_with_value(20);
    let hash_x = x.canonical_hash().0;
    let hash_y = y.canonical_hash().0;

    let hidden = HiddenRealization { 
        fields: vec![], 
        unresolved_energy: Rational64::from_integer(0),
        projection_risk: Rational64::from_integer(0),
    };
    let r_xy = Projection::project(&hidden, x, y, Rational64::from_integer(1), mock_cohbit());

    let geom = CohGeometry {
        receipts: vec![r_xy],
        weights: cohbit::ufe::variational::ActionWeights::default(),
        glue_overhead: Rational64::from_integer(0),
    };

    // [PROPERTY G4] d(x,y) = 1, d(y,x) = inf
    assert_eq!(geom.calculate_distance(hash_x, hash_y), Some(Rational64::from_integer(1)));
    assert_eq!(geom.calculate_distance(hash_y, hash_x), None);
}
