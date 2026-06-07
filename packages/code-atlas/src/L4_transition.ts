// @cohbit/code-atlas — L4 Typed Transition Layer
// Describes before/after state changes caused by code.
//
// Spec source: Noetican Code Invariant Atlas v1.0 §8
// Governing law:
//   This layer is where code becomes TTC-compatible.
//   Transitions declare what state changes, what guards it, and what rejects it.

// ─── Types ─────────────────────────────────────────────────────

export type TransitionKind =
    | 'core_code'
    | 'governance'
    | 'repository'
    | 'copilot_construction'
    | 'runtime_memory'
    | 'multi_worker';

export interface TypedTransition {
    transitionId: string;
    name: string;
    kind: TransitionKind;
    stateBefore: string;
    stateAfter: string;
    commitCondition: string;
    rejectCondition: string;
    usesInvariants: string[];
}

// ─── Core Code Transitions (TRANS_001–TRANS_020) ──────────────

export const TRANS_001: TypedTransition = {
    transitionId: 'TRANS_001', name: 'GuardedDivision', kind: 'core_code',
    stateBefore: 'division_requested', stateAfter: 'division_committed_or_safe_failure_returned',
    commitCondition: 'denominator != 0', rejectCondition: 'denominator == 0',
    usesInvariants: ['INV_006', 'INV_009', 'INV_011', 'INV_025'],
};

export const TRANS_002: TypedTransition = {
    transitionId: 'TRANS_002', name: 'SafeArrayAccess', kind: 'core_code',
    stateBefore: 'index_access_requested', stateAfter: 'access_committed_or_bounds_failure',
    commitCondition: 'index within bounds', rejectCondition: 'index out of bounds',
    usesInvariants: ['INV_006', 'INV_009', 'INV_017'],
};

export const TRANS_003: TypedTransition = {
    transitionId: 'TRANS_003', name: 'CheckedResourceLifecycle', kind: 'core_code',
    stateBefore: 'resource_created', stateAfter: 'resource_destroyed_or_error',
    commitCondition: 'resource successfully released', rejectCondition: 'resource leak or double free',
    usesInvariants: ['INV_012', 'INV_013', 'INV_014', 'INV_006'],
};

export const TRANS_004: TypedTransition = {
    transitionId: 'TRANS_004', name: 'TypedErrorPropagation', kind: 'core_code',
    stateBefore: 'error_detected', stateAfter: 'error_propagated_or_handled',
    commitCondition: 'error encoded as typed value', rejectCondition: 'error silently lost or converted to null',
    usesInvariants: ['INV_009', 'INV_011'],
};

export const TRANS_005: TypedTransition = {
    transitionId: 'TRANS_005', name: 'ProofCheckedClaim', kind: 'core_code',
    stateBefore: 'unproven_claim', stateAfter: 'proof_accepted_or_obligation_open',
    commitCondition: 'proof checker accepts', rejectCondition: 'proof contains sorry/admit/axiom without declaration',
    usesInvariants: ['INV_024', 'INV_006', 'INV_025'],
};

export const TRANS_006: TypedTransition = {
    transitionId: 'TRANS_006', name: 'SafeMutation', kind: 'core_code',
    stateBefore: 'mutation_requested', stateAfter: 'mutation_committed_or_borrow_failure',
    commitCondition: 'single mutable reference or valid borrow', rejectCondition: 'aliased mutable reference',
    usesInvariants: ['INV_005', 'INV_014', 'INV_015'],
};

export const TRANS_007: TypedTransition = {
    transitionId: 'TRANS_007', name: 'DependencyImportCheck', kind: 'core_code',
    stateBefore: 'import_requested', stateAfter: 'dependencies_validated_or_missing',
    commitCondition: 'dependency exists and version is compatible', rejectCondition: 'missing or incompatible dependency',
    usesInvariants: ['INV_021', 'INV_006'],
};

export const TRANS_008: TypedTransition = {
    transitionId: 'TRANS_008', name: 'AsyncResultHandling', kind: 'core_code',
    stateBefore: 'async_operation_started', stateAfter: 'result_received_or_failure_propagated',
    commitCondition: 'result resolved and handled', rejectCondition: 'unhandled rejection or timeout',
    usesInvariants: ['INV_022', 'INV_009', 'INV_011'],
};

export const TRANS_009: TypedTransition = {
    transitionId: 'TRANS_009', name: 'TestBackedFunction', kind: 'core_code',
    stateBefore: 'function_written', stateAfter: 'function_tested',
    commitCondition: 'all tests pass', rejectCondition: 'any test fails',
    usesInvariants: ['INV_023', 'INV_001', 'INV_006', 'INV_025'],
};

export const TRANS_010: TypedTransition = {
    transitionId: 'TRANS_010', name: 'StructInvariantPreservation', kind: 'core_code',
    stateBefore: 'struct_created_or_modified', stateAfter: 'invariant_preserved_or_violation_detected',
    commitCondition: 'struct invariant holds', rejectCondition: 'struct invariant violated',
    usesInvariants: ['INV_019', 'INV_006', 'INV_009'],
};

export const TRANS_011: TypedTransition = {
    transitionId: 'TRANS_011', name: 'PointerValidityCheck', kind: 'core_code',
    stateBefore: 'pointer_dereference_attempted', stateAfter: 'valid_access_or_null_error',
    commitCondition: 'pointer is non-null and valid', rejectCondition: 'null or dangling pointer',
    usesInvariants: ['INV_016', 'INV_006', 'INV_009'],
};

export const TRANS_012: TypedTransition = {
    transitionId: 'TRANS_012', name: 'CrossLanguageProjectionReuse', kind: 'core_code',
    stateBefore: 'pattern_in_source_language', stateAfter: 'projected_to_target_or_blocked',
    commitCondition: 'projection passes target language checks', rejectCondition: 'semantic drift risk not declared',
    usesInvariants: ['INV_025', 'INV_011', 'INV_021'],
};

export const TRANS_013: TypedTransition = {
    transitionId: 'TRANS_013', name: 'InputValidation', kind: 'core_code',
    stateBefore: 'external_input_received', stateAfter: 'input_validated_or_rejected',
    commitCondition: 'input passes validation', rejectCondition: 'input fails validation',
    usesInvariants: ['INV_006', 'INV_009', 'INV_011', 'INV_003'],
};

export const TRANS_014: TypedTransition = {
    transitionId: 'TRANS_014', name: 'SanitizedDatabaseQuery', kind: 'core_code',
    stateBefore: 'query_requested', stateAfter: 'query_executed_safely_or_blocked',
    commitCondition: 'query parameters are sanitized', rejectCondition: 'injection pattern detected',
    usesInvariants: ['INV_006', 'INV_009', 'INV_003'],
};

export const TRANS_015: TypedTransition = {
    transitionId: 'TRANS_015', name: 'LockAcquireRelease', kind: 'core_code',
    stateBefore: 'lock_acquired', stateAfter: 'lock_released_or_timeout',
    commitCondition: 'lock released within scope', rejectCondition: 'deadlock or timeout exceeds threshold',
    usesInvariants: ['INV_012', 'INV_013', 'INV_006', 'INV_009'],
};

export const TRANS_016: TypedTransition = {
    transitionId: 'TRANS_016', name: 'FileOpenReadClose', kind: 'core_code',
    stateBefore: 'file_open', stateAfter: 'file_read_and_closed_or_error',
    commitCondition: 'file exists, readable, and closed', rejectCondition: 'file missing, permissions, or left open',
    usesInvariants: ['INV_012', 'INV_013', 'INV_006', 'INV_009'],
};

export const TRANS_017: TypedTransition = {
    transitionId: 'TRANS_017', name: 'NullSafeAccess', kind: 'core_code',
    stateBefore: 'optional_value_access_attempted', stateAfter: 'value_accessed_or_null_handled',
    commitCondition: 'value is present', rejectCondition: 'value is null/None and not handled',
    usesInvariants: ['INV_006', 'INV_009', 'INV_011', 'INV_016'],
};

export const TRANS_018: TypedTransition = {
    transitionId: 'TRANS_018', name: 'ExhaustivePatternMatch', kind: 'core_code',
    stateBefore: 'variant_matching_requested', stateAfter: 'all_cases_handled_or_warning',
    commitCondition: 'all variants handled', rejectCondition: 'missing variant case',
    usesInvariants: ['INV_006', 'INV_009', 'INV_011'],
};

export const TRANS_019: TypedTransition = {
    transitionId: 'TRANS_019', name: 'PanicBoundaryControl', kind: 'core_code',
    stateBefore: 'unrecoverable_condition_detected', stateAfter: 'panic_contained_or_propagated',
    commitCondition: 'panic caught at boundary', rejectCondition: 'panic escapes through public API',
    usesInvariants: ['INV_010', 'INV_009', 'INV_006'],
};

export const TRANS_020: TypedTransition = {
    transitionId: 'TRANS_020', name: 'TheoremRepairAttempt', kind: 'core_code',
    stateBefore: 'proof_failed', stateAfter: 'proof_repaired_or_new_obligation',
    commitCondition: 'repaired proof passes checker', rejectCondition: 'repair introduces new sorry/admit',
    usesInvariants: ['INV_024', 'INV_025', 'INV_023'],
};

// ─── Governance Transitions ────────────────────────────────────

export const TRANS_021: TypedTransition = {
    transitionId: 'TRANS_021', name: 'EvidenceClaimGate', kind: 'governance',
    stateBefore: 'claim_proposed', stateAfter: 'claim_gated_by_evidence',
    commitCondition: 'evidence level matches claim type', rejectCondition: 'claim exceeds evidence ceiling',
    usesInvariants: ['INV_025', 'INV_023', 'INV_024'],
};

export const TRANS_022: TypedTransition = {
    transitionId: 'TRANS_022', name: 'SchemaValidatedReceipt', kind: 'governance',
    stateBefore: 'receipt_produced', stateAfter: 'receipt_schema_validated',
    commitCondition: 'receipt passes schema validation', rejectCondition: 'receipt schema mismatch',
    usesInvariants: ['INV_025'],
};

// ─── Registry ──────────────────────────────────────────────────

export const CORE_TRANSITIONS: TypedTransition[] = [
    TRANS_001, TRANS_002, TRANS_003, TRANS_004, TRANS_005,
    TRANS_006, TRANS_007, TRANS_008, TRANS_009, TRANS_010,
    TRANS_011, TRANS_012, TRANS_013, TRANS_014, TRANS_015,
    TRANS_016, TRANS_017, TRANS_018, TRANS_019, TRANS_020,
];

export const GOVERNANCE_TRANSITIONS: TypedTransition[] = [
    TRANS_021, TRANS_022,
];

export const ALL_TRANSITIONS: Map<string, TypedTransition> = new Map([
    ...[...CORE_TRANSITIONS, ...GOVERNANCE_TRANSITIONS].map(t => [t.transitionId, t] as const),
]);

// ─── Query ─────────────────────────────────────────────────────

export function getTransition(id: string): TypedTransition | undefined {
    return ALL_TRANSITIONS.get(id);
}

export function listByKind(kind: TransitionKind): TypedTransition[] {
    return [...ALL_TRANSITIONS.values()].filter(t => t.kind === kind);
}

export function listByInvariant(invariantId: string): TypedTransition[] {
    return [...ALL_TRANSITIONS.values()].filter(t => t.usesInvariants.includes(invariantId));
}