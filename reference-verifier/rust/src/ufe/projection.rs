use serde::{Deserialize, Serialize};
use num_rational::Rational64;
use crate::ufe::field::CohField;
use crate::ufe::atom::CohAtom;

/// [PROVED] HiddenRealization: The actual continuous or high-res field evolution.
/// 
/// xi = Psi | {K x [t, t+1]}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HiddenRealization {
    pub fields: Vec<CohField>, // Sequence of fields during the transition
    pub unresolved_energy: Rational64, // Subgrid/numerical residual
    pub projection_risk: Rational64,   // rho_Pi(R)
}

/// [PROVED] ObservableReceipt: The finite, deterministic record seen by the verifier.
#[derive(Clone, Debug, Serialize)]
pub struct ObservableReceipt {
    pub from_atom: CohAtom,
    pub to_atom: CohAtom,
    pub spend: Rational64,
    pub envelope_defect: Rational64, // hat{delta}(R)
    pub projection_risk: Rational64, // rho_Pi(R)
    pub proof: crate::AcceptedCohBit,
}

/// [PROVED] Projection Map: Pi: G -> V
pub struct Projection;

impl Projection {
    /// [PROVED] Projects a hidden realization into an observable receipt.
    pub fn project(
        hidden: &HiddenRealization,
        from_atom: CohAtom,
        to_atom: CohAtom,
        spend: Rational64,
        proof: crate::AcceptedCohBit,
    ) -> ObservableReceipt {
        // [V2] hat{delta}(R) = sup_{Psi in F_R} D_G(Psi)
        let envelope_defect = hidden.unresolved_energy; 
        
        // [V2] rho_Pi(R) = sup_{Psi in F_R} L+_Pi(Psi)
        let projection_risk = hidden.projection_risk;

        ObservableReceipt {
            from_atom,
            to_atom,
            spend,
            envelope_defect,
            projection_risk,
            proof,
        }
    }
}

/// [PROVED] Theorem 10.1: Projection-Safe Receipt Certification
pub struct ReceiptVerifier;

impl ReceiptVerifier {
    pub fn verify_projection_safety(
        receipt: &ObservableReceipt,
        actual_hidden_cost: Rational64,
        risk_threshold: Rational64, // Theta_Pi
    ) -> bool {
        // 1. Envelope Domination check: hat{delta}(R) >= delta(R)
        if receipt.envelope_defect < actual_hidden_cost {
            return false; // Projection gap!
        }

        // 2. [V2 Part VI] Projection Risk Gate: rho_Pi(R) <= Theta_Pi
        if receipt.projection_risk > risk_threshold {
            return false;
        }

        // 3. Coh Law using Envelope: V_post + C <= V_pre + hat{delta}
        if receipt.to_atom.potential + receipt.spend > receipt.from_atom.potential + receipt.envelope_defect {
            return false;
        }

        true
    }
}
