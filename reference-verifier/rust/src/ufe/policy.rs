use crate::CohBit;
use crate::error::CohBitReject;
use crate::types::Hash32;
use num_rational::Rational64;

/// [POLICY] Substrate Governance Policy
#[derive(Clone, Debug)]
pub struct Policy {
    max_memory_mass: Option<usize>,
    max_trace_memory_mass: Option<usize>,
    max_authority_injection: Rational64,
}

impl Default for Policy {
    fn default() -> Self {
        Self {
            max_memory_mass: Some(1024 * 1024), // 1MB per bit default
            max_trace_memory_mass: None,
            max_authority_injection: Rational64::from_integer(1_000_000),
        }
    }
}

impl Policy {
    pub fn new(max_mem: Option<usize>, max_trace: Option<usize>, max_auth: Rational64) -> Self {
        Self {
            max_memory_mass: max_mem,
            max_trace_memory_mass: max_trace,
            max_authority_injection: max_auth,
        }
    }

    /// [PROVED] Policy Hashing
    /// 
    /// Returns a deterministic hash of the policy parameters.
    pub fn hash(&self) -> Hash32 {
        let mut data = Vec::new();
        data.extend_from_slice(b"cohbit:v1:policy");

        match self.max_memory_mass {
            Some(m) => {
                data.push(1);
                data.extend_from_slice(&m.to_be_bytes());
            }
            None => data.push(0),
        }

        match self.max_trace_memory_mass {
            Some(t) => {
                data.push(1);
                data.extend_from_slice(&t.to_be_bytes());
            }
            None => data.push(0),
        }

        data.extend_from_slice(&self.max_authority_injection.numer().to_be_bytes());
        data.extend_from_slice(&self.max_authority_injection.denom().to_be_bytes());
        
        Hash32::tagged_hash("cohbit:v1:policy", &[&data])
    }

    /// [MANDATE] Policy Authorization: Accepted -> Executable
    pub fn authorize(&self, accepted: crate::AcceptedCohBit) -> Result<crate::ExecutableCohBit, CohBitReject> {
        let bit = accepted.inner();

        // [LOCK] Policy Bind: The bit must declare the hash of the policy it claims to pass.
        if accepted.inner().policy_hash != self.hash() {
            return Err(CohBitReject::PolicyHashMismatch);
        }

        self.verify_bit(bit)?;
        Ok(crate::ExecutableCohBit(accepted))
    }

    pub fn verify_bit(&self, bit: &CohBit) -> Result<(), CohBitReject> {
        // Enforce structural and admissibility first
        bit.validate()?;

        // Enforce M_mem policy
        if let Some(limit) = self.max_memory_mass {
            if bit.memory_mass() > limit {
                return Err(CohBitReject::PolicyMemoryMassExceeded);
            }
        }

        // Enforce Authority cap
        if *bit.authority() > self.max_authority_injection {
            return Err(CohBitReject::AuthorityExceedsCap);
        }

        Ok(())
    }

    pub fn verify_path(&self, path: &[crate::AcceptedCohBit]) -> Result<(), CohBitReject> {
        let mut total_mem_mass = 0;

        for accepted in path {
            let bit = accepted.inner();
            self.verify_bit(bit)?;
            total_mem_mass += bit.memory_mass();
        }

        if let Some(limit) = self.max_trace_memory_mass {
            if total_mem_mass > limit {
                return Err(CohBitReject::PolicyTraceMassExceeded);
            }
        }

        Ok(())
    }
}

/// [TCB] Governance Gate: The mandatory checkpoint for execution.
/// 
/// This gate ensures that mathematical acceptance is coupled with 
/// operational permission. It is the only TCB-sanctioned path to 
/// state commitment.
pub struct GovernanceGate<'a> {
    pub policy: &'a Policy,
}

impl<'a> GovernanceGate<'a> {
    /// [MANDATE] Secure Transformation: Accepted -> Executable
    pub fn authorize(&self, accepted: crate::AcceptedCohBit) -> Result<crate::ExecutableCohBit, CohBitReject> {
        self.policy.authorize(accepted)
    }

    /// [MANDATE] Secure Trace Verification
    pub fn verify_trajectory(&self, path: &[crate::AcceptedCohBit]) -> Result<(), CohBitReject> {
        self.policy.verify_path(path)
    }
}
