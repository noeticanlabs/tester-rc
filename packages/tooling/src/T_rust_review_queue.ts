// @cohbit/tooling — T Rust Review Queue (v3.2)
// Triage calibrated Rust risk findings into an actionable review queue.
// Assigns P0-P3 priorities based on severity × confidence × context.
//
// Operating law:
//   Priority is a review signal, not a certification of defect.
//   P0 means "review first," not "this is definitely broken."
//   The queue is sorted by signal strength for practitioner utility.
//
// v8.1: Deterministic finding keys.
//   findingId = hex(sha256("file:line:riskKind"))[0:16]
//   Same file, same line, same riskKind → same findingId across runs.

import * as crypto from 'node:crypto';
import type { CodeRiskFinding, RustEvidenceLevel } from './T_rust_risk_scanner.js';
import type { EnrichedFinding, GuardInfo } from './T_rust_finding_enricher.js';

// ─── Types ─────────────────────────────────────────────────────

export type ReviewPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ReviewQueueItem {
    findingId: string;
    file: string;
    line: number;
    riskKind: string;
    severity: CodeRiskFinding['severity'];
    confidence: CodeRiskFinding['confidence'];
    fileContext: CodeRiskFinding['fileContext'];
    priority: ReviewPriority;
    reason: string;
    recommendedAction: string;
    pattern: string;
    matchedText: string;
    evidenceLevel: RustEvidenceLevel;

    // v3.3: Enriched context (populated when enrichment is available)
    functionName?: string | null;
    moduleName?: string | null;
    implContext?: string | null;
    isPublic?: boolean;
    isTestFunction?: boolean;
    isUnsafeFunction?: boolean;
    returnType?: string | null;
    codeWindow?: string[];
    nearbyGuards?: GuardInfo[];
    evidenceNotes?: string[];
    falsePositiveNotes?: string[];
    recommendedInspection?: string[];
    suggestedEvidence?: string[];

    // v3.6: Boundary status fields
    claimStatus?: 'draft' | 'review_signal' | 'verified';
    mutationStatus?: 'none' | 'proposed' | 'refused';
    proposalStatus?: 'not_applicable' | 'generated' | 'gate_ready' | 'applied';
    commitStatus?: 'not_applicable' | 'pending_review' | 'committed';
}

export interface ReviewQueue {
    queueId: string;
    createdAt: string;
    items: ReviewQueueItem[];
    summary: {
        P0: number;
        P1: number;
        P2: number;
        P3: number;
        total: number;
    };
}

// ─── Priority Assignment ───────────────────────────────────────

function assignPriority(f: CodeRiskFinding): { priority: ReviewPriority; reason: string } {
    const isProduction = f.fileContext === 'src' || f.fileContext === 'example';
    const isTest = f.fileContext === 'test' || f.fileContext === 'fixture';

    // P0: high severity + high confidence + production
    if (f.severity === 'high' && f.confidence === 'high' && isProduction) {
        return {
            priority: 'P0',
            reason: 'High-severity, high-confidence finding in production code. Review immediately.',
        };
    }

    // P1a: high severity + medium confidence (any context)
    if (f.severity === 'high' && f.confidence === 'medium') {
        const ctx = isProduction ? 'production' : isTest ? 'test' : 'other';
        return {
            priority: 'P1',
            reason: `High-severity finding with medium confidence in ${ctx} context. Review at next opportunity.`,
        };
    }

    // P1b: medium severity + high confidence + production
    if (f.severity === 'medium' && f.confidence === 'high' && isProduction) {
        return {
            priority: 'P1',
            reason: 'Medium-severity, high-confidence finding in production code. Review at next cadence.',
        };
    }

    // P2a: high severity in test files (even high confidence — test panics are expected)
    if (f.severity === 'high' && isTest) {
        return {
            priority: 'P2',
            reason: 'High-severity finding in test code. Verify intentional panics/safety patterns.',
        };
    }

    // P2b: medium severity + medium confidence (any context)
    if (f.severity === 'medium' && f.confidence === 'medium') {
        return {
            priority: 'P2',
            reason: 'Medium-severity, medium-confidence finding. Review during regular maintenance.',
        };
    }

    // P2c: high severity + low confidence (weird pattern, check it)
    if (f.severity === 'high' && f.confidence === 'low') {
        return {
            priority: 'P2',
            reason: 'High-severity but low-confidence finding. Worth checking, may be false positive.',
        };
    }

    // P3: low confidence signals, expected test patterns, low-severity anything
    return {
        priority: 'P3',
        reason: isTest
            ? 'Low-confidence or expected pattern in test code. Normal test assertions.'
            : 'Low-confidence or low-severity review signal. Review if bandwidth permits.',
    };
}

function recommendedAction(f: CodeRiskFinding): string {
    const actions: Record<string, string> = {
        unsafe_block: 'Verify safety invariants are documented and manually enforced around this unsafe block.',
        unsafe_function: 'Review unsafe function preconditions. Ensure caller documentation explains safety requirements.',
        process_command: 'Verify command arguments are sanitized and not derived from untrusted input.',
        command_new: 'Verify no unsanitized user input reaches Command::new().',
        filesystem_delete_file: 'Verify the deleted path is scoped within project boundaries.',
        filesystem_delete_recursive: 'CRITICAL: Verify remove_dir_all target is tightly bounded and validated.',
        filesystem_create: 'Verify File::create path is scoped and overwrite is intentional.',
        filesystem_open_write: 'Verify OpenOptions write/append path is safe.',
        filesystem_path_from_variable: 'Verify the variable path source is validated before reaching the filesystem call.',
        relative_traversal: 'Verify path traversal is bounded. Ensure no external input controls the traversal depth.',
        path_join_dynamic: 'Verify dynamic path input is validated and scoped.',
        unwrap_review_signal: 'Consider Result/Option propagation or proper error handling instead of unwrap.',
        expect_review_signal: 'Verify the expectation message justifies why this cannot fail.',
        panic_review_signal: 'Verify this panic is intentional and unrecoverable. Consider graceful error handling.',
        todo_review_signal: 'Complete implementation or add tracking issue reference.',
        unimplemented_review_signal: 'Add implementation or roadmap reference for this planned feature.',
        format_path: 'Prefer Path::join() over format!() for cross-platform path construction.',
        path_join_literal: 'This is typically benign. Verify if Path::join() would be more maintainable.',
        unbounded_recursion: 'Verify recursion depth is bounded and terminates.',
    };
    return actions[f.riskKind] ?? 'Review finding in context. Verify pattern is intentional and safe.';
}

// ─── Deterministic Finding Identity ─────────────────────────────

/**
 * Compute a deterministic finding key from (file, line, riskKind).
 * Same file + same line + same riskKind → same key across all runs.
 * Uses SHA-256 first 16 hex chars.
 */
export function computeDeterministicFindingKey(file: string, line: number, riskKind: string): string {
    const input = `${file}:${line}:${riskKind}`;
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 16);
}

// ─── Queue Builder ─────────────────────────────────────────────

let queueCounter = 0;

/**
 * Build a prioritized review queue from calibrated Rust risk findings.
 * Sorts by: priority (P0 first), then severity, then confidence, then file path.
 *
 * v8.1: findingId is now deterministic from (file, line, riskKind).
 * Sequential index is a sort tiebreaker only, not identity.
 */
export function buildReviewQueue(findings: CodeRiskFinding[]): ReviewQueue {
    queueCounter += 1;

    const items: ReviewQueueItem[] = findings.map((f) => {
        const { priority, reason } = assignPriority(f);
        return {
            findingId: computeDeterministicFindingKey(f.file, f.line, f.riskKind),
            file: f.file,
            line: f.line,
            riskKind: f.riskKind,
            severity: f.severity,
            confidence: f.confidence,
            fileContext: f.fileContext,
            priority,
            reason,
            recommendedAction: recommendedAction(f),
            pattern: f.pattern,
            matchedText: f.matchedText,
            evidenceLevel: 'surface_detected',
        };
    });

    // Sort: P0 → P1 → P2 → P3, then high → medium → low severity, then high → medium → low confidence, then file
    const priorityOrder: Record<ReviewPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    items.sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        const sDiff = severityOrder[a.severity]! - severityOrder[b.severity]!;
        if (sDiff !== 0) return sDiff;
        const cDiff = confidenceOrder[a.confidence]! - confidenceOrder[b.confidence]!;
        if (cDiff !== 0) return cDiff;
        return a.file.localeCompare(b.file) || a.line - b.line;
    });

    const summary = { P0: 0, P1: 0, P2: 0, P3: 0, total: items.length };
    for (const item of items) {
        const p = item.priority;
        if (p === 'P0') summary.P0++;
        else if (p === 'P1') summary.P1++;
        else if (p === 'P2') summary.P2++;
        else if (p === 'P3') summary.P3++;
    }

    return {
        queueId: `QUEUE_${String(queueCounter).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        items,
        summary,
    };
}

/**
 * Get top N findings by priority (P0 first), optionally filtered to production only.
 */
export function topFindings(queue: ReviewQueue, n: number, productionOnly = false): ReviewQueueItem[] {
    let filtered = queue.items;
    if (productionOnly) {
        filtered = filtered.filter(f => f.fileContext === 'src' || f.fileContext === 'example');
    }
    return filtered.slice(0, n);
}

/**
 * Get items at a specific priority level.
 */
export function findingsByPriority(queue: ReviewQueue, priority: ReviewPriority): ReviewQueueItem[] {
    return queue.items.filter(f => f.priority === priority);
}

/**
 * Emit the review queue as JSON (machine-readable).
 */
export function reviewQueueToJson(queue: ReviewQueue): string {
    return JSON.stringify(queue, null, 2);
}

// ─── v3.3: Enriched Review Queue Builder ────────────────────────

/**
 * Build a prioritized review queue from enriched findings.
 * Includes all evidence annotations, code windows, guard info,
 * and boundary status fields.
 *
 * v3.3: Accepts EnrichedFinding[] for full evidence-rich output.
 * Falls back to CodeRiskFinding[] for backward compatibility.
 */
export function buildEnrichedReviewQueue(findings: EnrichedFinding[]): ReviewQueue {
    queueCounter += 1;

    const items: ReviewQueueItem[] = findings.map((f) => {
        const { priority, reason } = assignPriority({
            file: f.file,
            line: f.line,
            pattern: f.pattern,
            riskKind: f.riskKind,
            severity: f.severity,
            confidence: f.confidence,
            fileContext: f.fileContext,
            evidenceLevel: f.evidenceLevel,
            recommendation: f.recommendation,
            matchedText: f.matchedText,
        });
        return {
            findingId: computeDeterministicFindingKey(f.file, f.line, f.riskKind),
            file: f.file,
            line: f.line,
            riskKind: f.riskKind,
            severity: f.severity,
            confidence: f.confidence,
            fileContext: f.fileContext,
            priority,
            reason,
            recommendedAction: recommendedAction({ file: f.file, line: f.line, pattern: f.pattern, riskKind: f.riskKind, severity: f.severity, confidence: f.confidence, fileContext: f.fileContext, evidenceLevel: f.evidenceLevel, recommendation: f.recommendation, matchedText: f.matchedText }),
            pattern: f.pattern,
            matchedText: f.matchedText,
            evidenceLevel: f.evidenceLevel,

            // v3.3: Enriched context
            functionName: f.functionName,
            moduleName: f.moduleName,
            implContext: f.implContext,
            isPublic: f.isPublic,
            isTestFunction: f.isTestFunction,
            isUnsafeFunction: f.isUnsafeFunction,
            returnType: f.returnType,
            codeWindow: f.codeWindow,
            nearbyGuards: f.nearbyGuards,
            evidenceNotes: f.evidenceNotes,
            falsePositiveNotes: f.falsePositiveNotes,
            recommendedInspection: f.recommendedInspection,
            suggestedEvidence: f.suggestedEvidence,

            // v3.6: Boundary status
            claimStatus: 'review_signal',
            mutationStatus: 'none',
            proposalStatus: 'not_applicable',
            commitStatus: 'not_applicable',
        };
    });

    // Sort: P0 → P1 → P2 → P3, then high → medium → low severity, then confidence, then file
    const priorityOrder: Record<ReviewPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    items.sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        const sDiff = severityOrder[a.severity]! - severityOrder[b.severity]!;
        if (sDiff !== 0) return sDiff;
        const cDiff = confidenceOrder[a.confidence]! - confidenceOrder[b.confidence]!;
        if (cDiff !== 0) return cDiff;
        return a.file.localeCompare(b.file) || a.line - b.line;
    });

    const summary = { P0: 0, P1: 0, P2: 0, P3: 0, total: items.length };
    for (const item of items) {
        const p = item.priority;
        if (p === 'P0') summary.P0++;
        else if (p === 'P1') summary.P1++;
        else if (p === 'P2') summary.P2++;
        else if (p === 'P3') summary.P3++;
    }

    return {
        queueId: `QUEUE_${String(queueCounter).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        items,
        summary,
    };
}

/**
 * Emit a human-readable summary of the review queue.
 */
export function reviewQueueSummary(queue: ReviewQueue): string[] {
    const lines: string[] = [];
    lines.push(`Review Queue: ${queue.summary.total} items`);
    lines.push(`  P0 (immediate): ${queue.summary.P0}`);
    lines.push(`  P1 (next):      ${queue.summary.P1}`);
    lines.push(`  P2 (regular):   ${queue.summary.P2}`);
    lines.push(`  P3 (low):       ${queue.summary.P3}`);

    if (queue.summary.P0 > 0) {
        lines.push('');
        lines.push('Top P0 findings:');
        const p0s = findingsByPriority(queue, 'P0').slice(0, 10);
        for (const f of p0s) {
            lines.push(`  ${f.file}:${f.line} — ${f.riskKind} — ${f.reason}`);
        }
    }

    return lines;
}