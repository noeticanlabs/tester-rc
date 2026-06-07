use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::cluster::{Cluster, FluxMatrix};
use num_rational::Rational64;

#[test]
fn test_cluster_aggregation_and_balance() {
    let atom_1_pre = CohAtom {
        coherence: Rational64::from_integer(1),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(100),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(5),
        mass: Rational64::from_integer(0),
        invariants: vec![Rational64::from_integer(10)],
    };
    let atom_2_pre = CohAtom {
        coherence: Rational64::from_integer(1),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(200),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(10),
        mass: Rational64::from_integer(0),
        invariants: vec![Rational64::from_integer(20)],
    };

    let atom_1_post = CohAtom {
        potential: Rational64::from_integer(90),
        spend: Rational64::from_integer(5),
        defect: Rational64::from_integer(2),
        ..atom_1_pre.clone()
    };
    let atom_2_post = CohAtom {
        potential: Rational64::from_integer(190),
        spend: Rational64::from_integer(5),
        defect: Rational64::from_integer(2),
        ..atom_2_pre.clone()
    };

    let cluster = Cluster {
        atoms_pre: vec![atom_1_pre, atom_2_pre],
        atoms_post: vec![atom_1_post, atom_2_post],
        local_bits: vec![], // Not needed for balance check
    };

    // Global: V_pre = 300, V_post = 280, C_sum = 10, D_sum = 4
    // 280 + 10 <= 300 + 4 => 290 <= 304 (Accepted)
    assert!(cluster.is_admissible(
        Rational64::from_integer(10),
        Rational64::from_integer(20),
        Rational64::from_integer(15)
    ));
}

#[test]
fn test_aggregate_budget_overflow() {
    let atom_1_pre = CohAtom { potential: Rational64::from_integer(100), ..default_atom() };
    let atom_2_pre = CohAtom { potential: Rational64::from_integer(100), ..default_atom() };

    let atom_1_post = CohAtom { potential: Rational64::from_integer(95), spend: Rational64::from_integer(3), ..atom_1_pre.clone() };
    let atom_2_post = CohAtom { potential: Rational64::from_integer(95), spend: Rational64::from_integer(3), ..atom_2_pre.clone() };

    let cluster = Cluster {
        atoms_pre: vec![atom_1_pre, atom_2_pre],
        atoms_post: vec![atom_1_post, atom_2_post],
        local_bits: vec![],
    };

    // Locally: Spend = 3 (passes budget 5)
    // Globally: Spend = 6 (fails budget 5)
    assert!(!cluster.is_admissible(
        Rational64::from_integer(10),
        Rational64::from_integer(5), // Global budget
        Rational64::from_integer(15)
    ));
}

#[test]
fn test_flux_antisymmetry() {
    let flux = FluxMatrix {
        matrix: vec![
            vec![Rational64::from_integer(0), Rational64::from_integer(5)],
            vec![Rational64::from_integer(-5), Rational64::from_integer(0)],
        ]
    };
    assert!(flux.is_antisymmetric());

    let bad_flux = FluxMatrix {
        matrix: vec![
            vec![Rational64::from_integer(0), Rational64::from_integer(5)],
            vec![Rational64::from_integer(-4), Rational64::from_integer(0)],
        ]
    };
    assert!(!bad_flux.is_antisymmetric());
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
