use cohbit::ufe::field::{CohField};
use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::CohBitBridge;
use cohbit::types::{DomainId, Hash32};
use num_rational::Rational64;

#[test]
fn test_field_to_atom_integration() {
    let field = CohField {
        theta_order: Rational64::from_integer(1),
        phase: Rational64::from_integer(0),
        potential_dens: Rational64::from_integer(100),
        defect_dens: Rational64::from_integer(5),
        spend_dens: Rational64::from_integer(2),
        risk_dens: Rational64::from_integer(1),
        values: vec![Rational64::from_integer(10)],
    };

    let volume = Rational64::from_integer(2);
    let atom = CohAtom::from_field(&field, volume);

    assert_eq!(atom.potential, Rational64::from_integer(200));
    assert_eq!(atom.defect, Rational64::from_integer(10));
    assert_eq!(atom.spend, Rational64::from_integer(4));
    assert_eq!(atom.invariants[0], Rational64::from_integer(20));
}

#[test]
fn test_atom_to_bit_certification() {
    let atom_n = CohAtom {
        coherence: Rational64::from_integer(1),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(100),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(0),
        mass: Rational64::from_integer(0),
        invariants: vec![Rational64::from_integer(10)],
    };

    let mut atom_n_plus_1 = atom_n.clone();
    atom_n_plus_1.potential = Rational64::from_integer(95);

    let defect = Rational64::from_integer(10);
    let spend = Rational64::from_integer(5);

    // V_{n+1} + C <= V_n + D
    // 95 + 5 <= 100 + 10  => 100 <= 110 (Accepted)
    let bit = CohBitBridge::create_bit(
        DomainId(Hash32([0; 32])),
        &atom_n,
        &atom_n_plus_1,
        defect,
        spend,
        Rational64::from_integer(0),
        1,
        None,
        Hash32([0; 32]),
    );

    assert!(bit.inner().is_admissible());
}

#[test]
#[should_panic(expected = "Failed to create CohBit")]
fn test_potential_balance_violation() {
    let atom_n = CohAtom {
        coherence: Rational64::from_integer(1),
        phase: Rational64::from_integer(0),
        potential: Rational64::from_integer(100),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(0),
        mass: Rational64::from_integer(0),
        invariants: vec![Rational64::from_integer(10)],
    };

    let mut atom_n_plus_1 = atom_n.clone();
    atom_n_plus_1.potential = Rational64::from_integer(110);

    let defect = Rational64::from_integer(5);
    let spend = Rational64::from_integer(10);

    // V_{n+1} + C <= V_n + D
    // 110 + 10 <= 100 + 5  => 120 <= 105 (Rejected)
    CohBitBridge::create_bit(
        DomainId(Hash32([0; 32])),
        &atom_n,
        &atom_n_plus_1,
        defect,
        spend,
        Rational64::from_integer(0),
        1,
        None,
        Hash32([0; 32]),
    );
}
