// CohBit-Copilot Work Planner (v1.3)
// Turns English task requests into scoped engineering plans using workspace intelligence.
//
// Core flow:
//   operator English
//   → parseOperatorEnglish()
//   → scanWorkspace()
//   → findSymbolsInProject()
//   → buildDependencyGraph()
//   → routeLikelyFiles()
//   → buildWorkPlan()
//
// Operating law:
//   Planner may inspect, route, score, and recommend.
//   It may not generate a patch unless explicitly routed into proposer.
//   It may not review, authorize, apply, rollback, receipt, or commit.

import * as path from 'node:path';
import { parseOperatorEnglish } from './english.js';
import { scanWorkspace, classifyFile } from './workspace.js';
import { findSymbolsInProject } from './symbols.js';
import { buildDependencyGraph, findAffectedFiles } from './dep_graph.js';
import type {
    WorkIntent,
    WorkPlan,
    WorkspaceSummary,
    ProjectSymbols,
    DependencyGraph,
    SymbolInfo,
    FileRole,
    EnglishCommandParse,
    EnglishConstraints,
    MutationPermission,
    ParserConfidence,
    RiskLevel,
} from './types.js';

// ─── Stage 1: Infer WorkIntent from OperatorIntent + task text ─

function inferWorkIntent(parse: EnglishCommandParse): WorkIntent {
    const lower = parse.raw.toLowerCase();

    // Inspect-only constraints override everything
    if (parse.intent === 'InspectWorkspace' || parse.intent === 'InspectFile') {
        return 'InspectOnly';
    }
    if (parse.constraints.readOnly) {
        return 'InspectOnly';
    }

    // PlanChange needs keyword disambiguation
    if (parse.intent === 'PlanChange' || parse.intent === 'ProposePatch') {
        if (/\badd\b.*\b(command|cli|flag|option)\b/.test(lower)) return 'AddCommand';
        if (/\bmodify\b|\bchange\b|\brefactor\b|\bupdate\b|\brewrite\b/.test(lower)) return 'ModifyFunction';
        if (/\badd\b.*\btests?\b|\bcreate\b.*\btests?\b|\bwrite\b.*\btests?\b/.test(lower)) return 'AddTest';
        if (/\bfix\b.*\b(test|failure|fail|broken)\b/.test(lower)) return 'FixFailure';
        if (/\badd\b/.test(lower)) return 'AddCommand';
        if (/\bfix\b/.test(lower)) return 'ModifyFunction';
        if (/\bimplement\b|\bcreate\b|\bbuild\b/.test(lower)) return 'AddCommand';
        return 'ModifyFunction';
    }

    if (parse.intent === 'FixTests') return 'FixFailure';
    if (parse.intent === 'RecommendTests') return 'InspectOnly';

    // Mutations that arrive without PlanChange/ProposePatch wrapper
    if (parse.intent === 'ApplyPatch' || parse.intent === 'AuthorizePatch') {
        return 'ModifyFunction';
    }

    if (parse.intent === 'ShowRecent' || parse.intent === 'ResumeSession' || parse.intent === 'ExplainSession') {
        return 'InspectOnly';
    }

    if (parse.intent === 'RunTests') return 'InspectOnly';

    // Unknown intent — attempt direct keyword disambiguation from raw text
    if (parse.intent === 'Unknown') {
        if (/\badd\b.*\b(command|cli|flag|option)\b/.test(lower)) return 'AddCommand';
        if (/\bmodify\b|\bchange\b|\brefactor\b|\bupdate\b|\brewrite\b/.test(lower)) return 'ModifyFunction';
        if (/\badd\b.*\btests?\b|\bcreate\b.*\btests?\b|\bwrite\b.*\btests?\b/.test(lower)) return 'AddTest';
        if (/\bfix\b.*\b(test|failure|fail|broken)\b/.test(lower)) return 'FixFailure';
        if (/\binspect\b/.test(lower)) return 'InspectOnly';
        if (/\badd\b|\bimplement\b|\bcreate\b|\bbuild\b/.test(lower)) return 'AddCommand';
        if (/\bfix\b/.test(lower)) return 'FixFailure';
        if (/\btest\b/.test(lower)) return 'InspectOnly';
        return 'Unknown';
    }

    return 'Unknown';
}

// ─── Stage 2: Keyword-based file routing ───────────────────────

interface FileScore {
    path: string;
    reason: string;
    role: FileRole;
    score: number;
}

function routeLikelyFiles(
    ws: WorkspaceSummary,
    symbols: ProjectSymbols,
    task: string,
    parse: EnglishCommandParse,
): Array<{ path: string; reason: string; role: FileRole }> {
    const lower = task.toLowerCase();
    const scores: FileScore[] = [];

    // Collect all project files (source + test + config)
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles];

    for (const filePath of allFiles) {
        const basename = path.basename(filePath).toLowerCase();
        const dirName = path.dirname(filePath).toLowerCase();
        let score = 0;
        const reasons: string[] = [];

        // ── Keyword-to-file mapping ──

        // CLI / command routing
        if (/\bcli\b|\bcommand\b|\bflag\b|\barg\b|\bpars(e|ing|er)\b/.test(lower)) {
            if (basename.includes('cli') || filePath === 'src/cli.ts') {
                score += 40;
                reasons.push('CLI command dispatch lives here');
            }
        }

        // Ledger / session routing
        if (/\bledger\b|\bsession\b|\bresume\b|\bsummarize\b|\bsummary\b/.test(lower)) {
            if (basename.includes('ledger')) {
                score += 35;
                reasons.push('Ledger contains session loading/summarization');
            }
        }

        // Receipt / hash routing
        if (/\breceipt\b|\bhash\b|\bcommit\b|\bfinalize\b/.test(lower)) {
            if (basename.includes('receipt') || filePath === 'src/receipt.ts') {
                score += 35;
                reasons.push('Receipt module handles hash computation and finalization');
            }
        }

        // Proposer routing
        if (/\bpropos(e|al)\b|\bpatch\b|\bbounded\b/.test(lower)) {
            if (basename.includes('proposer') || filePath === 'src/proposer.ts') {
                score += 30;
                reasons.push('Proposer handles bounded patch generation');
            }
        }

        // Gates / pipeline routing
        if (/\bgate\b|\bpipeline\b|\breview\b|\bauthorize\b|\bapply\b|\brollback\b/.test(lower)) {
            if (basename.includes('gate')) {
                score += 30;
                reasons.push('Gates module orchestrates the patch pipeline');
            }
        }

        // English / command understanding routing
        if (/\benglish\b|\bparse\b|\boperator\b|\bintent\b/.test(lower)) {
            if (basename.includes('english') || filePath === 'src/english.ts') {
                score += 35;
                reasons.push('English module handles operator command parsing');
            }
        }

        // Symbol / dependency routing
        if (/\bsymbol\b|\bdependenc(y|ies)\b|\bimport\b|\bexports?\b|\bgraph\b/.test(lower)) {
            if (basename.includes('symbol') || basename.includes('dep_graph')) {
                score += 35;
                reasons.push('Symbol and dependency graph modules handle code intelligence');
            }
        }

        // Workspace / environment routing
        if (/\bworkspace\b|\benvironment\b|\brepo\b|\bproject\b/.test(lower)) {
            if (basename.includes('workspace') || basename.includes('environment')) {
                score += 30;
                reasons.push('Workspace and environment modules handle project awareness');
            }
        }

        // Test routing — keyword mapping to test files
        if (/\btest\b|\bfailure\b|\bfailing\b|\bfix\b/.test(lower)) {
            if (filePath.startsWith('tests/')) {
                score += 15;
                if (reasons.length === 0) reasons.push('Test file matching task context');
            }
        }

        // ── Symbol name matching ──
        const fileSymbols = symbols.fileIndex[filePath] ?? [];
        for (const sym of fileSymbols) {
            const symLower = sym.name.toLowerCase();
            // Check if any significant task word matches a symbol name
            const taskWords = lower.split(/\s+/).filter(w => w.length > 2);
            for (const word of taskWords) {
                if (symLower.includes(word) || word.includes(symLower)) {
                    score += 10;
                    if (reasons.length === 0) reasons.push(`Symbol "${sym.name}" matches task keyword "${word}"`);
                    break;
                }
            }
        }

        // ── Module name matching from English parse ──
        if (parse.targetModule) {
            const modLower = parse.targetModule.toLowerCase();
            if (basename.includes(modLower)) {
                score += 25;
                reasons.push(`Module "${parse.targetModule}" explicitly referenced by operator`);
            }
        }

        // ── File role heuristics ──
        const role = classifyFile(filePath, ws.language);

        // If task mentions "tests", boost test files
        if (/\btest\b/.test(lower) && role === 'test') {
            score += 10;
        }
        // If task mentions specific file path
        if (parse.targetFile && filePath.includes(parse.targetFile)) {
            score += 50;
            reasons.push(`File path "${parse.targetFile}" explicitly referenced by operator`);
        }

        if (score > 0) {
            scores.push({ path: filePath, reason: reasons.join('; ') || 'Keyword match', role, score });
        }
    }

    // Sort by score descending, take top 8
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 8);

    // If nothing matched, fall back to generic routing based on source/test roles
    if (top.length === 0) {
        for (const filePath of ws.sourceFiles.slice(0, 5)) {
            const role = classifyFile(filePath, ws.language);
            top.push({ path: filePath, reason: 'Source file (no specific keyword match)', role, score: 0 });
        }
    }

    return top.map(({ path: p, reason, role }) => ({ path: p, reason, role }));
}

// ─── Stage 3: Build ordered steps ──────────────────────────────

function buildSteps(intent: WorkIntent, likelyFiles: Array<{ path: string; reason: string; role: FileRole }>): string[] {
    const steps: string[] = [];

    switch (intent) {
        case 'AddCommand':
            steps.push('Inspect existing CLI command dispatch in ' + (likelyFiles.find(f => f.path.includes('cli'))?.path ?? 'src/cli.ts'));
            steps.push('Identify the handler pattern used by existing commands');
            steps.push('Define the new command interface and argument parsing rules');
            steps.push('Implement the new command handler function');
            steps.push('Wire the command into the CLI dispatch switch');
            steps.push('Update help text to document the new command');
            steps.push('Add tests covering the new command');
            steps.push('Run targeted tests: npm test -- tests/cli-related');
            steps.push('Run full test suite: npm test');
            break;

        case 'ModifyFunction':
            steps.push('Inspect the target function and its callers');
            steps.push('Review the function signature, return type, and side effects');
            steps.push('Identify all direct dependents via dependency graph');
            steps.push('Make the targeted modification');
            steps.push('Update any callers affected by the change');
            steps.push('Run tests for the modified module');
            steps.push('Run affected downstream tests');
            steps.push('Run full test suite: npm test');
            break;

        case 'AddTest':
            steps.push('Identify the module to be tested');
            steps.push('Review existing test patterns in the test directory');
            steps.push('Write test cases covering happy path, edge cases, and failure modes');
            steps.push('Run the new tests in isolation');
            steps.push('Run full test suite: npm test');
            break;

        case 'FixFailure':
            steps.push('Inspect the failing test output');
            steps.push('Trace the failure to the root cause in the source module');
            steps.push('Implement the fix');
            steps.push('Run the previously failing test to confirm resolution');
            steps.push('Run full test suite to check for regressions: npm test');
            break;

        case 'InspectOnly':
            steps.push('Scan relevant files for context');
            steps.push('Report findings without mutation');
            if (likelyFiles.length > 0) {
                steps.push('Review exports, imports, and symbol structure of likely files');
            }
            break;

        case 'Unknown':
            steps.push('Clarify the task intent with the operator');
            steps.push('Re-parse with more specific English phrasing');
            break;
    }

    return steps;
}

// ─── Stage 4: Recommend test files ─────────────────────────────

function recommendTests(
    likelyFiles: Array<{ path: string; reason: string; role: FileRole }>,
    ws: WorkspaceSummary,
): string[] {
    const tests: string[] = [];
    const seen = new Set<string>();

    for (const f of likelyFiles) {
        // Map source files to their corresponding test files
        const basename = path.basename(f.path, path.extname(f.path));

        // Common test file patterns
        const candidates = [
            `tests/${basename}.test.ts`,
            `tests/${basename}.spec.ts`,
            `tests/${basename}_test.ts`,
            `tests/test_${basename}.ts`,
        ];

        for (const candidate of candidates) {
            if (ws.testFiles.includes(candidate) && !seen.has(candidate)) {
                seen.add(candidate);
                tests.push(candidate);
            }
        }

        // If the file is already a test, include it
        if (f.path.startsWith('tests/') && !seen.has(f.path)) {
            seen.add(f.path);
            tests.push(f.path);
        }
    }

    // Always suggest full suite
    if (!seen.has('(full suite)')) {
        tests.push('(full suite)');
    }

    return tests;
}

// ─── Stage 5: Risk assessment ──────────────────────────────────

function assessRisk(
    parse: EnglishCommandParse,
    intent: WorkIntent,
): RiskLevel {
    // Unsafe commands are always Blocked
    if (parse.confidence === 'unsafe') return 'Blocked';

    // Read-only constraints with mutation intent
    if (parse.constraints.readOnly && intent !== 'InspectOnly' && intent !== 'Unknown') {
        return 'Blocked';
    }

    // No-apply with mutation intent
    if (parse.constraints.noApply && (intent === 'AddCommand' || intent === 'ModifyFunction' || intent === 'FixFailure')) {
        return 'High';
    }

    // Inspection is always Low
    if (intent === 'InspectOnly') return 'Low';

    // Unknown intent is High
    if (intent === 'Unknown') return 'High';

    // Fixing failures carries Medium risk (regression risk)
    if (intent === 'FixFailure') return 'Medium';

    // Adding commands carries Medium risk (new surface area)
    if (intent === 'AddCommand') return 'Medium';

    // Modifying functions carries Medium risk
    if (intent === 'ModifyFunction') return 'Medium';

    // Adding tests is Low risk
    if (intent === 'AddTest') return 'Low';

    return 'Medium';
}

// ─── Stage 6: Mutation permission resolution ───────────────────

function resolveMutationPermission(
    parse: EnglishCommandParse,
    intent: WorkIntent,
): MutationPermission {
    // Explicit constraints take priority
    if (parse.constraints.readOnly || intent === 'InspectOnly') {
        return 'ReadOnly';
    }

    if (parse.constraints.noApply) {
        return 'ProposalOnly';
    }

    if (parse.confidence === 'unsafe') {
        return 'Unknown';
    }

    // Mutation intents default to proposal-only (must go through gates)
    if (intent === 'AddCommand' || intent === 'ModifyFunction' || intent === 'FixFailure') {
        return 'ProposalOnly';
    }

    if (intent === 'AddTest') {
        return 'ProposalOnly';
    }

    return 'ReadOnly';
}

// ─── Public API ────────────────────────────────────────────────

export async function plan(task: string, cwd: string): Promise<WorkPlan> {
    // Stage 1: Parse operator English
    const parse = parseOperatorEnglish(task);

    // Stage 2: Infer work intent
    const intent = inferWorkIntent(parse);

    // Stage 3: Gather workspace intelligence
    const ws = await scanWorkspace(cwd);
    let symbols: ProjectSymbols = { root: cwd, language: ws.language, symbols: [], fileIndex: {} };
    let depGraph: DependencyGraph = { edges: [], adjacency: {}, reverseAdjacency: {} };

    try {
        symbols = await findSymbolsInProject(cwd);
    } catch {
        // Symbol extraction may fail; continue with empty symbols
    }

    try {
        depGraph = await buildDependencyGraph(cwd);
    } catch {
        // Dependency graph may fail; continue with empty graph
    }

    // Stage 4: Route likely files
    const likelyFiles = routeLikelyFiles(ws, symbols, task, parse);

    // Stage 5: Compute affected files from dependency graph
    const affectedSet = new Set<string>();
    for (const f of likelyFiles) {
        const affected = findAffectedFiles(f.path, depGraph);
        for (const a of affected) {
            affectedSet.add(a);
        }
    }
    // Remove files that are already in likelyFiles
    for (const f of likelyFiles) {
        affectedSet.delete(f.path);
    }
    const affectedFiles = [...affectedSet].sort();

    // Stage 6: Build steps
    const steps = buildSteps(intent, likelyFiles);

    // Stage 7: Recommend tests
    const suggestedTests = recommendTests(likelyFiles, ws);

    // Stage 8: Assess risk
    const risk = assessRisk(parse, intent);

    // Stage 9: Resolve mutation permission
    const mutationPermission = resolveMutationPermission(parse, intent);

    // Stage 10: Determine confidence
    const confidence: ParserConfidence =
        parse.confidence === 'unsafe' || intent === 'Unknown'
            ? 'low'
            : (parse.confidence as ParserConfidence);

    return {
        intent,
        confidence,
        task,
        likelyFiles,
        affectedFiles,
        steps,
        suggestedTests,
        risk,
        constraints: parse.constraints,
        mutationPermission,
    };
}