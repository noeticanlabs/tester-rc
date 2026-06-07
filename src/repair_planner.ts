// CohBit-Copilot Failure-Aware Repair Planner (v1.7)
// Parses test/build/lint failure output into structured repair plans.
//
// Operating law:
//   Repair planner may inspect failures, classify, and route to patch primitives.
//   It may generate bounded PatchProposals via the patch builder.
//   It may not review, authorize, apply, test, rollback, receipt, or commit.

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { scanWorkspace, classifyFile } from './workspace.js';
import type {
    ParsedFailure,
    RepairPlan,
    FailureSource,
    FailureCategory,
    PatchPrimitive,
    FileRole,
    RiskLevel,
    FileRole as FR,
} from './types.js';

// ─── Failure Text Parsing ─────────────────────────────────────

function parseVitestFailure(text: string): ParsedFailure[] {
    const failures: ParsedFailure[] = [];
    const lines = text.split('\n');

    let currentFile: string | null = null;
    let currentLine: number | null = null;
    let message: string[] = [];
    let inFailure = false;

    for (const line of lines) {
        // Vitest file detection: ❯ tests/file.test.ts > describe > it
        const fileMatch = line.match(/\b(tests?\/\S+\.test\.\S+)\b/);
        if (fileMatch) {
            if (inFailure && currentFile) {
                failures.push({
                    source: 'test',
                    file: currentFile,
                    line: currentLine,
                    message: message.join(' ').trim(),
                    category: 'unknown',
                    suggestedPrimitive: 'ReplaceExactBlock',
                    confidence: 'medium',
                });
                message = [];
            }
            currentFile = fileMatch[1]!;
            inFailure = true;
            continue;
        }

        // Line number detection
        const lineMatch = line.match(/:\d+:\d+/);
        if (lineMatch && currentFile) {
            const ln = lineMatch[0].match(/\d+/)?.join('');
            if (ln) currentLine = parseInt(ln, 10);
        }

        // Expected/received pattern (assertion failure)
        if (inFailure) {
            if (/\bExpected\b|\bReceived\b|\bexpected\b|\breceived\b|AssertionError/i.test(line)) {
                message.push(line.trim());
            }
            if (/^\s{2,}(Expected|Received)/i.test(line)) {
                message.push(line.trim());
            }
        }

        // Error message line
        const errorMatch = line.match(/Error:\s*(.+)/);
        if (errorMatch && inFailure) {
            message.push(errorMatch[1]!);
        }
    }

    // Push last failure
    if (inFailure && currentFile) {
        failures.push({
            source: 'test',
            file: currentFile,
            line: currentLine,
            message: message.join(' ').trim(),
            category: 'unknown',
            suggestedPrimitive: 'ReplaceExactBlock',
            confidence: 'medium',
        });
    }

    return failures;
}

function parseTypeScriptError(text: string): ParsedFailure[] {
    const failures: ParsedFailure[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
        // TypeScript error pattern: path(line,col): error TS1234: message
        const tsMatch = line.match(/^(.+?)\((\d+),\d+\):\s*error\s+TS\d+:\s*(.+)/);
        if (tsMatch) {
            const file = tsMatch[1]!;
            const lineNum = parseInt(tsMatch[2]!, 10);
            const message = tsMatch[3]!;

            let suggestedPrimitive: PatchPrimitive | null = 'ReplaceExactBlock';
            let category: FailureCategory | 'unknown' = 'unknown';

            // Pattern match for common TS errors
            if (/cannot find module|module.*not found/i.test(message)) {
                suggestedPrimitive = 'InsertImportIfAbsent';
                category = 'rejects_state_root_mismatch';
            } else if (/is not assignable/i.test(message)) {
                suggestedPrimitive = 'ReplaceExactBlock';
            }

            failures.push({
                source: 'build',
                file: file.startsWith('src/') || file.startsWith('tests/') ? file : null,
                line: lineNum,
                message,
                category,
                suggestedPrimitive,
                confidence: 'high',
            });
        }
    }

    return failures;
}

export function parseFailureText(text: string): ParsedFailure[] {
    if (!text || text.trim().length === 0) return [];

    // Detect failure source
    const source = detectFailureSource(text);
    switch (source) {
        case 'test':
            return parseVitestFailure(text);
        case 'build':
            return parseTypeScriptError(text);
        default:
            // Generic: extract file paths and messages
            return parseGenericFailure(text);
    }
}

function detectFailureSource(text: string): FailureSource {
    const lower = text.toLowerCase();
    if (/❯.*\.test\.|✗|×|assertion|expected|received|tests?\s+failed|FAIL/i.test(text)) return 'test';
    if (/error\s+ts\d+:|cannot find module|is not assignable/i.test(text)) return 'build';
    if (/warning|error|clippy|eslint/i.test(text)) return 'lint';
    return 'unknown';
}

function parseGenericFailure(text: string): ParsedFailure[] {
    const failures: ParsedFailure[] = [];
    const fileMatches = text.matchAll(/(?:in|at|file|path)\s+['"]?(\S+\.(?:ts|js|rs|py|go|cs))['"]?/gi);
    for (const match of fileMatches) {
        failures.push({
            source: 'unknown',
            file: match[1]!,
            line: null,
            message: text.substring(0, 200).trim(),
            category: 'unknown',
            suggestedPrimitive: null,
            confidence: 'low',
        });
    }
    return failures;
}

// ─── File Mapping ─────────────────────────────────────────────

async function mapFailureToSourceFile(failure: ParsedFailure, cwd: string): Promise<string | null> {
    // If the failure already has a file, verify it exists
    if (failure.file) {
        const fullPath = path.join(cwd, failure.file);
        try {
            await fs.access(fullPath);
            return failure.file;
        } catch {
            // File not found, try alternative mapping
        }
    }

    // Try to map test file → source file
    if (failure.file && failure.file.startsWith('tests/')) {
        const basename = path.basename(failure.file, path.extname(failure.file));
        // Common patterns: tests/ledger.test.ts → src/ledger.ts
        const stripped = basename.replace(/\.test$/, '').replace(/_test$/, '').replace(/^test_/, '');
        const candidates = [
            `src/${stripped}.ts`,
            `src/${stripped}.js`,
            `src/${stripped}/${path.basename(stripped)}.ts`,
        ];
        for (const candidate of candidates) {
            const fullPath = path.join(cwd, candidate);
            try {
                await fs.access(fullPath);
                return candidate;
            } catch { /* continue */ }
        }
    }

    return null;
}

// ─── Public API ───────────────────────────────────────────────

export async function buildRepairPlan(
    failureText: string,
    cwd: string,
): Promise<RepairPlan> {
    const failures = parseFailureText(failureText);
    const ws = await scanWorkspace(cwd);

    // Map failures to source files
    const likelyFiles: Array<{ path: string; reason: string; role: FileRole }> = [];
    const suggestedPatches: RepairPlan['suggestedPatches'] = [];
    const seenFiles = new Set<string>();

    for (const failure of failures) {
        const sourceFile = await mapFailureToSourceFile(failure, cwd);
        if (sourceFile && !seenFiles.has(sourceFile)) {
            seenFiles.add(sourceFile);
            const role = classifyFile(sourceFile, ws.language);
            likelyFiles.push({
                path: sourceFile,
                reason: `Failed at ${failure.file ?? 'unknown location'}: ${failure.message.substring(0, 60)}`,
                role,
            });
        }

        if (failure.suggestedPrimitive && sourceFile) {
            suggestedPatches.push({
                targetFile: sourceFile,
                primitive: failure.suggestedPrimitive,
                confidence: failure.confidence,
            });
        }
    }

    // If no files found, add fallback from workspace scan
    if (likelyFiles.length === 0 && failures.length > 0) {
        for (const f of ws.sourceFiles.slice(0, 5)) {
            likelyFiles.push({
                path: f,
                reason: 'Source file (failure could not be mapped to specific file)',
                role: classifyFile(f, ws.language),
            });
        }
    }

    // Build steps
    const steps: string[] = [];
    if (failures.length > 0) {
        steps.push(`Parsed ${failures.length} failure(s) from ${failures[0]?.source ?? 'unknown'} output`);
    }
    if (likelyFiles.length > 0) {
        steps.push('Inspect the likely source files identified above');
    }
    if (suggestedPatches.length > 0) {
        steps.push(`Review ${suggestedPatches.length} suggested patch(es)`);
        steps.push('Run: cohbit-copilot build-patch --file <target> --primitive <primitive>');
    }
    steps.push('Apply fixes via the governed gate pipeline (propose → review → authorize → apply → test)');
    steps.push('Run full test suite: npm test');

    // Assess risk
    let risk: RiskLevel = 'Medium';
    if (failures.length === 0) risk = 'Low';
    if (failures.some(f => f.category !== 'unknown')) risk = 'High';

    return { failures, likelyFiles, suggestedPatches, steps, risk };
}