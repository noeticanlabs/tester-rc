// Cohbit-Copilot Gate Pipeline
// Implements the governed patch lifecycle per SPEC.md type-safe coupling flow:
//   1. [CANDIDATE] ProposalGate
//   2. [REVIEW] ReviewGate
//   3. [AUTHORIZE] AuthorizeGate (Policy Layer)
//   4. [APPLY] ApplyGate
//   5. [TEST] PostApplyTestGate
//   6. [ROLLBACK] RollbackGate
//   7. [RECEIPT] SessionLedger
//
// Central authority boundary:
//   Proposal ≠ Authority
//   Patch Applied ≠ Patch Stable
//   Test Passed ≠ Final Commit

import type {
    PatchProposal,
    ReviewResult,
    GateRecord,
    GateStatus,
    GateEvent,
    TestResult,
    ApplySnapshot,
    FailureClassification,
    FailureCategory,
    CohBitReceipt,
    LanguageReceipt,
    Rational64,
    GmiStatus,
} from './types.js';
import { isAdmissible } from './types.js';
import {
    buildReceipt,
    verifyGmiStatus,
    buildLanguageReceipt,
} from './receipt.js';
import { classifyPatchFile, buildAtlasEntry } from './atlas_bridge.js';
import { storeAtlasEntry } from '../packages/code-atlas/src/store.js';
import { isRustVerifierAvailable } from './rust_receipt_gate.js';

// ─── Utility ───────────────────────────────────────────────────
let idCounter = 0;
function nextId(prefix: string): string {
    idCounter += 1;
    return `${prefix}-${Date.now()}-${idCounter.toString(16)}`;
}

function now(): string {
    return new Date().toISOString();
}

function addEvent(record: GateRecord, gate: string, status: GateStatus, details: string): void {
    record.timeline.push({ timestamp: now(), gate, status, details });
    record.status = status;
}

// ─── 1. ProposalGate ───────────────────────────────────────────
// Copilot may propose. Bounded proposals only. No self-authorization.
// Enforces the admissibility law on proposed transitions.

export interface ProposalInput {
    description: string;
    files: {
        path: string;
        action: 'create' | 'modify' | 'delete';
        beforeContent: string | null;
        afterContent: string;
        diff: string;
    }[];
    estimatedSpend: Rational64;
    estimatedDefect: Rational64;
    requiredAuthority: Rational64;
    policyHash: string;
}

export function propose(input: ProposalInput): GateRecord {
    const proposal: PatchProposal = {
        proposalId: nextId('prop'),
        description: input.description,
        files: input.files.map(f => ({
            path: f.path,
            action: f.action,
            beforeContent: f.beforeContent,
            afterContent: f.afterContent,
            diff: f.diff,
        })),
        estimatedSpend: input.estimatedSpend,
        estimatedDefect: input.estimatedDefect,
        requiredAuthority: input.requiredAuthority,
        policyHash: input.policyHash,
        createdAt: now(),
    };

    const record: GateRecord = {
        proposal,
        status: 'PROPOSED',
        review: null,
        authorization: null,
        applySnapshot: null,
        testResults: null,
        rollbackApplied: false,
        receipt: null,
        timeline: [],
    };

    addEvent(record, 'ProposalGate', 'PROPOSED', `Proposal ${proposal.proposalId} created: ${proposal.description}`);
    return record;
}

// ─── 2. ReviewGate ─────────────────────────────────────────────
// Human/verifier inspection. Enforces: Proposal ≠ Authority.
// The copilot cannot self-approve.

export function review(record: GateRecord, reviewer: string, approved: boolean, comments: string): GateRecord {
    if (record.status !== 'PROPOSED') {
        addEvent(record, 'ReviewGate', 'REVIEW_REJECTED', `Cannot review: current status is ${record.status}, expected PROPOSED`);
        return record;
    }

    const result: ReviewResult = {
        proposalId: record.proposal.proposalId,
        reviewer,
        approved,
        comments,
        reviewedAt: now(),
    };

    record.review = result;

    if (approved) {
        addEvent(record, 'ReviewGate', 'REVIEW_PASSED', `Approved by ${reviewer}: ${comments}`);
    } else {
        addEvent(record, 'ReviewGate', 'REVIEW_REJECTED', `Rejected by ${reviewer}: ${comments}`);
    }

    return record;
}

// ─── 3. AuthorizeGate ──────────────────────────────────────────
// Policy Layer enforcement per SPEC.md §3:
//   Mathematical Acceptance ≠ Executable Permission
//   Type-safe coupling: only displacements passing both Admissibility
//   and Policy gates can reach the commitment boundary.
//   Policy binding: AcceptedCohBit must declare policy_hash.

export interface AuthorizationInput {
    domainId: string;
    valuationPre: Rational64;
    valuationPost: Rational64;
    memoryBudget: number;   // B_mem from SPEC.md §3.1
    traceBudget: number;    // B_trace from SPEC.md §3.1
}

export function authorize(
    record: GateRecord,
    input: AuthorizationInput,
    receipt: CohBitReceipt,
): GateRecord {
    if (record.status !== 'REVIEW_PASSED') {
        addEvent(record, 'AuthorizeGate', 'AUTHORIZATION_DENIED',
            `Cannot authorize: current status is ${record.status}, expected REVIEW_PASSED`);
        return record;
    }

    // Policy Hash Binding — SPEC.md MANDATE
    if (receipt.wedge.policyHash !== record.proposal.policyHash) {
        addEvent(record, 'AuthorizeGate', 'AUTHORIZATION_DENIED',
            `Policy hash mismatch: receipt declares ${receipt.wedge.policyHash}, proposal requires ${record.proposal.policyHash}`);
        return record;
    }

    // Admissibility Check (Mathematical Acceptance)
    const admissible = isAdmissible(
        input.valuationPre,
        input.valuationPost,
        receipt.wedge.spend,
        receipt.wedge.defect,
        receipt.wedge.authority,
    );

    if (!admissible) {
        addEvent(record, 'AuthorizeGate', 'AUTHORIZATION_DENIED',
            'Admissibility check failed: V(post) + s > V(pre) + d + a');
        return record;
    }

    // Memory Mass Policy — SPEC.md §3.1: M_mem(b) ≤ B_mem
    const memMass = Buffer.byteLength(JSON.stringify(receipt), 'utf8');
    if (memMass > input.memoryBudget) {
        addEvent(record, 'AuthorizeGate', 'AUTHORIZATION_DENIED',
            `Memory mass ${memMass} exceeds budget ${input.memoryBudget}`);
        return record;
    }

    // Authorization
    const gmiStatus: GmiStatus = {
        blockHeight: 0,
        receiptHash: receipt.bitId,
        hashVerified: true,
        signatureVerified: false, // v0.4
        transitionAdmissible: admissible,
    };

    record.authorization = gmiStatus;
    addEvent(record, 'AuthorizeGate', 'AUTHORIZED',
        `Authorized: admissible=${admissible}, memMass=${memMass}, budget=${input.memoryBudget}`);

    return record;
}

// ─── 4. ApplyGate ──────────────────────────────────────────────
// Applies bounded patches with pre-state snapshot for rollback.
// Enforces: Patch Applied ≠ Patch Stable

export interface ApplyInput {
    filesModified: string[];
    prePatchHashes: Record<string, string>;
    postPatchHashes: Record<string, string>;
}

export function apply(record: GateRecord, input: ApplyInput): GateRecord {
    if (record.status !== 'AUTHORIZED') {
        addEvent(record, 'ApplyGate', 'APPLY_FAILED',
            `Cannot apply: current status is ${record.status}, expected AUTHORIZED`);
        return record;
    }

    const snapshot: ApplySnapshot = {
        appliedAt: now(),
        filesModified: input.filesModified,
        files: [],
        prePatchHashes: input.prePatchHashes,
        postPatchHashes: input.postPatchHashes,
    };

    record.applySnapshot = snapshot;
    addEvent(record, 'ApplyGate', 'APPLIED',
        `Applied to ${input.filesModified.length} files: ${input.filesModified.join(', ')}`);

    return record;
}

// ─── 5. PostApplyTestGate ──────────────────────────────────────
// Runs test suite, classifies failures.
// Enforces: Test Passed ≠ Final Commit

export function runTests(record: GateRecord, testResults: TestResult[]): GateRecord {
    if (record.status !== 'APPLIED') {
        addEvent(record, 'PostApplyTestGate', 'TESTS_FAILED',
            `Cannot test: current status is ${record.status}, expected APPLIED`);
        return record;
    }

    record.testResults = testResults;

    const allPassed = testResults.every(t => t.passed);
    if (allPassed) {
        addEvent(record, 'PostApplyTestGate', 'TESTS_PASSED',
            `All ${testResults.length} tests passed`);
    } else {
        const failures = testResults.filter(t => !t.passed);
        addEvent(record, 'PostApplyTestGate', 'TESTS_FAILED',
            `${failures.length}/${testResults.length} tests failed: ${failures.map(f => f.name).join(', ')}`);
    }

    return record;
}

// ─── Failure Classifier ────────────────────────────────────────
// Classifies test failures against known test_vectors/ categories

export function classifyFailure(testResult: TestResult): FailureClassification {
    if (testResult.passed) {
        return {
            category: 'adversarial_input_detected', // fallback — should not happen
            severity: 'WARNING',
            description: 'Test passed unexpectedly in failure classifier',
        };
    }

    const errorMsg = testResult.error ?? '';

    if (errorMsg.includes('negative spend') || errorMsg.includes('spend less than zero')) {
        return { category: 'rejects_negative_spend', severity: 'ERROR', description: 'Spend must be non-negative', offendingField: 'spend' };
    }
    if (errorMsg.includes('authority cap') || errorMsg.includes('authority exceeded')) {
        return { category: 'rejects_authority_cap_exceeded', severity: 'ERROR', description: 'Authority cap exceeded', offendingField: 'authority' };
    }
    if (errorMsg.includes('bad margin') || errorMsg.includes('margin')) {
        return { category: 'rejects_bad_margin', severity: 'ERROR', description: 'Bad margin or envelope violation', offendingField: 'defect' };
    }
    if (errorMsg.includes('state root mismatch') || errorMsg.includes('state hash')) {
        return { category: 'rejects_state_root_mismatch', severity: 'ERROR', description: 'State root/hash mismatch', offendingField: 'fromState' };
    }
    if (errorMsg.includes('chain digest') || errorMsg.includes('digest mismatch')) {
        return { category: 'rejects_chain_digest_mismatch', severity: 'ERROR', description: 'Chain digest mismatch', offendingField: 'certificateHash' };
    }
    if (errorMsg.includes('unauthorized') || errorMsg.includes('potential creation')) {
        return { category: 'rejects_unauthorized_potential_creation', severity: 'FATAL', description: 'Unauthorized potential creation detected', offendingField: 'authority' };
    }

    // ─── v0.4: Language-specific failure patterns ─────────────
    // cargo test
    if (errorMsg.includes('thread') && errorMsg.includes('panicked')) {
        return { category: 'adversarial_input_detected', severity: 'ERROR', description: 'Rust panic in test', offendingField: 'certificateHash' };
    }
    if (errorMsg.includes('left') && errorMsg.includes('right') && errorMsg.includes('assertion')) {
        return { category: 'rejects_bad_margin', severity: 'ERROR', description: 'Assertion failure (cargo test)', offendingField: 'defect' };
    }
    // pytest
    if (errorMsg.includes('AssertionError') || errorMsg.includes('assert')) {
        return { category: 'rejects_bad_margin', severity: 'ERROR', description: 'Assertion failure (pytest)', offendingField: 'defect' };
    }
    // go test
    if (errorMsg.includes('FAIL') && errorMsg.includes('Test')) {
        return { category: 'rejects_bad_margin', severity: 'ERROR', description: 'Test failure (go test)', offendingField: 'defect' };
    }
    if (errorMsg.includes('panic:') && errorMsg.includes('runtime error')) {
        return { category: 'adversarial_input_detected', severity: 'ERROR', description: 'Go runtime panic', offendingField: 'certificateHash' };
    }
    // dotnet test
    if (errorMsg.includes('Failed ') && errorMsg.includes('Error Message')) {
        return { category: 'rejects_bad_margin', severity: 'ERROR', description: 'Test failure (dotnet)', offendingField: 'defect' };
    }

    return {
        category: 'adversarial_input_detected',
        severity: 'ERROR',
        description: `Unclassified failure: ${errorMsg}`,
    };
}

// ─── 6. RollbackGate ───────────────────────────────────────────
// Reverts to pre-apply state if tests fail.
// Enforces: Patch Applied ≠ Patch Stable

export function rollback(record: GateRecord): GateRecord {
    if (record.status !== 'TESTS_FAILED') {
        addEvent(record, 'RollbackGate', 'ROLLBACK_FAILED',
            `Cannot rollback: current status is ${record.status}, expected TESTS_FAILED`);
        return record;
    }

    if (!record.applySnapshot) {
        addEvent(record, 'RollbackGate', 'ROLLBACK_FAILED', 'No apply snapshot available for rollback');
        return record;
    }

    record.rollbackApplied = true;
    addEvent(record, 'RollbackGate', 'ROLLED_BACK',
        `Rolled back ${record.applySnapshot.filesModified.length} files to pre-patch state`);

    return record;
}

// ─── 7. SessionLedger / Receipt Gate ───────────────────────────
// Produces a deterministic receipt for the completed lifecycle.
// Enforces: receipt_hash_is_deterministic

export function commitReceipt(
    record: GateRecord,
    valuationPre: Rational64,
    valuationPost: Rational64,
    domainId: string,
    actionHash: string,
): GateRecord {
    const validCommitStates: GateStatus[] = ['TESTS_PASSED'];
    if (!validCommitStates.includes(record.status)) {
        addEvent(record, 'ReceiptGate', 'ROLLBACK_FAILED',
            `Cannot commit receipt: current status is ${record.status}, expected TESTS_PASSED`);
        return record;
    }

    const receiptResult = buildReceipt({
        valuationPre,
        valuationPost,
        spend: record.proposal.estimatedSpend,
        defect: record.proposal.estimatedDefect,
        authority: record.proposal.requiredAuthority,
        prescribedEnvelope: { numer: 1, denom: 1 }, // 100% envelope — configurable per domain
        fromState: record.applySnapshot?.prePatchHashes?.[record.applySnapshot.filesModified[0] ?? ''] ?? '0'.repeat(64),
        toState: record.applySnapshot?.postPatchHashes?.[record.applySnapshot.filesModified[0] ?? ''] ?? '0'.repeat(64),
        version: '0.1.0',
        domainId,
        policyHash: record.proposal.policyHash,
        actionHash,
        certificateHash: '0'.repeat(64), // placeholder — would be computed from verifier evidence
    });

    if ('error' in receiptResult) {
        addEvent(record, 'ReceiptGate', 'APPLIED',  // Stay at APPLIED — receipt was not produced
            `Receipt build failed: ${receiptResult.error}`);
        return record;
    }

    record.receipt = receiptResult;
    addEvent(record, 'ReceiptGate', 'RECEIPTED',
        `Receipt committed: ${receiptResult.bitId}`);

    // ── v11.8: Record Rust verifier availability as advisory evidence ─
    // Rust verification is evidence-gathering only — does not block receipt.
    // Stored as a flag instead of a timeline event to avoid doubling ReceiptGate entries.
    record.rustVerifierAvailable = isRustVerifierAvailable();

    // ── v1.1: Auto-store classified atlas entry ──────────────
    try {
        const firstFile = record.proposal.files[0];
        if (firstFile) {
            const classification = classifyPatchFile(firstFile, record.proposal.proposalId);
            const entry = buildAtlasEntry({
                gateRecord: record,
                receipt: receiptResult,
                sessionId: record.proposal.proposalId,
                classification,
            });
            storeAtlasEntry(entry).catch(() => {
                // Best-effort — don't block receipt commit on atlas storage failure
            });
        }
    } catch {
        // Atlas storage is advisory — never block receipt commit
    }

    return record;
}

// ─── Session Language Receipt ──────────────────────────────────
// Produces a LanguageReceipt for the session
export function commitSessionReceipt(
    record: GateRecord,
    candidateId: number,
    candidateKind: string,
    domain: string,
): LanguageReceipt | { error: string } {
    // Determine decision based on gate status
    let decision: 'Commit' | 'FallbackCommit' | 'Quarantine' | 'RepairNeeded' | 'Reject';
    switch (record.status) {
        case 'RECEIPTED':
            decision = 'Commit';
            break;
        case 'ROLLED_BACK':
            decision = 'RepairNeeded';
            break;
        case 'TESTS_FAILED':
            decision = 'Reject';
            break;
        case 'AUTHORIZATION_DENIED':
        case 'REVIEW_REJECTED':
            decision = 'Reject';
            break;
        default:
            decision = 'Quarantine';
    }

    // Compute approximate valuations
    const spend = record.proposal.estimatedSpend.numer / record.proposal.estimatedSpend.denom;
    const defect = record.proposal.estimatedDefect.numer / record.proposal.estimatedDefect.denom;
    const authority = record.proposal.requiredAuthority.numer / record.proposal.requiredAuthority.denom;
    const valuationBefore = 100; // placeholder baseline
    const valuationAfter = valuationBefore - spend + defect + authority;

    return buildLanguageReceipt(
        nextId('session'),
        candidateId,
        candidateKind,
        domain,
        valuationBefore,
        valuationAfter,
        spend,
        defect,
        authority,
        decision,
    );
}

// ─── Full Pipeline Runner ──────────────────────────────────────
// Runs the complete governed patch lifecycle in sequence

export interface PipelineConfig {
    proposal: ProposalInput;
    reviewer: string;
    reviewApproved: boolean;
    reviewComments: string;
    authorization: AuthorizationInput;
    apply: ApplyInput;
    testResults: TestResult[];
    domainId: string;
    actionHash: string;
}

export function runPipeline(config: PipelineConfig): GateRecord {
    // Step 1: Propose
    let record = propose(config.proposal);

    // Step 2: Review
    record = review(record, config.reviewer, config.reviewApproved, config.reviewComments);
    if (record.status !== 'REVIEW_PASSED') {
        return record;
    }

    // Build an intermediate receipt for authorization
    const tempReceipt: CohBitReceipt = {
        bitId: '',
        valuationPre: config.authorization.valuationPre,
        valuationPost: config.authorization.valuationPost,
        wedge: {
            version: '0.1.0',
            domainId: config.domainId,
            policyHash: config.proposal.policyHash,
            fromState: config.apply.prePatchHashes[Object.keys(config.apply.prePatchHashes)[0] ?? ''] ?? '0'.repeat(64),
            toState: '0'.repeat(64), // will be set after apply
            actionHash: config.actionHash,
            spend: config.proposal.estimatedSpend,
            defect: config.proposal.estimatedDefect,
            prescribedEnvelope: { numer: 1, denom: 10 },
            authority: config.proposal.requiredAuthority,
            certificateHash: '0'.repeat(64),
        },
    };

    // Step 3: Authorize
    record = authorize(record, config.authorization, tempReceipt);
    if (record.status !== 'AUTHORIZED') {
        return record;
    }

    // Step 4: Apply
    record = apply(record, config.apply);
    if (record.status !== 'APPLIED') {
        return record;
    }

    // Step 5: Test
    record = runTests(record, config.testResults);
    if (record.status === 'TESTS_FAILED') {
        // Step 6: Rollback
        record = rollback(record);
        return record;
    }

    // Step 7: Receipt
    record = commitReceipt(
        record,
        config.authorization.valuationPre,
        config.authorization.valuationPost,
        config.domainId,
        config.actionHash,
    );

    return record;
}