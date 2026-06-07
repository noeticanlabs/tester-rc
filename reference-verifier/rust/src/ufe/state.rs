use serde::{Deserialize, Serialize};
use num_rational::Rational64;
use crate::types::Hash32;
use crate::ufe::StateSpace;

/// Physical state: fields, fluids, gauge variables.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PhysState {
    pub density: Rational64,
    pub pressure: Rational64,
    pub temperature: Rational64,
    // Placeholder for field vectors
    pub velocity: [Rational64; 3],
    pub magnetic_field: [Rational64; 3],
    pub electric_field: [Rational64; 3],
}

/// Phaseloom variables (theta vectors).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PhaseState {
    pub theta: Vec<Rational64>,
}

/// Invariant quantities (I_1, ..., I_k).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InvState {
    pub invariants: Vec<Rational64>,
}

/// Verifier-facing quantities (defect, cost, margin, risk).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CertState {
    pub risk: Rational64,
    pub potential: Rational64,
}

/// Historical receipt state.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HistState {
    pub last_receipt_hash: Option<Hash32>,
    pub step_index: u64,
    pub chain_digest: Hash32,
}

/// [PROVED] X = X_phys x X_phase x X_inv x X_cert x X_hist
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExecutableState {
    pub phys: PhysState,
    pub phase: PhaseState,
    pub inv: InvState,
    pub cert: CertState,
    pub hist: HistState,
}

impl StateSpace for ExecutableState {}
