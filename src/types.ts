// Cohbit-Copilot Core Types
// Derived from CohBit-primitive schemas and SPEC.md expanded spec

// ─── Rational64 ────────────────────────────────────────────────
// Rational valuation type matching cohbit_receipt.schema.json
export interface Rational64 {
    numer: number; // integer
    denom: number; // integer, minimum 1
}

export function rationalEquals(a: Rational64, b: Rational64): boolean {
    return a.numer * b.denom === b.numer * a.denom;
}

export function rationalAdd(a: Rational64, b: Rational64): Rational64 {
    return { numer: a.numer * b.denom + b.numer * a.denom, denom: a.denom * b.denom };
}

export function rationalSub(a: Rational64, b: Rational64): Rational64 {
    return { numer: a.numer * b.denom - b.numer * a.denom, denom: a.denom * b.denom };
}

export function rationalCmp(a: Rational64, b: Rational64): number {
    const lhs = a.numer * b.denom;
    const rhs = b.numer * a.denom;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
}

export function rationalLe(a: Rational64, b: Rational64): boolean {
    return rationalCmp(a, b) <= 0;
}

// ─── Wedge (11-Term Wedge Law from expanded SPEC.md) ───────────
// Safety Wedge: Version, DomainID, PolicyHash, FromState, ActionHash,
//   ToState, Spend, Defect, PrescribedEnvelope, Authority, CertificateHash
export interface Wedge {
    version: string;
    domainId: string;
    policyHash: string;
    fromState: string;   // 64-char hex
    actionHash: string;
    toState: string;     // 64-char hex (null / zero if rejected)
    spend: Rational64;
    defect: Rational64;
    prescribedEnvelope: Rational64;
    authority: Rational64;
    certificateHash: string;
}

// ─── CohBit Receipt ────────────────────────────────────────────
// Matching cohbit_receipt.schema.json
export interface CohBitReceipt {
    bitId: string;           // 64-char hex
    valuationPre: Rational64;
    valuationPost: Rational64;
    wedge: Wedge;
}

// ─── Admissibility Check ───────────────────────────────────────
// The fundamental Admissibility Law:
//   V(post) + s ≤ V(pre) + d + a
export function isAdmissible(valuationPre: Rational64, valuationPost: Rational64, spend: Rational64, defect: Rational64, authority: Rational64): boolean {
    const lhs = rationalAdd(valuationPost, spend);
    const rhs = rationalAdd(rationalAdd(valuationPre, defect), authority);
    return rationalLe(lhs, rhs);
}

// ─── GMI Status ────────────────────────────────────────────────
// Matching gmi_status.schema.json — used for authorization gate
export interface GmiStatus {
    blockHeight: number;
    receiptHash: string;
    hashVerified: boolean;
    signatureVerified: boolean;
    transitionAdmissible: boolean;
}

// ─── Language Receipt Decision ─────────────────────────────────
// Matching language_receipt.schema.json decisions
export type LanguageDecision =
    | 'Commit'
    | 'FallbackCommit'
    | 'Quarantine'
    | 'RepairNeeded'
    | 'Reject'
    | 'AskClarifyingQuestion'
    | 'Refuse'
    | 'CiteRequired'
    | 'DowngradeConfidence';

// ─── Language Receipt ──────────────────────────────────────────
// Matching language_receipt.schema.json
export interface LanguageReceipt {
    receiptId: string;
    candidateId: number;
    candidateKind: string;
    decision: LanguageDecision;
    domain: string;
    safetyLevel: string;
    verifierResults: Record<string, unknown>[];
    invariantChecks: Record<string, unknown>[];
    committedText: string | null;
    quarantinedText: string | null;
    claimsChecked: Record<string, unknown>[];
    valuationBefore: number;
    valuationAfter: number;
    spend: number;
    defect: number;
    authority: number;
    learnerScore: number | null;
    learnerDecision: string | null;
    replyLoopState: Record<string, unknown> | null;
    hash: number[]; // [u8; 32] as array of 32 bytes
}

// ─── Gate Status ───────────────────────────────────────────────
// The pipeline states for the governed patch lifecycle
export type GateStatus =
    | 'PROPOSED'
    | 'REVIEW_PASSED'
    | 'REVIEW_REJECTED'
    | 'AUTHORIZED'
    | 'AUTHORIZATION_DENIED'
    | 'APPLIED'
    | 'APPLY_FAILED'
    | 'TESTS_PASSED'
    | 'TESTS_FAILED'
    | 'ROLLED_BACK'
    | 'ROLLBACK_FAILED'
    | 'RECEIPTED';

// ─── Patch Proposal ────────────────────────────────────────────
// A bounded, reviewable development transition
export interface PatchProposal {
    proposalId: string;
    description: string;
    files: PatchFile[];
    estimatedSpend: Rational64;
    estimatedDefect: Rational64;
    requiredAuthority: Rational64;
    policyHash: string;
    createdAt: string; // ISO 8601
}

export interface PatchFile {
    path: string;
    action: 'create' | 'modify' | 'delete';
    beforeContent: string | null;
    afterContent: string;
    diff: string;
}

// ─── Review Result ─────────────────────────────────────────────
export interface ReviewResult {
    proposalId: string;
    reviewer: string;
    approved: boolean;
    comments: string;
    reviewedAt: string;
}

// ─── Gate Record ───────────────────────────────────────────────
// Tracks a patch through the full governed pipeline
export interface GateRecord {
    proposal: PatchProposal;
    status: GateStatus;
    review: ReviewResult | null;
    authorization: GmiStatus | null;
    applySnapshot: ApplySnapshot | null;
    testResults: TestResult[] | null;
    rollbackApplied: boolean;
    receipt: CohBitReceipt | null;
    timeline: GateEvent[];
    rustVerifierAvailable?: boolean;
}

export interface ApplySnapshot {
    appliedAt: string;
    filesModified: string[];
    files: SnapshotFile[];
    prePatchHashes: Record<string, string>;
    postPatchHashes: Record<string, string>;
}

// Per-file snapshot with pre-state content + hash for self-contained rollback
export interface SnapshotFile {
    path: string;
    beforeContent: string;
    beforeHash: string;
}

export interface TestResult {
    name: string;
    passed: boolean;
    duration: number; // ms
    error?: string;
}

export interface GateEvent {
    timestamp: string;
    gate: string;
    status: GateStatus;
    details: string;
}

// ─── Session Ledger ────────────────────────────────────────────
export interface SessionLedgerEntry {
    sessionId: string;
    gateRecord: GateRecord;
    languageReceipt?: LanguageReceipt;
    committedAt: string;
}

// ─── Failures ──────────────────────────────────────────────────
// From test_vectors/ the known rejection categories
export type FailureCategory =
    | 'rejects_unauthorized_potential_creation'
    | 'rejects_negative_spend'
    | 'rejects_bad_margin'
    | 'rejects_authority_cap_exceeded'
    | 'rejects_state_root_mismatch'
    | 'rejects_chain_digest_mismatch'
    | 'adversarial_input_detected';

export interface FailureClassification {
    category: FailureCategory;
    severity: 'FATAL' | 'ERROR' | 'WARNING';
    description: string;
    offendingField?: string;
}

// ─── Language Detection Types (v0.4) ──────────────────────────
export type Language = 'node' | 'rust' | 'go' | 'python' | 'dotnet' | 'unknown';

export type ParserConfidence = 'high' | 'medium' | 'low';

export interface ParsedTestResult extends TestResult {
    parserConfidence: ParserConfidence;
    rawLine: string;
}

// ─── Bounded Patch Proposal Types (v0.7) ─────────────────────
export type ProposalIntent =
    | 'fix_failing_test'
    | 'create_missing_file'
    | 'replace_exact_block'
    | 'unknown';

export interface PatchScope {
    allowedPaths: string[];
    maxFiles: number;
    maxBytesChanged: number;
    allowCreate: boolean;
    allowModify: boolean;
    allowDelete: boolean;
}

export type BoundedProposalResult =
    | {
        status: 'proposed';
        proposal: PatchProposal;
        scope: PatchScope;
        reason: string;
    }
    | {
        status: 'no_patch';
        reason: string;
        suggestedNextAction: string;
    };

export interface ProposalInput {
    cwd: string;
    targetPath?: string;
    findBlock?: string;
    replaceBlock?: string;
    createPath?: string;
    content?: string;
    failureText?: string;
    testResults?: TestResult[];
    scope: PatchScope;
}

// ─── English Capability Types (v1.0E) ────────────────────────
export type OperatorIntent =
    | 'InspectWorkspace'
    | 'InspectFile'
    | 'PlanChange'
    | 'ProposePatch'
    | 'RunTests'
    | 'ReviewPatch'
    | 'AuthorizePatch'
    | 'ApplyPatch'
    | 'RollbackPatch'
    | 'ShowRecent'
    | 'ResumeSession'
    | 'ExplainSession'
    | 'RecommendTests'
    | 'FixTests'
    | 'Unknown';

export type MutationPermission =
    | 'ReadOnly'
    | 'ProposalOnly'
    | 'MayApplyWithAuthorization'
    | 'Unknown';

export interface EnglishConstraints {
    readOnly?: boolean | undefined;
    noApply?: boolean | undefined;
    noDelete?: boolean | undefined;
    maxFiles?: number | undefined;
    allowCreate?: boolean | undefined;
}

export type EnglishConfidence = 'high' | 'medium' | 'low' | 'unsafe';

export interface EnglishCommandParse {
    intent: OperatorIntent;
    confidence: EnglishConfidence;
    targetFile: string | undefined;
    targetModule: string | undefined;
    sessionRef: string | undefined;
    testCommand: string | undefined;
    constraints: EnglishConstraints;
    unsafeReason: string | undefined;
    raw: string;
}

// ─── Workspace Intelligence Types (v1.1) ─────────────────────
export type FileRole =
    | 'source'
    | 'test'
    | 'config'
    | 'docs'
    | 'schema'
    | 'lockfile'
    | 'generated'
    | 'binary'
    | 'unknown';

export interface WorkspaceSummary {
    root: string;
    language: Language;
    manifests: string[];
    fileCounts: Record<string, number>;
    sourceFiles: string[];
    testFiles: string[];
    configFiles: string[];
    docsFiles: string[];
    ignoredDirs: string[];
    totalFiles: number;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Blocked';

export interface EnvironmentReport {
    workspace: WorkspaceSummary;
    language: Language;
    defaultTestCommand: string;
    tools: Record<string, boolean>;
    gitAvailable: boolean;
    gitDirty: boolean;
    riskLevel: RiskLevel;
    riskReasons: string[];
    warnings: string[];
}

// ─── Symbol & Dependency Graph Types (v1.2) ──────────────────
export type SymbolKind =
    | 'Import'
    | 'Export'
    | 'Function'
    | 'Class'
    | 'Interface'
    | 'Type'
    | 'Enum'
    | 'Struct'
    | 'Trait'
    | 'Module'
    | 'Const'
    | 'Variable'
    | 'Unknown';

export interface SymbolInfo {
    file: string;
    name: string;
    kind: SymbolKind;
    line: number;
    confidence: ParserConfidence;
    raw: string;
}

export interface ProjectSymbols {
    root: string;
    language: Language;
    symbols: SymbolInfo[];
    fileIndex: Record<string, SymbolInfo[]>;
}

export interface SymbolFilter {
    kinds?: SymbolKind[] | undefined;
    paths?: string[] | undefined;
    namePattern?: string | undefined;
}

export interface DependencyEdge {
    from: string;
    to: string;
    rawImport: string;
    confidence: ParserConfidence;
}

export interface DependencyGraph {
    edges: DependencyEdge[];
    adjacency: Record<string, string[]>;
    reverseAdjacency: Record<string, string[]>;
}

// ─── Work Planner Types (v1.3) ───────────────────────────────
export type WorkIntent =
    | 'AddCommand'
    | 'ModifyFunction'
    | 'AddTest'
    | 'FixFailure'
    | 'InspectOnly'
    | 'Unknown';

export type WorkPlan = {
    intent: WorkIntent;
    confidence: ParserConfidence;
    task: string;
    likelyFiles: Array<{
        path: string;
        reason: string;
        role: FileRole;
    }>;
    affectedFiles: string[];
    steps: string[];
    suggestedTests: string[];
    risk: RiskLevel;
    constraints: EnglishConstraints;
    mutationPermission: MutationPermission;
};

// ─── Test Recommendation Types (v1.4) ───────────────────────

export interface TestRecommendationInput {
    likelyFiles?: string[] | undefined;
    changedFiles?: string[] | undefined;
    affectedFiles?: string[] | undefined;
    workspace: WorkspaceSummary;
    depGraph?: DependencyGraph | undefined;
}

export type TestTier = 'targeted' | 'module' | 'full';

export interface TestRecommendationCommand {
    command: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    tier: TestTier;
}

export interface TestRecommendation {
    commands: TestRecommendationCommand[];
    fallbackCommand: string;
}

// ─── Patch Builder Types (v1.5) ─────────────────────────────

export type PatchPrimitive =
    | 'ReplaceExactBlock'
    | 'InsertImportIfAbsent'
    | 'AppendExport'
    | 'CreateFileFromTemplate'
    | 'AddCliDispatchArm'
    | 'AddTestCaseFromTemplate';

export interface PatchBuildRequest {
    planId?: string | undefined;
    task: string;
    targetFile: string;
    primitive: PatchPrimitive;
    find?: string | undefined;
    replace?: string | undefined;
    template?: string | undefined;
    scope: PatchScope;
}

export type PatchBuildResult =
    | {
        status: 'proposed';
        proposal: PatchProposal;
        primitive: PatchPrimitive;
        bounds: PatchScope;
        suggestedTests: string[];
        reason: string;
    }
    | {
        status: 'no_patch';
        reason: string;
        suggestedNextAction: string;
    };

// ─── Repair Planner Types (v1.7) ─────────────────────────────

export type FailureSource = 'test' | 'build' | 'lint' | 'unknown';

export interface ParsedFailure {
    source: FailureSource;
    file: string | null;
    line: number | null;
    message: string;
    category: FailureCategory | 'unknown';
    suggestedPrimitive: PatchPrimitive | null;
    confidence: 'high' | 'medium' | 'low';
}

export interface RepairPlan {
    failures: ParsedFailure[];
    likelyFiles: Array<{ path: string; reason: string; role: FileRole }>;
    suggestedPatches: Array<{
        targetFile: string;
        primitive: PatchPrimitive;
        find?: string;
        replace?: string;
        confidence: string;
    }>;
    steps: string[];
    risk: RiskLevel;
}

// ─── Filesystem Bridge Types (v0.2) ───────────────────────────
export interface RollbackResult {
    success: boolean;
    filesRestored: string[];
    hashVerified: boolean;
    warnings: string[];
}

export type EmptyTestPolicy = 'allow-with-notice' | 'reject';

export interface TestRunConfig {
    command?: string;          // default "npm test"
    emptyTestPolicy?: EmptyTestPolicy;  // default "allow-with-notice"
    timeoutMs?: number;        // default 30000
}
