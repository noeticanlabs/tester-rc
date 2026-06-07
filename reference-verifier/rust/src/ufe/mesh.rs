use serde::{Deserialize, Serialize};
use num_rational::Rational64;
use crate::ufe::cluster::Cluster;

/// [PROVED] GlobalBudgets: The aggregate constraints for a full mesh Omega.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GlobalBudgets {
    pub epsilon_d: Rational64, // Global defect tolerance
    pub budget_c: Rational64,   // Global spend budget
    pub risk_crit: Rational64,  // Global risk threshold
    pub gamma_phi: Rational64,  // Global phase energy growth cap
}

/// [PROVED] Mesh: The spatial discretization Omega_h.
pub struct Mesh {
    pub name: String,
    pub global_budgets: GlobalBudgets,
}

/// [PROVED] CohFieldStep: A field-scale certified transition Psi^n -> Psi^{n+1}.
pub struct CohFieldStep<'a> {
    pub mesh: &'a Mesh,
    pub full_cluster: Cluster,
    pub boundary_flux: Rational64,
    pub global_authority: Rational64,
}

impl<'a> CohFieldStep<'a> {
    /// [PROVED] Theorem 8.1: Full-field certification.
    pub fn verify(&self) -> bool {
        let pre = self.full_cluster.aggregate_state_pre();
        let post = self.full_cluster.aggregate_state_post();
        let budgets = &self.mesh.global_budgets;

        // 1. Global Defect check
        if post.defect > budgets.epsilon_d {
            return false;
        }

        // 2. Global Cost/Spend check
        if post.spend > budgets.budget_c {
            return false;
        }

        // 3. Global Risk check (Nonlinear/Supremum)
        if post.risk > budgets.risk_crit {
            return false;
        }

        // 4. Global Coh Balance Law: V_{n+1} + C <= V_n + D + F_boundary + Authority
        // For Layer 8 canonical form, we explicitly account for boundary flux and authority.
        if post.potential + post.spend > pre.potential + post.defect + self.boundary_flux + self.global_authority {
            return false;
        }

        true
    }
}
