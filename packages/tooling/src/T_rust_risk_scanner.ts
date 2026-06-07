// @cohbit/tooling — T Rust Content Risk Scanner (v3.1)
// Regex-based Rust code content risk detection with calibrated confidence.
// Distinguishes test from production context, assigns confidence per finding,
// and refines path-risk patterns into specific categories.
//
// Operating law:
//   A regex match is a review signal, not a defect certification.
//   `unwrap()` is not automatically a bug — it is a request for review.
//   Test-file findings are expected patterns, not production risks.
//   Low-confidence findings are weaker signals, not false positives.
//   This scanner does not parse the Rust AST; it performs pattern matching only.

import type { ContentArtifact } from './T_content_reader.js';

// ─── Types ─────────────────────────────────────────────────────

export type RustEvidenceLevel = 'surface_detected' | 'syntax_checked';
export type CodeRiskSeverity = 'low' | 'medium' | 'high';
export type FindingConfidence = 'high' | 'medium' | 'low';
export type FileContext = 'test' | 'src' | 'example' | 'fixture' | 'generated' | 'docs' | 'benchmark' | 'unknown';

export interface CodeRiskFinding {
    file: string;
    line: number;
    column?: number;
    pattern: string;
    riskKind: string;
    severity: CodeRiskSeverity;
    confidence: FindingConfidence;
    fileContext: FileContext;
    evidenceLevel: RustEvidenceLevel;
    recommendation: string;
    matchedText: string;
}

export interface RustRiskScanSummary {
    // Legacy counts (backward compatible)
    unwrapExpect: number;
    panicTodo: number;
    unsafeBlocks: number;
    filesystemWrites: number;
    processCommands: number;
    stringPathJoins: number;
    // v3.1: severity × confidence matrix
    bySeverityAndConfidence: {
        highHigh: number;
        highMedium: number;
        highLow: number;
        mediumHigh: number;
        mediumMedium: number;
        mediumLow: number;
        lowHigh: number;
        lowMedium: number;
        lowLow: number;
    };
    // v3.1: context breakdown
    productionFindings: number;
    testFindings: number;
    benchmarkFindings: number;
    unknownContextFindings: number;
    // v3.1: path-risk sub-breakdown
    pathJoinDynamic: number;
    pathRelativeTraversal: number;
    pathFilesystemFromVariable: number;
    pathLowConfidenceLiteral: number;
    total: number;
}

export interface RustRiskScanResult {
    findings: CodeRiskFinding[];
    summary: RustRiskScanSummary;
    filesScanned: number;
    filesWithFindings: number;
    evidenceLevel: RustEvidenceLevel;
    scannedAt: string;
}

// ─── File Context Classifier ───────────────────────────────────

function classifyFileContext(filePath: string): FileContext {
    const lower = filePath.toLowerCase();
    if (lower.includes('/tests/') || lower.includes('\\tests\\') ||
        lower.includes('/__tests__/') || lower.includes('\\__tests__\\') ||
        lower.endsWith('_test.rs') || lower.startsWith('test_')) {
        return 'test';
    }
    if (lower.includes('/examples/') || lower.includes('\\examples\\')) {
        return 'example';
    }
    if (lower.includes('/fixtures/') || lower.includes('\\fixtures\\') ||
        lower.includes('/test_fixtures/') || lower.includes('\\test_fixtures\\')) {
        return 'fixture';
    }
    if (lower.includes('/generated/') || lower.includes('\\generated\\') ||
        lower.includes('/target/') || lower.includes('\\target\\')) {
        return 'generated';
    }
    if (lower.includes('/docs/') || lower.includes('\\docs\\') ||
        lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.rst')) {
        return 'docs';
    }
    if (lower.includes('/benches/') || lower.includes('\\benches\\') ||
        lower.includes('_benchmark') || lower.includes('benchmark_') ||
        lower.endsWith('_bench.rs')) {
        return 'benchmark';
    }
    if (lower.startsWith('src/') || lower.startsWith('src\\') ||
        lower.includes('/src/') || lower.includes('\\src\\') ||
        lower.includes('/crates/') || lower.includes('\\crates\\')) {
        return 'src';
    }
    return 'unknown';
}

// ─── Confidence assignment per risk kind ───────────────────────

const BASE_CONFIDENCE: Record<string, FindingConfidence> = {
    unsafe_block: 'high',
    unsafe_function: 'high',
    process_command: 'high',
    command_new: 'high',
    filesystem_delete_file: 'high',
    filesystem_delete_recursive: 'high',
    filesystem_create: 'medium',
    filesystem_open_write: 'medium',
    filesystem_write_method: 'low',
    unwrap_review_signal: 'medium',
    expect_review_signal: 'medium',
    panic_review_signal: 'medium',
    todo_review_signal: 'high',
    unimplemented_review_signal: 'high',
    path_join_literal: 'low',
    path_join_dynamic: 'medium',
    format_path: 'medium',
    relative_traversal: 'high',
    filesystem_path_from_variable: 'high',
    unbounded_recursion: 'low',
};

// ─── Risk Patterns ─────────────────────────────────────────────

interface RustRiskPattern {
    riskKind: string;
    severity: CodeRiskSeverity;
    regex: RegExp;
    recommendation: string;
}

const RUST_RISK_PATTERNS: RustRiskPattern[] = [
    // ── unwrap/expect review signals ──────────────────────────
    {
        riskKind: 'unwrap_review_signal',
        severity: 'medium',
        regex: /(?<!\/\/.*)\.unwrap\s*\(/g,
        recommendation: 'Review: .unwrap() panics on None/Err. Consider Result/Option propagation or proper error handling.',
    },
    {
        riskKind: 'expect_review_signal',
        severity: 'medium',
        regex: /(?<!\/\/.*)\.expect\s*\(/g,
        recommendation: 'Review: .expect() panics on None/Err. Verify the expectation message documents why this cannot fail.',
    },

    // ── panic/todo/unimplemented ──────────────────────────────
    {
        riskKind: 'panic_review_signal',
        severity: 'high',
        regex: /(?<!\/\/.*)panic!\s*[\(m]/g,
        recommendation: 'Review: panic!() terminates the process. Verify this is intended as an unrecoverable state.',
    },
    {
        riskKind: 'todo_review_signal',
        severity: 'medium',
        regex: /(?<!\/\/.*)todo!\s*\(/g,
        recommendation: 'Review: todo!() marks unfinished code. Complete implementation or add tracking issue reference.',
    },
    {
        riskKind: 'unimplemented_review_signal',
        severity: 'medium',
        regex: /(?<!\/\/.*)unimplemented!\s*\(/g,
        recommendation: 'Review: unimplemented!() marks planned but unwritten code. Add implementation or roadmap reference.',
    },

    // ── unsafe blocks ────────────────────────────────────────
    {
        riskKind: 'unsafe_block',
        severity: 'high',
        regex: /unsafe\s*\{/g,
        recommendation: 'Review: unsafe block bypasses Rust safety guarantees. Verify invariants are documented and manually enforced.',
    },
    {
        riskKind: 'unsafe_function',
        severity: 'high',
        regex: /unsafe\s+fn\b/g,
        recommendation: 'Review: unsafe function requires caller to uphold safety invariants. Verify documentation explains preconditions.',
    },

    // ── process / command execution ───────────────────────────
    {
        riskKind: 'process_command',
        severity: 'high',
        regex: /std::process::Command\b/g,
        recommendation: 'Review: std::process::Command spawns external processes. Verify input sanitization and command whitelisting.',
    },
    {
        riskKind: 'command_new',
        severity: 'high',
        regex: /Command::new\s*\(/g,
        recommendation: 'Review: Command::new() creates external process. Verify no unsanitized user input reaches the command.',
    },

    // ── filesystem mutation ───────────────────────────────────
    {
        riskKind: 'filesystem_delete_file',
        severity: 'high',
        regex: /fs::remove_file\s*\(/g,
        recommendation: 'Review: fs::remove_file deletes a file. Verify path is not derived from unsanitized input.',
    },
    {
        riskKind: 'filesystem_delete_recursive',
        severity: 'high',
        regex: /fs::remove_dir_all\s*\(/g,
        recommendation: 'CRITICAL: fs::remove_dir_all recursively deletes directories. Verify path is tightly scoped and validated.',
    },
    {
        riskKind: 'filesystem_create',
        severity: 'medium',
        regex: /File::create\s*\(/g,
        recommendation: 'Review: File::create overwrites existing files. Verify path is scoped and truncation is intended.',
    },
    {
        riskKind: 'filesystem_open_write',
        severity: 'medium',
        regex: /OpenOptions::new\(\)\s*\.(?:write|append)\s*\(/g,
        recommendation: 'Review: OpenOptions with write/append mutates filesystem. Verify path safety.',
    },

    // ── v3.1: Refined path-risk patterns ──────────────────────
    {
        riskKind: 'relative_traversal',
        severity: 'high',
        regex: /\.\.\//g,
        recommendation: 'Review: Relative path traversal (../) detected. Verify path is bounded and not controlled by external input.',
    },
    {
        riskKind: 'filesystem_path_from_variable',
        severity: 'high',
        regex: /(?:(?:fs::write|fs::read|File::create|File::open|fs::remove_file|fs::remove_dir_all)\s*\(\s*(?!["'])[^,)]+)/g,
        recommendation: 'CRITICAL: Filesystem operation uses variable (non-literal) path. Verify variable is tightly scoped and validated.',
    },
    {
        riskKind: 'path_join_dynamic',
        severity: 'medium',
        regex: /\.join\s*\(\s*(?!["'])|Path::new\s*\(\s*(?!["'])|PathBuf::from\s*\(\s*(?!["'])/g,
        recommendation: 'Review: Path constructed from dynamic (non-literal) input. Verify input validation and path scoping.',
    },
    {
        riskKind: 'format_path',
        severity: 'low',
        regex: /format!\s*\([^,]*({[^}]*}\/)|format!\s*\([^,]*(:\/[^,]*})/g,
        recommendation: 'Note: format!() used for path construction. Prefer Path::join() for cross-platform correctness.',
    },
    {
        riskKind: 'path_join_literal',
        severity: 'low',
        regex: /"(?:\.\/|[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.\/]+)"/g,
        recommendation: 'Note: String literal path detected. This is typically benign but verify it would not benefit from Path::join().',
    },
];

// ─── Scanner Implementation ────────────────────────────────────

let scanCounter = 0;

function lineNumberFromIndex(text: string, index: number): number {
    let lineCount = 1;
    for (let i = 0; i < index; i++) {
        if (text[i] === '\n') lineCount++;
    }
    return lineCount;
}

function matchedSnippet(text: string, index: number, matchLength: number): string {
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + matchLength + 60);
    let snippet = text.substring(start, end);
    snippet = snippet.replace(/\s+/g, ' ').trim();
    if (snippet.length > 120) snippet = snippet.substring(0, 117) + '...';
    return snippet;
}

function isProductionContext(ctx: FileContext): boolean {
    return ctx === 'src' || ctx === 'example';
}

function isTestContext(ctx: FileContext): boolean {
    return ctx === 'test' || ctx === 'fixture';
}

/**
 * Adjust confidence based on file context.
 * Test-file unwrap/expect/panic are downgraded to low confidence
 * because these patterns are expected in test code.
 */
function contextAdjustedConfidence(riskKind: string, fileContext: FileContext, baseConfidence: FindingConfidence): FindingConfidence {
    // unwrap/expect in test/fixture files → expected, downgrade confidence
    if (isTestContext(fileContext) &&
        (riskKind === 'unwrap_review_signal' || riskKind === 'expect_review_signal' || riskKind === 'panic_review_signal')) {
        return 'low';
    }
    // In prod context, baseline confidence applies
    return baseConfidence;
}

export function scanRustContent(
    artifact: ContentArtifact,
): CodeRiskFinding[] {
    const findings: CodeRiskFinding[] = [];
    const { path: file, text } = artifact;

    if (!file.endsWith('.rs')) return findings;

    const fileContext = classifyFileContext(file);

    for (const pattern of RUST_RISK_PATTERNS) {
        pattern.regex.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(text)) !== null) {
            const line = lineNumberFromIndex(text, match.index);
            const snippet = matchedSnippet(text, match.index, match[0].length);
            const baseConfidence = BASE_CONFIDENCE[pattern.riskKind] ?? 'medium';
            const confidence = contextAdjustedConfidence(pattern.riskKind, fileContext, baseConfidence);

            findings.push({
                file,
                line,
                pattern: match[0].trim(),
                riskKind: pattern.riskKind,
                severity: pattern.severity,
                confidence,
                fileContext,
                evidenceLevel: 'surface_detected',
                recommendation: pattern.recommendation,
                matchedText: snippet,
            });
        }
    }

    return findings;
}

export function scanRustContentBatch(
    artifacts: ContentArtifact[],
): RustRiskScanResult {
    scanCounter += 1;

    const allFindings: CodeRiskFinding[] = [];
    const rustArtifacts = artifacts.filter(a => a.path.endsWith('.rs'));
    const filesWithFindings = new Set<string>();

    for (const artifact of rustArtifacts) {
        const findings = scanRustContent(artifact);
        if (findings.length > 0) {
            filesWithFindings.add(artifact.path);
            allFindings.push(...findings);
        }
    }

    // ── Severity × Confidence matrix ───────────────────────────
    const bySevConf = {
        highHigh: 0, highMedium: 0, highLow: 0,
        mediumHigh: 0, mediumMedium: 0, mediumLow: 0,
        lowHigh: 0, lowMedium: 0, lowLow: 0,
    };

    function incSevConf(s: CodeRiskSeverity, c: FindingConfidence) {
        const key = `${s}${c.charAt(0).toUpperCase()}${c.slice(1)}` as keyof typeof bySevConf;
        bySevConf[key]++;
    }

    // ── Legacy + new summary fields ────────────────────────────
    const summary: RustRiskScanSummary = {
        unwrapExpect: 0,
        panicTodo: 0,
        unsafeBlocks: 0,
        filesystemWrites: 0,
        processCommands: 0,
        stringPathJoins: 0,
        bySeverityAndConfidence: bySevConf,
        productionFindings: 0,
        testFindings: 0,
        benchmarkFindings: 0,
        unknownContextFindings: 0,
        pathJoinDynamic: 0,
        pathRelativeTraversal: 0,
        pathFilesystemFromVariable: 0,
        pathLowConfidenceLiteral: 0,
        total: allFindings.length,
    };

    for (const f of allFindings) {
        incSevConf(f.severity, f.confidence);

        // Context breakdown
        if (isProductionContext(f.fileContext)) summary.productionFindings++;
        else if (isTestContext(f.fileContext)) summary.testFindings++;
        else if (f.fileContext === 'benchmark') summary.benchmarkFindings++;
        else summary.unknownContextFindings++;

        // Legacy category breakdown
        if (f.riskKind === 'unwrap_review_signal' || f.riskKind === 'expect_review_signal') {
            summary.unwrapExpect++;
        } else if (f.riskKind === 'panic_review_signal' || f.riskKind === 'todo_review_signal' || f.riskKind === 'unimplemented_review_signal') {
            summary.panicTodo++;
        } else if (f.riskKind === 'unsafe_block' || f.riskKind === 'unsafe_function') {
            summary.unsafeBlocks++;
        } else if (
            f.riskKind === 'filesystem_delete_file' ||
            f.riskKind === 'filesystem_delete_recursive' ||
            f.riskKind === 'filesystem_create' ||
            f.riskKind === 'filesystem_open_write'
        ) {
            summary.filesystemWrites++;
        } else if (f.riskKind === 'process_command' || f.riskKind === 'command_new') {
            summary.processCommands++;
        } else if (
            f.riskKind === 'path_join_literal' ||
            f.riskKind === 'path_join_dynamic' ||
            f.riskKind === 'format_path'
        ) {
            summary.stringPathJoins++;
        }

        // v3.1 path-risk sub-breakdown
        if (f.riskKind === 'path_join_literal') summary.pathLowConfidenceLiteral++;
        else if (f.riskKind === 'path_join_dynamic') summary.pathJoinDynamic++;
        else if (f.riskKind === 'relative_traversal') summary.pathRelativeTraversal++;
        else if (f.riskKind === 'filesystem_path_from_variable') summary.pathFilesystemFromVariable++;
    }

    return {
        findings: allFindings,
        summary,
        filesScanned: rustArtifacts.length,
        filesWithFindings: filesWithFindings.size,
        evidenceLevel: 'surface_detected',
        scannedAt: new Date().toISOString(),
    };
}