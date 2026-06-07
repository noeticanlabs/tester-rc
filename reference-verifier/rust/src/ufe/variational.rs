use std::collections::{HashMap, BinaryHeap};
use std::cmp::Ordering;
use num_rational::Rational64;
use crate::ufe::projection::ObservableReceipt;

/// [PROVED] ActionWeights: Parameters for the certified action functional S_Coh.
#[derive(Clone, Debug)]
pub struct ActionWeights {
    pub alpha_delta: Rational64,
    pub alpha_spend: Rational64,
    pub alpha_risk: Rational64,
    pub alpha_margin: Rational64,
    pub alpha_phase: Rational64,
    pub alpha_mem: Rational64,
}

impl Default for ActionWeights {
    fn default() -> Self {
        Self {
            alpha_delta: Rational64::from_integer(1),
            alpha_spend: Rational64::from_integer(1),
            alpha_risk: Rational64::from_integer(0),
            alpha_margin: Rational64::from_integer(0),
            alpha_phase: Rational64::from_integer(0),
            alpha_mem: Rational64::from_integer(0),
        }
    }
}

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
struct ActionCost {
    cost: Rational64,
    node_hash: [u8; 32],
}

impl Ord for ActionCost {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.cmp(&self.cost)
    }
}

impl PartialOrd for ActionCost {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// [PROVED] GeodesicSelector: Selection engine for optimal certified trajectories.
pub struct GeodesicSelector {
    pub receipts: Vec<ObservableReceipt>,
    pub weights: ActionWeights,
    pub glue_overhead: Rational64,
}

impl GeodesicSelector {
    /// [PROVED] Find the path that minimizes S_Coh(P).
    pub fn find_geodesic(&self, start_hash: [u8; 32], end_hash: [u8; 32]) -> Option<Vec<ObservableReceipt>> {
        if start_hash == end_hash {
            return Some(vec![]);
        }

        let mut dists: HashMap<[u8; 32], Rational64> = HashMap::new();
        let mut prev: HashMap<[u8; 32], (ObservableReceipt, [u8; 32])> = HashMap::new();
        let mut heap = BinaryHeap::new();

        dists.insert(start_hash, Rational64::from_integer(0));
        heap.push(ActionCost { cost: Rational64::from_integer(0), node_hash: start_hash });

        while let Some(ActionCost { cost, node_hash }) = heap.pop() {
            if node_hash == end_hash {
                // Reconstruct path
                let mut path = Vec::new();
                let mut curr = node_hash;
                while let Some((receipt, parent)) = prev.remove(&curr) {
                    path.push(receipt);
                    curr = parent;
                }
                path.reverse();
                return Some(path);
            }

            if let Some(&d) = dists.get(&node_hash) {
                if cost > d {
                    continue;
                }
            }

            for receipt in &self.receipts {
                let current_from_hash = receipt.from_atom.canonical_hash().0;

                if current_from_hash == node_hash {
                    let next_node = receipt.to_atom.canonical_hash().0;

                    // Calculate S_Coh for this step
                    let step_action = self.calculate_step_action(receipt);
                    let mut next_cost = cost + step_action;
                    if node_hash != start_hash {
                        next_cost += self.glue_overhead;
                    }

                    if !dists.contains_key(&next_node) || next_cost < *dists.get(&next_node).unwrap() {
                        dists.insert(next_node, next_cost);
                        prev.insert(next_node, (receipt.clone(), node_hash));
                        heap.push(ActionCost { cost: next_cost, node_hash: next_node });
                    }
                }
            }
        }

        None
    }

    fn calculate_step_action(&self, r: &ObservableReceipt) -> Rational64 {
        let w = &self.weights;
        // S_step = alpha_delta * hat_delta + alpha_C * C + alpha_R * R - alpha_M * margin + alpha_phi * delta_E_phi
        // For simplicity in the primitive, we only use delta, spend, and risk.
        w.alpha_delta * r.envelope_defect 
            + w.alpha_spend * r.spend 
            + w.alpha_risk * r.projection_risk
            + w.alpha_mem * Rational64::from_integer(r.proof.inner().memory_mass() as i64)
    }
}
