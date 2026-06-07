use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use arbitrary::Arbitrary;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, PartialOrd, Ord, Arbitrary)]
pub struct Hash32(pub [u8; 32]);

impl Serialize for Hash32 {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&hex::encode(self.0))
    }
}

impl<'de> Deserialize<'de> for Hash32 {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where D: serde::Deserializer<'de> {
        let s = String::deserialize(deserializer)?;
        let bytes = hex::decode(s).map_err(serde::de::Error::custom)?;
        if bytes.len() != 32 {
            return Err(serde::de::Error::custom(format!("Hash32 must be 32 bytes, got {}", bytes.len())));
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Ok(Hash32(arr))
    }
}

impl Hash32 {
    pub fn from_hex(hex: &str) -> Result<Self, String> {
        if hex.len() != 64 {
            return Err("Invalid hex length".to_string());
        }
        let bytes = hex::decode(hex).map_err(|e| e.to_string())?;
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Ok(Hash32(arr))
    }

    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }

    pub fn tagged_hash(tag: &str, data: &[&[u8]]) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(tag.as_bytes());
        for d in data {
            hasher.update(d);
        }
        Hash32(hasher.finalize().into())
    }

    pub fn combine_tagged(&self, tag: &str, other: &Self) -> Self {
        Self::tagged_hash(tag, &[&self.0, &other.0])
    }
}

/// A placeholder signature for the CohBit.
/// 
/// [IMPORTANT] In a production system, this MUST be replaced by a cryptographic 
/// certificate issued by a verified signing authority.
#[derive(Clone, Debug, PartialEq, Eq, Arbitrary)]
pub struct PlaceholderSignature(pub Vec<u8>);

impl PlaceholderSignature {
    pub const MAX_SIZE: usize = 1024 * 1024; // 1MB cap for P1-4
}

impl Serialize for PlaceholderSignature {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&hex::encode(&self.0))
    }
}

impl<'de> Deserialize<'de> for PlaceholderSignature {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where D: serde::Deserializer<'de> {
        let s = String::deserialize(deserializer)?;
        let bytes = hex::decode(s).map_err(serde::de::Error::custom)?;
        Ok(PlaceholderSignature(bytes))
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Arbitrary)]
pub struct DomainId(pub Hash32);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default, Arbitrary)]
#[repr(u8)]
pub enum RvStatus {
    #[default]
    Unknown = 0,
    Accept = 1,
    Reject = 2,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Timestamp(pub u64);
