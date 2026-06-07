#![forbid(unsafe_code)]
pub mod error;
pub mod types;
pub mod ufe;

use crate::error::CohBitReject;
use crate::types::{DomainId, Hash32, PlaceholderSignature, RvStatus};
use arbitrary::Arbitrary;
use num_rational::Rational64;
use serde::{Deserialize, Serialize};

/// Data required to construct a new CohBit.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CohBitInput {
    pub version: u16,
    pub domain: DomainId,
    pub bit_id: Hash32,
    pub from_state: Hash32,
    pub to_state: Hash32,
    pub action_hash: Hash32,
    pub prior_state_root: Hash32,
    pub verifier_id: Hash32,
    pub canon_profile_hash: Hash32,
    pub policy_hash: Hash32,
    pub certificate_hash: Hash32,
    pub valuation_pre: Rational64,
    pub valuation_post: Rational64,
    pub spend: Rational64,
    pub defect: Rational64,
    pub delta_hat: Rational64,
    pub authority: Rational64,
    pub step_index: u64,
    pub prev_receipt_hash: Option<Hash32>,
    pub chain_digest_pre: Hash32,
    pub rv_status: RvStatus,
    /// Placeholder: In a production system, this would be a real cryptographic proof.
    pub signature: PlaceholderSignature,
}

impl<'a> Arbitrary<'a> for CohBitInput {
    fn arbitrary(u: &mut arbitrary::Unstructured<'a>) -> arbitrary::Result<Self> {
        Ok(Self {
            version: u.arbitrary()?,
            domain: u.arbitrary()?,
            bit_id: u.arbitrary()?,
            from_state: u.arbitrary()?,
            to_state: u.arbitrary()?,
            action_hash: u.arbitrary()?,
            prior_state_root: u.arbitrary()?,
            verifier_id: u.arbitrary()?,
            canon_profile_hash: u.arbitrary()?,
            policy_hash: u.arbitrary()?,
            certificate_hash: u.arbitrary()?,
            valuation_pre: Rational64::from_integer(u.arbitrary()?),
            valuation_post: Rational64::from_integer(u.arbitrary()?),
            spend: Rational64::from_integer(u.arbitrary()?),
            defect: Rational64::from_integer(u.arbitrary()?),
            delta_hat: Rational64::from_integer(u.arbitrary()?),
            authority: Rational64::from_integer(u.arbitrary()?),
            step_index: u.arbitrary()?,
            prev_receipt_hash: u.arbitrary()?,
            chain_digest_pre: u.arbitrary()?,
            rv_status: u.arbitrary()?,
            signature: u.arbitrary()?,
        })
    }
}

/// The CohBit v1.0: The atomic primitive of certified computation.
///
/// [NOTE] Fields are private to enforce the "Reject-by-Construction" promise.
/// A CohBit cannot exist unless it has passed the Admissibility and structural validation.
#[derive(Clone, Debug, Serialize)]
pub struct CohBit {
    version: u16,
    domain: DomainId,
    bit_id: Hash32,

    // State Transition
    from_state: Hash32,
    to_state: Hash32,
    action_hash: Hash32,

    // Security Anchors
    prior_state_root: Hash32,
    verifier_id: Hash32,
    canon_profile_hash: Hash32,
    policy_hash: Hash32,
    certificate_hash: Hash32,

    // Accounting (Exact Rationals)
    valuation_pre: Rational64,
    valuation_post: Rational64,
    spend: Rational64,
    defect: Rational64,
    delta_hat: Rational64,
    authority: Rational64,

    // Trace Continuity
    step_index: u64,
    prev_receipt_hash: Option<Hash32>,
    chain_digest_pre: Hash32,
    chain_digest_post: Hash32,

    // Verifier Outcome
    rv_status: RvStatus,

    // Commitment
    receipt_hash: Hash32,
    signature: PlaceholderSignature,
}

#[cfg(any(test, feature = "test-utils"))]
impl<'de> serde::Deserialize<'de> for CohBit {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where D: serde::Deserializer<'de> {
        #[derive(Deserialize)]
        struct CohBitRaw {
            version: u16,
            domain: DomainId,
            bit_id: Hash32,
            from_state: Hash32,
            to_state: Hash32,
            action_hash: Hash32,
            prior_state_root: Hash32,
            verifier_id: Hash32,
            canon_profile_hash: Hash32,
            policy_hash: Hash32,
            certificate_hash: Hash32,
            valuation_pre: Rational64,
            valuation_post: Rational64,
            spend: Rational64,
            defect: Rational64,
            delta_hat: Rational64,
            authority: Rational64,
            step_index: u64,
            prev_receipt_hash: Option<Hash32>,
            chain_digest_pre: Hash32,
            chain_digest_post: Hash32,
            rv_status: RvStatus,
            receipt_hash: Hash32,
            signature: PlaceholderSignature,
        }
        let raw = CohBitRaw::deserialize(deserializer)?;
        Ok(Self {
            version: raw.version,
            domain: raw.domain,
            bit_id: raw.bit_id,
            from_state: raw.from_state,
            to_state: raw.to_state,
            action_hash: raw.action_hash,
            prior_state_root: raw.prior_state_root,
            verifier_id: raw.verifier_id,
            canon_profile_hash: raw.canon_profile_hash,
            policy_hash: raw.policy_hash,
            certificate_hash: raw.certificate_hash,
            valuation_pre: raw.valuation_pre,
            valuation_post: raw.valuation_post,
            spend: raw.spend,
            defect: raw.defect,
            delta_hat: raw.delta_hat,
            authority: raw.authority,
            step_index: raw.step_index,
            prev_receipt_hash: raw.prev_receipt_hash,
            chain_digest_pre: raw.chain_digest_pre,
            chain_digest_post: raw.chain_digest_post,
            rv_status: raw.rv_status,
            receipt_hash: raw.receipt_hash,
            signature: raw.signature,
        })
    }
}

/// [TCB] AcceptedCohBit: A displacement that has passed mathematical verification.
/// 
/// This type can only be constructed by successfully passing the Admissibility and 
/// structural validation checks. It is the "Mathematical Proof" of a transition.
/// 
/// [HARDENED] Deserialize is removed to prevent bypass via untrusted byte reconstruction.
#[derive(Clone, Debug, Serialize)]
pub struct AcceptedCohBit(pub(crate) CohBit);

impl AcceptedCohBit {
    pub fn inner(&self) -> &CohBit {
        &self.0
    }
}

/// [TCB] ExecutableCohBit: A displacement that has passed BOTH math and policy gates.
/// 
/// This is the only type sanctioned for state commitment. 
/// "Make illegal states unrepresentable."
/// 
/// [HARDENED] Deserialize is removed to prevent bypass.
#[derive(Clone, Debug, Serialize)]
pub struct ExecutableCohBit(pub(crate) AcceptedCohBit);

impl ExecutableCohBit {
    pub fn inner(&self) -> &CohBit {
        &self.0 .0
    }
    
    pub fn accepted(&self) -> &AcceptedCohBit {
        &self.0
    }
}

impl CohBit {
    pub fn input(&self) -> CohBitInput {
        CohBitInput {
            version: self.version,
            domain: self.domain,
            bit_id: self.bit_id,
            from_state: self.from_state,
            to_state: self.to_state,
            action_hash: self.action_hash,
            prior_state_root: self.prior_state_root,
            verifier_id: self.verifier_id,
            canon_profile_hash: self.canon_profile_hash,
            policy_hash: self.policy_hash,
            certificate_hash: self.certificate_hash,
            valuation_pre: self.valuation_pre,
            valuation_post: self.valuation_post,
            spend: self.spend,
            defect: self.defect,
            delta_hat: self.delta_hat,
            authority: self.authority,
            step_index: self.step_index,
            prev_receipt_hash: self.prev_receipt_hash,
            chain_digest_pre: self.chain_digest_pre,
            rv_status: self.rv_status,
            signature: self.signature.clone(),
        }
    }

    /// Maximum authority injection allowed per single transition to prevent budget inflation.
    pub const MAX_AUTHORITY_PER_BIT: i64 = 1_000_000;
    /// Checked constructor: Only returns an AcceptedCohBit if it is admissible and valid.
    pub fn new(input: CohBitInput) -> Result<AcceptedCohBit, CohBitReject> {
        if input.signature.0.len() > PlaceholderSignature::MAX_SIZE {
            return Err(CohBitReject::StructuralIntegrityFailure);
        }

        let mut bit = Self {
            version: input.version,
            domain: input.domain,
            bit_id: input.bit_id,
            from_state: input.from_state,
            to_state: input.to_state,
            action_hash: input.action_hash,
            prior_state_root: input.prior_state_root,
            verifier_id: input.verifier_id,
            canon_profile_hash: input.canon_profile_hash,
            policy_hash: input.policy_hash,
            certificate_hash: input.certificate_hash,
            valuation_pre: input.valuation_pre,
            valuation_post: input.valuation_post,
            spend: input.spend,
            defect: input.defect,
            delta_hat: input.delta_hat,
            authority: input.authority,
            step_index: input.step_index,
            prev_receipt_hash: input.prev_receipt_hash,
            chain_digest_pre: input.chain_digest_pre,
            chain_digest_post: Hash32([0; 32]), // Temporary
            rv_status: input.rv_status,
            receipt_hash: Hash32([0; 32]), // Temporary
            signature: input.signature,
        };

        // Derive commitments
        bit.receipt_hash = bit.receipt_hash_expected();
        bit.chain_digest_post = bit.chain_digest_post_expected();

        bit.validate()?;
        Ok(AcceptedCohBit(bit))
    }

    // --- Getters ---
    pub fn version(&self) -> u16 {
        self.version
    }
    pub fn domain(&self) -> &DomainId {
        &self.domain
    }
    pub fn bit_id(&self) -> &Hash32 {
        &self.bit_id
    }
    pub fn from_state(&self) -> &Hash32 {
        &self.from_state
    }
    pub fn to_state(&self) -> &Hash32 {
        &self.to_state
    }
    pub fn action_hash(&self) -> &Hash32 {
        &self.action_hash
    }
    pub fn prior_state_root(&self) -> &Hash32 {
        &self.prior_state_root
    }
    pub fn verifier_id(&self) -> &Hash32 {
        &self.verifier_id
    }
    pub fn canon_profile_hash(&self) -> &Hash32 {
        &self.canon_profile_hash
    }
    pub fn policy_hash(&self) -> &Hash32 {
        &self.policy_hash
    }
    pub fn certificate_hash(&self) -> &Hash32 {
        &self.certificate_hash
    }
    pub fn valuation_pre(&self) -> &Rational64 {
        &self.valuation_pre
    }
    pub fn valuation_post(&self) -> &Rational64 {
        &self.valuation_post
    }
    pub fn spend(&self) -> &Rational64 {
        &self.spend
    }
    pub fn defect(&self) -> &Rational64 {
        &self.defect
    }
    pub fn delta_hat(&self) -> &Rational64 {
        &self.delta_hat
    }
    pub fn authority(&self) -> &Rational64 {
        &self.authority
    }
    pub fn step_index(&self) -> u64 {
        self.step_index
    }
    pub fn prev_receipt_hash(&self) -> Option<Hash32> {
        self.prev_receipt_hash
    }
    pub fn chain_digest_pre(&self) -> &Hash32 {
        &self.chain_digest_pre
    }
    pub fn chain_digest_post(&self) -> &Hash32 {
        &self.chain_digest_post
    }
    pub fn rv_status(&self) -> RvStatus {
        self.rv_status
    }
    pub fn receipt_hash(&self) -> &Hash32 {
        &self.receipt_hash
    }
    pub fn signature(&self) -> &PlaceholderSignature {
        &self.signature
    }

    /// Computes the canonical payload hash for the receipt.
    pub fn payload_hash(&self) -> Hash32 {
        let mut data = Vec::new();
        data.push(self.version.to_be_bytes().to_vec());
        data.push(self.domain.0 .0.to_vec());
        data.push(self.bit_id.0.to_vec());
        data.push(self.prior_state_root.0.to_vec());
        data.push(self.from_state.0.to_vec());
        data.push(self.to_state.0.to_vec());
        data.push(self.action_hash.0.to_vec());
        data.push(self.verifier_id.0.to_vec());
        data.push(self.canon_profile_hash.0.to_vec());
        data.push(self.policy_hash.0.to_vec());
        data.push(self.certificate_hash.0.to_vec());

        let mut push_rat = |r: &Rational64| {
            let nr = r.reduced();
            data.push(nr.numer().to_be_bytes().to_vec());
            data.push(nr.denom().to_be_bytes().to_vec());
        };

        push_rat(&self.valuation_pre);
        push_rat(&self.valuation_post);
        push_rat(&self.spend);
        push_rat(&self.defect);
        push_rat(&self.delta_hat);
        push_rat(&self.authority);

        data.push(self.step_index.to_be_bytes().to_vec());
        if let Some(prev) = &self.prev_receipt_hash {
            data.push(vec![1]);
            data.push(prev.0.to_vec());
        } else {
            data.push(vec![0]);
        }
        data.push(self.chain_digest_pre.0.to_vec());
        data.push(vec![self.rv_status as u8]);

        let slices: Vec<&[u8]> = data.iter().map(|d| d.as_slice()).collect();
        Hash32::tagged_hash("cohbit:v1:payload", &slices)
    }

    pub fn receipt_hash_expected(&self) -> Hash32 {
        Hash32::tagged_hash("cohbit:v1:receipt", &[&self.payload_hash().0])
    }

    pub fn chain_digest_post_expected(&self) -> Hash32 {
        self.chain_digest_pre
            .combine_tagged("cohbit:v1:chain", &self.receipt_hash)
    }

    /// [LAW] The Admissibility Law: V(y) + s <= V(x) + d + a
    /// 
    /// Every accepted CohBit must satisfy this inequality.
    /// Refer to Lemma 1 in SPEC.md.
    /// 
    /// [HARDENED] Uses BigRational to prevent i64 overflow during verification.
    pub fn is_admissible(&self) -> bool {
        use num_rational::BigRational;
        use num_bigint::BigInt;

        let to_big = |r: &Rational64| {
            BigRational::new(BigInt::from(*r.numer()), BigInt::from(*r.denom()))
        };

        let v_pre = to_big(&self.valuation_pre);
        let v_post = to_big(&self.valuation_post);
        let spend = to_big(&self.spend);
        let defect = to_big(&self.defect);
        let authority = to_big(&self.authority);

        let lhs = v_post + spend;
        let rhs = v_pre + defect + authority;
        
        lhs <= rhs
    }

    /// [LAW] Memory Footprint Mass
    /// 
    /// M_mem = |CanonicalBytes(b)|
    /// 
    /// Returns the informational weight of the displacement in bytes.
    /// Refer to Definition 1.2 in SPEC.md.
    pub fn memory_mass(&self) -> usize {
        self.to_canonical_bytes().len()
    }

    /// [PROVED] Canonical Serialization
    /// 
    /// Returns a deterministic byte representation of the CohBit.
    /// [HARDENED] Uses the same binary field-order encoding as payload_hash
    /// instead of JSON to ensure mass stability and prevent encoding exploits.
    pub fn to_canonical_bytes(&self) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(b"cohbit:v1:canonical");
        
        // Use the manual payload logic as the canon source
        out.extend_from_slice(&self.payload_hash().0);
        out.extend_from_slice(&self.receipt_hash.0);
        out.extend_from_slice(&self.chain_digest_post.0);
        out.extend_from_slice(&self.signature.0);
        
        out
    }

    /// Structural validity: Hashes match, defect is bounded, verifier accepted.
    pub fn is_structurally_valid(&self) -> Result<(), CohBitReject> {
        // Mandate S3: Non-Negativity
        if self.spend < Rational64::from_integer(0)
            || self.defect < Rational64::from_integer(0)
            || self.authority < Rational64::from_integer(0)
            || self.valuation_pre < Rational64::from_integer(0)
            || self.valuation_post < Rational64::from_integer(0)
        {
            return Err(CohBitReject::NonCanonicalEncoding);
        }

        // Mandate S4: Bounded Authority
        if self.version != 1 {
            return Err(CohBitReject::UnsupportedVersion);
        }

        if self.authority > Rational64::from_integer(Self::MAX_AUTHORITY_PER_BIT) {
            return Err(CohBitReject::AuthorityExceedsCap);
        }

        if self.receipt_hash != self.receipt_hash_expected() {
            return Err(CohBitReject::BadReceiptHash);
        }
        if self.chain_digest_post != self.chain_digest_post_expected() {
            return Err(CohBitReject::ChainDigestMismatch);
        }
        if self.defect > self.delta_hat {
            return Err(CohBitReject::DefectExceedsDeltaHat);
        }
        if self.rv_status != RvStatus::Accept {
            return Err(CohBitReject::CertificateRejected);
        }
        Ok(())
    }

    /// Full validation: Structural + Admissibility.
    pub fn validate(&self) -> Result<(), CohBitReject> {
        self.is_structurally_valid()?;

        // [MANDATE] S2: Checked Admissibility
        // Refer to Theorem 2: Safety requires committed bits to be verified.
        if !self.is_admissible() {
            return Err(CohBitReject::NegativeMargin);
        }
        Ok(())
    }
}

/// Verification Logic for Trajectories
pub struct Verifier;

impl Verifier {
    pub fn verify_chain(bits: &[AcceptedCohBit]) -> Result<(), CohBitReject> {
        for (i, accepted) in bits.iter().enumerate() {
            let bit = accepted.inner();
            bit.validate()?;

            if i > 0 {
                let prev = bits[i - 1].inner();
                if bit.from_state != prev.to_state {
                    return Err(CohBitReject::StateHashMismatch);
                }
                if bit.prev_receipt_hash != Some(prev.receipt_hash) {
                    return Err(CohBitReject::PreviousReceiptMismatch);
                }
                if bit.step_index != prev.step_index + 1 {
                    return Err(CohBitReject::ChainIndexMismatch);
                }
                if bit.chain_digest_pre != prev.chain_digest_post {
                    return Err(CohBitReject::ChainDigestMismatch);
                }
            }
        }
        Ok(())
    }
}
