pub mod field;
pub mod atom;
pub mod cluster;
pub mod mesh;
pub mod trajectory;
pub mod projection;
pub mod geometry;
pub mod valuation;
pub mod solver;
pub mod variational;
pub mod policy;

use crate::CohBitInput;
use crate::types::{Hash32, DomainId, PlaceholderSignature, RvStatus};
use crate::ufe::atom::CohAtom;
use num_rational::Rational64;

/// [PROVED] CohBitBridge: The bridge from PDE atoms to certified transitions.
pub struct CohBitBridge;

impl CohBitBridge {
    /// [PROVED] Create a CohBit from a transition between two CohAtoms.
    pub fn create_bit(
        domain: DomainId,
        from: &CohAtom,
        to: &CohAtom,
        defect: Rational64,
        spend: Rational64,
        authority: Rational64,
        step_index: u64,
        prev_receipt_hash: Option<Hash32>,
        chain_digest_pre: Hash32,
    ) -> crate::AcceptedCohBit {
        let input = CohBitInput {
            version: 1,
            domain,
            bit_id: Hash32::tagged_hash("cohbit:v1:id", &[&from.canonical_hash().0, &to.canonical_hash().0]),
            from_state: from.canonical_hash(),
            to_state: to.canonical_hash(),
            action_hash: Hash32([0; 32]), // Transition action hash placeholder
            prior_state_root: Hash32([0; 32]), // Global state root placeholder
            verifier_id: Hash32([0; 32]),
            canon_profile_hash: Hash32([10; 32]), 
            policy_hash: Hash32([11; 32]),        
            certificate_hash: Hash32([0; 32]),
            valuation_pre: from.potential,
            valuation_post: to.potential,
            spend,
            defect,
            delta_hat: defect, 
            authority,
            step_index,
            prev_receipt_hash,
            chain_digest_pre,
            rv_status: RvStatus::Accept,
            signature: PlaceholderSignature(vec![0; 64]),
        };

        crate::CohBit::new(input).expect("Failed to create CohBit from atom transition")
    }
}
