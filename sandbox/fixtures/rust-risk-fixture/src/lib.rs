// rust-risk-fixture — Controlled test target for CohBit-Copilot audit.
// Contains intentional risk patterns to test scanner, triage, obligation,
// dedup, and refusal paths.
//
// NOT FOR PRODUCTION USE. This file deliberately contains:
//   - unsafe blocks and functions
//   - process command execution patterns
//   - filesystem mutation with variable paths
//   - path traversal
//   - panic!/unwrap!/todo! review signals
//
// Operating law:
//   This fixture exists as audit target only.
//   It may never be committed into production code paths.

// ─── P0: unsafe_block (high severity × high confidence × production) ────────

/// Deliberate unsafe pointer dereference — triggers unsafe_block review.
pub unsafe fn unsafe_deref(ptr: *const i32) -> i32 {
    unsafe {
        *ptr
    }
}

// ─── P0: unsafe_function (high severity × high confidence × production) ─────

/// Raw pointer arithmetic — triggers unsafe_function review.
pub unsafe fn raw_pointer_offset(base: *mut u8, offset: usize) -> *mut u8 {
    unsafe { base.add(offset) }
}

// ─── P0: process_command (high severity × high confidence × production) ──────

/// External process execution — triggers process_command review.
pub fn run_external(cmd: &str) -> std::io::Result<std::process::Output> {
    std::process::Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .output()
}

/// Process spawn — triggers command_new review.
pub fn launch_script(script_path: &str) {
    let _ = std::process::Command::new("sh")
        .arg(script_path)
        .spawn();
}

// ─── P0: filesystem_path_from_variable (high × high × production) ───────────

/// Filesystem write with variable path — injection/sandbox risk.
pub fn save_output(filename: &str, data: &[u8]) -> std::io::Result<()> {
    std::fs::write(filename, data)
}

// ─── P0: filesystem_delete_file (high × high × production) ──────────────────

/// File deletion — resource destruction risk.
pub fn remove_artifact(path: &str) -> std::io::Result<()> {
    std::fs::remove_file(path)
}

// ─── P0: filesystem_create (high × high × production) ───────────────────────

/// File creation — may overwrite existing resource.
pub fn open_output(path: &str) -> std::io::Result<std::fs::File> {
    std::fs::File::create(path)
}

// ─── P0: relative_traversal (high × high × production) ──────────────────────

/// Path traversal via string interpolation — ../ escape risk.
pub fn resolve_path(base: &str, sub: &str) -> String {
    format!("{}/../{}", base, sub)
}

// ─── P1: panic_review_signal (high severity × medium confidence) ────────────

/// Explicit panic — intentional interruption of control flow.
pub fn assert_invariant(condition: bool) {
    if !condition {
        panic!("Invariant violated: buffer must be non-empty");
    }
}

// ─── P1: unwrap_review_signal (high severity × medium confidence) ───────────

/// Unchecked .unwrap() — may panic on None.
pub fn extract_value(input: Option<String>) -> String {
    input.unwrap()
}

// ─── P1: todo_review_signal (high severity × medium confidence) ────────────

/// Unfinished implementation — will panic if called.
pub fn parser_v2() -> String {
    todo!("Implement v2 parser with streaming support")
}