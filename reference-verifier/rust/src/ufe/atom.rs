use serde::{Deserialize, Serialize};
use num_rational::Rational64;
use arbitrary::Arbitrary;
use crate::ufe::field::CohField;

/// [PROVED] CohAtom: The localized finite-volume state carrier.
/// 
/// A_i(t) = (Theta_i, theta_i, V_i, D_i, C_i, R_i, I_i)
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CohAtom {
    pub coherence: Rational64,
    pub phase: Rational64,
    pub potential: Rational64,
    pub defect: Rational64,
    pub spend: Rational64,
    pub risk: Rational64,
    pub mass: Rational64,
    pub invariants: Vec<Rational64>,
}

impl CohAtom {
    pub fn canonical_hash(&self) -> crate::types::Hash32 {
        let mut data = Vec::new();
        data.push(self.coherence.numer().to_be_bytes().to_vec());
        data.push(self.coherence.denom().to_be_bytes().to_vec());
        data.push(self.phase.numer().to_be_bytes().to_vec());
        data.push(self.phase.denom().to_be_bytes().to_vec());
        data.push(self.potential.numer().to_be_bytes().to_vec());
        data.push(self.potential.denom().to_be_bytes().to_vec());
        data.push(self.defect.numer().to_be_bytes().to_vec());
        data.push(self.defect.denom().to_be_bytes().to_vec());
        data.push(self.risk.numer().to_be_bytes().to_vec());
        data.push(self.risk.denom().to_be_bytes().to_vec());
        data.push(self.mass.numer().to_be_bytes().to_vec());
        data.push(self.mass.denom().to_be_bytes().to_vec());
        
        let slices: Vec<&[u8]> = data.iter().map(|d| d.as_slice()).collect();
        crate::types::Hash32::tagged_hash("cohbit:v1:atom", &slices)
    }

    /// [PROVED] Finite-volume extraction from a CohField.
    /// 
    /// In a real system, this would integrate over the cell volume K_i.
    /// Here we assume a unit volume for the primitive demonstration.
    pub fn from_field(field: &CohField, volume: Rational64) -> Self {
        Self {
            coherence: field.theta_order * volume,
            phase: field.phase, // Phase is usually an average
            potential: field.potential_dens * volume,
            defect: field.defect_dens * volume,
            spend: field.spend_dens * volume,
            risk: field.risk_dens * volume,
            mass: Rational64::from_integer(0), // Calculated on demand
            invariants: field.values.iter().map(|&i| i * volume).collect(),
        }
    }

    /// [LAW] Computational Mass: M = V + D + R
    pub fn computational_mass(&self) -> Rational64 {
        self.potential + self.defect + self.risk
    }
}

impl<'a> Arbitrary<'a> for CohAtom {
    fn arbitrary(u: &mut arbitrary::Unstructured<'a>) -> arbitrary::Result<Self> {
        Ok(Self {
            coherence: Rational64::from_integer(u.arbitrary()?),
            phase: Rational64::from_integer(u.arbitrary()?),
            potential: Rational64::from_integer(u.arbitrary()?),
            defect: Rational64::from_integer(u.arbitrary()?),
            spend: Rational64::from_integer(u.arbitrary()?),
            risk: Rational64::from_integer(u.arbitrary()?),
            mass: Rational64::from_integer(u.arbitrary()?),
            invariants: vec![Rational64::from_integer(u.arbitrary()?)],
        })
    }
}
