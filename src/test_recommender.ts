// CohBit-Copilot Test Recommender (v1.4)
// Standalone, reusable test recommendation from files, plans, or proposals.
//
// Three tiers:
//   Tier 1 — Targeted: exact test file match (high confidence)
//   Tier 2 — Module: test file + dependent tests (medium confidence)
//   Tier 3 — Full suite: fallback (low confidence)
//
// Operating law:
//   Test recommendation may guide verification.
//   It may not claim that verification has occurred.
//   Only the TestGate can produce test evidence.

import * as path from 'node:path';
import { findAffectedFiles } from './dep_graph.js';
import { defaultTestCommand } from './lang.js';
import { classifyFile } from './workspace.js';
import type {
    TestRecommendationInput,
    TestRecommendation,
    TestRecommendationCommand,
    TestTier,
    WorkspaceSummary,
    DependencyGraph,
    Language,
} from './types.js';

// ─── Per-Language Test Runners ────────────────────────────────

function resolveTestRunner(lang: Language): string {
    switch (lang) {
        case 'node': return 'npm test';
        case 'rust': return 'cargo test';
        case 'go': return 'go test';
        case 'python': return 'pytest';
        case 'dotnet': return 'dotnet test';
        default: return 'npm test';
    }
}

function resolveTargetedCommand(lang: Language, testFile: string): string {
    switch (lang) {
        case 'node': return `npm test -- ${testFile}`;
        case 'rust': return `cargo test --test ${path.basename(testFile, path.extname(testFile))}`;
        case 'go': return `go test ${path.dirname(testFile)}`;
        case 'python': return `pytest ${testFile}`;
        case 'dotnet': return `dotnet test --filter "FullyQualifiedName~${path.basename(testFile, path.extname(testFile))}"`;
        default: return `npm test -- ${testFile}`;
    }
}

function resolveModuleCommand(lang: Language, modulePattern: string): string | null {
    switch (lang) {
        case 'node': return `npx vitest run -- --grep "${modulePattern}"`;
        case 'rust': return `cargo test ${modulePattern}`;
        case 'go': return `go test ./${modulePattern}/...`;
        case 'python': return `pytest -k "${modulePattern}"`;
        case 'dotnet': return `dotnet test --filter "FullyQualifiedName~${modulePattern}"`;
        default: return null;
    }
}

// ─── File-to-Test Mapping ─────────────────────────────────────

function mapFileToTest(filePath: string, ws: WorkspaceSummary): string | null {
    const basename = path.basename(filePath, path.extname(filePath));

    // Common test file patterns
    const candidates = [
        `tests/${basename}.test.ts`,
        `tests/${basename}.spec.ts`,
        `tests/${basename}_test.ts`,
        `tests/test_${basename}.ts`,
        `tests/${basename}_test.py`,
        `tests/test_${basename}.py`,
        `tests/${basename}_test.go`,
        `tests/${basename}_test.rs`,
        `tests/test_${basename}.rs`,
    ];

    for (const candidate of candidates) {
        if (ws.testFiles.includes(candidate)) return candidate;
    }

    // If the file is already a test file, include it
    if (filePath.startsWith('tests/') && ws.testFiles.includes(filePath)) {
        return filePath;
    }

    // Try fuzzy: any test file whose basename contains the source basename
    const sourceBase = path.basename(filePath, path.extname(filePath)).toLowerCase();
    for (const tf of ws.testFiles) {
        const testBase = path.basename(tf, path.extname(tf)).toLowerCase();
        if (testBase.includes(sourceBase) || sourceBase.includes(testBase)) {
            return tf;
        }
    }

    return null;
}

function extractModuleName(filePath: string): string {
    const basename = path.basename(filePath, path.extname(filePath));
    // Strip leading/trailing test/test_/_test/_spec suffixes
    return basename.replace(/^(test_|tests?\/)/, '').replace(/([._](test|spec|_test))$/, '');
}

// ─── Public API ───────────────────────────────────────────────

export function recommend(input: TestRecommendationInput): TestRecommendation {
    const commands: TestRecommendationCommand[] = [];
    const seen = new Set<string>();
    const { workspace: ws, depGraph, likelyFiles = [], changedFiles = [], affectedFiles: explicitAffected = [] } = input;

    // Collect all files to analyze
    const allFiles = new Set<string>();
    for (const f of [...likelyFiles, ...changedFiles, ...explicitAffected]) {
        allFiles.add(f);
    }

    // Compute transitive affected files from depGraph
    if (depGraph) {
        for (const f of allFiles) {
            const affected = findAffectedFiles(f, depGraph);
            for (const a of affected) allFiles.add(a);
        }
    }

    if (allFiles.size === 0) {
        // No files given — only full suite
        const fb = resolveTestRunner(ws.language);
        return {
            commands: [{
                command: fb,
                reason: 'No files specified — full suite is the only recommendation',
                confidence: 'low',
                tier: 'full',
            }],
            fallbackCommand: fb,
        };
    }

    // ── Tier 1: Targeted commands (exact test file matches) ──
    for (const filePath of allFiles) {
        const mapped = mapFileToTest(filePath, ws);
        if (mapped) {
            const cmd = resolveTargetedCommand(ws.language, mapped);
            if (!seen.has(cmd)) {
                seen.add(cmd);
                commands.push({
                    command: cmd,
                    reason: `Direct test file for ${filePath}`,
                    confidence: 'high',
                    tier: 'targeted',
                });
            }
        }
    }

    // ── Tier 2: Module commands (test file + dependents) ──
    const moduleNames = new Set<string>();
    for (const filePath of allFiles) {
        moduleNames.add(extractModuleName(filePath));
    }

    for (const modName of moduleNames) {
        const cmd = resolveModuleCommand(ws.language, modName);
        if (cmd && !seen.has(cmd)) {
            seen.add(cmd);
            commands.push({
                command: cmd,
                reason: `Module-scoped tests for "${modName}" and dependents`,
                confidence: 'medium',
                tier: 'module',
            });
        }
    }

    // ── Tier 3: Full suite fallback ──
    const fallbackCommand = resolveTestRunner(ws.language);
    if (!seen.has(fallbackCommand)) {
        commands.push({
            command: fallbackCommand,
            reason: 'Full project verification (fallback)',
            confidence: 'low',
            tier: 'full',
        });
    }

    return { commands, fallbackCommand };
}