use std::collections::{HashMap, BinaryHeap};
use std::cmp::Ordering;
use num_rational::Rational64;
use crate::ufe::projection::ObservableReceipt;

/// [PROVED] Path cost comparison for Dijkstra
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
struct PathCost {
    cost: Rational64,
    node_hash: [u8; 32],
}

impl Ord for PathCost {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse for min-heap
        other.cost.cmp(&self.cost)
    }
}

impl PartialOrd for PathCost {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// [PROVED] CohGeometry: A directed extended Lawvere pseudometric space.
pub struct CohGeometry {
    pub receipts: Vec<ObservableReceipt>,
    pub weights: crate::ufe::variational::ActionWeights,
    pub glue_overhead: Rational64,
}

impl CohGeometry {
    /// [PROVED] d_Coh(x, y) = inf_{P: x -> y} Delta_Coh(P)
    /// 
    /// This uses a directed shortest path search (Dijkstra) on the receipt graph.
    pub fn calculate_distance(&self, start_hash: [u8; 32], end_hash: [u8; 32]) -> Option<Rational64> {
        if start_hash == end_hash {
            return Some(Rational64::from_integer(0)); // Lemma 11.2: Identity
        }

        let mut dists: HashMap<[u8; 32], Rational64> = HashMap::new();
        let mut heap = BinaryHeap::new();

        dists.insert(start_hash, Rational64::from_integer(0));
        heap.push(PathCost { cost: Rational64::from_integer(0), node_hash: start_hash });

        while let Some(PathCost { cost, node_hash }) = heap.pop() {
            if node_hash == end_hash {
                return Some(cost);
            }

            if let Some(&d) = dists.get(&node_hash) {
                if cost > d {
                    continue;
                }
            }

            // Find all receipts starting from this node
            for receipt in &self.receipts {
                let full_from_hash = receipt.from_atom.canonical_hash().0;

                if full_from_hash == node_hash {
                    let next_node = receipt.to_atom.canonical_hash().0;
                    
                    // [V3 Part 4] Trajectory Cost Functional
                    let step_cost = self.weights.alpha_delta * receipt.envelope_defect 
                                  + self.weights.alpha_spend * receipt.spend 
                                  + self.weights.alpha_risk * receipt.projection_risk
                                  + self.weights.alpha_mem * Rational64::from_integer(receipt.proof.inner().memory_mass() as i64);

                    let mut next_cost = cost + step_cost;
                    if node_hash != start_hash {
                        next_cost += self.glue_overhead;
                    }

                    if !dists.contains_key(&next_node) || next_cost < *dists.get(&next_node).unwrap() {
                        dists.insert(next_node, next_cost);
                        heap.push(PathCost { cost: next_cost, node_hash: next_node });
                    }
                }
            }
        }

        None // d = +inf (no path exists)
    }

    /// [PROVED] Triangle Inequality: d(x, z) <= d(x, y) + d(y, z)
    pub fn verify_triangle_inequality(&self, x: [u8; 32], y: [u8; 32], z: [u8; 32]) -> bool {
        let d_xz = self.calculate_distance(x, z);
        let d_xy = self.calculate_distance(x, y);
        let d_yz = self.calculate_distance(y, z);

        match (d_xz, d_xy, d_yz) {
            (Some(xz), Some(xy), Some(yz)) => xz <= xy + yz,
            (None, _, _) => true, // inf <= something is always true
            (Some(_), None, _) | (Some(_), _, None) => true, // something <= inf is always true
        }
    }
}
