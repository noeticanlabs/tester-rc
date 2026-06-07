use serde::{Deserialize, Serialize};
use num_rational::Rational64;
use crate::ufe::atom::CohAtom;
use crate::CohBit;

/// [PROVED] ClusterCohAtom: The aggregated state carrier for a cluster C.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClusterCohAtom {
    pub potential: Rational64,
    pub defect: Rational64,
    pub spend: Rational64,
    pub risk: Rational64, // Typically non-additive (e.g., max)
    pub invariants: Vec<Rational64>,
}

/// [PROVED] A cluster C is a collection of CohAtoms.
pub struct Cluster {
    pub atoms_pre: Vec<CohAtom>,
    pub atoms_post: Vec<CohAtom>,
    pub local_bits: Vec<CohBit>,
}

impl Cluster {
    /// [PROVED] Aggregate additive quantities: V, C, D.
    pub fn aggregate_state_pre(&self) -> ClusterCohAtom {
        let mut total_v = Rational64::from_integer(0);
        let mut total_d = Rational64::from_integer(0);
        let mut total_c = Rational64::from_integer(0);
        let mut max_risk = Rational64::from_integer(0);
        let mut total_inv = Vec::new();

        for atom in &self.atoms_pre {
            total_v += atom.potential;
            total_d += atom.defect;
            total_c += atom.spend;
            if atom.risk > max_risk {
                max_risk = atom.risk;
            }
            if total_inv.is_empty() {
                total_inv = atom.invariants.clone();
            } else {
                for (i, inv) in atom.invariants.iter().enumerate() {
                    total_inv[i] += *inv;
                }
            }
        }

        ClusterCohAtom {
            potential: total_v,
            defect: total_d,
            spend: total_c,
            risk: max_risk,
            invariants: total_inv,
        }
    }

    pub fn aggregate_state_post(&self) -> ClusterCohAtom {
        let mut total_v = Rational64::from_integer(0);
        let mut total_d = Rational64::from_integer(0);
        let mut total_c = Rational64::from_integer(0);
        let mut max_risk = Rational64::from_integer(0);
        let mut total_inv = Vec::new();

        for atom in &self.atoms_post {
            total_v += atom.potential;
            total_d += atom.defect;
            total_c += atom.spend;
            if atom.risk > max_risk {
                max_risk = atom.risk;
            }
            if total_inv.is_empty() {
                total_inv = atom.invariants.clone();
            } else {
                for (i, inv) in atom.invariants.iter().enumerate() {
                    total_inv[i] += *inv;
                }
            }
        }

        ClusterCohAtom {
            potential: total_v,
            defect: total_d,
            spend: total_c,
            risk: max_risk,
            invariants: total_inv,
        }
    }

    /// [PROVED] Cluster admissibility: Aggregate truth is required.
    pub fn is_admissible(
        &self,
        epsilon_d: Rational64,
        budget_c: Rational64,
        risk_crit: Rational64,
    ) -> bool {
        let pre = self.aggregate_state_pre();
        let post = self.aggregate_state_post();

        // 1. Aggregate Defect check
        if post.defect > epsilon_d {
            return false;
        }

        // 2. Aggregate Cost/Spend check
        if post.spend > budget_c {
            return false;
        }

        // 3. Aggregate Risk check (Non-additive)
        if post.risk > risk_crit {
            return false;
        }

        // 4. Aggregate Coh Balance Law: V_{n+1} + C <= V_n + D
        if post.potential + post.spend > pre.potential + post.defect {
            return false;
        }

        true
    }
}

/// Flux compatibility helper
pub struct FluxMatrix {
    pub matrix: Vec<Vec<Rational64>>, // matrix[i][j] is flux from i to j
}

impl FluxMatrix {
    /// [PROVED] Lemma 7.1: Internal flux cancellation requirement.
    pub fn is_antisymmetric(&self) -> bool {
        let n = self.matrix.len();
        for i in 0..n {
            for j in 0..n {
                if self.matrix[i][j] + self.matrix[j][i] != Rational64::from_integer(0) {
                    return false;
                }
            }
        }
        true
    }
}
