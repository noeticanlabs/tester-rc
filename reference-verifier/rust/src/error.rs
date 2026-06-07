use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum CohBitReject {
    #[error("Non-canonical encoding")]
    NonCanonicalEncoding,
    #[error("Bad receipt hash")]
    BadReceiptHash,
    #[error("Bad signature")]
    BadSignature,
    #[error("Certificate rejected")]
    CertificateRejected,
    #[error("Defect exceeds delta-hat")]
    DefectExceedsDeltaHat,
    #[error("Policy hash mismatch")]
    PolicyHashMismatch,
    #[error("Negative margin (Inadmissible)")]
    NegativeMargin,
    #[error("Authority exceeds per-bit cap")]
    AuthorityExceedsCap,
    #[error("State hash mismatch")]
    StateHashMismatch,
    #[error("Chain index mismatch")]
    ChainIndexMismatch,
    #[error("Chain digest mismatch")]
    ChainDigestMismatch,
    #[error("Previous receipt mismatch")]
    PreviousReceiptMismatch,
    #[error("Execution mismatch")]
    ExecutionMismatch,
    #[error("Unsupported version")]
    UnsupportedVersion,
    #[error("Policy violation: Memory mass exceeded")]
    PolicyMemoryMassExceeded,
    #[error("Policy violation: Trace mass exceeded")]
    PolicyTraceMassExceeded,
    #[error("Structural integrity failure")]
    StructuralIntegrityFailure,
}
