use num_rational::Rational64;
use crate::ufe::atom::CohAtom;
use crate::ufe::mesh::Mesh;
use crate::ufe::valuation::ValuationOracle;
use crate::ufe::variational::ActionWeights;
use crate::ufe::projection::{ObservableReceipt, Projection, HiddenRealization};

/// [PROVED] BitProver: A factory for certified displacements.
pub trait BitProver {
    fn prove(
        &self,
        from_atom: &CohAtom,
        to_atom: &CohAtom,
        spend: Rational64,
        defect: Rational64,
        authority: Rational64,
    ) -> crate::AcceptedCohBit;
}

/// [PROVED] CertifiedSolver: Governed dynamics engine for following geodesics.
pub struct CertifiedSolver<'a, V: ValuationOracle, P: BitProver> {
    pub mesh: &'a Mesh,
    pub oracle: &'a V,
    pub prover: &'a P,
    pub weights: ActionWeights,
    pub glue_overhead: Rational64,
}

impl<'a, V: ValuationOracle, P: BitProver> CertifiedSolver<'a, V, P> {
    /// [PROVED] Governed Step: Propose, refine, and certify.
    pub fn governed_step(
        &self,
        from_atom: &CohAtom,
        proposals: Vec<(CohAtom, Rational64, Rational64, Rational64)>, // (Target, Spend, Defect, Authority)
    ) -> Option<ObservableReceipt> {
        let mut best_receipt: Option<ObservableReceipt> = None;
        let mut min_action: Option<Rational64> = None;

        let v_pre = self.oracle.valuate(from_atom);

        for (to_candidate, spend, defect, authority) in proposals {
            let v_post = self.oracle.valuate(&to_candidate);
            
            // Admissibility Check: V(post) + s <= V(pre) + d + a
            if v_post + spend <= v_pre + defect + authority {
                // Generate the real proof for this candidate (P0-3)
                let proof = self.prover.prove(from_atom, &to_candidate, spend, defect, authority);
                
                // It is admissible! Now check if it's the best displacement.
                let hidden = HiddenRealization { 
                    fields: vec![], 
                    unresolved_energy: defect,
                    projection_risk: authority * Rational64::new(1, 10), // Heuristic: risk scales with authority
                };
                let receipt = Projection::project(&hidden, from_atom.clone(), to_candidate.clone(), spend, proof);
                
                // Calculate action (from Layer 12)
                let action = self.weights.alpha_delta * receipt.envelope_defect 
                            + self.weights.alpha_spend * receipt.spend 
                            + self.weights.alpha_risk * receipt.projection_risk
                            + self.weights.alpha_mem * Rational64::from_integer(receipt.proof.inner().memory_mass() as i64);

                if min_action.is_none() || action < min_action.unwrap() {
                    min_action = Some(action);
                    best_receipt = Some(receipt);
                }
            }
        }

        best_receipt
    }
}
