use serde::{Deserialize, Serialize};
use num_rational::Rational64;
use crate::ufe::mesh::CohFieldStep;
use crate::ufe::cluster::ClusterCohAtom;

/// [PROVED] TrajectoryBudgets: Cumulative constraints over a time horizon.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TrajectoryBudgets {
    pub max_accumulated_spend: Rational64,
    pub max_total_defect: Rational64,
    pub constant_risk_crit: Option<Rational64>,
}

/// [PROVED] Trajectory: A time-ordered sequence of accepted field-scale CohBits.
/// 
/// Traj = CohBit^{N-1} o ... o CohBit^0
pub struct Trajectory<'a> {
    pub initial_state: ClusterCohAtom,
    pub steps: Vec<CohFieldStep<'a>>,
    pub cumulative_budgets: TrajectoryBudgets,
}

impl<'a> Trajectory<'a> {
    /// [PROVED] Theorem 9.1: Certified CohField Trajectory verification.
    pub fn verify(&self) -> bool {
        if self.steps.is_empty() {
            return true;
        }

        let mut total_spend = Rational64::from_integer(0);
        let mut total_defect = Rational64::from_integer(0);
        let mut total_boundary_flux = Rational64::from_integer(0);
        let mut total_authority = Rational64::from_integer(0);

        // Failure Mode 1: Broken temporal chain check
        for i in 0..self.steps.len() {
            let step = &self.steps[i];
            
            // Verify individual step acceptance
            if !step.verify() {
                return false;
            }

            // Verify continuity with previous step
            if i > 0 {
                let prev_step = &self.steps[i - 1];
                // In a real system, we'd compare state hashes here.
                // For the primitive, we compare potential as a proxy for state continuity.
                let prev_post = prev_step.full_cluster.aggregate_state_post();
                let current_pre = step.full_cluster.aggregate_state_pre();
                if prev_post.potential != current_pre.potential {
                    return false; // Broken temporal chain
                }
            } else {
                // First step continuity with initial state
                let current_pre = step.full_cluster.aggregate_state_pre();
                if self.initial_state.potential != current_pre.potential {
                    return false;
                }
            }

            // Accumulate quantities for telescoping law
            let post = step.full_cluster.aggregate_state_post();
            total_spend += post.spend;
            total_defect += post.defect;
            total_boundary_flux += step.boundary_flux;
            total_authority += step.global_authority;

            // Temporal Risk Bound: R^n <= R_crit
            if let Some(crit) = self.cumulative_budgets.constant_risk_crit {
                if post.risk > crit {
                    return false;
                }
            }
        }

        // Cumulative Budget Exhaustion check
        if total_spend > self.cumulative_budgets.max_accumulated_spend {
            return false;
        }
        if total_defect > self.cumulative_budgets.max_total_defect {
            return false;
        }

        // Telescoping Coh Law: V^N + C^{0:N} <= V^0 + D^{0:N} + B_boundary^{0:N} + A_auth^{0:N}
        let final_step = self.steps.last().unwrap();
        let final_v = final_step.full_cluster.aggregate_state_post().potential;
        let initial_v = self.initial_state.potential;

        if final_v + total_spend > initial_v + total_defect + total_boundary_flux + total_authority {
            return false;
        }

        true
    }
}
