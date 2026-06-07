// @cohbit/tooling — T Rust Finding Enricher (v3.3)
// Post-processes raw regex findings from T_rust_risk_scanner with
// structural context: code windows, nearby guards, function names,
// module names, impl context, test status, and evidence annotations.
//
// Operating law:
//   Enrichment adds context to review signals. It does not certify defects.
//   Code windows are extracted from raw text; they are not AST-parsed.
//   Nearby guard detection is regex-based and may miss non-local guards.
//   Evidence notes are advisory, not conclusive.

import type { CodeRiskFinding } from './T_rust_risk_scanner.js';
import type { RustSymbol } from './T_rust_symbol_extractor.js';

// ─── Types ─────────────────────────────────────────────────────

export interface GuardInfo {
    kind: 'is_some' | 'is_ok' | 'match' | 'if_let' | 'ok_or' | 'unwrap_or' | 'question_mark' | 'none';
    line: number;
    text: string;
}

export interface EnrichedFinding {
    // Original fields from CodeRiskFinding
    file: string;
    line: number;
    column?: number;
    pattern: string;
    riskKind: string;
    severity: CodeRiskFinding['severity'];
    confidence: CodeRiskFinding['confidence'];
    fileContext: CodeRiskFinding['fileContext'];
    evidenceLevel: CodeRiskFinding['evidenceLevel'];
    recommendation: string;
    matchedText: string;

    // v3.3: Structural context
    functionName: string | null;
    moduleName: string | null;
    implContext: 'fn' | 'impl' | 'mod' | 'test_mod' | 'main' | 'unknown';
    isPublic: boolean;
    isTestFunction: boolean;
    isUnsafeFunction: boolean;
    returnType: string | null;

    // v3.3: Code window (5 lines around the match: N-2 to N+2)
    codeWindow: string[];

    // v3.3: Nearby guard detection
    nearbyGuards: GuardInfo[];

    // v3.3: Evidence annotations
    evidenceNotes: string[];
    falsePositiveNotes: string[];
    recommendedInspection: string[];
    suggestedEvidence: string[];
}

// ─── Symbol Map Builder ─────────────────────────────────────────

function buildSymbolMap(symbols: RustSymbol[]): Map<string, RustSymbol[]> {
    const map = new Map<string, RustSymbol[]>();
    for (const sym of symbols) {
        const key = sym.file;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(sym);
    }
    return map;
}

function findEnclosingFunction(
    file: string,
    line: number,
    symbolMap: Map<string, RustSymbol[]>,
): { name: string | null; isPublic: boolean; isUnsafe: boolean; isTest: boolean; returnType: string | null } {
    const symbols = symbolMap.get(file);
    if (!symbols) return { name: null, isPublic: false, isUnsafe: false, isTest: false, returnType: null };

    // Find the function/module/impl that contains this line (closest symbol before or at the line)
    let bestMatch: RustSymbol | null = null;
    for (const sym of symbols) {
        if (sym.kind === 'fn' || sym.kind === 'pub_fn' || sym.kind === 'test') {
            if (sym.line <= line) {
                if (!bestMatch || sym.line > bestMatch.line) {
                    bestMatch = sym;
                }
            }
        }
    }

    if (!bestMatch) return { name: null, isPublic: false, isUnsafe: false, isTest: false, returnType: null };

    return {
        name: bestMatch.name,
        isPublic: bestMatch.kind === 'pub_fn',
        isUnsafe: bestMatch.raw.includes('unsafe'),
        isTest: bestMatch.kind === 'test',
        returnType: null, // would need AST-lite for return type extraction
    };
}

function findModuleName(file: string, symbolMap: Map<string, RustSymbol[]>): string | null {
    const symbols = symbolMap.get(file);
    if (!symbols) return null;

    const modSymbol = symbols.find(s => s.kind === 'mod');
    if (modSymbol) return modSymbol.name;

    // Fallback: derive from file path
    const parts = file.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1]?.replace(/\.rs$/, '');
    return filename ?? null;
}

function findImplContext(
    file: string,
    line: number,
    symbolMap: Map<string, RustSymbol[]>,
): 'fn' | 'impl' | 'mod' | 'test_mod' | 'main' | 'unknown' {
    const symbols = symbolMap.get(file);
    if (!symbols) return 'unknown';

    // Check if inside an impl block
    const implsBefore = symbols.filter(s => s.kind === 'impl' && s.line <= line);
    if (implsBefore.length > 0) return 'impl';

    // Check if inside a mod
    const modsBefore = symbols.filter(s => s.kind === 'mod' && s.line <= line);
    if (modsBefore.length > 0) {
        // Check if it's a test module
        const modSym = modsBefore[modsBefore.length - 1]!;
        if (modSym.name === 'tests' || modSym.name.startsWith('test_')) return 'test_mod';
        return 'mod';
    }

    // Check if inside a function
    const fnsBefore = symbols.filter(s => (s.kind === 'fn' || s.kind === 'pub_fn') && s.line <= line);
    if (fnsBefore.length > 0) return 'fn';

    return 'unknown';
}

// ─── Code Window Extractor ──────────────────────────────────────

function extractCodeWindow(lines: string[], matchLine: number): string[] {
    const start = Math.max(0, matchLine - 3);
    const end = Math.min(lines.length, matchLine + 2);
    return lines.slice(start, end);
}

// ─── Nearby Guard Detector ──────────────────────────────────────

const GUARD_PATTERNS: Array<{ kind: GuardInfo['kind']; regex: RegExp }> = [
    { kind: 'is_some', regex: /\.is_some\(\)/g },
    { kind: 'is_ok', regex: /\.is_ok\(\)/g },
    { kind: 'match', regex: /\bmatch\b/g },
    { kind: 'if_let', regex: /\bif\s+let\b/g },
    { kind: 'ok_or', regex: /\.ok_or[<_]/g },
    { kind: 'unwrap_or', regex: /\.unwrap_or[<_\(]/g },
    { kind: 'question_mark', regex: /\?\s*[;,\)]/g },
];

function detectNearbyGuards(lines: string[], matchLine: number): GuardInfo[] {
    const guards: GuardInfo[] = [];
    const windowStart = Math.max(0, matchLine - 3);
    const windowEnd = Math.min(lines.length, matchLine + 3);

    for (let i = windowStart; i < windowEnd; i++) {
        const line = lines[i]!;
        for (const pattern of GUARD_PATTERNS) {
            pattern.regex.lastIndex = 0;
            const match = pattern.regex.exec(line!)!;
            if (match) {
                guards.push({
                    kind: pattern.kind,
                    line: i + 1, // 1-based
                    text: line.trim(),
                });
                pattern.regex.lastIndex = 0;
            }
        }
    }

    return guards;
}

// ─── Evidence Generator ─────────────────────────────────────────

function generateEvidenceNotes(
    finding: CodeRiskFinding,
    funcName: string | null,
    isPublic: boolean,
    isTest: boolean,
    guards: GuardInfo[],
): string[] {
    const notes: string[] = [];

    // Context evidence
    if (funcName) {
        notes.push(`Located in function '${funcName}'`);
    }
    if (isPublic && !isTest) {
        notes.push('Function is public — findings affect external callers');
    }
    if (isTest) {
        notes.push('Finding is in test code — expected patterns, not production risk');
    }

    // Guard evidence
    if (guards.length === 0) {
        if (finding.riskKind.includes('unwrap') || finding.riskKind.includes('expect')) {
            notes.push('No nearby is_some/is_ok/match/if_let guard detected');
        }
    } else {
        const guardKinds = [...new Set(guards.map(g => g.kind))];
        notes.push(`Nearby guards detected: ${guardKinds.join(', ')}`);
    }

    // Pattern-specific evidence
    switch (finding.riskKind) {
        case 'unsafe_block':
            notes.push('unsafe block bypasses Rust safety guarantees');
            break;
        case 'unsafe_function':
            notes.push('Callers must uphold safety invariants (not verified here)');
            break;
        case 'process_command':
        case 'command_new':
            notes.push('External process execution detected — input sanitization not verified');
            break;
        case 'filesystem_path_from_variable':
            notes.push('Filesystem operation uses variable path — path scoping not verified');
            break;
        case 'unwrap_review_signal':
            notes.push('.unwrap() will panic on None/Err — no recovery path');
            break;
        case 'panic_review_signal':
            notes.push('panic!() terminates the process — verify unrecoverable state intent');
            break;
        case 'todo_review_signal':
            notes.push('todo!() marks unfinished code — implementation not complete');
            break;
    }

    return notes;
}

function generateFalsePositiveNotes(
    finding: CodeRiskFinding,
    isTest: boolean,
    guards: GuardInfo[],
): string[] {
    const notes: string[] = [];

    if (isTest) {
        notes.push('Test context: patterns like unwrap() are idiomatic in test assertions');
    }
    if (guards.some(g => g.kind === 'match' || g.kind === 'if_let')) {
        notes.push('Nearby match/if_let guard may make this pattern safe in practice');
    }
    if (guards.some(g => g.kind === 'unwrap_or')) {
        notes.push('.unwrap_or() provides a fallback — pattern may not panic');
    }
    if (finding.riskKind === 'unwrap_review_signal' && guards.some(g => g.kind === 'question_mark')) {
        notes.push('Nearby ? operator suggests Result propagation pattern in use');
    }

    return notes;
}

function generateRecommendedInspection(finding: CodeRiskFinding): string[] {
    const inspections: Record<string, string[]> = {
        unsafe_block: [
            'Verify safety invariants are documented and manually enforced',
            'Check that no safe code can trigger undefined behavior through this block',
        ],
        unsafe_function: [
            'Review function preconditions and caller documentation',
            'Verify all callers understand and uphold safety requirements',
        ],
        process_command: [
            'Check whether command arguments are derived from untrusted input',
            'Verify command whitelisting or path sanitization is in place',
        ],
        command_new: [
            'Verify no unsanitized user input reaches Command::new()',
            'Check whether the command path is hardcoded or externally influenced',
        ],
        filesystem_delete_file: [
            'Verify the deleted path is scoped within project boundaries',
            'Check for path traversal or symlink vulnerabilities',
        ],
        filesystem_delete_recursive: [
            'CRITICAL: Verify path is tightly scoped and validated',
            'Ensure no ../ traversal or symlink dereference to sensitive directories',
        ],
        filesystem_create: [
            'Verify path is scoped and truncation is intentional',
            'Check that File::create cannot overwrite critical configuration',
        ],
        filesystem_path_from_variable: [
            'Trace the variable source — is it user-controlled?',
            'Verify path is validated and scoped before filesystem use',
        ],
        relative_traversal: [
            'Verify ../ is not controllable by external input',
            'Check that final path is resolved and bounds-checked',
        ],
        unwrap_review_signal: [
            'Check whether the value cannot be None/Err by construction',
            'Consider returning Result or Option instead of panicking',
        ],
        expect_review_signal: [
            'Verify the expect message documents why failure is impossible',
            'Consider whether a proper error type would be more informative',
        ],
        panic_review_signal: [
            'Verify this is truly an unrecoverable state',
            'Consider whether a Result return with graceful degradation is possible',
        ],
        todo_review_signal: [
            'Complete the implementation or add a tracking issue reference',
            'Verify callers don\'t rely on this function in production paths',
        ],
        unimplemented_review_signal: [
            'Add implementation or roadmap reference',
            'Move to backlog or replace with stub that returns a sensible default',
        ],
    };

    return inspections[finding.riskKind] ?? [
        `Review the ${finding.riskKind} pattern in context`,
        'Determine whether the pattern is intentional and safe',
    ];
}

function generateSuggestedEvidence(finding: CodeRiskFinding): string[] {
    const evidence: Record<string, string[]> = {
        unsafe_block: [
            'Document the safety invariants in a SAFETY comment above the unsafe block',
            'Run Miri (undefined behavior detector) on code paths through this block',
        ],
        unsafe_function: [
            'Add Safety section to function documentation',
            'Run Miri on all callers',
        ],
        process_command: [
            'Add integration test with malicious input',
            'Run command-injection fuzz test',
        ],
        filesystem_delete_file: [
            'Add path traversal test with ../ input',
            'Add symlink test pointing outside workspace',
        ],
        filesystem_path_from_variable: [
            'Add test with boundary paths (/, C:\\, ~)',
            'Add test with symlink redirection',
        ],
        unwrap_review_signal: [
            'Add a test with None/Err input to verify panic behavior',
            'Run the test suite with RUST_BACKTRACE=1 to check for unexpected panics',
        ],
        expect_review_signal: [
            'Add a test with None/Err input to verify the expect message',
        ],
        panic_review_signal: [
            'Add a test proving the invariant cannot be violated',
            'Add a fuzz test that attempts to trigger the panic',
        ],
        todo_review_signal: [
            'Add a tracking issue in the project issue tracker',
            'Link the todo!() to the issue with a comment',
        ],
    };

    return evidence[finding.riskKind] ?? [
        'Run targeted tests for this code path',
        'Review the function in context of its callers',
    ];
}

// ─── Main Enrichment Function ───────────────────────────────────

export function enrichFindings(
    findings: CodeRiskFinding[],
    symbols: RustSymbol[],
    contentMap: Map<string, string>,
): EnrichedFinding[] {
    const symbolMap = buildSymbolMap(symbols);

    return findings.map(finding => {
        const matchLine = finding.line;
        const content = contentMap.get(finding.file) ?? '';
        const allLines = content.split('\n');
        const lines = allLines;

        // Structural context
        const func = findEnclosingFunction(finding.file, matchLine, symbolMap);
        const moduleName = findModuleName(finding.file, symbolMap);
        const implContext = findImplContext(finding.file, matchLine, symbolMap);

        // Code window
        const codeWindow = extractCodeWindow(lines, matchLine);

        // Guard detection
        const nearbyGuards = detectNearbyGuards(lines, matchLine);

        // Evidence
        const evidenceNotes = generateEvidenceNotes(finding, func.name, func.isPublic, func.isTest, nearbyGuards);
        const falsePositiveNotes = generateFalsePositiveNotes(finding, func.isTest, nearbyGuards);
        const recommendedInspection = generateRecommendedInspection(finding);
        const suggestedEvidence = generateSuggestedEvidence(finding);

        return {
            ...finding,
            functionName: func.name,
            moduleName,
            implContext,
            isPublic: func.isPublic,
            isTestFunction: func.isTest,
            isUnsafeFunction: func.isUnsafe,
            returnType: func.returnType,
            codeWindow,
            nearbyGuards,
            evidenceNotes,
            falsePositiveNotes,
            recommendedInspection,
            suggestedEvidence,
        };
    });
}

// ─── Batch Enricher ─────────────────────────────────────────────

export function enrichFromContentArtifacts(
    findings: CodeRiskFinding[],
    symbols: RustSymbol[],
    contentArtifacts: Array<{ path: string; text: string }>,
): EnrichedFinding[] {
    const contentMap = new Map<string, string>();
    for (const artifact of contentArtifacts) {
        if (artifact.path && artifact.text != null) {
            contentMap.set(artifact.path, artifact.text);
        }
    }
    return enrichFindings(findings, symbols, contentMap);
}