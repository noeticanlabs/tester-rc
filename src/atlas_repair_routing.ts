// CohBit-Copilot Atlas Repair Routing (v4.1)
// Classifies atlas memory entries into repairability routes.
// Does not generate, authorize, apply, or commit any repair.
//
// Operating law:
//   Repair routing may classify atlas memory into possible next actions.
//   It may not generate, authorize, apply, verify, promote, or commit a repair.

import type { AtlasEntry } from '../packages/code-atlas/src/store.js';
import type { ReviewQueueItem } from '../packages/tooling/src/T_rust_review_queue.js';
import type { PatchPrimitive } from './types.js';

// ─── Types ─────────────────────────────────────────────────────

export type RepairabilityClass =
    | 'human_review_required'
    | 'bounded_patch_candidate'
    | 'needs_ast_analysis'
    | 'needs_verification_evidence'
    | 'diagnostic_only';

export interface AtlasRepairRoute {
    entryId: string;
    findingId: string;
    file: string;
    line: number;
    riskKind: string;
    fileContext: string;
    invariantIds: string[];
    failureModeIds: string[];
    repairability: RepairabilityClass;
    suggestedPrimitive?: PatchPrimitive;
    requiredEvidence: string[];
    reason: string;
    mayGenerateProposal: boolean;
}

// ─── Versioned Routing Map ────────────────────────────────────

export const REPAIR_ROUTE_MAP_VERSION = 'v4.1.0';

interface RepairRouteRule {
    riskKind: string;
    repairability: RepairabilityClass;
    requiredEvidence: string[];
    reason: string;
    mayGenerateProposal: boolean;
}

/**
 * Base routing rules by riskKind.
 * Context (test vs production) may override repairability at route time.
 * All routes have mayGenerateProposal=false at v4.1.
 */
const BASE_ROUTES: Record<string, Omit<RepairRouteRule, 'riskKind'>> = {
    unsafe_block: {
        repairability: 'human_review_required',
        requiredEvidence: ['Safety invariant documentation', 'Manual review sign-off'],
        reason: 'Unsafe blocks bypass Rust safety guarantees. No automatic repair is safe.',
        mayGenerateProposal: false,
    },
    unsafe_function: {
        repairability: 'human_review_required',
        requiredEvidence: ['Safety precondition documentation', 'Caller audit'],
        reason: 'Unsafe functions require caller-side safety analysis. No automatic repair.',
        mayGenerateProposal: false,
    },
    panic_review_signal: {
        repairability: 'human_review_required',  // overridden to diagnostic_only for test context
        requiredEvidence: ['Panic boundary review', 'Recoverability assessment'],
        reason: 'panic! terminates the process. Requires human judgment on recoverability.',
        mayGenerateProposal: false,
    },
    todo_review_signal: {
        repairability: 'needs_verification_evidence',
        requiredEvidence: ['Completion specification', 'Tracking issue reference'],
        reason: 'Unfinished code requires specification of intended behavior before any repair.',
        mayGenerateProposal: false,
    },
    unimplemented_review_signal: {
        repairability: 'needs_verification_evidence',
        requiredEvidence: ['Implementation specification', 'Design document'],
        reason: 'Planned but unwritten code needs design specification before repair.',
        mayGenerateProposal: false,
    },
    process_command: {
        repairability: 'human_review_required',
        requiredEvidence: ['Command whitelist audit', 'Input sanitization review'],
        reason: 'External process execution is a trust boundary. Requires human security review.',
        mayGenerateProposal: false,
    },
    command_new: {
        repairability: 'human_review_required',
        requiredEvidence: ['Command source audit', 'Argument sanitization review'],
        reason: 'Command construction requires review of input sources. No automatic repair.',
        mayGenerateProposal: false,
    },
    filesystem_delete_file: {
        repairability: 'human_review_required',
        requiredEvidence: ['Path scoping audit', 'Deletion safety review'],
        reason: 'File deletion requires path validation and safety review. No automatic repair.',
        mayGenerateProposal: false,
    },
    filesystem_delete_recursive: {
        repairability: 'human_review_required',
        requiredEvidence: ['Path scoping audit', 'Blast radius assessment'],
        reason: 'Recursive directory deletion has high blast radius. Requires human review.',
        mayGenerateProposal: false,
    },
    filesystem_create: {
        repairability: 'human_review_required',
        requiredEvidence: ['Path scoping audit', 'Overwrite safety review'],
        reason: 'File::create may overwrite. Path must be validated by a human.',
        mayGenerateProposal: false,
    },
    filesystem_open_write: {
        repairability: 'human_review_required',
        requiredEvidence: ['Path scoping audit', 'Write safety review'],
        reason: 'OpenOptions write/append requires path validation. Human review needed.',
        mayGenerateProposal: false,
    },
    filesystem_path_from_variable: {
        repairability: 'human_review_required',
        requiredEvidence: ['Variable source audit', 'Path injection analysis'],
        reason: 'Filesystem operation on variable path is an injection risk. Requires human review.',
        mayGenerateProposal: false,
    },
    relative_traversal: {
        repairability: 'human_review_required',
        requiredEvidence: ['Path boundary audit', 'Sandbox escape analysis'],
        reason: 'Relative traversal may escape intended directory scope. Security review required.',
        mayGenerateProposal: false,
    },
    unwrap_review_signal: {
        repairability: 'needs_ast_analysis',  // overridden to diagnostic_only for test
        requiredEvidence: ['AST structural analysis', 'Error propagation feasibility check'],
        reason: 'unwrap() removal requires understanding surrounding error flow. AST analysis needed first.',
        mayGenerateProposal: false,
    },
    expect_review_signal: {
        repairability: 'needs_ast_analysis',  // overridden to diagnostic_only for test
        requiredEvidence: ['AST structural analysis', 'Expectation message review'],
        reason: 'expect() assessment requires understanding the error context. AST analysis needed.',
        mayGenerateProposal: false,
    },
    path_join_dynamic: {
        repairability: 'needs_ast_analysis',
        requiredEvidence: ['Path construction audit', 'Input source trace'],
        reason: 'Dynamic path join needs input source analysis before any repair can be proposed.',
        mayGenerateProposal: false,
    },
    format_path: {
        repairability: 'needs_ast_analysis',
        requiredEvidence: ['Path construction audit'],
        reason: 'format!() path construction needs structural analysis before recommending Path::join().',
        mayGenerateProposal: false,
    },
    path_join_literal: {
        repairability: 'diagnostic_only',
        requiredEvidence: [],
        reason: 'Literal path is typically benign. No repair action needed.',
        mayGenerateProposal: false,
    },
    unbounded_recursion: {
        repairability: 'needs_ast_analysis',
        requiredEvidence: ['Recursion depth analysis', 'Termination proof or bound'],
        reason: 'Recursion requires termination analysis. AST inspection needed before any change.',
        mayGenerateProposal: false,
    },
};

// ─── Routing Function ──────────────────────────────────────────

/**
 * Route an atlas memory entry to its repairability class.
 * Context-aware: test-file findings are demoted to diagnostic_only.
 *
 * @param entry - The stored atlas entry
 * @param finding - The original review queue finding (for context)
 * @returns AtlasRepairRoute with repairability classification
 */
export function routeToRepair(
    entry: AtlasEntry,
    finding: ReviewQueueItem,
): AtlasRepairRoute {
    const base = BASE_ROUTES[finding.riskKind];
    const isTest = finding.fileContext === 'test' || finding.fileContext === 'fixture';

    let repairability: RepairabilityClass;
    let reason: string;

    if (base) {
        // Test-context: downgrade panic, unwrap, expect to diagnostic_only
        if (isTest && (
            finding.riskKind === 'panic_review_signal' ||
            finding.riskKind === 'unwrap_review_signal' ||
            finding.riskKind === 'expect_review_signal' ||
            finding.riskKind === 'path_join_literal'
        )) {
            repairability = 'diagnostic_only';
            reason = `Test-file ${finding.riskKind}. Expected pattern — no repair needed.`;
        } else {
            repairability = base.repairability;
            reason = base.reason;
        }
    } else {
        repairability = 'needs_ast_analysis';
        reason = `Unknown riskKind '${finding.riskKind}'. Requires structural analysis before classification.`;
    }

    return {
        entryId: entry.receiptBitId,
        findingId: finding.findingId,
        file: finding.file,
        line: finding.line,
        riskKind: finding.riskKind,
        fileContext: finding.fileContext,
        invariantIds: entry.invariants,
        failureModeIds: entry.riskIds,
        repairability,
        requiredEvidence: base?.requiredEvidence ?? ['Unknown — requires investigation'],
        reason,
        mayGenerateProposal: false, // always false at v4.1
    };
}

/**
 * Route all atlas entries to repair routes.
 */
export function routeAllToRepair(
    entries: AtlasEntry[],
    findings: ReviewQueueItem[],
): AtlasRepairRoute[] {
    const routes: AtlasRepairRoute[] = [];
    for (let i = 0; i < Math.min(entries.length, findings.length); i++) {
        const entry = entries[i];
        const finding = findings[i];
        if (!entry || !finding) continue;
        routes.push(routeToRepair(entry, finding));
    }
    return routes;
}