#!/usr/bin/env -S npx tsx
// CohBit-Copilot v3.0 — CTRL Content-Aware Repo Audit
// Moves from filename-level scanning to content-level analysis.
// Reads real .rs, .lean, .md files; scans for Rust risk patterns;
// extracts symbols; produces evidence-labeled findings.
//
// Operating law:
//   Content findings are evidence, not verdicts.
//   A regex match may trigger review.
//   It may not certify a bug, authorize repair, or imply defect without verification.

import { scanWorkspace } from '../src/workspace.js';
import { scanRepository } from '../packages/tooling/src/T3_scanner.js';
import { auditRepository } from '../packages/tooling/src/T_integrated_audit.js';
import { runBenchmarkSuite } from '../packages/tooling/src/T19_benchmark.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createToolCallBudget, recordToolCall } from '../packages/resource/src/R6_tool_calls.js';
import { createBenchmarkBudget, recordBenchmarkCase } from '../packages/resource/src/R10_benchmark.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import { createResourceForecast } from '../packages/resource/src/R20_forecast.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    console.log(`v3.0 Content-Aware CTRL Audit`);
    console.log(`Target: ${root}\n`);

    // Change to target directory for scanWorkspace
    const origCwd = process.cwd();
    process.chdir(root);

    const startTime = Date.now();

    // ─── Phase 0: Budgeting ───────────────────────────────────
    console.log('Phase 0 — Budgeting...');
    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v3.0-ctrl-content-audit', resourceType: 'cpu_time', budgetLimit: 120, estimatedUse: 30,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v3.0-ctrl-content-audit', budgetLimitMs: 120000, estimatedMs: 30000 });
    const toolCallBudget = createToolCallBudget({ sessionId: 'v3.0-ctrl-content-audit', allowedToolCalls: 100 });
    const benchmarkBudget = createBenchmarkBudget({ benchmarkFamily: 'ext_repo_audit', allowedCases: 20 });

    // ─── Phase 1: Workspace Scan ──────────────────────────────
    console.log('Phase 1 — Workspace scan...');
    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    recordToolCall(toolCallBudget);
    console.log(`  Files found: ${allFiles.length} | Language: ${ws.language}`);

    // ─── Phase 2: Filename-Level Scan (existing) ──────────────
    console.log('Phase 2 — Filename-level scan (T3)...');
    const repoScan = scanRepository(allFiles, root);
    recordToolCall(toolCallBudget);

    // ─── Phase 3: Content Reading ─────────────────────────────
    console.log('Phase 3 — Content reading...');
    // Read all source + doc files (text only)
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, {
        maxFileBytes: 2 * 1024 * 1024,   // 2MB per file
        maxTotalBytes: 50 * 1024 * 1024, // 50MB total
        maxFiles: 500,
    });
    recordToolCall(toolCallBudget);
    console.log(`  Read: ${contentResult.artifacts.length} files, ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)} KB`);
    console.log(`  Skipped binary: ${contentResult.skippedBinary.length}, large: ${contentResult.skippedLarge.length}, decode errors: ${contentResult.decodeErrors.length}, missing: ${contentResult.missingFiles.length}`);

    // ─── Phase 4: Rust Content Risk Scan ──────────────────────
    console.log('Phase 4 — Rust content risk scan...');
    const rustContentResult = scanRustContentBatch(contentResult.artifacts);
    recordToolCall(toolCallBudget);
    console.log(`  .rs files scanned: ${rustContentResult.filesScanned}`);
    console.log(`  Files with findings: ${rustContentResult.filesWithFindings}`);
    console.log(`  Total findings: ${rustContentResult.summary.total}`);
    console.log(`    unwrap/expect: ${rustContentResult.summary.unwrapExpect}`);
    console.log(`    panic/todo/unimplemented: ${rustContentResult.summary.panicTodo}`);
    console.log(`    unsafe: ${rustContentResult.summary.unsafeBlocks}`);
    console.log(`    filesystem writes: ${rustContentResult.summary.filesystemWrites}`);
    console.log(`    process commands: ${rustContentResult.summary.processCommands}`);
    console.log(`    manual path joins: ${rustContentResult.summary.stringPathJoins}`);

    // ─── Phase 5: Rust Symbol Extraction ──────────────────────
    console.log('Phase 5 — Rust symbol extraction...');
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    recordToolCall(toolCallBudget);
    console.log(`  .rs files scanned: ${rustSymbolResult.filesScanned}`);
    console.log(`  Total symbols: ${rustSymbolResult.summary.total}`);
    console.log(`    functions: ${rustSymbolResult.summary.totalFunctions} (${rustSymbolResult.summary.pubFunctions} public)`);
    console.log(`    structs: ${rustSymbolResult.summary.structs} | enums: ${rustSymbolResult.summary.enums} | traits: ${rustSymbolResult.summary.traits}`);
    console.log(`    impls: ${rustSymbolResult.summary.impls} | modules: ${rustSymbolResult.summary.modules}`);
    console.log(`    tests: ${rustSymbolResult.summary.tests} | macros: ${rustSymbolResult.summary.macros}`);
    console.log(`    statics: ${rustSymbolResult.summary.statics} | consts: ${rustSymbolResult.summary.consts} | uses: ${rustSymbolResult.summary.useStatements}`);

    // ─── Phase 6: Existing Audit (filename-level risks) ───────
    console.log('Phase 6 — Integrated audit...');
    const auditResult = auditRepository(allFiles, { includeBenchmark: false });
    recordToolCall(toolCallBudget);

    // ─── Phase 7: Benchmark ───────────────────────────────────
    console.log('Phase 7 — Benchmark...');
    const benchmarkSuite = runBenchmarkSuite();
    recordBenchmarkCase(benchmarkBudget);

    // ─── Phase 8: Resource Analytics ──────────────────────────
    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v3.0-ctrl-content-audit-receipt');
    recordElapsed(timeBudget, totalMs);

    // ─── Phase 9: Health Dashboard ────────────────────────────
    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: {
            computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : computeBudget.status === 'within_budget' ? 'healthy' : 'watch',
            repairBacklogHealth: auditResult.repair.openRepairs > 5 ? 'scarce' : auditResult.repair.openRepairs > 0 ? 'watch' : 'healthy',
            toolCallHealth: toolCallBudget.status === 'exhausted' ? 'scarce' : 'healthy',
        },
    });

    // ─── Phase 10: Resource Receipt ───────────────────────────
    const resourceReceipt = createResourceReceipt({
        workflowId: 'v3.0-ctrl-content-audit',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`, `tool_calls:${toolCallBudget.allowedToolCalls}`, `content_budget:50MB/500files`],
        outputsCreated: ['v3_0_ctrl_content_audit.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `tool_calls:${toolCallBudget.usedToolCalls}`,
        `files_scanned:${allFiles.length}`,
        `content_files_read:${contentResult.artifacts.length}`,
        `content_bytes_read:${contentResult.budgetUsed.totalBytes}`,
        `rust_risk_findings:${rustContentResult.summary.total}`,
        `rust_symbols:${rustSymbolResult.summary.total}`,
        `filename_risks:${auditResult.risks.totalRiskWarnings}`,
    ], `Content-aware audit completed in ${(totalMs / 1000).toFixed(1)}s. ${rustContentResult.summary.total} Rust risk signals, ${rustSymbolResult.summary.total} symbols extracted.`);

    // ─── Phase 11: Forecast ───────────────────────────────────
    const forecast = createResourceForecast({
        workspaceId: 'cohbit-ctrl',
        predictedOpenRepairs: auditResult.repair.openRepairs,
        predictedBottleneck: rustContentResult.summary.total > 20 ? 'risk_backlog' : rustContentResult.summary.panicTodo > 0 ? 'panic_review' : 'none_predicted',
        recommendedAction: rustContentResult.summary.total > 0 ? 'Review content risk signals. Prioritize unsafe blocks and filesystem mutations.' : 'Continue monitoring.',
    });

    // ─── Phase 12: Report Generation ──────────────────────────
    console.log('Phase 12 — Generating report...');

    // Build Rust risk findings table (top 30, sorted by severity)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const topFindings = [...rustContentResult.findings]
        .sort((a, b) => {
            const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
            if (sevDiff !== 0) return sevDiff;
            // Same severity: group by file
            return a.file.localeCompare(b.file) || a.line - b.line;
        })
        .slice(0, 30);

    const riskFindingsTable = topFindings.length > 0
        ? [
            '',
            '### Top Risk Signals (by severity)',
            '| File | Line | Pattern | Risk Kind | Severity |',
            '|------|------|---------|-----------|----------|',
            ...topFindings.map(f =>
                `| ${f.file} | ${f.line} | \`${f.pattern}\` | ${f.riskKind} | **${f.severity}** |`
            ),
        ]
        : ['', '_No content risk signals found._'];

    // Files with most findings (top 10)
    const findingCounts = new Map<string, number>();
    for (const f of rustContentResult.findings) {
        findingCounts.set(f.file, (findingCounts.get(f.file) ?? 0) + 1);
    }
    const topFilesByFindings = [...findingCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const topFilesTable = topFilesByFindings.length > 0
        ? [
            '',
            '### Top Files by Review Signals',
            '| File | Signals |',
            '|------|---------|',
            ...topFilesByFindings.map(([file, count]) => `| ${file} | ${count} |`),
        ]
        : [];

    // Files that define tests
    const testSymbols = rustSymbolResult.symbols.filter(s => s.kind === 'test');
    const testFiles = new Set(testSymbols.map(s => s.file));

    // Files with #[derive(...)]
    const deriveSymbols = rustSymbolResult.symbols.filter(s => s.kind === 'derive');

    // Files with unsafe
    const unsafeFound = rustContentResult.findings.filter(f => f.riskKind === 'unsafe_block' || f.riskKind === 'unsafe_function');
    const unsafeFiles = new Set(unsafeFound.map(f => f.file));

    // Files with filesystem mutation
    const fsMutationFound = rustContentResult.findings.filter(f =>
        f.riskKind === 'filesystem_delete_file' || f.riskKind === 'filesystem_delete_recursive' ||
        f.riskKind === 'filesystem_create' || f.riskKind === 'filesystem_open_write' || f.riskKind === 'filesystem_write_method'
    );
    const fsMutationFiles = new Set(fsMutationFound.map(f => f.file));

    const report = [
        `# CohBit-Copilot v3.0 — CTRL Content-Aware Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Evidence Level:** surface_detected (regex/content scan, not AST-verified)`,
        '',
        `## Philosophy`,
        `> Content findings are evidence, not verdicts.`,
        `> A regex match may trigger review — it does not certify a bug, authorize repair, or imply defect.`,
        `> This audit reads source files, finds review signals inside code, links them to file/line evidence,`,
        `> budgets the analysis, and reports limitations honestly.`,
        '',
        `## 1. Repository Overview`,
        `- Files: **${allFiles.length}** | Language: ${ws.language}`,
        `- Code: ${repoScan.detectedArtifacts.codeFiles} | Math docs: ${repoScan.detectedArtifacts.mathDocs} | Proof: ${repoScan.detectedArtifacts.proofFiles} | Language docs: ${repoScan.detectedArtifacts.languageDocs}`,
        `- Schemas: ${repoScan.detectedArtifacts.schemas} | Receipts: ${repoScan.detectedArtifacts.receipts} | Other: ${repoScan.detectedArtifacts.other}`,
        '',
        `## 2. Content Ingestion Budget`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Files read | ${contentResult.artifacts.length} |`,
        `| Total bytes read | ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(1)} KB |`,
        `| Budget limit (total) | ${(contentResult.budget.maxTotalBytes / (1024 * 1024)).toFixed(0)} MB |`,
        `| Max file size | ${(contentResult.budget.maxFileBytes / 1024).toFixed(0)} KB |`,
        `| Max files | ${contentResult.budget.maxFiles} |`,
        `| Skipped binary | ${contentResult.skippedBinary.length} |`,
        `| Skipped large | ${contentResult.skippedLarge.length} |`,
        `| Decode errors | ${contentResult.decodeErrors.length} |`,
        `| Missing files | ${contentResult.missingFiles.length} |`,
        '',
        `## 3. Rust Content Risk Scan`,
        `- .rs files scanned: **${rustContentResult.filesScanned}**`,
        `- Files with findings: ${rustContentResult.filesWithFindings}`,
        `- Total review signals: **${rustContentResult.summary.total}**`,
        '',
        `### Risk Signal Summary`,
        `| Category | Count | Severity |`,
        `|----------|-------|----------|`,
        `| \`unwrap()\` / \`expect()\` | ${rustContentResult.summary.unwrapExpect} | medium |`,
        `| \`panic!\` / \`todo!\` / \`unimplemented!\` | ${rustContentResult.summary.panicTodo} | high/medium |`,
        `| \`unsafe\` blocks / functions | ${rustContentResult.summary.unsafeBlocks} | **high** |`,
        `| Filesystem write paths | ${rustContentResult.summary.filesystemWrites} | high/medium |`,
        `| Process commands | ${rustContentResult.summary.processCommands} | **high** |`,
        `| Manual path joins | ${rustContentResult.summary.stringPathJoins} | low |`,
        '',
        `### High-Severity Breakdown`,
        `- Unsafe blocks/functions in: ${unsafeFiles.size} files`,
        `- Filesystem mutation in: ${fsMutationFiles.size} files`,
        ...(unsafeFound.length > 0 ? [
            '',
            `**Unsafe locations:**`,
            ...unsafeFound.map(f => `  - \`${f.file}:${f.line}\` — ${f.riskKind}`),
        ] : ['', '_No unsafe blocks detected._']),
        ...(fsMutationFound.length > 0 ? [
            '',
            `**Filesystem mutation locations:**`,
            ...fsMutationFound.slice(0, 15).map(f => `  - \`${f.file}:${f.line}\` — ${f.riskKind}`),
        ] : ['', '_No filesystem mutation patterns detected._']),
        ...riskFindingsTable,
        ...topFilesTable,
        '',
        `## 4. Rust Symbol Extraction`,
        `- .rs files scanned: **${rustSymbolResult.filesScanned}**`,
        `- Total symbols extracted: ${rustSymbolResult.summary.total}`,
        '',
        `| Symbol Type | Count |`,
        `|-------------|-------|`,
        `| Functions (total) | ${rustSymbolResult.summary.totalFunctions} |`,
        `| Public functions | ${rustSymbolResult.summary.pubFunctions} |`,
        `| Structs | ${rustSymbolResult.summary.structs} |`,
        `| Enums | ${rustSymbolResult.summary.enums} |`,
        `| Traits | ${rustSymbolResult.summary.traits} |`,
        `| Impl blocks | ${rustSymbolResult.summary.impls} |`,
        `| Modules | ${rustSymbolResult.summary.modules} |`,
        `| \`#[test]\` functions | ${rustSymbolResult.summary.tests} |`,
        `| \`macro_rules!\` macros | ${rustSymbolResult.summary.macros} |`,
        `| Static variables | ${rustSymbolResult.summary.statics} |`,
        `| Constants | ${rustSymbolResult.summary.consts} |`,
        `| Use statements | ${rustSymbolResult.summary.useStatements} |`,
        '',
        `### Derived Insights`,
        `- ${testFiles.size} files define \`#[test]\` functions`,
        `- ${deriveSymbols.length} \`#[derive(...)]\` attributes detected`,
        ...(unsafeFiles.size > 0 ? [`- **${unsafeFiles.size} files contain \`unsafe\` blocks or functions — PRIORITY REVIEW**`] : []),
        ...(fsMutationFiles.size > 0 ? [`- **${fsMutationFiles.size} files contain filesystem mutation patterns — PRIORITY REVIEW**`] : []),
        ...(rustContentResult.summary.panicTodo > 0 ? [`- ${rustContentResult.summary.panicTodo} panic/todo/unimplemented signals — review for completeness`] : []),
        '',
        `## 5. Filename-Level Risk Scan (Existing)`,
        `- Risk warnings: **${auditResult.risks.totalRiskWarnings}**`,
        `- Retrieval guard: ${auditResult.retrieval.accepted.length} accepted / ${auditResult.retrieval.rejected.length} rejected (${auditResult.retrieval.evidenceLevel})`,
        '',
        `## 6. Resource Budgets`,
        `| Budget | Limit | Used | Status |`,
        `|--------|-------|------|--------|`,
        `| Compute | ${computeBudget.budgetLimit}s | ${(totalMs / 1000).toFixed(1)}s | ${computeBudget.status} |`,
        `| Time | ${timeBudget.budgetLimitMs}ms | ${timeBudget.actualElapsedMs}ms | ${timeBudget.status} |`,
        `| Tool Calls | ${toolCallBudget.allowedToolCalls} | ${toolCallBudget.usedToolCalls} | ${toolCallBudget.status} |`,
        `| Content Budget | ${(contentResult.budget.maxTotalBytes / (1024 * 1024)).toFixed(0)}MB / ${contentResult.budget.maxFiles} files | ${(contentResult.budgetUsed.totalBytes / (1024 * 1024)).toFixed(1)}MB / ${contentResult.budgetUsed.filesRead} files | ${contentResult.budgetUsed.totalBytes > contentResult.budget.maxTotalBytes ? 'exceeded' : 'within_budget'} |`,
        '',
        `## 7. Resource Health`,
        `| Panel | Status |`,
        `|-------|--------|`,
        `| Compute | ${health.computeHealth} |`,
        `| Repair Backlog | ${health.repairBacklogHealth} |`,
        `| Tool Calls | ${health.toolCallHealth} |`,
        `| **Overall** | **${health.overallResourceHealth.toUpperCase()}** |`,
        '',
        `## 8. Resource Receipt`,
        `| Authorized | ${resourceReceipt.authorizedResources.join(', ')} |`,
        `| Actual | ${resourceReceipt.actualResources.join(', ')} |`,
        `| Efficiency | ${resourceReceipt.efficiencySummary} |`,
        '',
        `## 9. Forecast (30-day)`,
        `- Bottleneck: ${forecast.predictedBottleneck}`,
        `- Action: ${forecast.recommendedAction}`,
        '',
        `## 10. Benchmark`,
        `- Passed: ${benchmarkSuite.summary.passed} / Failed: ${benchmarkSuite.summary.failed}`,
        `- Total: ${benchmarkSuite.totalElapsedMs}ms | Slowest: ${benchmarkSuite.summary.slowest}`,
        '',
        `## 11. Limitations`,
        `- **Evidence level:** surface_detected — No Rust AST parser is used. All content findings are regex-based pattern matches.`,
        `- **Not verified:** A regex match does not certify a bug, authorize repair, or imply defect. Each finding is a review signal.`,
        `- **Comment filtering:** Simple ` + '`//`' + ` comment detection is applied, but ` + '`/* */`' + ` block comments may produce false positives.`,
        `- **Symbol extraction:** Regex-based. May miss generic parameters, where clauses, macro-produced symbols, or complex ` + '`impl`' + ` patterns.`,
        `- **Path join detection:** Heuristic. May produce false positives on legitimate string literals containing ` + '`/`' + `.`,
        `- **Budget:** Content reading is capped at 50MB total / 500 files / 2MB per file. Large repos may be partially audited.`,
        '',
        `## 12. Recommendations`,
    ];
    for (const r of auditResult.recommendations) report.push(`- ${r}`);
    if (unsafeFiles.size > 0) report.push(`- **HIGH PRIORITY:** ${unsafeFiles.size} files use \`unsafe\`. Verify invariants are documented and manually enforced.`);
    if (fsMutationFiles.size > 0) report.push(`- **HIGH PRIORITY:** ${fsMutationFiles.size} files contain filesystem mutation. Verify paths are validated and scoped.`);
    if (rustContentResult.summary.unwrapExpect > 20) report.push(`- ${rustContentResult.summary.unwrapExpect} unwrap/expect calls found. Consider systematic error handling strategy.`);
    if (rustContentResult.summary.panicTodo > 5) report.push(`- ${rustContentResult.summary.panicTodo} panic/todo/unimplemented signals. Review for intentionality.`);
    report.push(`- Resource health: **${health.overallResourceHealth}**.`, '', '---', '*v3.0 CTRL Content-Aware Audit. CohBit-Copilot observed file contents, found review signals, extracted symbols, budgeted the analysis, and reported limitations honestly — without granting authority.*');

    const outPath = path.join(origCwd, 'reports', 'v3_0_ctrl_content_audit.md');
    await fs.writeFile(outPath, report.join('\n'), 'utf-8');

    // Restore cwd
    process.chdir(origCwd);

    console.log(`\n═══ v3.0 CTRL Content-Aware Audit Complete ═══`);
    console.log(`  Target: ${root}`);
    console.log(`  Files: ${allFiles.length} | Content files read: ${contentResult.artifacts.length}`);
    console.log(`  Rust risk signals: ${rustContentResult.summary.total} | Symbols: ${rustSymbolResult.summary.total}`);
    console.log(`  Unsafe: ${rustContentResult.summary.unsafeBlocks} | FS mutation: ${rustContentResult.summary.filesystemWrites}`);
    console.log(`  Panic/todo: ${rustContentResult.summary.panicTodo} | unwrap/expect: ${rustContentResult.summary.unwrapExpect}`);
    console.log(`  Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`);
    console.log(`  Content budget: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB / ${(contentResult.budget.maxTotalBytes / 1024).toFixed(0)}KB`);
    console.log(`  Health: ${health.overallResourceHealth}`);
    console.log(`  Report: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });