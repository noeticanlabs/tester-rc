// @cohbit/code-atlas — L5 Constraint / Risk Layer
// Attaches failure modes, safety limits, and forbidden collapses.
//
// Spec source: Noetican Code Invariant Atlas v0.1 §L5, v1.0
// Governing law:
//   This is the database's safety wall.

export type FailureSeverity = 'high' | 'medium' | 'low';

export interface FailureMode {
    failureId: string;
    name: string;
    family: string;
    severity: FailureSeverity;
    blockedBy: string[];
    forbiddenStatus: string;
}

export interface RiskTag {
    riskId: string; name: string; description: string;
}

export interface ForbiddenCollapse {
    collapseId: string; name: string; description: string; severity: FailureSeverity;
}

// ─── Failure Modes ─────────────────────────────────────────────

export const FAIL_ARITH_001: FailureMode = { failureId: 'FAIL_ARITH_001', name: 'DivisionByZero', family: 'arithmetic_safety', severity: 'high', blockedBy: ['denominator_nonzero_guard', 'typed_failure_return', 'proof_obligation'], forbiddenStatus: 'accepted_without_guard' };
export const FAIL_ARITH_002: FailureMode = { failureId: 'FAIL_ARITH_002', name: 'IntegerOverflow', family: 'arithmetic_safety', severity: 'high', blockedBy: ['bounds_check', 'checked_arithmetic', 'saturating_ops'], forbiddenStatus: 'accepted_without_overflow_check' };
export const FAIL_MEM_001: FailureMode = { failureId: 'FAIL_MEM_001', name: 'NullPointerDereference', family: 'memory_safety', severity: 'high', blockedBy: ['null_check', 'Option_type', 'non_null_guarantee'], forbiddenStatus: 'accepted_without_guard' };
export const FAIL_MEM_002: FailureMode = { failureId: 'FAIL_MEM_002', name: 'UseAfterFree', family: 'memory_safety', severity: 'high', blockedBy: ['ownership_tracking', 'borrow_check', 'lifetime_analysis'], forbiddenStatus: 'accepted' };
export const FAIL_MEM_003: FailureMode = { failureId: 'FAIL_MEM_003', name: 'DoubleFree', family: 'memory_safety', severity: 'high', blockedBy: ['ownership_tracking', 'drop_check'], forbiddenStatus: 'accepted' };
export const FAIL_MEM_004: FailureMode = { failureId: 'FAIL_MEM_004', name: 'BufferOverflow', family: 'memory_safety', severity: 'high', blockedBy: ['bounds_check', 'safe_indexing', 'static_analysis'], forbiddenStatus: 'accepted_without_bounds' };
export const FAIL_MEM_005: FailureMode = { failureId: 'FAIL_MEM_005', name: 'MemoryLeak', family: 'memory_safety', severity: 'medium', blockedBy: ['ownership_tracking', 'drop_guarantee', 'resource_scope'], forbiddenStatus: 'accepted_in_loop' };
export const FAIL_CONC_001: FailureMode = { failureId: 'FAIL_CONC_001', name: 'RaceCondition', family: 'concurrency_safety', severity: 'high', blockedBy: ['mutex', 'atomic_ops', 'channel_ordering'], forbiddenStatus: 'accepted_without_sync' };
export const FAIL_CONC_002: FailureMode = { failureId: 'FAIL_CONC_002', name: 'Deadlock', family: 'concurrency_safety', severity: 'high', blockedBy: ['lock_ordering', 'timeout', 'try_lock'], forbiddenStatus: 'accepted' };
export const FAIL_ERR_001: FailureMode = { failureId: 'FAIL_ERR_001', name: 'UnhandledError', family: 'error_handling', severity: 'high', blockedBy: ['typed_error', 'exhaustive_match', 'error_propagation'], forbiddenStatus: 'accepted_without_handler' };
export const FAIL_ERR_002: FailureMode = { failureId: 'FAIL_ERR_002', name: 'SilentFailure', family: 'error_handling', severity: 'high', blockedBy: ['typed_result', 'log_failure', 'alert_on_drop'], forbiddenStatus: 'accepted' };
export const FAIL_INPUT_001: FailureMode = { failureId: 'FAIL_INPUT_001', name: 'UncheckedUserInput', family: 'input_safety', severity: 'high', blockedBy: ['input_validation', 'sanitization', 'type_narrowing'], forbiddenStatus: 'accepted_without_validation' };
export const FAIL_INPUT_002: FailureMode = { failureId: 'FAIL_INPUT_002', name: 'SQLInjection', family: 'input_safety', severity: 'high', blockedBy: ['parameterized_query', 'input_sanitization'], forbiddenStatus: 'accepted' };
export const FAIL_PROOF_001: FailureMode = { failureId: 'FAIL_PROOF_001', name: 'FakeProofSuccess', family: 'verification_safety', severity: 'high', blockedBy: ['proof_checker', 'no_sorry', 'axiom_declaration'], forbiddenStatus: 'accepted' };
export const FAIL_PROOF_002: FailureMode = { failureId: 'FAIL_PROOF_002', name: 'SemanticMismatch', family: 'cross_language', severity: 'medium', blockedBy: ['projection_audit', 'drift_risk_declaration', 'backtranslation'], forbiddenStatus: 'accepted_without_drift_warning' };
export const FAIL_PANIC_001: FailureMode = { failureId: 'FAIL_PANIC_001', name: 'UncontainedPanic', family: 'panic_safety', severity: 'high', blockedBy: ['panic_boundary', 'catch_unwind', 'graceful_shutdown'], forbiddenStatus: 'accepted' };

export const FAILURE_MODES: Map<string, FailureMode> = new Map([
    ['FAIL_ARITH_001', FAIL_ARITH_001], ['FAIL_ARITH_002', FAIL_ARITH_002],
    ['FAIL_MEM_001', FAIL_MEM_001], ['FAIL_MEM_002', FAIL_MEM_002], ['FAIL_MEM_003', FAIL_MEM_003], ['FAIL_MEM_004', FAIL_MEM_004], ['FAIL_MEM_005', FAIL_MEM_005],
    ['FAIL_CONC_001', FAIL_CONC_001], ['FAIL_CONC_002', FAIL_CONC_002],
    ['FAIL_ERR_001', FAIL_ERR_001], ['FAIL_ERR_002', FAIL_ERR_002],
    ['FAIL_INPUT_001', FAIL_INPUT_001], ['FAIL_INPUT_002', FAIL_INPUT_002],
    ['FAIL_PROOF_001', FAIL_PROOF_001], ['FAIL_PROOF_002', FAIL_PROOF_002],
    ['FAIL_PANIC_001', FAIL_PANIC_001],
]);

// ─── Risk Tags ──────────────────────────────────────────────────

export const RISK_TAGS: RiskTag[] = [
    { riskId: 'RISK_001', name: 'NullableAmbiguity', description: 'A null, None, or undefined value may be silently propagated.' },
    { riskId: 'RISK_002', name: 'UncheckedCast', description: 'A type cast bypasses type checking without runtime validation.' },
    { riskId: 'RISK_003', name: 'ResourceLeak', description: 'A resource may not be released under all code paths.' },
    { riskId: 'RISK_004', name: 'RaceWindow', description: 'A time window exists where concurrent access may cause corruption.' },
    { riskId: 'RISK_005', name: 'ProofGap', description: 'A proof claim relies on an unproven lemma or sorry placeholder.' },
    { riskId: 'RISK_006', name: 'CrossLanguageDrift', description: 'Semantic drift between source and target language projections.' },
    { riskId: 'RISK_007', name: 'ClaimInflation', description: 'A claim exceeds the evidence level supporting it.' },
    { riskId: 'RISK_008', name: 'StaleReceipt', description: 'A receipt no longer reflects current code or evidence state.' },
];

// ─── Forbidden Collapses ───────────────────────────────────────

export const FORBIDDEN_COLLAPSES: ForbiddenCollapse[] = [
    { collapseId: 'COLLAPSE_001', name: 'SyntaxAsCorrectness', description: 'Code that parses is treated as correct.', severity: 'high' },
    { collapseId: 'COLLAPSE_002', name: 'TestAsProof', description: 'Passing tests are treated as formal proof.', severity: 'high' },
    { collapseId: 'COLLAPSE_003', name: 'SimulationAsTheorem', description: 'Simulation results are treated as mathematical theorems.', severity: 'high' },
    { collapseId: 'COLLAPSE_004', name: 'AnalogyAsEquivalence', description: 'Structural analogy is treated as semantic equivalence.', severity: 'medium' },
    { collapseId: 'COLLAPSE_005', name: 'CodeAsProof', description: 'Working code is treated as proof of correctness.', severity: 'high' },
    { collapseId: 'COLLAPSE_006', name: 'StaleReceiptAsCurrent', description: 'An outdated receipt is treated as current evidence.', severity: 'medium' },
];

// ─── Query ─────────────────────────────────────────────────────

export function getFailureMode(id: string): FailureMode | undefined { return FAILURE_MODES.get(id); }
export function listFailuresBySeverity(severity: FailureSeverity): FailureMode[] { return [...FAILURE_MODES.values()].filter(f => f.severity === severity); }
export function listFailuresByFamily(family: string): FailureMode[] { return [...FAILURE_MODES.values()].filter(f => f.family === family); }