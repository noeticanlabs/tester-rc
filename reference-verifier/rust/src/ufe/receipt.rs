use serde::{Deserialize, Serialize};
use crate::CohBit;
use crate::ufe::StateSpace;

/// [PROVED] A committed transition has a receipt r_n.
/// 
/// The receipt is the bridge from dynamics to proof-carrying execution.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Receipt<S: StateSpace> {
    pub from_state: S,
    pub to_state: S,
    pub proof: CohBit,
}

/// [PROVED] Executable history H_n = (r_0, ..., r_{n-1})
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct History<S: StateSpace> {
    pub receipts: Vec<Receipt<S>>,
}

impl<S: StateSpace> History<S> {
    pub fn new() -> Self {
        Self { receipts: Vec::new() }
    }

    pub fn push(&mut self, receipt: Receipt<S>) {
        self.receipts.push(receipt);
    }
}
