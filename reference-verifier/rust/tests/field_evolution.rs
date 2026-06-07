use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::cluster::Cluster;
use cohbit::ufe::mesh::{Mesh, GlobalBudgets, CohFieldStep};
use num_rational::Rational64;

#[test]
fn test_field_scale_certified_step() {
    let budgets = GlobalBudgets {
        epsilon_d: Rational64::from_integer(100),
        budget_c: Rational64::from_integer(100),
        risk_crit: Rational64::from_integer(50),
        gamma_phi: Rational64::from_integer(10),
    };
    let mesh = Mesh { name: "test_mesh".to_string(), global_budgets: budgets };

    let atom_pre = CohAtom {
        potential: Rational64::from_integer(1000),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(10),
        ..default_atom()
    };
    let atom_post = CohAtom {
        potential: Rational64::from_integer(950),
        spend: Rational64::from_integer(20),
        defect: Rational64::from_integer(10),
        risk: Rational64::from_integer(15),
        ..atom_pre.clone()
    };

    let step = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster {
            atoms_pre: vec![atom_pre],
            atoms_post: vec![atom_post],
            local_bits: vec![],
        },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };

    // V_post + C <= V_pre + D
    // 950 + 20 <= 1000 + 10 => 970 <= 1010 (Accepted)
    assert!(step.verify());
}

#[test]
fn test_global_budget_breach() {
    let budgets = GlobalBudgets {
        epsilon_d: Rational64::from_integer(5), // Tight defect budget
        budget_c: Rational64::from_integer(100),
        risk_crit: Rational64::from_integer(50),
        gamma_phi: Rational64::from_integer(10),
    };
    let mesh = Mesh { name: "tight_mesh".to_string(), global_budgets: budgets };

    let atom_pre = CohAtom { potential: Rational64::from_integer(1000), ..default_atom() };
    let atom_post = CohAtom {
        potential: Rational64::from_integer(990),
        defect: Rational64::from_integer(10), // Breach!
        ..atom_pre.clone()
    };

    let step = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster {
            atoms_pre: vec![atom_pre],
            atoms_post: vec![atom_post],
            local_bits: vec![],
        },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };

    assert!(!step.verify());
}

#[test]
fn test_boundary_flux_accounting() {
    let budgets = GlobalBudgets {
        epsilon_d: Rational64::from_integer(100),
        budget_c: Rational64::from_integer(100),
        risk_crit: Rational64::from_integer(50),
        gamma_phi: Rational64::from_integer(10),
    };
    let mesh = Mesh { name: "boundary_mesh".to_string(), global_budgets: budgets };

    let atom_pre = CohAtom { potential: Rational64::from_integer(100), ..default_atom() };
    let atom_post = CohAtom { potential: Rational64::from_integer(110), ..atom_pre.clone() };

    // V_post (110) > V_pre (100)
    // Without boundary flux, this is rejected.
    let step_no_flux = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster {
            atoms_pre: vec![atom_pre.clone()],
            atoms_post: vec![atom_post.clone()],
            local_bits: vec![],
        },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };
    assert!(!step_no_flux.verify());

    // With boundary flux (10), it becomes admissible.
    let step_with_flux = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster {
            atoms_pre: vec![atom_pre],
            atoms_post: vec![atom_post],
            local_bits: vec![],
        },
        boundary_flux: Rational64::from_integer(10),
        global_authority: Rational64::from_integer(0),
    };
    assert!(step_with_flux.verify());
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
