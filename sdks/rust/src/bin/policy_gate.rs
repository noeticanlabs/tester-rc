// CohBit-Copilot v12.2 — Rust Policy / Admissibility Gate
// Standalone binary: validates proposal authorization preconditions.
// Used by the TypeScript bridge for independent gate evidence.
//
// Operating law:
//   Rust may verify deterministic gate preconditions.
//   Rust may return policy/admissibility evidence.
//   Rust may not authorize commit, close obligations, or apply patches.
//   The TypeScript gate lifecycle remains the authority path.

use std::env;
use std::fs;
use serde::{Deserialize, Serialize};

// ─── Rational64 ───────────────────────────────────────────────

#[derive(Clone, Deserialize)]
struct Rational {
    numer: i64,
    denom: i64,
}

impl Rational {
    fn to_f64(&self) -> f64 {
        self.numer as f64 / self.denom.max(1) as f64
    }
}

// ─── Input Types ──────────────────────────────────────────────

#[derive(Deserialize)]
struct PolicyGateInput {
    proposal: ProposalData,
    authorization: AuthorizationData,
    #[serde(default = "default_max_files")]
    max_files: u32,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct ProposalData {
    #[serde(rename = "policyHash")]
    policy_hash: String,
    files: Vec<FileEntry>,
    #[serde(rename = "estimatedSpend")]
    estimated_spend: Rational,
    #[serde(rename = "estimatedDefect")]
    estimated_defect: Rational,
    #[serde(rename = "requiredAuthority")]
    required_authority: Rational,
}

#[derive(Deserialize)]
struct FileEntry {
    path: String,
    #[allow(dead_code)]
    action: String,
    #[serde(default, rename = "requiresReview")]
    #[allow(dead_code)]
    requires_review: bool,
}

#[derive(Deserialize)]
struct AuthorizationData {
    #[serde(rename = "valuationPre")]
    valuation_pre: Rational,
    #[serde(rename = "valuationPost")]
    valuation_post: Rational,
    #[serde(rename = "memoryBudget")]
    memory_budget: f64,
    #[serde(rename = "receiptPolicyHash")]
    receipt_policy_hash: String,
    #[serde(rename = "receiptSpend")]
    receipt_spend: Rational,
    #[serde(rename = "receiptDefect")]
    receipt_defect: Rational,
    #[serde(rename = "receiptAuthority")]
    receipt_authority: Rational,
    #[serde(rename = "receiptCanonicalBytes")]
    receipt_canonical_bytes: f64,
}

fn default_max_files() -> u32 { 10 }

// ─── Output ──────────────────────────────────────────────────

#[derive(Serialize)]
struct CheckResult {
    check: String,
    passed: bool,
    detail: Option<String>,
}

#[derive(Serialize)]
struct PolicyGateOutput {
    valid: bool,
    evidence: String,
    checks: Vec<CheckResult>,
}

// ─── Validation ──────────────────────────────────────────────

fn validate(input: &PolicyGateInput) -> PolicyGateOutput {
    let mut checks: Vec<CheckResult> = Vec::new();
    let mut valid = true;

    // Check 1: Policy hash present
    let hash_present = !input.proposal.policy_hash.is_empty();
    checks.push(CheckResult {
        check: "policy_hash_present".to_string(),
        passed: hash_present,
        detail: if hash_present { None } else { Some("Proposal policy_hash is empty.".to_string()) },
    });
    if !hash_present { valid = false; }

    // Check 2: Policy hash match
    let hash_match = if hash_present {
        let m = input.proposal.policy_hash == input.authorization.receipt_policy_hash;
        checks.push(CheckResult {
            check: "policy_hash_match".to_string(),
            passed: m,
            detail: if m { None } else {
                Some(format!("Receipt declares '{}', proposal requires '{}'.",
                    input.authorization.receipt_policy_hash, input.proposal.policy_hash))
            },
        });
        m
    } else {
        checks.push(CheckResult {
            check: "policy_hash_match".to_string(),
            passed: false,
            detail: Some("Skipped: policy_hash not present.".to_string()),
        });
        false
    };
    if !hash_match { valid = false; }

    // Check 3: Admissibility law — V_post + spend ≤ V_pre + defect + authority
    let lhs = input.authorization.valuation_post.to_f64() + input.authorization.receipt_spend.to_f64();
    let rhs = input.authorization.valuation_pre.to_f64()
        + input.authorization.receipt_defect.to_f64()
        + input.authorization.receipt_authority.to_f64();
    let admissible = lhs <= rhs;
    checks.push(CheckResult {
        check: "admissibility".to_string(),
        passed: admissible,
        detail: Some(format!(
            "V({}) + s({}) = {} ≤ V({}) + d({}) + a({}) = {}",
            input.authorization.valuation_post.numer,
            input.authorization.receipt_spend.numer,
            lhs,
            input.authorization.valuation_pre.numer,
            input.authorization.receipt_defect.numer,
            input.authorization.receipt_authority.numer,
            rhs,
        )),
    });
    if !admissible { valid = false; }

    // Check 4: Memory mass budget
    let within_mem = input.authorization.receipt_canonical_bytes <= input.authorization.memory_budget;
    checks.push(CheckResult {
        check: "memory_budget".to_string(),
        passed: within_mem,
        detail: Some(format!(
            "Canonical bytes {:.0} ≤ budget {:.0}",
            input.authorization.receipt_canonical_bytes,
            input.authorization.memory_budget,
        )),
    });
    if !within_mem { valid = false; }

    // Check 5: File paths are relative (not absolute, no null bytes)
    let mut paths_valid = true;
    for f in &input.proposal.files {
        if f.path.starts_with('/') || (f.path.len() > 1 && f.path.chars().nth(1) == Some(':')) {
            paths_valid = false;
            break;
        }
        if f.path.contains('\0') {
            paths_valid = false;
            break;
        }
        if f.path.contains("..") {
            paths_valid = false;
            break;
        }
    }
    checks.push(CheckResult {
        check: "file_paths_in_scope".to_string(),
        passed: paths_valid,
        detail: Some(format!(
            "{} file(s) checked — paths_valid={}",
            input.proposal.files.len(),
            paths_valid,
        )),
    });
    if !paths_valid { valid = false; }

    // Check 6: File count within budget
    let file_count_ok = input.proposal.files.len() as u32 <= input.max_files;
    checks.push(CheckResult {
        check: "file_count_budget".to_string(),
        passed: file_count_ok,
        detail: Some(format!(
            "{} files ≤ max {}", input.proposal.files.len(), input.max_files,
        )),
    });
    if !file_count_ok { valid = false; }

    // Check 7: Required fields present (checked by deserialization success)
    let fields_ok = input.authorization.valuation_pre.denom > 0
        && input.authorization.valuation_post.denom > 0
        && input.authorization.receipt_spend.denom > 0
        && input.authorization.receipt_defect.denom > 0
        && input.authorization.receipt_authority.denom > 0;
    checks.push(CheckResult {
        check: "receipt_fields".to_string(),
        passed: fields_ok,
        detail: if fields_ok {
            Some("All required fields present and well-formed.".to_string())
        } else {
            Some("One or more Rational denom ≤ 0.".to_string())
        },
    });
    if !fields_ok { valid = false; }

    // Check 8: High-risk action classes flagged as review-required
    let high_risk_dirs = ["src/gates", "src/rust_", "sdks/rust/src/bin", "src/cli.ts", "tests/g"];
    let mut high_risk_actions_ok = true;
    let mut high_risk_detail_parts: Vec<String> = Vec::new();
    for f in &input.proposal.files {
        let action_is_high_risk = f.action == "create" || f.action == "delete";
        let path_in_high_risk_dir = high_risk_dirs.iter().any(|dir| f.path.starts_with(dir));
        if action_is_high_risk || path_in_high_risk_dir {
            if !f.requires_review {
                high_risk_actions_ok = false;
                high_risk_detail_parts.push(format!(
                    "{} (action={}, reviewRequired=false)",
                    f.path, f.action
                ));
            }
        }
    }
    checks.push(CheckResult {
        check: "high_risk_requires_review".to_string(),
        passed: high_risk_actions_ok,
        detail: if high_risk_actions_ok {
            Some("All high-risk file actions have requires_review=true.".to_string())
        } else {
            Some(format!(
                "High-risk actions without review: [{}]",
                high_risk_detail_parts.join(", ")
            ))
        },
    });
    if !high_risk_actions_ok { valid = false; }

    // Check 9: Unsafe auto-proposal classes refused
    let authority_zero = input.proposal.required_authority.numer == 0;
    let defect_zero = input.proposal.estimated_defect.numer == 0;
    let create_in_gate_dir = input.proposal.files.iter().any(|f| {
        f.action == "create" && (
            f.path.starts_with("src/gate_store") ||
            f.path.starts_with("src/gates") ||
            f.path.starts_with("src/ledger") ||
            f.path.starts_with("src/receipt") ||
            f.path.starts_with("reports/") && f.action == "modify"
        )
    });

    let unsafe_auto_class_ok = !(authority_zero && defect_zero) && !create_in_gate_dir;
    checks.push(CheckResult {
        check: "unsafe_auto_proposal_refused".to_string(),
        passed: unsafe_auto_class_ok,
        detail: if unsafe_auto_class_ok {
            Some("No unsafe auto-proposal class detected.".to_string())
        } else {
            let mut reasons: Vec<String> = Vec::new();
            if authority_zero && defect_zero {
                reasons.push("zero authority + zero defect (self-authorizing)".to_string());
            }
            if create_in_gate_dir {
                reasons.push("create/modify in governed gate/receipt directory".to_string());
            }
            Some(format!("Refused: {}", reasons.join("; ")))
        },
    });
    if !unsafe_auto_class_ok { valid = false; }

    // ── Evidence ─────────────────────────────────────────────
    let total_checks = checks.len();
    let passed_checks = checks.iter().filter(|c| c.passed).count();
    let evidence = if valid {
        format!(
            "Rust policy gate: all {} preconditions passed.",
            total_checks,
        )
    } else {
        format!(
            "Rust policy gate: {}/{} preconditions failed. Checks: {}",
            total_checks - passed_checks,
            total_checks,
            checks.iter()
                .filter(|c| !c.passed)
                .map(|c| c.check.as_str())
                .collect::<Vec<_>>()
                .join(", "),
        )
    };

    PolicyGateOutput {
        valid,
        evidence,
        checks,
    }
}

fn main() {
    let payload_path = env::args().nth(1).expect("Usage: policy_gate <payload.json>");
    let data = fs::read_to_string(&payload_path).expect("Failed to read payload");
    let input: PolicyGateInput = serde_json::from_str(&data).expect("Invalid payload");

    let result = validate(&input);

    let json = serde_json::to_string_pretty(&result).expect("Failed to serialize result");
    println!("{}", json);

    if !result.valid {
        std::process::exit(1);
    }
}