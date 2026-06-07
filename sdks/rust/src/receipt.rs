// Cohbit-Copilot Rust SDK — Receipt Hashing (v0.5)
// Deterministic canonical serialization + SHA-256 matching TypeScript implementation.

use sha2::{Sha256, Digest};
use crate::types::{Rational64, Wedge, CohBitReceipt};

// ─── Canonical Serialization ───────────────────────────────────

fn canonical_rational(r: &Rational64) -> String {
    let reduced = r.reduced();
    let sign = if reduced.numer < 0 { "-" } else { "" };
    format!("{}{}/{}", sign, reduced.numer.abs(), reduced.denom)
}

fn canonical_wedge(w: &Wedge) -> String {
    let parts = vec![
        format!("v:{}", w.version),
        format!("d:{}", w.domain_id),
        format!("p:{}", w.policy_hash),
        format!("f:{}", w.from_state),
        format!("a:{}", w.action_hash),
        format!("t:{}", w.to_state),
        format!("s:{}", canonical_rational(&w.spend)),
        format!("e:{}", canonical_rational(&w.defect)),
        format!("z:{}", canonical_rational(&w.prescribed_envelope)),
        format!("u:{}", canonical_rational(&w.authority)),
        format!("c:{}", w.certificate_hash),
    ];
    parts.join("|")
}

pub fn canonical_receipt(r: &CohBitReceipt) -> String {
    let parts = vec![
        format!("pre:{}", canonical_rational(&r.valuation_pre)),
        format!("post:{}", canonical_rational(&r.valuation_post)),
        format!("w:[{}]", canonical_wedge(&r.wedge)),
    ];
    parts.join("|")
}

// ─── Receipt Hashing ───────────────────────────────────────────

pub fn hash_receipt(receipt: &CohBitReceipt) -> String {
    let canonical = canonical_receipt(receipt);
    let mut hasher = Sha256::new();
    hasher.update(canonical.as_bytes());
    format!("{:x}", hasher.finalize())
}