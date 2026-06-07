use serde::{Deserialize, Serialize};
use num_rational::Rational64;

/// [PROVED] CohField: The continuous computational-physics substrate.
/// 
/// Psi(x, t) = (Theta, theta, v, d, c, r, I)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CohField {
    pub theta_order: Rational64,   // Theta: order/coherence field
    pub phase: Rational64,         // theta: phase field
    pub potential_dens: Rational64, // v: potential density
    pub defect_dens: Rational64,    // d: defect density
    pub spend_dens: Rational64,     // c: cost/spend density
    pub risk_dens: Rational64,      // r: risk density
    pub values: Vec<Rational64>,
}

impl CohField {
    pub fn canonical_hash(&self) -> crate::types::Hash32 {
        let mut data = Vec::new();
        for v in &self.values {
            data.push(v.numer().to_be_bytes().to_vec());
            data.push(v.denom().to_be_bytes().to_vec());
        }
        let slices: Vec<&[u8]> = data.iter().map(|d| d.as_slice()).collect();
        crate::types::Hash32::tagged_hash("cohbit:v1:field", &slices)
    }
}

/// [PROVED] CohField PDE: The balance-law form.
/// 
/// dt Psi + div J_Psi = - dE/dPsi + S_Psi
pub trait CohFieldPDE {
    fn evolve(&self, field: &CohField, dt: Rational64) -> CohField;
    fn flux(&self, field: &CohField) -> CohField;
    fn source(&self, field: &CohField) -> CohField;
}
