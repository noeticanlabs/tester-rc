use cohbit::ufe::atom::CohAtom;
use cohbit::ufe::cluster::{Cluster, ClusterCohAtom};
use cohbit::ufe::mesh::{Mesh, GlobalBudgets, CohFieldStep};
use cohbit::ufe::trajectory::{Trajectory, TrajectoryBudgets};
use num_rational::Rational64;

#[test]
fn test_certified_trajectory_success() {
    let mesh_budgets = GlobalBudgets {
        epsilon_d: Rational64::from_integer(10),
        budget_c: Rational64::from_integer(10),
        risk_crit: Rational64::from_integer(50),
        gamma_phi: Rational64::from_integer(0),
    };
    let mesh = Mesh { name: "test".to_string(), global_budgets: mesh_budgets };

    let traj_budgets = TrajectoryBudgets {
        max_accumulated_spend: Rational64::from_integer(100),
        max_total_defect: Rational64::from_integer(100),
        constant_risk_crit: Some(Rational64::from_integer(50)),
    };

    let atom_0 = CohAtom { potential: Rational64::from_integer(1000), ..default_atom() };
    let atom_1 = CohAtom { potential: Rational64::from_integer(995), spend: Rational64::from_integer(5), ..default_atom() };
    let atom_2 = CohAtom { potential: Rational64::from_integer(990), spend: Rational64::from_integer(5), ..default_atom() };

    let step_0 = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster { atoms_pre: vec![atom_0.clone()], atoms_post: vec![atom_1.clone()], local_bits: vec![] },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };
    let step_1 = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster { atoms_pre: vec![atom_1.clone()], atoms_post: vec![atom_2.clone()], local_bits: vec![] },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };

    let initial_state = ClusterCohAtom {
        potential: Rational64::from_integer(1000),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(0),
        invariants: vec![],
    };

    let trajectory = Trajectory {
        initial_state,
        steps: vec![step_0, step_1],
        cumulative_budgets: traj_budgets,
    };

    assert!(trajectory.verify());
}

#[test]
fn test_broken_temporal_chain() {
    let mesh_budgets = GlobalBudgets {
        epsilon_d: Rational64::from_integer(10),
        budget_c: Rational64::from_integer(10),
        risk_crit: Rational64::from_integer(50),
        gamma_phi: Rational64::from_integer(0),
    };
    let mesh = Mesh { name: "test".to_string(), global_budgets: mesh_budgets };

    let atom_0 = CohAtom { potential: Rational64::from_integer(1000), ..default_atom() };
    let atom_1 = CohAtom { potential: Rational64::from_integer(995), ..default_atom() };
    let atom_2_mismatch = CohAtom { potential: Rational64::from_integer(500), ..default_atom() }; // JUMP!
    let atom_3 = CohAtom { potential: Rational64::from_integer(495), ..default_atom() };

    let step_0 = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster { atoms_pre: vec![atom_0.clone()], atoms_post: vec![atom_1.clone()], local_bits: vec![] },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };
    let step_1 = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster { atoms_pre: vec![atom_2_mismatch], atoms_post: vec![atom_3], local_bits: vec![] },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };

    let trajectory = Trajectory {
        initial_state: ClusterCohAtom { potential: Rational64::from_integer(1000), ..default_cluster_atom() },
        steps: vec![step_0, step_1],
        cumulative_budgets: default_traj_budgets(),
    };

    assert!(!trajectory.verify());
}

#[test]
fn test_cumulative_budget_exhaustion() {
    let mesh_budgets = GlobalBudgets {
        epsilon_d: Rational64::from_integer(10),
        budget_c: Rational64::from_integer(10), // Step budget is 10
        risk_crit: Rational64::from_integer(50),
        gamma_phi: Rational64::from_integer(0),
    };
    let mesh = Mesh { name: "test".to_string(), global_budgets: mesh_budgets };

    let traj_budgets = TrajectoryBudgets {
        max_accumulated_spend: Rational64::from_integer(15), // Total budget is 15
        max_total_defect: Rational64::from_integer(100),
        constant_risk_crit: None,
    };

    let atom_0 = CohAtom { potential: Rational64::from_integer(1000), ..default_atom() };
    let atom_1 = CohAtom { potential: Rational64::from_integer(991), spend: Rational64::from_integer(9), ..default_atom() };
    let atom_2 = CohAtom { potential: Rational64::from_integer(982), spend: Rational64::from_integer(9), ..default_atom() };

    let step_0 = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster { atoms_pre: vec![atom_0.clone()], atoms_post: vec![atom_1.clone()], local_bits: vec![] },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };
    let step_1 = CohFieldStep {
        mesh: &mesh,
        full_cluster: Cluster { atoms_pre: vec![atom_1.clone()], atoms_post: vec![atom_2.clone()], local_bits: vec![] },
        boundary_flux: Rational64::from_integer(0),
        global_authority: Rational64::from_integer(0),
    };

    let trajectory = Trajectory {
        initial_state: ClusterCohAtom { potential: Rational64::from_integer(1000), ..default_cluster_atom() },
        steps: vec![step_0, step_1], // Total spend = 18 > 15
        cumulative_budgets: traj_budgets,
    };

    assert!(!trajectory.verify());
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

fn default_cluster_atom() -> ClusterCohAtom {
    ClusterCohAtom {
        potential: Rational64::from_integer(0),
        defect: Rational64::from_integer(0),
        spend: Rational64::from_integer(0),
        risk: Rational64::from_integer(0),
        invariants: vec![],
    }
}

fn default_traj_budgets() -> TrajectoryBudgets {
    TrajectoryBudgets {
        max_accumulated_spend: Rational64::from_integer(1000000),
        max_total_defect: Rational64::from_integer(1000000),
        constant_risk_crit: None,
    }
}
