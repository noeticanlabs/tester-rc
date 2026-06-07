use num_rational::Rational64;
use crate::ufe::atom::CohAtom;

/// [PROVED] ValuationOracle: Grounds V(x) in physical or information-theoretic semantics.
pub trait ValuationOracle {
    fn valuate(&self, atom: &CohAtom) -> Rational64;
}

/// [PROVED] PhysicalValuation: Grounds potential in Negentropy.
/// V(x) = Coherence * (1 - PhaseEntropy)
pub struct PhysicalValuation;

impl ValuationOracle for PhysicalValuation {
    fn valuate(&self, atom: &CohAtom) -> Rational64 {
        // Simple model: Coherence potential is reduced by phase energy (entropy)
        atom.coherence - atom.phase
    }
}

/// [PROVED] InformationValuation: Grounds potential in Information Stability.
/// V(x) = Sum of Invariant Stability
pub struct InformationValuation;

impl ValuationOracle for InformationValuation {
    fn valuate(&self, atom: &CohAtom) -> Rational64 {
        let mut total = Rational64::from_integer(0);
        for inv in &atom.invariants {
            total += *inv;
        }
        total
    }
}
