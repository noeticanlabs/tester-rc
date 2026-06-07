// CohBit-Copilot v12.1 — Rust Audit Scanner Core Candidate
// Standalone binary: regex-scans Rust source files for 5 core risk patterns.
// Used by the TypeScript bridge for cross-language scanner evidence.
//
// Operating law:
//   Rust scanner evidence may strengthen review confidence.
//   It does not prove a defect, authorize repair, or replace human review.
//   Regex matches are review signals, not defect certifications.

use std::env;
use std::fs;
use serde::{Deserialize, Serialize};
use regex::Regex;

#[derive(Deserialize)]
struct ScannerInput {
    files: Vec<FileEntry>,
}

#[derive(Deserialize)]
struct FileEntry {
    path: String,
    text: String,
}

#[derive(Serialize)]
struct ScannerFinding {
    file: String,
    line: u32,
    risk_kind: String,
    matched_text: String,
}

#[derive(Serialize)]
struct ScannerOutput {
    files_scanned: u32,
    findings: Vec<ScannerFinding>,
    evidence: String,
}

fn line_number(text: &str, index: usize) -> u32 {
    let mut count = 1u32;
    for (i, ch) in text.char_indices() {
        if i >= index { break; }
        if ch == '\n' { count += 1; }
    }
    count
}

fn snippet(text: &str, index: usize, len: usize) -> String {
    let start = index.saturating_sub(20);
    let end = std::cmp::min(text.len(), index + len + 60);
    let s = &text[start..end];
    s.replace(['\n', '\r', '\t'], " ").trim().to_string()
}

fn scan_file(path: &str, text: &str) -> Vec<ScannerFinding> {
    let mut findings = Vec::new();

    // Pattern 1: unsafe_block
    let re_unsafe = Regex::new(r"unsafe\s*\{").unwrap();
    for m in re_unsafe.find_iter(text) {
        findings.push(ScannerFinding {
            file: path.to_string(),
            line: line_number(text, m.start()),
            risk_kind: "unsafe_block".to_string(),
            matched_text: snippet(text, m.start(), m.len()),
        });
    }

    // Pattern 2: process_command (std::process::Command)
    let re_cmd = Regex::new(r"std::process::Command\b").unwrap();
    for m in re_cmd.find_iter(text) {
        findings.push(ScannerFinding {
            file: path.to_string(),
            line: line_number(text, m.start()),
            risk_kind: "process_command".to_string(),
            matched_text: snippet(text, m.start(), m.len()),
        });
    }

    // Pattern 3: filesystem_delete_file (fs::remove_file)
    let re_del = Regex::new(r"fs::remove_file\s*\(").unwrap();
    for m in re_del.find_iter(text) {
        findings.push(ScannerFinding {
            file: path.to_string(),
            line: line_number(text, m.start()),
            risk_kind: "filesystem_delete_file".to_string(),
            matched_text: snippet(text, m.start(), m.len()),
        });
    }

    // Pattern 4: unwrap_review_signal (.unwrap()
    let re_unwrap = Regex::new(r"\.unwrap\s*\(").unwrap();
    for m in re_unwrap.find_iter(text) {
        findings.push(ScannerFinding {
            file: path.to_string(),
            line: line_number(text, m.start()),
            risk_kind: "unwrap_review_signal".to_string(),
            matched_text: snippet(text, m.start(), m.len()),
        });
    }

    // Pattern 5: panic_review_signal (panic!)
    let re_panic = Regex::new(r"panic!\s*[\(m]").unwrap();
    for m in re_panic.find_iter(text) {
        findings.push(ScannerFinding {
            file: path.to_string(),
            line: line_number(text, m.start()),
            risk_kind: "panic_review_signal".to_string(),
            matched_text: snippet(text, m.start(), m.len()),
        });
    }

    findings
}

fn main() {
    let payload_path = env::args().nth(1).expect("Usage: scanner_gate <payload.json>");
    let data = fs::read_to_string(&payload_path).expect("Failed to read payload");
    let input: ScannerInput = serde_json::from_str(&data).expect("Invalid payload");

    let mut all_findings = Vec::new();

    for entry in &input.files {
        let findings = scan_file(&entry.path, &entry.text);
        all_findings.extend(findings);
    }

    let total = all_findings.len();
    let evidence = format!(
        "Rust scanner gate: scanned {} files, found {} findings across {} risk kinds",
        input.files.len(),
        total,
        {
            let mut kinds: Vec<&str> = all_findings.iter().map(|f| f.risk_kind.as_str()).collect();
            kinds.sort();
            kinds.dedup();
            kinds.len()
        }
    );

    let output = ScannerOutput {
        files_scanned: input.files.len() as u32,
        findings: all_findings,
        evidence,
    };

    let json = serde_json::to_string_pretty(&output).expect("Failed to serialize output");
    println!("{}", json);
}