// @cohbit/code-atlas — L3 Canonical Invariant Layer
// Language-neutral computational invariants that survive across languages.
//
// Spec source: Noetican Code Invariant Atlas v0.1 §L3, v1.0 §6-7
// Governing law:
//   Python, Rust, C, TypeScript, and Lean are different surfaces
//   over shared computational invariants.

// ─── Types ─────────────────────────────────────────────────────

export type InvariantKind = 'atomic' | 'composite';

export type InvariantFamily =
    | 'definition'
    | 'invocation'
    | 'binding'
    | 'state_change'
    | 'control_flow'
    | 'return_flow'
    | 'failure_handling'
    | 'resource_memory'
    | 'type_structure'
    | 'dependency'
    | 'asynchrony'
    | 'verification'
    | 'receipt';

export interface AtomicInvariant {
    id: string;
    name: string;
    kind: 'atomic';
    family: InvariantFamily;
    definition: string;
    preconditions: string[];
    postconditions: string[];
    failureModes: string[];
    receiptRequired: boolean;
}

export interface CompositeInvariant {
    id: string;
    name: string;
    kind: 'composite';
    definition: string;
    constituentIds: string[];
}

export type Invariant = AtomicInvariant | CompositeInvariant;

// ─── Atomic Invariant Registry (INV_001–INV_025) ───────────────

export const INV_001: AtomicInvariant = {
    id: 'INV_001', name: 'FunctionDefinition', kind: 'atomic', family: 'definition',
    definition: 'A named or anonymous reusable computational unit with parameters, body, and return behavior.',
    preconditions: ['name or anonymous binding is valid', 'parameters are syntactically valid', 'body is parseable'],
    postconditions: ['callable unit exists', 'body becomes executable or checkable', 'can be referenced by call sites'],
    failureModes: ['invalid signature', 'missing body', 'ambiguous return behavior', 'scope collision'],
    receiptRequired: false,
};

export const INV_002: AtomicInvariant = {
    id: 'INV_002', name: 'FunctionCall', kind: 'atomic', family: 'invocation',
    definition: 'An invocation of a callable computational unit with zero or more arguments.',
    preconditions: ['called function exists or is resolvable', 'argument count is compatible', 'argument types are compatible'],
    postconditions: ['callee body is entered', 'return value or side effect may occur'],
    failureModes: ['undefined function', 'wrong arity', 'type mismatch', 'unhandled callee failure'],
    receiptRequired: false,
};

export const INV_003: AtomicInvariant = {
    id: 'INV_003', name: 'VariableBinding', kind: 'atomic', family: 'binding',
    definition: 'A symbolic name is associated with a value, reference, type, or computation.',
    preconditions: ['identifier is valid', 'binding occurs within a valid scope'],
    postconditions: ['symbol can be referenced while in scope', 'bound value has a known origin'],
    failureModes: ['undefined variable', 'shadowing confusion', 'scope leakage', 'uninitialized binding'],
    receiptRequired: false,
};

export const INV_004: AtomicInvariant = {
    id: 'INV_004', name: 'Assignment', kind: 'atomic', family: 'state_change',
    definition: 'A value is placed into a named storage location, variable, field, or memory region.',
    preconditions: ['target is valid', 'value is compatible', 'target is writable'],
    postconditions: ['target refers to the new value', 'previous value may be replaced'],
    failureModes: ['immutable target', 'type mismatch', 'uninitialized source', 'unexpected alias mutation'],
    receiptRequired: false,
};

export const INV_005: AtomicInvariant = {
    id: 'INV_005', name: 'Mutation', kind: 'atomic', family: 'state_change',
    definition: 'An existing stateful object, variable, field, or memory location is changed in place.',
    preconditions: ['target is mutable', 'mutation operation is permitted', 'aliasing constraints are satisfied'],
    postconditions: ['target state differs from prior state', 'dependent references may observe the change'],
    failureModes: ['immutable reference', 'race condition', 'unexpected shared state change', 'invalid memory write'],
    receiptRequired: true,
};

export const INV_006: AtomicInvariant = {
    id: 'INV_006', name: 'ConditionalBranch', kind: 'atomic', family: 'control_flow',
    definition: 'A guarded transition that selects one continuation path from multiple possible paths.',
    preconditions: ['guard expression is evaluable', 'branch bodies are syntactically valid'],
    postconditions: ['one continuation path is selected', 'unselected branch does not execute'],
    failureModes: ['unreachable branch', 'missing else', 'side-effectful guard', 'ambiguous condition'],
    receiptRequired: true,
};

export const INV_007: AtomicInvariant = {
    id: 'INV_007', name: 'Loop', kind: 'atomic', family: 'control_flow',
    definition: 'A repeated execution structure governed by an iteration rule, guard, or collection.',
    preconditions: ['loop guard or iterable is valid', 'body is syntactically valid', 'termination condition identifiable'],
    postconditions: ['body executes zero or more times', 'state may change across iterations'],
    failureModes: ['infinite loop', 'off-by-one', 'mutation during iteration', 'unbounded resource consumption'],
    receiptRequired: true,
};

export const INV_008: AtomicInvariant = {
    id: 'INV_008', name: 'Return', kind: 'atomic', family: 'return_flow',
    definition: 'A control-flow exit from a function with optional value emission.',
    preconditions: ['return occurs in valid context', 'returned value is compatible with expected type'],
    postconditions: ['current callable exits', 'caller receives value or completion signal'],
    failureModes: ['missing return', 'wrong return type', 'unreachable return', 'early return bypasses cleanup'],
    receiptRequired: false,
};

export const INV_009: AtomicInvariant = {
    id: 'INV_009', name: 'ErrorPath', kind: 'atomic', family: 'failure_handling',
    definition: 'A computational path that handles, propagates, rejects, or records failure.',
    preconditions: ['failure condition is detectable', 'error representation is available'],
    postconditions: ['failure is represented, propagated, handled, or rejected', 'unsafe success is avoided'],
    failureModes: ['silent failure', 'swallowed exception', 'incorrect error conversion', 'unsafe fallback'],
    receiptRequired: true,
};

export const INV_010: AtomicInvariant = {
    id: 'INV_010', name: 'ExceptionOrPanic', kind: 'atomic', family: 'failure_handling',
    definition: 'An abnormal control-flow mechanism that interrupts ordinary execution due to an error or invalid state.',
    preconditions: ['exception/panic mechanism exists', 'trigger condition is defined'],
    postconditions: ['ordinary control flow is interrupted', 'handler or runtime receives failure signal'],
    failureModes: ['uncaught exception', 'panic in recoverable path', 'loss of diagnostic info', 'resource leak during unwind'],
    receiptRequired: true,
};

export const INV_011: AtomicInvariant = {
    id: 'INV_011', name: 'ResultOrOption', kind: 'atomic', family: 'failure_handling',
    definition: 'A typed representation of success, failure, presence, or absence.',
    preconditions: ['language supports explicit success/failure encoding', 'consumer checks or propagates the result'],
    postconditions: ['success and failure remain distinguishable', 'caller must handle or propagate encoded state'],
    failureModes: ['unchecked None/null', 'ignored error result', 'ambiguous failure encoding', 'forced unwrap panic'],
    receiptRequired: true,
};

export const INV_012: AtomicInvariant = {
    id: 'INV_012', name: 'Allocation', kind: 'atomic', family: 'resource_memory',
    definition: 'A resource, memory region, object, or handle is acquired or created.',
    preconditions: ['allocation request is valid', 'resource availability is sufficient'],
    postconditions: ['resource exists or allocation failure is represented', 'ownership is assigned'],
    failureModes: ['allocation failure', 'memory exhaustion', 'untracked ownership', 'resource leak'],
    receiptRequired: true,
};

export const INV_013: AtomicInvariant = {
    id: 'INV_013', name: 'Deallocation', kind: 'atomic', family: 'resource_memory',
    definition: 'A previously acquired resource, memory region, or handle is released.',
    preconditions: ['resource was previously allocated', 'caller has authority to release', 'not already released'],
    postconditions: ['resource is no longer active', 'future use is invalid unless reacquired'],
    failureModes: ['double free', 'use after free', 'leak', 'invalid free'],
    receiptRequired: true,
};

export const INV_014: AtomicInvariant = {
    id: 'INV_014', name: 'OwnershipTransfer', kind: 'atomic', family: 'resource_memory',
    definition: 'Responsibility for a value, resource, or capability moves from one owner to another.',
    preconditions: ['source possesses the resource', 'target is valid', 'transfer rules are satisfied'],
    postconditions: ['target receives authority', 'source may lose or have restricted access'],
    failureModes: ['use after move', 'duplicate ownership', 'authority confusion', 'untracked handoff'],
    receiptRequired: true,
};

export const INV_015: AtomicInvariant = {
    id: 'INV_015', name: 'BorrowOrReference', kind: 'atomic', family: 'resource_memory',
    definition: 'A non-owning access path to an existing value, resource, or memory location.',
    preconditions: ['referenced target exists', 'lifetime/validity window respected', 'mutability rules satisfied'],
    postconditions: ['borrower can observe or mutate per permission', 'owner remains responsible'],
    failureModes: ['dangling reference', 'mutable alias violation', 'lifetime escape', 'null reference'],
    receiptRequired: true,
};

export const INV_016: AtomicInvariant = {
    id: 'INV_016', name: 'PointerDereference', kind: 'atomic', family: 'resource_memory',
    definition: 'Accessing the value or memory location referenced by a pointer-like object.',
    preconditions: ['pointer is valid', 'pointer is non-null when required', 'target memory is live', 'permissions satisfied'],
    postconditions: ['target value is read or written', 'memory state may be observed or mutated'],
    failureModes: ['null dereference', 'dangling pointer', 'out-of-bounds access', 'invalid alignment'],
    receiptRequired: true,
};

export const INV_017: AtomicInvariant = {
    id: 'INV_017', name: 'ArrayIndex', kind: 'atomic', family: 'resource_memory',
    definition: 'Accessing an element within an indexed collection by position.',
    preconditions: ['index is within bounds', 'collection is non-empty when accessed'],
    postconditions: ['element is retrieved or updated', 'bounds satisfied'],
    failureModes: ['index out of bounds', 'negative index', 'empty collection access', 'off-by-one'],
    receiptRequired: true,
};

export const INV_018: AtomicInvariant = {
    id: 'INV_018', name: 'TypeDeclaration', kind: 'atomic', family: 'type_structure',
    definition: 'A new type, alias, or type-level construct is introduced.',
    preconditions: ['name is valid and not conflicting', 'type definition is well-formed'],
    postconditions: ['new type exists in scope', 'type can be used in declarations and expressions'],
    failureModes: ['name collision', 'recursive type without base case', 'unsound type definition'],
    receiptRequired: false,
};

export const INV_019: AtomicInvariant = {
    id: 'INV_019', name: 'StructOrClass', kind: 'atomic', family: 'type_structure',
    definition: 'A composite data type grouping named fields with associated methods or behaviors.',
    preconditions: ['field types are valid', 'no conflicting field names'],
    postconditions: ['struct/class instances can be created', 'fields are accessible per visibility rules'],
    failureModes: ['field type undefined', 'circular field dependency', 'invariant violation in constructor'],
    receiptRequired: false,
};

export const INV_020: AtomicInvariant = {
    id: 'INV_020', name: 'InterfaceOrTrait', kind: 'atomic', family: 'type_structure',
    definition: 'A contract of required methods, properties, or behaviors that types may implement.',
    preconditions: ['contract is well-formed', 'method signatures are valid'],
    postconditions: ['implementing types can be checked', 'consumers can rely on the contract'],
    failureModes: ['missing implementation', 'incorrect signature', 'ambiguous dispatch', 'diamond problem'],
    receiptRequired: false,
};

export const INV_021: AtomicInvariant = {
    id: 'INV_021', name: 'ImportDependency', kind: 'atomic', family: 'dependency',
    definition: 'A reference to an external module, library, or compilation unit required by the current code.',
    preconditions: ['dependency exists', 'version is compatible', 'import path is valid'],
    postconditions: ['imported symbols are available', 'dependency graph is extended'],
    failureModes: ['missing dependency', 'version conflict', 'circular import', 'namespace collision'],
    receiptRequired: false,
};

export const INV_022: AtomicInvariant = {
    id: 'INV_022', name: 'AsyncContinuation', kind: 'atomic', family: 'asynchrony',
    definition: 'A computation that may suspend and resume, producing a future, promise, or task.',
    preconditions: ['async runtime or scheduler is available', 'operation is awaitable or thenable'],
    postconditions: ['computation may proceed asynchronously', 'result is available at continuation'],
    failureModes: ['unhandled rejection', 'deadlock', 'race condition', 'timeout without handler'],
    receiptRequired: true,
};

export const INV_023: AtomicInvariant = {
    id: 'INV_023', name: 'TestAssertion', kind: 'atomic', family: 'verification',
    definition: 'A claim that a specific condition holds under test execution.',
    preconditions: ['assertion is evaluable', 'test framework is available'],
    postconditions: ['assertion result is known (pass/fail)', 'evidence is recorded'],
    failureModes: ['flaky assertion', 'missing edge case', 'assertion on undefined behavior', 'false positive'],
    receiptRequired: true,
};

export const INV_024: AtomicInvariant = {
    id: 'INV_024', name: 'ProofObligation', kind: 'atomic', family: 'verification',
    definition: 'A formal claim that must be discharged by proof, not merely by test or example.',
    preconditions: ['claim is well-formed', 'proof system is available', 'definitions are complete'],
    postconditions: ['obligation is discharged or remains open with witness', 'proof status is recorded'],
    failureModes: ['sorry/placeholder', 'unproven assumption', 'incomplete specification', 'axiom misuse'],
    receiptRequired: true,
};

export const INV_025: AtomicInvariant = {
    id: 'INV_025', name: 'CommitReceipt', kind: 'atomic', family: 'receipt',
    definition: 'A governed record that a computational step was accepted, rejected, or requires repair.',
    preconditions: ['transition has been proposed', 'evidence has been checked', 'admissibility conditions are met'],
    postconditions: ['receipt is emitted', 'transition state is recorded', 'memory graph may be updated'],
    failureModes: ['missing evidence', 'receipt not linked', 'stale receipt reused', 'false commit claim'],
    receiptRequired: true,
};

// ─── Atomic Registry ───────────────────────────────────────────

export const ATOMIC_INVARIANTS: Map<string, AtomicInvariant> = new Map([
    ['INV_001', INV_001], ['INV_002', INV_002], ['INV_003', INV_003], ['INV_004', INV_004],
    ['INV_005', INV_005], ['INV_006', INV_006], ['INV_007', INV_007], ['INV_008', INV_008],
    ['INV_009', INV_009], ['INV_010', INV_010], ['INV_011', INV_011], ['INV_012', INV_012],
    ['INV_013', INV_013], ['INV_014', INV_014], ['INV_015', INV_015], ['INV_016', INV_016],
    ['INV_017', INV_017], ['INV_018', INV_018], ['INV_019', INV_019], ['INV_020', INV_020],
    ['INV_021', INV_021], ['INV_022', INV_022], ['INV_023', INV_023], ['INV_024', INV_024],
    ['INV_025', INV_025],
]);

// ─── Composite Invariant Registry (CINV_001–CINV_016) ─────────

export const CINV_001: CompositeInvariant = {
    id: 'CINV_001', name: 'GuardedArithmetic', kind: 'composite',
    definition: 'A computational pattern that checks arithmetic preconditions before executing and encodes failure explicitly.',
    constituentIds: ['INV_006', 'INV_009', 'INV_011', 'INV_023', 'INV_025'],
};

export const CINV_002: CompositeInvariant = {
    id: 'CINV_002', name: 'SafeIndexedAccess', kind: 'composite',
    definition: 'Bounds-checked access to an indexed collection with explicit failure encoding.',
    constituentIds: ['INV_006', 'INV_009', 'INV_017', 'INV_011'],
};

export const CINV_003: CompositeInvariant = {
    id: 'CINV_003', name: 'ExplicitFailureEncoding', kind: 'composite',
    definition: 'Failure is represented as a typed value rather than an exception, null, or silent fallback.',
    constituentIds: ['INV_009', 'INV_011', 'INV_023'],
};

export const CINV_004: CompositeInvariant = {
    id: 'CINV_004', name: 'ResourceLifecycleClosure', kind: 'composite',
    definition: 'Resources are allocated, used under guard, and deallocated within a bounded scope.',
    constituentIds: ['INV_012', 'INV_013', 'INV_014', 'INV_006', 'INV_009'],
};

export const CINV_005: CompositeInvariant = {
    id: 'CINV_005', name: 'OwnershipSafeMutation', kind: 'composite',
    definition: 'Mutation is permitted only when ownership, borrowing, and aliasing rules are satisfied.',
    constituentIds: ['INV_005', 'INV_014', 'INV_015'],
};

export const CINV_006: CompositeInvariant = {
    id: 'CINV_006', name: 'AsyncFailurePropagation', kind: 'composite',
    definition: 'Asynchronous failures are propagated through the async continuation chain without silent loss.',
    constituentIds: ['INV_022', 'INV_009', 'INV_011'],
};

export const CINV_007: CompositeInvariant = {
    id: 'CINV_007', name: 'DependencyTrustBoundary', kind: 'composite',
    definition: 'External dependencies are imported with declared version, scope, and trust assumptions.',
    constituentIds: ['INV_021', 'INV_006', 'INV_009'],
};

export const CINV_008: CompositeInvariant = {
    id: 'CINV_008', name: 'ProofWithoutPlaceholder', kind: 'composite',
    definition: 'A proof obligation is discharged without sorry, admit, or unproven axioms.',
    constituentIds: ['INV_024', 'INV_006', 'INV_025'],
};

export const CINV_009: CompositeInvariant = {
    id: 'CINV_009', name: 'TestBackedTransition', kind: 'composite',
    definition: 'A code transition is supported by test assertions that exercise both success and failure paths.',
    constituentIds: ['INV_023', 'INV_006', 'INV_009', 'INV_025'],
};

export const CINV_010: CompositeInvariant = {
    id: 'CINV_010', name: 'ReceiptedCrossLanguageReuse', kind: 'composite',
    definition: 'A code pattern from one language is reused in another only after receipt, projection, and drift risk declaration.',
    constituentIds: ['INV_025', 'INV_011', 'INV_021'],
};

export const CINV_011: CompositeInvariant = {
    id: 'CINV_011', name: 'InputTrustBoundary', kind: 'composite',
    definition: 'External input is validated before entering internal computation.',
    constituentIds: ['INV_006', 'INV_009', 'INV_011', 'INV_003'],
};

export const CINV_012: CompositeInvariant = {
    id: 'CINV_012', name: 'QuerySanitization', kind: 'composite',
    definition: 'Database or external queries are constructed with sanitized parameters to prevent injection.',
    constituentIds: ['INV_006', 'INV_009', 'INV_003'],
};

export const CINV_013: CompositeInvariant = {
    id: 'CINV_013', name: 'LockLifecycleBound', kind: 'composite',
    definition: 'Locks are acquired and released within a bounded scope, with timeout and deadlock detection.',
    constituentIds: ['INV_012', 'INV_013', 'INV_006', 'INV_009'],
};

export const CINV_014: CompositeInvariant = {
    id: 'CINV_014', name: 'NullableAccessControl', kind: 'composite',
    definition: 'Nullable or optional access is guarded by presence checks before dereference.',
    constituentIds: ['INV_006', 'INV_009', 'INV_011', 'INV_016'],
};

export const CINV_015: CompositeInvariant = {
    id: 'CINV_015', name: 'ExhaustiveVariantHandling', kind: 'composite',
    definition: 'All variants of a discriminated union or enum are handled explicitly.',
    constituentIds: ['INV_006', 'INV_009', 'INV_011'],
};

export const CINV_016: CompositeInvariant = {
    id: 'CINV_016', name: 'ClaimEvidenceAlignment', kind: 'composite',
    definition: 'The strength of a claim does not exceed the evidence level supporting it.',
    constituentIds: ['INV_023', 'INV_024', 'INV_025'],
};

// ─── Composite Registry ────────────────────────────────────────

export const COMPOSITE_INVARIANTS: Map<string, CompositeInvariant> = new Map([
    ['CINV_001', CINV_001], ['CINV_002', CINV_002], ['CINV_003', CINV_003], ['CINV_004', CINV_004],
    ['CINV_005', CINV_005], ['CINV_006', CINV_006], ['CINV_007', CINV_007], ['CINV_008', CINV_008],
    ['CINV_009', CINV_009], ['CINV_010', CINV_010], ['CINV_011', CINV_011], ['CINV_012', CINV_012],
    ['CINV_013', CINV_013], ['CINV_014', CINV_014], ['CINV_015', CINV_015], ['CINV_016', CINV_016],
]);

// ─── Query Functions ───────────────────────────────────────────

export function getInvariant(id: string): Invariant | undefined {
    return ATOMIC_INVARIANTS.get(id) ?? COMPOSITE_INVARIANTS.get(id);
}

export function resolveComposite(id: string): AtomicInvariant[] {
    const composite = COMPOSITE_INVARIANTS.get(id);
    if (!composite) return [];
    return composite.constituentIds
        .map(cid => ATOMIC_INVARIANTS.get(cid))
        .filter((inv): inv is AtomicInvariant => inv !== undefined);
}

export function listByFamily(family: InvariantFamily): AtomicInvariant[] {
    const results: AtomicInvariant[] = [];
    for (const inv of ATOMIC_INVARIANTS.values()) {
        if (inv.family === family) results.push(inv);
    }
    return results;
}

export function getReceiptRequiredInvariants(): AtomicInvariant[] {
    const results: AtomicInvariant[] = [];
    for (const inv of ATOMIC_INVARIANTS.values()) {
        if (inv.receiptRequired) results.push(inv);
    }
    return results;
}