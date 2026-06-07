// @cohbit/tooling — T Atlas Integration (v4.0 → v8.1)
// Bridges calibrated risk findings into the Code Atlas memory system.
// Maps riskKinds → invariants → failure modes → atlas entries → memory graph.
//
// Operating law:
//   Atlas integration may map findings, store advisory memory, build structural
//   graph edges, and feed retrieval guard. It may not certify defects, authorize
//   repairs, mutate source files, promote evidence level, or commit state.
//   Atlas entries are advisory memory records, not gate-pipeline receipts.
//
// v8.1: Obligation dedup + re-audit stability.
//   - Obligation IDs are deterministic from (file, line, riskKind).
//   - Obligation store persists to .cohbit/audit/v8_obligations.json.
//   - Reconcile algorithm: closed obligations preserved, duplicates prevented,
//     content-changed obligations re-opened for review.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ReviewQueueItem } from '../packages/tooling/src/T_rust_review_queue.js';
import type { AtlasEntry } from '../packages/code-atlas/src/store.js';
import { storeAtlasEntry, queryByReceipt } from '../packages/code-atlas/src/store.js';
import { aggregatePatterns, loadCanonicalPatterns, saveCanonicalPatterns } from '../packages/code-atlas/src/L13_canonical_pattern.js';
import type { MemoryEdge, MemoryGraph } from '../packages/code-atlas/src/L10_memory_graph.js';
import { createMemoryGraph } from '../packages/code-atlas/src/L10_memory_graph.js';
import type { RetrievalCandidate } from '../packages/tooling/src/T15_retrieval_guard.js';
import { analyzeMath } from '../packages/tooling/src/T14_math_adapter.js';
import { analyzeLanguage } from '../packages/tooling/src/T13_language_adapter.js';
import { scanRisks } from '../packages/tooling/src/T7_risk_scanner.js';
import { transformToTltGraph, type TltTransformResult } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import type { ContentArtifact } from '../packages/tooling/src/T_content_reader.js';
import type { TypedTransition } from '../packages/code-atlas/src/L4_transition.js';
import { ALL_TRANSITIONS } from '../packages/code-atlas/src/L4_transition.js';
import type { VerifierRoute, EvidenceLevel } from '../packages/code-atlas/src/L7_verifier.js';
import { getVerifierRoute } from '../packages/code-atlas/src/L7_verifier.js';
import type { RepairObligation } from '../packages/code-atlas/src/L9_repair_obligation.js';

// ─── Versioned Risk → Invariant Map ────────────────────────────

export const RISK_INVARIANT_MAP_VERSION = 'v4.0.0';

export interface RiskInvariantMapEntry {
    riskKind: string;
    invariantIds: string[];
    failureModeIds: string[];
    rationale: string;
    confidence: 'heuristic';
}

/**
 * Mapping from Rust risk scanner patterns to Code Atlas invariants and failure modes.
 * All mappings are heuristic — same riskKind always maps to same invariants,
 * regardless of surrounding runtime context.
 */
export const RISK_INVARIANT_MAP: Map<string, RiskInvariantMapEntry> = new Map([
    // ── unsafe ────────────────────────────────────────────────
    ['unsafe_block', {
        riskKind: 'unsafe_block',
        invariantIds: ['INV_012', 'INV_016', 'INV_005'],
        failureModeIds: ['FAIL_MEM_001', 'FAIL_MEM_004'],
        rationale: 'Unsafe blocks bypass memory safety guarantees. INV_012 (Allocation), INV_016 (PointerDereference), INV_005 (Mutation).',
        confidence: 'heuristic',
    }],
    ['unsafe_function', {
        riskKind: 'unsafe_function',
        invariantIds: ['INV_001', 'INV_005', 'INV_016'],
        failureModeIds: ['FAIL_MEM_001'],
        rationale: 'Unsafe functions require caller to uphold invariants. INV_001 (FunctionDefinition), INV_005 (Mutation).',
        confidence: 'heuristic',
    }],

    // ── panic/unwrap/expect ───────────────────────────────────
    ['panic_review_signal', {
        riskKind: 'panic_review_signal',
        invariantIds: ['INV_010', 'INV_009'],
        failureModeIds: ['FAIL_PANIC_001'],
        rationale: 'panic! interrupts ordinary execution. INV_010 (ExceptionOrPanic), INV_009 (ErrorPath).',
        confidence: 'heuristic',
    }],
    ['unwrap_review_signal', {
        riskKind: 'unwrap_review_signal',
        invariantIds: ['INV_011', 'INV_009', 'INV_006'],
        failureModeIds: ['FAIL_ERR_001'],
        rationale: '.unwrap() on None/Err is unchecked failure. INV_011 (ResultOrOption), INV_009 (ErrorPath), INV_006 (ConditionalBranch).',
        confidence: 'heuristic',
    }],
    ['expect_review_signal', {
        riskKind: 'expect_review_signal',
        invariantIds: ['INV_011', 'INV_009', 'INV_006'],
        failureModeIds: ['FAIL_ERR_001'],
        rationale: '.expect() panics on None/Err. INV_011 (ResultOrOption), INV_009 (ErrorPath).',
        confidence: 'heuristic',
    }],
    ['todo_review_signal', {
        riskKind: 'todo_review_signal',
        invariantIds: ['INV_001', 'INV_009'],
        failureModeIds: ['FAIL_ERR_001'],
        rationale: 'Unfinished code will panic. INV_001 (FunctionDefinition incomplete), INV_009 (ErrorPath).',
        confidence: 'heuristic',
    }],
    ['unimplemented_review_signal', {
        riskKind: 'unimplemented_review_signal',
        invariantIds: ['INV_001', 'INV_009'],
        failureModeIds: ['FAIL_ERR_001'],
        rationale: 'Planned code panics on invocation. INV_001 (FunctionDefinition incomplete).',
        confidence: 'heuristic',
    }],

    // ── process / command execution ───────────────────────────
    ['process_command', {
        riskKind: 'process_command',
        invariantIds: ['INV_002', 'INV_006', 'INV_009'],
        failureModeIds: ['FAIL_INPUT_001'],
        rationale: 'External process spawn may take unsanitized input. INV_002 (FunctionCall), INV_006 (ConditionalBranch).',
        confidence: 'heuristic',
    }],
    ['command_new', {
        riskKind: 'command_new',
        invariantIds: ['INV_002', 'INV_006', 'INV_009'],
        failureModeIds: ['FAIL_INPUT_001'],
        rationale: 'Command::new with dynamic args. INV_002 (FunctionCall), INV_006 (ConditionalBranch).',
        confidence: 'heuristic',
    }],

    // ── filesystem mutation ───────────────────────────────────
    ['filesystem_delete_file', {
        riskKind: 'filesystem_delete_file',
        invariantIds: ['INV_013', 'INV_005', 'INV_006'],
        failureModeIds: ['FAIL_MEM_005'],
        rationale: 'File deletion destroys resource. INV_013 (Deallocation), INV_005 (Mutation).',
        confidence: 'heuristic',
    }],
    ['filesystem_delete_recursive', {
        riskKind: 'filesystem_delete_recursive',
        invariantIds: ['INV_013', 'INV_005', 'INV_006'],
        failureModeIds: ['FAIL_MEM_004', 'FAIL_MEM_005'],
        rationale: 'Recursive directory deletion — high blast radius. INV_013 (Deallocation), INV_005 (Mutation).',
        confidence: 'heuristic',
    }],
    ['filesystem_create', {
        riskKind: 'filesystem_create',
        invariantIds: ['INV_012', 'INV_005'],
        failureModeIds: ['FAIL_MEM_005'],
        rationale: 'File::create allocates new resource and may overwrite. INV_012 (Allocation), INV_005 (Mutation).',
        confidence: 'heuristic',
    }],
    ['filesystem_open_write', {
        riskKind: 'filesystem_open_write',
        invariantIds: ['INV_005', 'INV_014'],
        failureModeIds: ['FAIL_ERR_002'],
        rationale: 'OpenOptions write/append mutates filesystem. INV_005 (Mutation), INV_014 (OwnershipTransfer).',
        confidence: 'heuristic',
    }],

    // ── path safety ───────────────────────────────────────────
    ['filesystem_path_from_variable', {
        riskKind: 'filesystem_path_from_variable',
        invariantIds: ['INV_006', 'INV_017', 'INV_009'],
        failureModeIds: ['FAIL_INPUT_001', 'FAIL_MEM_004'],
        rationale: 'Filesystem operation on variable path — injection/sandbox risk. INV_006 (ConditionalBranch), INV_017 (index/traversal analog).',
        confidence: 'heuristic',
    }],
    ['relative_traversal', {
        riskKind: 'relative_traversal',
        invariantIds: ['INV_006', 'INV_016'],
        failureModeIds: ['FAIL_MEM_004'],
        rationale: '../ traversal may escape intended directory scope. INV_006 (ConditionalBranch), INV_016 (PointerDereference analog).',
        confidence: 'heuristic',
    }],
    ['path_join_dynamic', {
        riskKind: 'path_join_dynamic',
        invariantIds: ['INV_006', 'INV_003'],
        failureModeIds: ['FAIL_INPUT_001'],
        rationale: 'Dynamic path join from variable input. INV_006 (ConditionalBranch), INV_003 (VariableBinding).',
        confidence: 'heuristic',
    }],
    ['format_path', {
        riskKind: 'format_path',
        invariantIds: ['INV_006'],
        failureModeIds: ['FAIL_INPUT_001'],
        rationale: 'format!() path construction is platform-dependent. INV_006 (ConditionalBranch).',
        confidence: 'heuristic',
    }],
    ['path_join_literal', {
        riskKind: 'path_join_literal',
        invariantIds: ['INV_006'],
        failureModeIds: [],
        rationale: 'String literal path — typically benign, flagged for consistency audit. INV_006 (ConditionalBranch / path selection).',
        confidence: 'heuristic',
    }],

    // ── recursion ─────────────────────────────────────────────
    ['unbounded_recursion', {
        riskKind: 'unbounded_recursion',
        invariantIds: ['INV_007'],
        failureModeIds: ['FAIL_CONC_001'],
        rationale: 'Recursive function may overflow stack. INV_007 (Loop).',
        confidence: 'heuristic',
    }],
]);

// ─── Deterministic Identity Functions (v8.1) ────────────────────

/**
 * Compute a deterministic atlas entry ID from (file, line, riskKind).
 * Same file + same line + same riskKind → same receiptBitId across all runs.
 * Uses SHA-256 first 32 hex chars.
 */
function deterministicMemoryBitId(file: string, line: number, riskKind: string): string {
    const input = `${file}:${line}:${riskKind}`;
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 32);
}

/**
 * Compute a deterministic obligation ID from (file, line, riskKind).
 * Same file + same line + same riskKind → same obligation ID across all runs.
 * Uses SHA-256 first 20 hex chars, prefixed with OBL_.
 */
export function computeObligationId(file: string, line: number, riskKind: string): string {
    const input = `obl:${file}:${line}:${riskKind}`;
    return `OBL_${crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 20)}`;
}

/**
 * Compute a content-derived evidence hash for change detection.
 * Uses SHA-256 of the file's text content (truncated to first 16 hex chars).
 */
export function computeContentEvidenceHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
}

// ─── Finding → AtlasEntry ──────────────────────────────────────

/**
 * Convert a review queue item to an atlas memory entry.
 * All entries are claimStatus=draft, evidenceLevel=surface_detected.
 */
export function findingToAtlasEntry(
    finding: ReviewQueueItem,
    sessionId: string,
): AtlasEntry {
    const mapping = RISK_INVARIANT_MAP.get(finding.riskKind);

    return {
        receiptBitId: deterministicMemoryBitId(finding.file, finding.line, finding.riskKind),
        proposalId: finding.findingId,
        invariants: mapping?.invariantIds ?? [],
        transitionId: `TRANS_${finding.riskKind}`,
        sessionId,
        evidenceLevel: finding.evidenceLevel,
        claimStatus: 'draft',
        riskIds: mapping?.failureModeIds ?? [],
        limitations: [
            'surface_detected (regex scan, not AST-verified)',
            `file_context: ${finding.fileContext}`,
            `priority: ${finding.priority}`,
            `confidence: ${finding.confidence}`,
        ],
        storedAt: new Date().toISOString(),
    };
}

// ─── Memory Graph Edges ────────────────────────────────────────

/**
 * Build memory graph edges from findings and atlas entries.
 * Creates edges: finding → file (uses_invariant), file → invariant (maps_to),
 * invariant → failure_mode (blocked_by).
 */
export function buildMemoryEdges(
    findings: ReviewQueueItem[],
    entries: AtlasEntry[],
): MemoryEdge[] {
    const edges: MemoryEdge[] = [];
    const seen = new Set<string>();

    function addEdge(from: string, to: string, edgeType: MemoryEdge['edgeType']) {
        const key = `${from}:${to}:${edgeType}`;
        if (!seen.has(key)) {
            seen.add(key);
            edges.push({ from, to, edgeType });
        }
    }

    for (let i = 0; i < findings.length; i++) {
        const finding = findings[i];
        const entry = entries[i];
        if (!entry || !finding) continue;

        const mapping = RISK_INVARIANT_MAP.get(finding.riskKind);
        if (!mapping) continue;

        // Finding → file
        addEdge(entry.receiptBitId, finding.file, 'uses_invariant');

        // File → each invariant
        for (const invId of mapping.invariantIds) {
            addEdge(finding.file, invId, 'maps_to');
        }

        // Invariant → failure mode (blocked_by)
        for (const failId of mapping.failureModeIds) {
            for (const invId of mapping.invariantIds) {
                addEdge(invId, failId, 'blocked_by');
            }
        }
    }

    return edges;
}

// ─── Findings → Retrieval Candidates ──────────────────────────

export function findingsToRetrievalCandidates(
    entries: AtlasEntry[],
): RetrievalCandidate[] {
    return entries.map(e => ({
        sourceId: e.receiptBitId,
        invariants: e.invariants,
        evidenceLevel: e.evidenceLevel,
        claimStatus: e.claimStatus,
        domain: 'code' as const,
        hasReceipt: false,
        isStale: false,
        content: `Finding ${e.proposalId}: ${e.limitations.join('; ')}`,
    }));
}

// ─── Seeding ───────────────────────────────────────────────────

export interface AtlasSeedResult {
    entries: AtlasEntry[];
    edges: MemoryEdge[];
    candidates: RetrievalCandidate[];
    graph: MemoryGraph | null;
    entriesWritten: number;
    errors: string[];
}

/**
 * Seed P0/P1 findings into the Code Atlas memory system.
 * Stores atlas entries, builds memory graph edges, and prepares retrieval candidates.
 * Only P0 and P1 findings are stored (P2/P3 gated behind config).
 */
export async function seedAtlasFromFindings(
    findings: ReviewQueueItem[],
    sessionId: string,
): Promise<AtlasSeedResult> {
    // Filter to P0/P1 only at v4.0
    const priorityFindings = findings.filter(f => f.priority === 'P0' || f.priority === 'P1');

    const entries: AtlasEntry[] = [];
    const errors: string[] = [];

    for (const finding of priorityFindings) {
        try {
            const entry = findingToAtlasEntry(finding, sessionId);
            entries.push(entry);
            await storeAtlasEntry(entry);
        } catch (err) {
            errors.push(`Failed to store ${finding.findingId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    const edges = buildMemoryEdges(priorityFindings, entries);
    const candidates = findingsToRetrievalCandidates(entries);

    let graph: MemoryGraph | null = null;
    if (entries.length > 0) {
        graph = createMemoryGraph({
            transitionId: `SEED_${sessionId}`,
            crossLanguageStatus: {},
            reusePermission: 'partial',
            reason: `Memory-seeded from ${priorityFindings.length} P0/P1 audit findings.`,
            edges,
        });
    }

    return {
        entries,
        edges,
        candidates,
        graph,
        entriesWritten: entries.length - errors.length,
        errors,
    };
}

// ─── v5.0: Math Atlas Seeding ──────────────────────────────────

export interface MathAtlasEntry {
    entryId: string;
    file: string;
    representationType: string;
    modelFamilies: string[];
    invariants: string[];
    risks: string[];
    confidence: string;
    evidenceLevel: string;
    claimStatus: 'draft';
    storedAt: string;
}

export interface MathSeedResult {
    entries: MathAtlasEntry[];
    leanFiles: number;
    mathRisks: number;
}

/**
 * Seed Lean content into math-atlas advisory memory.
 * Uses T14 analyzeMath() for heuristic mathematical content detection.
 */
export function seedMathFromContent(
    artifacts: ContentArtifact[],
    sessionId: string,
): MathSeedResult {
    const leanArtifacts = artifacts.filter(a => a.language === 'lean' || a.path.endsWith('.lean'));
    const entries: MathAtlasEntry[] = [];
    let mathRisks = 0;

    for (const artifact of leanArtifacts) {
        const analysis = analyzeMath(artifact.text, artifact.path);

        if (analysis.invariantsDetected.length > 0 || analysis.risksDetected.length > 0) {
            const entryId = crypto.createHash('sha256')
                .update(`${sessionId}:math:${artifact.path}:${artifact.contentHash}`).digest('hex').slice(0, 32);

            entries.push({
                entryId,
                file: artifact.path,
                representationType: analysis.representationType,
                modelFamilies: analysis.modelFamilies,
                invariants: analysis.invariantsDetected,
                risks: analysis.risksDetected,
                confidence: analysis.confidence,
                evidenceLevel: 'surface_detected',
                claimStatus: 'draft',
                storedAt: new Date().toISOString(),
            });

            mathRisks += analysis.risksDetected.length;
        }
    }

    return {
        entries,
        leanFiles: leanArtifacts.length,
        mathRisks,
    };
}

// ─── v5.0: TLT / Language Atlas Seeding ───────────────────────

export interface LanguageAtlasEntry {
    entryId: string;
    file: string;
    semanticUnits: string[];
    ambiguityDetected: boolean;
    contentRisks: { riskId: string; name: string; severity: string }[];
    evidenceLevel: string;
    claimStatus: 'draft';
    storedAt: string;
}

export interface LanguageSeedResult {
    entries: LanguageAtlasEntry[];
    docFiles: number;
    contentRisks: number;
}

/**
 * Seed markdown/text content into TLT atlas advisory memory.
 * Uses T7 scanRisks() for claim inflation detection and
 * T13 analyzeLanguage() for semantic unit extraction.
 */
/**
 * v8.9: Transform markdown/doc artifacts into TLT graph nodes
 * using the TLT Atlas registries.
 */
export function seedTltGraphFromContent(artifacts: ContentArtifact[]): TltTransformResult {
    const inputs = artifacts.map(a => ({ path: a.path, language: a.language, text: a.text }));
    return transformToTltGraph(inputs);
}

export function seedLanguageFromContent(
    artifacts: ContentArtifact[],
): LanguageSeedResult {
    const docArtifacts = artifacts.filter(a =>
        a.language === 'markdown' || a.path.endsWith('.md') || a.path.endsWith('.txt') || a.path.endsWith('.rst')
    );
    const entries: LanguageAtlasEntry[] = [];
    let contentRisks = 0;

    for (const artifact of docArtifacts) {
        const risks = scanRisks(artifact.text, artifact.path);
        const languageResult = analyzeLanguage(artifact.text);

        if (risks.length > 0 || languageResult.semanticUnits.length > 0) {
            const entryId = crypto.createHash('sha256')
                .update(`tlt:${artifact.path}:${artifact.contentHash}`).digest('hex').slice(0, 32);

            entries.push({
                entryId,
                file: artifact.path,
                semanticUnits: languageResult.semanticUnits,
                ambiguityDetected: languageResult.ambiguityDetected,
                contentRisks: risks.map(r => ({
                    riskId: r.riskId,
                    name: r.name,
                    severity: r.severity,
                })),
                evidenceLevel: 'surface_detected',
                claimStatus: 'draft',
                storedAt: new Date().toISOString(),
            });

            contentRisks += risks.length;
        }
    }

    return {
        entries,
        docFiles: docArtifacts.length,
        contentRisks,
    };
}

// ─── v7.0: Transition + Verifier + Repair Obligation Wiring ────

/**
 * Map a riskKind to the best-fit L4 transition.
 * Returns undefined if no clear mapping exists.
 */
export function findTransitionForFinding(riskKind: string): TypedTransition | undefined {
    const map: Record<string, string> = {
        unsafe_block: 'TRANS_006',           // SafeMutation
        unsafe_function: 'TRANS_006',        // SafeMutation
        process_command: 'TRANS_013',        // InputValidation
        command_new: 'TRANS_013',            // InputValidation
        filesystem_delete_file: 'TRANS_003', // CheckedResourceLifecycle
        filesystem_delete_recursive: 'TRANS_003',
        filesystem_create: 'TRANS_003',
        filesystem_open_write: 'TRANS_003',
        panic_review_signal: 'TRANS_019',    // PanicBoundaryControl
        unwrap_review_signal: 'TRANS_004',   // TypedErrorPropagation
        expect_review_signal: 'TRANS_004',   // TypedErrorPropagation
        todo_review_signal: 'TRANS_009',     // TestBackedFunction (incomplete → needs test)
        unimplemented_review_signal: 'TRANS_009',
        filesystem_path_from_variable: 'TRANS_013', // InputValidation
        relative_traversal: 'TRANS_011',     // PointerValidityCheck (path = pointer analog)
        path_join_dynamic: 'TRANS_013',      // InputValidation
        format_path: 'TRANS_013',            // InputValidation
        unbounded_recursion: 'TRANS_018',    // ExhaustivePatternMatch (structural analog)
    };

    const transitionId = map[riskKind];
    if (!transitionId) return undefined;

    for (const t of ALL_TRANSITIONS.values()) {
        if (t.transitionId === transitionId) return t;
    }
    return undefined;
}

/**
 * Assign a verifier route based on the finding's evidence level and risk context.
 * human_review_required → manual_audit
 * needs_ast_analysis → static_analysis
 * surface_detected → unit_tested (minimum bar)
 */
export function assignVerifierForFinding(finding: ReviewQueueItem): VerifierRoute {
    // human_review_required repairability → manual audit
    if (finding.confidence === 'high' && finding.severity === 'high') {
        return getVerifierRoute('VR_AUDIT_001')!;
    }

    // needs_ast_analysis patterns → static analysis
    if (finding.confidence === 'medium' && finding.fileContext === 'src') {
        return getVerifierRoute('VR_STATIC_001')!;
    }

    // Default: minimum bar for surface-detected findings
    return getVerifierRoute('VR_UNIT_001')!;
}

export interface EnrichedFinding {
    finding: ReviewQueueItem;
    transition: TypedTransition | undefined;
    verifier: VerifierRoute;
    repairObligation?: RepairObligation;
}

/**
 * Enrich a batch of findings with transitions, verifier routes, and repair obligations.
 */
export function enrichFindings(findings: ReviewQueueItem[]): EnrichedFinding[] {
    const results: EnrichedFinding[] = [];

    for (const f of findings) {
        const transition = findTransitionForFinding(f.riskKind);
        const verifier = assignVerifierForFinding(f);

        // Create repair obligation for human_review_required findings with a transition
        let repairObligation: RepairObligation | undefined;
        const isHumanRequired = f.riskKind === 'unsafe_block' || f.riskKind === 'unsafe_function' ||
            f.riskKind === 'process_command' || f.riskKind === 'command_new' ||
            f.riskKind.includes('filesystem_') || f.riskKind === 'panic_review_signal' ||
            f.riskKind === 'relative_traversal' || f.riskKind === 'filesystem_path_from_variable';

        if (isHumanRequired && transition) {
            const obligationId = computeObligationId(f.file, f.line, f.riskKind);
            repairObligation = {
                repairId: obligationId,
                linkedReceiptId: f.findingId,
                transitionId: transition.transitionId,
                failureReason: `${f.riskKind} at ${f.file}:${f.line} requires human review — ${f.recommendedAction.substring(0, 80)}`,
                requiredAction: `Manual review required for ${f.riskKind}. Verify safety invariants and documentation.`,
                status: 'needs_human_review',
                createdAt: new Date().toISOString(),
            };
        }

        const enrichedResult: EnrichedFinding = {
            finding: f,
            transition,
            verifier,
        };
        if (repairObligation !== undefined) {
            enrichedResult.repairObligation = repairObligation;
        }
        results.push(enrichedResult);
    }

    return results;
}

// ─── v8.1: Obligation Persistence + Reconciliation ──────────────

export type ObligationLifecycleStatus = 'open' | 'under_review' | 'accepted_risk' | 'needs_repair' | 'false_positive' | 'resolved' | 'deferred';

export interface ObligationRecord {
    obligation: RepairObligation;
    finding: ReviewQueueItem;
    transition: TypedTransition | undefined;
    verifier: VerifierRoute;
    currentStatus: ObligationLifecycleStatus;
    statusHistory: { from: ObligationLifecycleStatus; to: ObligationLifecycleStatus; at: string; reason: string }[];
    closedBy: string | undefined;    // review receipt ID or evidence reference
    closedAt: string | undefined;
    contentEvidenceHash: string;     // v8.6: content hash for change detection across runs
}

export interface PersistedObligationEntry {
    obligation: RepairObligation;
    finding: ReviewQueueItem;
    transitionId: string | undefined;
    currentStatus: ObligationLifecycleStatus;
    statusHistory: { from: ObligationLifecycleStatus; to: ObligationLifecycleStatus; at: string; reason: string }[];
    closedBy: string | undefined;
    closedAt: string | undefined;
    contentEvidenceHash: string;
    file: string;
    line: number;
    riskKind: string;
}

export interface PersistedObligationStore {
    version: 'v8.1';
    lastRun: string;
    target: string;
    obligations: Record<string, PersistedObligationEntry>;
}

export interface ReconciliationResult {
    newCount: number;
    existingCount: number;
    changedCount: number;
    closedPreserved: number;
    duplicatesPrevented: number;
}

/** In-memory store for v8.1 obligation lifecycle */
const obligationStore: Map<string, ObligationRecord> = new Map();

/**
 * Persist the current obligation store to disk.
 * Writes to .cohbit/audit/v8_obligations.json in the current working directory.
 */
export async function persistObligationStore(target: string): Promise<void> {
    const dir = path.join(process.cwd(), '.cohbit', 'audit');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'v8_obligations.json');

    const persisted: Record<string, PersistedObligationEntry> = {};
    for (const [repairId, record] of obligationStore) {
        persisted[repairId] = {
            obligation: record.obligation,
            finding: record.finding,
            transitionId: record.transition?.transitionId,
            currentStatus: record.currentStatus,
            statusHistory: record.statusHistory,
            closedBy: record.closedBy,
            closedAt: record.closedAt,
            contentEvidenceHash: record.contentEvidenceHash,
            file: record.finding.file,
            line: record.finding.line,
            riskKind: record.finding.riskKind,
        };
    }

    const store: PersistedObligationStore = {
        version: 'v8.1',
        lastRun: new Date().toISOString(),
        target,
        obligations: persisted,
    };

    await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Load the obligation store from disk.
 * Returns the persisted store or null if no previous state exists.
 */
export async function loadObligationStore(): Promise<PersistedObligationStore | null> {
    const filePath = path.join(process.cwd(), '.cohbit', 'audit', 'v8_obligations.json');
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const store = JSON.parse(raw) as PersistedObligationStore;
        if (store.version !== 'v8.1') return null;
        return store;
    } catch {
        return null;
    }
}

// ─── Reconciliation Algorithm (v8.1 core) ───────────────────────

/**
 * Reconcile enriched findings with the persisted obligation store.
 *
 * Algorithm:
 *   For each enriched finding:
 *     1. Compute deterministic obligationId from (file, line, riskKind)
 *     2. If obligationId exists in previous store AND status is closed:
 *        → Preserve exactly, do not mutate. Count as closedPreserved + duplicatesPrevented.
 *     3. If obligationId exists in previous store AND content hash changed:
 *        → Re-open as under_review, update evidence. Count as changed + duplicatesPrevented.
 *     4. If obligationId exists in previous store AND content unchanged:
 *        → Carry forward existing record. Count as existing + duplicatesPrevented.
 *     5. If obligationId is new:
 *        → Create new record. Count as new.
 */
export function reconcileObligations(
    enriched: EnrichedFinding[],
    contentHashes: Map<string, string>,
    previousStore: PersistedObligationStore | null,
): { records: ObligationRecord[]; result: ReconciliationResult } {
    const result: ReconciliationResult = {
        newCount: 0,
        existingCount: 0,
        changedCount: 0,
        closedPreserved: 0,
        duplicatesPrevented: 0,
    };

    const records: ObligationRecord[] = [];

    for (const e of enriched) {
        if (!e.repairObligation) continue;

        const repairId = e.repairObligation.repairId;
        const currentContentHash = contentHashes.get(e.finding.file) ?? '';

        // Check in-memory first (within same process lifecycle)
        const existingInMemory = obligationStore.get(repairId);
        if (existingInMemory) {
            // Check if content changed since last in-memory record
            result.duplicatesPrevented++;
            result.existingCount++;
            records.push(existingInMemory);
            continue;
        }

        // Check persisted store
        const persisted = previousStore?.obligations[repairId];
        if (persisted) {
            const isClosed = persisted.currentStatus === 'resolved' || persisted.currentStatus === 'false_positive';

            if (isClosed) {
                // Closed obligation — preserve exactly
                const record: ObligationRecord = {
                    obligation: persisted.obligation,
                    finding: persisted.finding,
                    transition: e.transition,
                    verifier: e.verifier,
                    currentStatus: persisted.currentStatus,
                    statusHistory: persisted.statusHistory,
                    closedBy: persisted.closedBy,
                    closedAt: persisted.closedAt,
                    contentEvidenceHash: persisted.contentEvidenceHash,
                };
                obligationStore.set(repairId, record);
                result.closedPreserved++;
                result.duplicatesPrevented++;
                records.push(record);
            } else if (persisted.contentEvidenceHash && persisted.contentEvidenceHash !== currentContentHash && currentContentHash !== '') {
                // Content changed — re-open for re-review
                const record: ObligationRecord = {
                    obligation: e.repairObligation,
                    finding: e.finding,
                    transition: e.transition,
                    verifier: e.verifier,
                    currentStatus: 'under_review',
                    statusHistory: [
                        ...persisted.statusHistory,
                        {
                            from: persisted.currentStatus,
                            to: 'under_review',
                            at: new Date().toISOString(),
                            reason: `Content evidence changed (hash: ${currentContentHash.substring(0, 8)}...). Re-opened for re-review.`,
                        },
                    ],
                    closedBy: undefined,
                    closedAt: undefined,
                    contentEvidenceHash: currentContentHash,
                };
                obligationStore.set(repairId, record);
                result.changedCount++;
                result.duplicatesPrevented++;
                records.push(record);
            } else {
                // Same finding, same content — carry forward
                const record: ObligationRecord = {
                    obligation: persisted.obligation,
                    finding: persisted.finding,
                    transition: e.transition,
                    verifier: e.verifier,
                    currentStatus: persisted.currentStatus,
                    statusHistory: persisted.statusHistory,
                    closedBy: persisted.closedBy,
                    closedAt: persisted.closedAt,
                    contentEvidenceHash: persisted.contentEvidenceHash,
                };
                obligationStore.set(repairId, record);
                result.existingCount++;
                result.duplicatesPrevented++;
                records.push(record);
            }
        } else {
            // Genuinely new finding
            const record: ObligationRecord = {
                obligation: e.repairObligation,
                finding: e.finding,
                transition: e.transition,
                verifier: e.verifier,
                currentStatus: 'open',
                statusHistory: [{
                    from: 'open', to: 'open',
                    at: new Date().toISOString(),
                    reason: 'Created by v8.1 audit enrichment.',
                }],
                closedBy: undefined,
                closedAt: undefined,
                contentEvidenceHash: currentContentHash,
            };
            obligationStore.set(repairId, record);
            result.newCount++;
            records.push(record);
        }
    }

    return { records, result };
}

/**
 * Seed obligations from enriched findings into the lifecycle store.
 * v8.1: Delegates to reconcileObligations for dedup logic.
 * When previousStore is not passed (first run), creates all as new.
 */
export function seedObligations(enriched: EnrichedFinding[], previousStore?: PersistedObligationStore | null): ObligationRecord[] {
    const contentHashes = new Map<string, string>();
    // Build content hash map from findings (hash will be empty for first-run)
    for (const e of enriched) {
        if (!e.repairObligation) continue;
        contentHashes.set(e.finding.file, '');
    }
    const { records } = reconcileObligations(enriched, contentHashes, previousStore ?? null);
    return records;
}

/**
 * Transition an obligation to a new lifecycle status.
 * Requires a reason. Returns false if transition is invalid.
 */
export function transitionObligation(
    repairId: string,
    to: ObligationLifecycleStatus,
    reason: string,
    closedByRef?: string,
): boolean {
    const record = obligationStore.get(repairId);
    if (!record) return false;

    const from = record.currentStatus;

    // Validate transitions
    const validFrom: Record<ObligationLifecycleStatus, ObligationLifecycleStatus[]> = {
        open: ['under_review', 'deferred', 'resolved'],
        under_review: ['accepted_risk', 'needs_repair', 'false_positive', 'resolved', 'deferred'],
        accepted_risk: ['resolved', 'deferred'],
        needs_repair: ['resolved', 'deferred'],
        false_positive: ['resolved'],
        resolved: [],
        deferred: ['open', 'under_review', 'resolved'],
    };

    const allowed = validFrom[from] ?? [];
    if (!allowed.includes(to)) return false;

    record.currentStatus = to;
    record.statusHistory.push({ from, to, at: new Date().toISOString(), reason });
    if (closedByRef) record.closedBy = closedByRef;
    if (to === 'resolved') record.closedAt = new Date().toISOString();

    return true;
}

/**
 * Close an obligation with a review receipt reference.
 * Requires a decision that implies resolution.
 */
export function closeObligationWithReceipt(
    repairId: string,
    receiptId: string,
    decision: string,
): boolean {
    let status: ObligationLifecycleStatus;
    switch (decision) {
        case 'accepted_risk': status = 'accepted_risk'; break;
        case 'false_positive': status = 'false_positive'; break;
        case 'needs_repair': status = 'needs_repair'; break;
        default: return false;
    }
    return transitionObligation(repairId, status, `Closed via review receipt ${receiptId} (${decision}).`, receiptId);
}

// ─── Query Functions ───────────────────────────────────────────

export function queryObligationsByStatus(status: ObligationLifecycleStatus): ObligationRecord[] {
    return [...obligationStore.values()].filter(r => r.currentStatus === status);
}

export function queryObligationsByInvariant(invId: string): ObligationRecord[] {
    return [...obligationStore.values()].filter(r => r.finding && r.transition?.usesInvariants.includes(invId));
}

export function queryObligationsByFailureMode(failId: string): ObligationRecord[] {
    return [...obligationStore.values()].filter(r => r.finding?.riskKind && r.obligation.failureReason.includes(failId));
}

export function queryObligationsByTransition(transId: string): ObligationRecord[] {
    return [...obligationStore.values()].filter(r => r.transition?.transitionId === transId);
}

export function queryObligationsByFile(filePattern: string): ObligationRecord[] {
    return [...obligationStore.values()].filter(r => r.finding?.file.includes(filePattern));
}

export function queryObligationsByPriority(priority: string): ObligationRecord[] {
    return [...obligationStore.values()].filter(r => r.finding?.priority === priority);
}

export function getAllObligations(): ObligationRecord[] {
    return [...obligationStore.values()];
}

import { enqueueRepair } from '../packages/tooling/src/T8_repair_queue.js';

// ─── v7.2: Dashboard + Aging ───────────────────────────────────

export type StaleLevel = 'stale_high' | 'stale_medium' | 'stale_low' | 're_review_needed' | 'repair_due' | 'fresh';

export interface AgedObligation extends ObligationRecord {
    staleLevel: StaleLevel;
    daysOpen: number;
    daysSinceLastChange: number;
}

export interface ObligationDashboard {
    generatedAt: string;
    health: {
        total: number;
        open: number;
        underReview: number;
        deferred: number;
        needsRepair: number;
        acceptedRisk: number;
        falsePositive: number;
        resolved: number;
    };
    aging: {
        staleHigh: AgedObligation[];
        staleMedium: AgedObligation[];
        staleLow: AgedObligation[];
        reReviewNeeded: AgedObligation[];
        repairDue: AgedObligation[];
        fresh: AgedObligation[];
    };
    closureEvidence: {
        closedWithReceipt: number;
        closedWithoutReceipt: number;
    };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function classifyStaleness(record: ObligationRecord): { level: StaleLevel; daysOpen: number; daysSinceLastChange: number } {
    const now = Date.now();
    const createdTs = new Date(record.obligation.createdAt).getTime();
    const daysOpen = Math.floor((now - createdTs) / DAY_MS);

    // Days since last status change
    const lastChange = record.statusHistory[record.statusHistory.length - 1];
    const lastChangeTs = lastChange ? new Date(lastChange.at).getTime() : createdTs;
    const daysSinceLastChange = Math.floor((now - lastChangeTs) / DAY_MS);

    const priority = record.finding?.priority;
    const status = record.currentStatus;

    // Resolved/false_positive are fresh
    if (status === 'resolved' || status === 'false_positive') return { level: 'fresh', daysOpen, daysSinceLastChange };

    // Deferred > 30 days → re_review_needed
    if (status === 'deferred' && daysSinceLastChange > 30) return { level: 're_review_needed', daysOpen, daysSinceLastChange };

    // needs_repair > 14 days → repair_due
    if (status === 'needs_repair' && daysSinceLastChange > 14) return { level: 'repair_due', daysOpen, daysSinceLastChange };

    // P0 open > 7 days → stale_high
    if (priority === 'P0' && daysOpen > 7) return { level: 'stale_high', daysOpen, daysSinceLastChange };

    // P1 open > 14 days → stale_medium
    if (priority === 'P1' && daysOpen > 14) return { level: 'stale_medium', daysOpen, daysSinceLastChange };

    // P2/P3 open > 30 days → stale_low
    if ((priority === 'P2' || priority === 'P3') && daysOpen > 30) return { level: 'stale_low', daysOpen, daysSinceLastChange };

    return { level: 'fresh', daysOpen, daysSinceLastChange };
}

export function generateDashboard(): ObligationDashboard {
    const all = getAllObligations();
    const aged: AgedObligation[] = all.map(r => {
        const { level, daysOpen, daysSinceLastChange } = classifyStaleness(r);
        return { ...r, staleLevel: level, daysOpen, daysSinceLastChange };
    });

    const health = {
        total: aged.length,
        open: 0, underReview: 0, deferred: 0, needsRepair: 0,
        acceptedRisk: 0, falsePositive: 0, resolved: 0,
    };
    const aging = {
        staleHigh: [] as AgedObligation[], staleMedium: [] as AgedObligation[],
        staleLow: [] as AgedObligation[], reReviewNeeded: [] as AgedObligation[],
        repairDue: [] as AgedObligation[], fresh: [] as AgedObligation[],
    };
    let closedWithReceipt = 0, closedWithoutReceipt = 0;

    for (const a of aged) {
        switch (a.currentStatus) {
            case 'open': health.open++; break;
            case 'under_review': health.underReview++; break;
            case 'deferred': health.deferred++; break;
            case 'needs_repair': health.needsRepair++; break;
            case 'accepted_risk': health.acceptedRisk++; break;
            case 'false_positive': health.falsePositive++; break;
            case 'resolved': health.resolved++; break;
        }

        switch (a.staleLevel) {
            case 'stale_high': aging.staleHigh.push(a); break;
            case 'stale_medium': aging.staleMedium.push(a); break;
            case 'stale_low': aging.staleLow.push(a); break;
            case 're_review_needed': aging.reReviewNeeded.push(a); break;
            case 'repair_due': aging.repairDue.push(a); break;
            default: aging.fresh.push(a); break;
        }

        if (a.closedBy) closedWithReceipt++;
        else if (a.currentStatus === 'resolved') closedWithoutReceipt++;
    }

    return {
        generatedAt: new Date().toISOString(),
        health,
        aging,
        closureEvidence: { closedWithReceipt, closedWithoutReceipt },
    };
}

// ─── v7.3: Escalation + Review Queue Sync ──────────────────────

export type EscalationLevel = 'none' | 'watch' | 'review_required' | 'repair_due' | 'blocked' | 'escalated';

export interface EscalationRecord {
    escalationId: string;
    obligationRepairId: string;
    staleLevel: StaleLevel;
    findingFile: string;
    findingLine: number;
    riskKind: string;
    priority: string;
    daysOpen: number;
    escalatedAt: string;
    reason: string;
    level: EscalationLevel;
}

/**
 * Generate escalation records for stale or overdue obligations.
 * Maps v7.2 aging levels to escalation levels.
 */
export function escalateStaleObligations(): EscalationRecord[] {
    const dashboard = generateDashboard();
    const records: EscalationRecord[] = [];
    let counter = 0;

    const escalationMap: Record<StaleLevel, EscalationLevel> = {
        stale_high: 'escalated',
        stale_medium: 'review_required',
        stale_low: 'watch',
        re_review_needed: 'review_required',
        repair_due: 'repair_due',
        fresh: 'none',
    };

    const allAged = [
        ...dashboard.aging.staleHigh,
        ...dashboard.aging.staleMedium,
        ...dashboard.aging.staleLow,
        ...dashboard.aging.reReviewNeeded,
        ...dashboard.aging.repairDue,
    ];

    for (const aged of allAged) {
        const level = escalationMap[aged.staleLevel] ?? 'none';
        if (level === 'none') continue;

        counter++;
        records.push({
            escalationId: `ESC_${String(counter).padStart(5, '0')}`,
            obligationRepairId: aged.obligation.repairId,
            staleLevel: aged.staleLevel,
            findingFile: aged.finding.file,
            findingLine: aged.finding.line,
            riskKind: aged.finding.riskKind,
            priority: aged.finding.priority,
            daysOpen: aged.daysOpen,
            escalatedAt: new Date().toISOString(),
            reason: `Escalated: ${aged.staleLevel} — ${aged.daysOpen} days open. Priority: ${aged.finding.priority}. Risk: ${aged.finding.riskKind}.`,
            level,
        });
    }

    return records;
}

/**
 * Sync escalation records into the T8 repair queue.
 * Only escalates review_required, repair_due, and escalated levels.
 * Returns count of items enqueued.
 */
export function syncEscalationsToReviewQueue(escalations: EscalationRecord[]): number {
    let synced = 0;
    const syncable: EscalationLevel[] = ['review_required', 'repair_due', 'escalated'];

    for (const esc of escalations) {
        if (!syncable.includes(esc.level)) continue;

        try {
            enqueueRepair({
                sourceRecordId: esc.obligationRepairId,
                repairType: 'code_repair',
                problem: esc.reason,
                requiredAction: `Review escalated finding: ${esc.riskKind} at ${esc.findingFile}:${esc.findingLine}. ${esc.daysOpen} days open.`,
                priority: esc.priority === 'P0' ? 'high' : 'medium',
            });
            synced++;
        } catch {
            // enqueue may throw if duplicate
        }
    }

    return synced;
}

// ─── v8.7: Canonical Pattern Aggregation ──────────────────────

/**
 * Aggregate all current obligations into canonical patterns
 * and persist to .cohbit/atlas/canonical_patterns.json.
 * Returns summary counts for the pipeline report.
 */
export async function aggregateCanonicalPatternsFromObligations(): Promise<{ totalPatterns: number; newPatterns: number; updatedPatterns: number }> {
    const allObligations = getAllObligations();
    const existingStore = await loadCanonicalPatterns();

    const refs = allObligations.map(o => ({
        finding: { riskKind: o.finding.riskKind, file: o.finding.file },
        obligation: { repairId: o.obligation.repairId, linkedReceiptId: o.obligation.linkedReceiptId },
    }));

    const { store, newPatterns, updatedPatterns } = aggregatePatterns(refs, existingStore, RISK_INVARIANT_MAP);
    await saveCanonicalPatterns(store);

    return {
        totalPatterns: Object.keys(store.patterns).length,
        newPatterns,
        updatedPatterns,
    };
}

// ─── Report ────────────────────────────────────────────────────

export interface ObligationReport {
    generatedAt: string;
    total: number;
    byStatus: Record<string, number>;
    byTransition: Record<string, number>;
    byInvariant: Record<string, number>;
    openObligations: ObligationRecord[];
    staleObligations: ObligationRecord[];
}

export function generateObligationReport(): ObligationReport {
    const all = getAllObligations();
    const byStatus: Record<string, number> = {};
    const byTransition: Record<string, number> = {};
    const byInvariant: Record<string, number> = {};
    const staleCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

    const openObligations: ObligationRecord[] = [];
    const staleObligations: ObligationRecord[] = [];

    for (const r of all) {
        byStatus[r.currentStatus] = (byStatus[r.currentStatus] ?? 0) + 1;
        if (r.transition) {
            byTransition[r.transition.name] = (byTransition[r.transition.name] ?? 0) + 1;
        }
        if (r.transition?.usesInvariants) {
            for (const invId of r.transition.usesInvariants) {
                byInvariant[invId] = (byInvariant[invId] ?? 0) + 1;
            }
        }
        if (r.currentStatus !== 'resolved' && r.currentStatus !== 'false_positive') {
            openObligations.push(r);
            const createdAt = new Date(r.obligation.createdAt).getTime();
            if (createdAt < staleCutoff) {
                staleObligations.push(r);
            }
        }
    }

    return {
        generatedAt: new Date().toISOString(),
        total: all.length,
        byStatus,
        byTransition,
        byInvariant,
        openObligations,
        staleObligations,
    };
}
