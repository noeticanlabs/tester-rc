// CohBit-Copilot v12.0 — Rust Deterministic ID Gate
// Standalone binary: verifies finding/obligation/processor IDs from conformance vectors.
// Used by the TypeScript bridge for cross-language ID verification.
//
// Operating law:
//   Rust may verify deterministic ID facts.
//   Rust verifier output is evidence, not authority.

use std::env;
use std::fs;
use sha2::{Sha256, Digest};
use serde::Deserialize;

#[derive(Deserialize)]
struct IdVector {
    #[serde(rename = "type")]
    id_type: String,
    description: String,
    input: IdInput,
    #[serde(rename = "expectedId")]
    expected_id: String,
}

#[derive(Deserialize)]
struct IdInput {
    file: Option<String>,
    line: Option<i64>,
    #[serde(rename = "riskKind")]
    risk_kind: Option<String>,
    #[serde(rename = "workflowId")]
    workflow_id: Option<String>,
    #[serde(rename = "processorKind")]
    processor_kind: Option<String>,
    #[serde(rename = "startTime")]
    start_time: Option<String>,
}

fn compute_finding_id(file: &str, line: i64, risk_kind: &str) -> String {
    let input = format!("{}:{}:{}", file, line, risk_kind);
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())[..16].to_string()
}

fn compute_obligation_id(file: &str, line: i64, risk_kind: &str) -> String {
    let input = format!("obl:{}:{}:{}", file, line, risk_kind);
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("OBL_{}", &format!("{:x}", hasher.finalize())[..20])
}

fn compute_processor_id(workflow_id: &str, processor_kind: &str, start_time: &str) -> String {
    let input = format!("proc:{}:{}:{}", workflow_id, processor_kind, start_time);
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())[..16].to_string()
}

fn main() {
    let payload_path = env::args().nth(1).expect("Usage: id_gate <payload.json>");
    let data = fs::read_to_string(&payload_path).expect("Failed to read payload");
    let vectors: Vec<IdVector> = serde_json::from_str(&data).expect("Invalid payload");

    let mut passed = 0;
    let total = vectors.len();
    let mut mismatches = 0;

    for v in &vectors {
        let computed = match v.id_type.as_str() {
            "finding" => {
                let file = v.input.file.as_deref().unwrap_or("");
                let line = v.input.line.unwrap_or(0);
                let risk = v.input.risk_kind.as_deref().unwrap_or("");
                compute_finding_id(file, line, risk)
            }
            "obligation" => {
                let file = v.input.file.as_deref().unwrap_or("");
                let line = v.input.line.unwrap_or(0);
                let risk = v.input.risk_kind.as_deref().unwrap_or("");
                compute_obligation_id(file, line, risk)
            }
            "processor" => {
                let wf = v.input.workflow_id.as_deref().unwrap_or("");
                let pk = v.input.processor_kind.as_deref().unwrap_or("");
                let st = v.input.start_time.as_deref().unwrap_or("");
                compute_processor_id(wf, pk, st)
            }
            other => {
                eprintln!("Unknown ID type: {}", other);
                continue;
            }
        };

        if computed == v.expected_id {
            passed += 1;
            println!("VERIFIED {} {}", v.id_type, computed);
        } else {
            mismatches += 1;
            eprintln!(
                "MISMATCH {} [{}]: expected:{} got:{}",
                v.id_type, v.description, v.expected_id, computed
            );
        }
    }

    if mismatches > 0 {
        eprintln!("\nRust ID Gate: {}/{} vectors match, {} mismatches", passed, total, mismatches);
        std::process::exit(1);
    }

    println!("\nRust ID Gate: {}/{} vectors match. All IDs verified.", passed, total);
}