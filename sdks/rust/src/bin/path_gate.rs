// CohBit-Copilot v11.9 — Rust Path Safety Gate
// Standalone binary: validates a file path against a workspace root.
// Used by the TypeScript bridge for cross-language path safety verification.
//
// Operating law:
//   Rust may verify path safety facts.
//   Rust validator output is evidence, not authority.
//   Rust validator never mutates the filesystem.

use std::env;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct PathGateInput {
    path: String,
    workspace_root: String,
    #[serde(default)]
    action: String, // "read" or "write"
}

#[derive(Serialize)]
struct PathGateOutput {
    valid: bool,
    reason: Option<String>,
    evidence: String,
    checks: Vec<CheckResult>,
}

#[derive(Serialize)]
struct CheckResult {
    check: String,
    passed: bool,
    detail: Option<String>,
}

fn main() {
    let payload_path = env::args().nth(1).expect("Usage: path_gate <payload.json>");
    let data = fs::read_to_string(&payload_path).expect("Failed to read payload");
    let input: PathGateInput = serde_json::from_str(&data).expect("Invalid payload");

    let result = validate_path(&input.path, &input.workspace_root, &input.action);

    let json = serde_json::to_string_pretty(&result).expect("Failed to serialize result");
    println!("{}", json);

    if !result.valid {
        std::process::exit(1);
    }
}

fn validate_path(file_path: &str, workspace_root: &str, action: &str) -> PathGateOutput {
    let mut checks: Vec<CheckResult> = Vec::new();
    let mut valid = true;
    let mut reason: Option<String> = None;

    // ── Check 1: Null byte ──────────────────────────────────
    if file_path.contains('\0') {
        checks.push(CheckResult {
            check: "null_byte".to_string(),
            passed: false,
            detail: Some("Path contains null byte — rejected.".to_string()),
        });
        return PathGateOutput {
            valid: false,
            reason: Some("null_byte".to_string()),
            evidence: format!("Rust path gate: null byte in path '{}'", file_path),
            checks,
        };
    }
    checks.push(CheckResult {
        check: "null_byte".to_string(),
        passed: true,
        detail: None,
    });

    // ── Check 2: Workspace root canonicalization ─────────────
    let root = Path::new(workspace_root);
    let canonical_root = match fs::canonicalize(root) {
        Ok(p) => p,
        Err(e) => {
            checks.push(CheckResult {
                check: "workspace_root_exists".to_string(),
                passed: false,
                detail: Some(format!("Cannot canonicalize workspace root: {}", e)),
            });
            return PathGateOutput {
                valid: false,
                reason: Some("invalid_workspace_root".to_string()),
                evidence: format!("Rust path gate: workspace root '{}' cannot be resolved", workspace_root),
                checks,
            };
        }
    };
    checks.push(CheckResult {
        check: "workspace_root_exists".to_string(),
        passed: true,
        detail: Some(format!("Root: {}", canonical_root.display())),
    });

    // ── Check 3: No parent directory traversal ───────────────
    let resolved = root.join(file_path);
    let canonical_resolved = match fs::canonicalize(&resolved) {
        Ok(p) => Some(p),
        Err(_) => {
            // File doesn't exist yet — check parent directory for create operations
            if action == "write" {
                match resolved.parent() {
                    Some(parent) => match fs::canonicalize(parent) {
                        Ok(parent_canon) => {
                            // For creates, canonical path is parent + filename
                            Some(parent_canon.join(resolved.file_name().unwrap_or_default()))
                        }
                        Err(_) => None,
                    },
                    None => None,
                }
            } else {
                None
            }
        }
    };

    // ── Check 4: Traversal detection ─────────────────────────
    // Check the raw resolved path (before canonicalization) for .. components
    let resolved_str = resolved.to_string_lossy();
    let has_traversal = resolved_str.contains("..") || 
        // On Unix, check for components that escape root
        !resolved.starts_with(&canonical_root);

    if has_traversal {
        // If canonicalization succeeded, check if it's still within workspace
        if let Some(ref canon) = canonical_resolved {
            if canon.starts_with(&canonical_root) {
                // Canonical path is fine even if raw had .. — that's normal path resolution
                checks.push(CheckResult {
                    check: "workspace_containment".to_string(),
                    passed: true,
                    detail: Some(format!("Canonical path within workspace: {}", canon.display())),
                });
            } else {
                checks.push(CheckResult {
                    check: "workspace_containment".to_string(),
                    passed: false,
                    detail: Some(format!(
                        "Path escapes workspace: '{}' resolves to '{}' outside root",
                        file_path, canon.display()
                    )),
                });
                valid = false;
                reason = Some("path_escapes_workspace".to_string());
            }
        } else {
            // Can't canonicalize — check if resolved prefix matches root
            if resolved.starts_with(&canonical_root) {
                checks.push(CheckResult {
                    check: "workspace_containment".to_string(),
                    passed: true,
                    detail: Some("Path prefix check passed (canonicalization unavailable)".to_string()),
                });
            } else {
                checks.push(CheckResult {
                    check: "workspace_containment".to_string(),
                    passed: false,
                    detail: Some(format!(
                        "Path '{}' does not start with workspace root '{}'",
                        file_path, canonical_root.display()
                    )),
                });
                valid = false;
                reason = Some("path_escapes_workspace".to_string());
            }
        }
    } else {
        checks.push(CheckResult {
            check: "workspace_containment".to_string(),
            passed: true,
            detail: Some("Path prefix check passed".to_string()),
        });
    }

    // ── Check 5: Absolute path detection ─────────────────────
    let path_obj = Path::new(file_path);
    let is_absolute = path_obj.is_absolute() || 
        (file_path.len() > 1 && file_path.chars().nth(1) == Some(':'));
    
    checks.push(CheckResult {
        check: "absolute_path".to_string(),
        passed: !is_absolute,
        detail: if is_absolute {
            Some(format!("Absolute path '{}' detected — may bypass workspace", file_path))
        } else {
            None
        },
    });
    if is_absolute {
        valid = false;
        reason = Some("absolute_path".to_string());
    }

    // ── Check 6: Alternate data stream (colon in filename) ───
    let file_name = path_obj.file_name().unwrap_or_default().to_string_lossy();
    if file_name.contains(':') {
        checks.push(CheckResult {
            check: "ads_syntax".to_string(),
            passed: false,
            detail: Some(format!("Alternate data stream syntax in filename: '{}'", file_name)),
        });
        valid = false;
        reason = Some("ads_syntax".to_string());
    } else {
        checks.push(CheckResult {
            check: "ads_syntax".to_string(),
            passed: true,
            detail: None,
        });
    }

    // ── Check 7: Symlink resolution (if file exists) ─────────
    if let Some(ref canon) = canonical_resolved {
        let symlink_escaped = !canon.starts_with(&canonical_root);
        checks.push(CheckResult {
            check: "symlink_escape".to_string(),
            passed: !symlink_escaped,
            detail: if symlink_escaped {
                Some(format!(
                    "Symlink escape: '{}' resolves to '{}' outside workspace",
                    file_path, canon.display()
                ))
            } else {
                Some(format!("Symlink resolved within workspace: {}", canon.display()))
            },
        });
        if symlink_escaped {
            valid = false;
            reason = Some("symlink_escape".to_string());
        }
    } else {
        checks.push(CheckResult {
            check: "symlink_escape".to_string(),
            passed: true,
            detail: Some("No symlink resolution needed (file does not exist yet)".to_string()),
        });
    }

    // ── Evidence construction ─────────────────────────────────
    let evidence = if valid {
        format!(
            "Rust path gate: path '{}' validated within workspace '{}' ({} {} checks passed)",
            file_path, canonical_root.display(), checks.len(), action
        )
    } else {
        format!(
            "Rust path gate: path '{}' REJECTED — {} (reason: {:?})",
            file_path,
            checks.iter().filter(|c| !c.passed).count(),
            reason.as_ref().unwrap_or(&"unknown".to_string())
        )
    };

    PathGateOutput {
        valid,
        reason,
        evidence,
        checks,
    }
}