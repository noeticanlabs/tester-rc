// Cohbit-Copilot Rust SDK — Core Types (v0.5)
// Mirrors the TypeScript Rational64, Wedge, and CohBitReceipt structures.
// Not a production client library.

use serde::{Deserialize, Serialize};

/// Rational valuation type matching cohbit_receipt.schema.json
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Rational64 {
    pub numer: i64,
    pub denom: i64, // minimum 1
}

impl Rational64 {
    /// Reduce to simplest form via GCD
    pub fn reduced(&self) -> Self {
        let g = gcd(self.numer.abs(), self.denom);
        if g == 0 {
            Rational64 { numer: self.numer, denom: self.denom }
        } else {
            Rational64 {
                numer: self.numer / g,
                denom: self.denom / g,
            }
        }
    }
}

fn gcd(mut a: i64, mut b: i64) -> i64 {
    if a == 0 || b == 0 { return 1; }
    a = a.abs();
    b = b.abs();
    while b != 0 {
        let t = b;
        b = a % b;
        a = t;
    }
    a
}

/// 11-Term Wedge Law from expanded SPEC.md
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Wedge {
    pub version: String,
    pub domain_id: String,       // 64-char hex
    pub policy_hash: String,     // 64-char hex
    pub from_state: String,      // 64-char hex
    pub action_hash: String,     // 64-char hex
    pub to_state: String,        // 64-char hex
    pub spend: Rational64,
    pub defect: Rational64,
    pub prescribed_envelope: Rational64,
    pub authority: Rational64,
    pub certificate_hash: String, // 64-char hex
}

/// Matching cohbit_receipt.schema.json
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CohBitReceipt {
    pub bit_id: String,           // 64-char hex
    pub valuation_pre: Rational64,
    pub valuation_post: Rational64,
    pub wedge: Wedge,
}