#!/usr/bin/env -S npx tsx
// CohBit-Copilot v3.1 — Calibrated Rust Risk Signal Audit
// Adds file-context classification, confidence scoring, and path-risk refinement.
// Produces severity×confidence matrix and production/test breakdowns.
//
// Operating law:
//   Low-confidence findings are weaker signals, not false positives.
//   Test-file findings are expected patterns, not production risks.
//   The report groups by signal strength so reviewers prioritize correctly.

import { scanWorkspace } from '../src/workspace.js';
import { scanRepository } from '../packages/tooling/src/T3_scanner.js';
import { auditRepository } from '../packages/tooling/src/T_integrated_audit.js';
import { runBenchmarkSuite } from '../packages/tooling/src/T19_benchmark.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch, type CodeRiskFinding } from '../packages/tooling/src/T_rust_risk_scanner.js';
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
    console.log(`v3.1 Calibrated Content-Aware Audit`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);

    const startTime = Date.now();

    // ─── Phase 0: Budgeting ───────────────────────────────────
    console.log('Phase 0 — Budgeting...');
    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v3.1-calibrated-audit', resourceType: 'cpu_time', budgetLimit: 120, estimatedUse: 30,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v3.1-calibrated-audit', budgetLimitMs: 120000, estimatedMs: 30000 });
    const toolCallBudget = createToolCallBudget({ sessionId: 'v3.1-calibrated-audit', allowedToolCalls: 100 });
    const benchmarkBudget = createBenchmarkBudget({ benchmarkFamily: 'ext_repo_audit', allowedCases: 20 });

    // ─── Phase 1: Workspace Scan ──────────────────────────────
    console.log('Phase 1 — Workspace scan...');
    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    recordToolCall(toolCallBudget);
    console.log(`  Files found: ${allFiles.length} | Language: ${ws.language}`);

    // ─── Phase 2: Filename-Level Scan ─────────────────────────
    console.log('Phase 2 — Filename-level scan...');
    const repoScan = scanRepository(allFiles, root);
    recordToolCall(toolCallBudget);

    // ─── Phase 3: Content Reading ─────────────────────────────
    console.log('Phase 3 — Content reading...');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, {
        maxFileBytes: 2 * 1024 * 1024,
        maxTotalBytes: 50 * 1024 * 1024,
        maxFiles: 500,
    });
    recordToolCall(toolCallBudget);
    console.log(`  Read: ${contentResult.artifacts.length} files, ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)} KB`);

    // ─── Phase 4: Rust Content Risk Scan ──────────────────────
    console.log('Phase 4 — Rust calibrated risk scan...');
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    recordToolCall(toolCallBudget);
    console.log(`  .rs files: ${rustResult.filesScanned} | Files with findings: ${rustResult.filesWithFindings}`);
    console.log(`  Total signals: ${rustResult.summary.total}`);
    console.log(`  Production: ${rustResult.summary.productionFindings} | Test: ${rustResult.summary.testFindings}`);
    console.log(`  Bench: ${rustResult.summary.benchmarkFindings} | Unknown: ${rustResult.summary.unknownContextFindings}`);
    console.log(`  High×High: ${rustResult.summary.bySeverityAndConfidence.highHigh} | High×Med: ${rustResult.summary.bySeverityAndConfidence.highMedium}`);

    // ─── Phase 5: Rust Symbol Extraction ──────────────────────
    console.log('Phase 5 — Rust symbol extraction...');
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    recordToolCall(toolCallBudget);

    // ─── Phase 6: Existing Audit ──────────────────────────────
    console.log('Phase 6 — Integrated audit...');
    const auditResult = auditRepository(allFiles, { includeBenchmark: false });
    recordToolCall(toolCallBudget);

    // ─── Phase 7: Benchmark ───────────────────────────────────
    console.log('Phase 7 — Benchmark...');
    const benchmarkSuite = runBenchmarkSuite();
    recordBenchmarkCase(benchmarkBudget);

    // ─── Phase 8: Resource Analytics ──────────────────────────
    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v3.1-calibrated-audit-receipt');
    recordElapsed(timeBudget, totalMs);

    // ─── Phase 9: Health ──────────────────────────────────────
    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: {
            computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : computeBudget.status === 'within_budget' ? 'healthy' : 'watch',
            repairBacklogHealth: auditResult.repair.openRepairs > 5 ? 'scarce' : auditResult.repair.openRepairs > 0 ? 'watch' : 'healthy',
            toolCallHealth: toolCallBudget.status === 'exhausted' ? 'scarce' : 'healthy',
        },
    });

    // ─── Phase 10: Receipt ────────────────────────────────────
    const resourceReceipt = createResourceReceipt({
        workflowId: 'v3.1-calibrated-audit',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`, `tool_calls:${toolCallBudget.allowedToolCalls}`],
        outputsCreated: ['v3_1_calibrated_audit.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `content_files_read:${contentResult.artifacts.length}`,
        `calibrated_findings:${rustResult.summary.total}`,
        `production_findings:${rustResult.summary.productionFindings}`,
        `test_findings:${rustResult.summary.testFindings}`,
    ], `Calibrated audit in ${(totalMs / 1000).toFixed(1)}s. ${rustResult.summary.productionFindings} production signals, ${rustResult.summary.testFindings} test signals.`);

    // ─── Phase 11: Forecast ───────────────────────────────────
    const highConfProdRisks = rustResult.findings.filter(f =>
        (f.fileContext === 'src' || f.fileContext === 'example') &&
        f.confidence === 'high'
    ).length;
    const forecast = createResourceForecast({
        workspaceId: 'cohbit-ctrl',
        predictedOpenRepairs: auditResult.repair.openRepairs,
        predictedBottleneck: highConfProdRisks > 0 ? 'production_risk' : rustResult.summary.total > 50 ? 'review_backlog' : 'none_predicted',
        recommendedAction: highConfProdRisks > 0 ? 'Review high-confidence production signals immediately.' : 'Review findings by severity. Test-only signals are lower priority.',
    });

    // ─── Phase 12: Report Generation ──────────────────────────
    console.log('Phase 12 — Generating calibrated report...');

    const sv = rustResult.summary.bySeverityAndConfidence;

    // Group findings for report sections
    const isProduction = (f: CodeRiskFinding) => f.fileContext === 'src' || f.fileContext === 'example';
    const isHighPriority = (f: CodeRiskFinding) => f.severity === 'high' && f.confidence === 'high';
    const isProductionHighPriority = (f: CodeRiskFinding) => isProduction(f) && isHighPriority(f);

    const productionHighFindings = rustResult.findings.filter(isProductionHighPriority);
    const prodFilesWithFindings = new Set<string>();
    const prodFindings = rustResult.findings.filter(isProduction);
    for (const f of prodFindings) prodFilesWithFindings.add(f.file);

    // Path-risk sub-breakdown
    const pathRiskBreakdown = [
        `| Path Join (dynamic) | ${rustResult.summary.pathJoinDynamic} | medium confidence |`,
        `| Relative Traversal (\`../\`) | ${rustResult.summary.pathRelativeTraversal} | **high severity** |`,
        `| FS Operation from Variable | ${rustResult.summary.pathFilesystemFromVariable} | **high severity** |`,
        `| Literal Path (low confidence) | ${rustResult.summary.pathLowConfidenceLiteral} | low confidence |`,
    ];

    const report = [
        `# CohBit-Copilot v3.1 — Calibrated Content-Aware Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Evidence Level:** surface_detected (regex/content scan, not AST-verified)`,
        '',
        `## Philosophy`,
        `> Content findings are evidence, not verdicts.`,
        `> This calibration distinguishes high-confidence production risks from low-confidence test patterns.`,
        `> Test-file \`unwrap()\` / \`panic!()\` are expected — downgraded to low confidence.`,
        `> High-confidence signals in production code should be reviewed first.`,
        '',
        `## 1. Repository Overview`,
        `- Files: **${allFiles.length}** | Language: ${ws.language}`,
        `- Code: ${repoScan.detectedArtifacts.codeFiles} | Proof: ${repoScan.detectedArtifacts.proofFiles} | Docs: ${repoScan.detectedArtifacts.languageDocs}`,
        '',
        `## 2. Content Ingestion`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Files read | ${contentResult.artifacts.length} / ${contentResult.budget.maxFiles} |`,
        `| Bytes read | ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(1)} KB / ${(contentResult.budget.maxTotalBytes / (1024 * 1024)).toFixed(0)} MB |`,
        '',
        `## 3. Calibrated Risk Signals`,
        `- .rs files scanned: **${rustResult.filesScanned}** | Files with findings: ${rustResult.filesWithFindings}`,
        `- Total review signals: **${rustResult.summary.total}**`,
        '',
        `### Severity × Confidence Matrix`,
        `| | High Severity | Medium Severity | Low Severity |`,
        `|---|---|---|---|`,
        `| **High Confidence** | ${sv.highHigh} | ${sv.mediumHigh} | ${sv.lowHigh} |`,
        `| **Medium Confidence** | ${sv.highMedium} | ${sv.mediumMedium} | ${sv.lowMedium} |`,
        `| **Low Confidence** | ${sv.highLow} | ${sv.mediumLow} | ${sv.lowLow} |`,
        '',
        `### Context Breakdown`,
        `| Context | Count | Priority |`,
        `|---------|-------|----------|`,
        `| Production (src/example) | **${rustResult.summary.productionFindings}** | HIGH |`,
        `| Test / Fixture | ${rustResult.summary.testFindings} | Low (expected patterns) |`,
        `| Benchmark | ${rustResult.summary.benchmarkFindings} | Low |`,
        `| Unknown | ${rustResult.summary.unknownContextFindings} | Review context |`,
        '',
        `### Legacy Category Summary (for comparison)`,
        `| Category | Count | Severity | Confidence |`,
        `|----------|-------|----------|------------|`,
        `| \`unwrap()\` / \`expect()\` | ${rustResult.summary.unwrapExpect} | medium (downgraded in tests) | low in tests, medium in src |`,
        `| \`panic!\` / \`todo!\` / \`unimplemented!\` | ${rustResult.summary.panicTodo} | high/medium | low in tests, medium/high in src |`,
        `| \`unsafe\` blocks / functions | ${rustResult.summary.unsafeBlocks} | **high** | **high** |`,
        `| Filesystem write paths | ${rustResult.summary.filesystemWrites} | high/medium | high/medium |`,
        `| Process commands | ${rustResult.summary.processCommands} | **high** | **high** |`,
        `| Path signals (all) | ${rustResult.summary.stringPathJoins} | low-medium | varies |`,
        '',
        `### Path-Risk Refinement`,
        `| Sub-category | Count | Notes |`,
        `|--------------|-------|-------|`,
        ...pathRiskBreakdown,
        '',
    ];

    // High-priority production findings
    if (productionHighFindings.length > 0) {
        report.push(`### ⚠ High-Confidence Production Risks (${productionHighFindings.length})`);
        report.push('| File | Line | Pattern | Risk Kind |');
        report.push('|------|------|---------|-----------|');
        for (const f of productionHighFindings.slice(0, 20)) {
            report.push(`| ${f.file} | ${f.line} | \`${f.pattern}\` | ${f.riskKind} |`);
        }
        report.push('');
    } else {
        report.push(`### ✅ No High-Confidence Production Risks`);
        report.push(`_All ${rustResult.summary.productionFindings} production-context findings are medium or low confidence._`);
        report.push('');
    }

    // Top production files to review
    if (prodFilesWithFindings.size > 0) {
        report.push(`### Production Files to Review (${prodFilesWithFindings.size} files)`);
        report.push('| File | Findings |');
        report.push('|------|----------|');
        const prodFileCounts = new Map<string, number>();
        for (const f of prodFindings) prodFileCounts.set(f.file, (prodFileCounts.get(f.file) ?? 0) + 1);
        const topProd = [...prodFileCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
        for (const [file, count] of topProd) {
            report.push(`| ${file} | ${count} |`);
        }
        report.push('');
    }

    // Test-file findings (expected, low priority)
    if (rustResult.summary.testFindings > 0) {
        report.push(`### Test-File Expected Patterns (${rustResult.summary.testFindings} signals)`);
        report.push(`_These findings are in test/fixture files. \`unwrap()\` / \`expect()\` / \`panic!()\` are expected in test code._`);
        report.push('');
        report.push(`- ${rustResult.summary.unwrapExpect} unwrap/expect calls — normal in test assertions`);
        if (rustResult.summary.panicTodo > 0) report.push(`- ${rustResult.summary.panicTodo} panic/todo signals — verify intentional test panics`);
        if (rustResult.summary.pathRelativeTraversal > 0) report.push(`- ${rustResult.summary.pathRelativeTraversal} relative path traversals — verify test fixture paths`);
        report.push('');
    }

    // Unwrap/expect breakdown by context
    report.push(`### Unwrap/Expect Context Breakdown`);
    const unwrapProd = rustResult.findings.filter(f => isProduction(f) && (f.riskKind === 'unwrap_review_signal' || f.riskKind === 'expect_review_signal'));
    const unwrapTest = rustResult.findings.filter(f => !isProduction(f) && (f.riskKind === 'unwrap_review_signal' || f.riskKind === 'expect_review_signal'));
    report.push(`- Production: ${unwrapProd.length} (review worthy — confidence ${unwrapProd.length > 0 ? 'medium' : 'n/a'})`);
    report.push(`- Test/Fixture: ${unwrapTest.length} (expected — confidence downgraded to low)`);
    report.push('');

    // Symbol summary
    report.push(`## 4. Rust Symbol Extraction`);
    report.push(`- Total symbols: ${rustSymbolResult.summary.total} | Functions: ${rustSymbolResult.summary.totalFunctions} (${rustSymbolResult.summary.pubFunctions} public)`);
    report.push(`- Structs: ${rustSymbolResult.summary.structs} | Enums: ${rustSymbolResult.summary.enums} | Traits: ${rustSymbolResult.summary.traits}`);
    report.push(`- Impls: ${rustSymbolResult.summary.impls} | Modules: ${rustSymbolResult.summary.modules} | Tests: ${rustSymbolResult.summary.tests}`);
    report.push('');

    // Filename-level (existing)
    report.push(`## 5. Filename-Level Risk Scan`);
    report.push(`- Risk warnings: **${auditResult.risks.totalRiskWarnings}**`);
    report.push('');

    // Resource budgets
    report.push(`## 6. Resource Budgets`);
    report.push(`| Budget | Limit | Used | Status |`);
    report.push(`|--------|-------|------|--------|`);
    report.push(`| Compute | ${computeBudget.budgetLimit}s | ${(totalMs / 1000).toFixed(1)}s | ${computeBudget.status} |`);
    report.push(`| Content | ${(contentResult.budget.maxTotalBytes / (1024 * 1024)).toFixed(0)}MB | ${(contentResult.budgetUsed.totalBytes / (1024 * 1024)).toFixed(1)}MB | within_budget |`);
    report.push(`| Overall | healthy | **${health.overallResourceHealth.toUpperCase()}** | — |`);
    report.push('');

    // Forecast
    report.push(`## 7. Forecast`);
    report.push(`- Bottleneck: ${forecast.predictedBottleneck}`);
    report.push(`- Action: ${forecast.recommendedAction}`);
    report.push('');

    // Benchmark
    report.push(`## 8. Benchmark`);
    report.push(`- Passed: ${benchmarkSuite.summary.passed} / Failed: ${benchmarkSuite.summary.failed} | ${benchmarkSuite.totalElapsedMs}ms`);
    report.push('');

    // Limitations
    report.push(`## 9. Limitations`);
    report.push(`- **Evidence level:** surface_detected — No Rust AST parser. Regex-based pattern matching only.`);
    report.push(`- **File context:** Path-based heuristic (\`/tests/\`, \`/src/\`, \`/benches/\`). May misclassify unusual layouts.`);
    report.push(`- **Confidence:** Rule-based. Test-file unwrap/expect/panic are downgraded to low. No ML or semantic analysis.`);
    report.push(`- **Path-risk detection:** \`filesystem_path_from_variable\` uses regex to detect non-literal arguments — may miss indirect variable usage.`);
    report.push(`- **Low-confidence findings are still signals** — they are not false positives, just weaker evidence.`);
    report.push(`- **Budget:** 50MB / 500 files / 2MB per file. Large repos partially audited.`);
    report.push('');

    // Recommendations
    report.push(`## 10. Recommendations`);
    if (productionHighFindings.length > 0) {
        report.push(`- **IMMEDIATE:** ${productionHighFindings.length} high-confidence production risks require review.`);
    }
    if (rustResult.summary.productionFindings > 0 && productionHighFindings.length === 0) {
        report.push(`- Production findings are present but all medium/low confidence. Review at standard cadence.`);
    }
    if (rustResult.summary.testFindings > 0) {
        report.push(`- ${rustResult.summary.testFindings} test-file signals — expected patterns. No action needed unless test panics are unintended.`);
    }
    if (rustResult.summary.pathRelativeTraversal > 0) {
        report.push(`- ${rustResult.summary.pathRelativeTraversal} relative traversal patterns detected. Verify path bounds.`);
    }
    report.push(`- Resource health: **${health.overallResourceHealth}**.`);
    report.push('', '---', '*v3.1 Calibrated Audit. v3.0 made it real. v3.1 makes it precise.*');

    const outPath = path.join(origCwd, 'reports', 'v3_1_calibrated_audit.md');
    await fs.writeFile(outPath, report.join('\n'), 'utf-8');
    process.chdir(origCwd);

    console.log(`\n═══ v3.1 Calibrated Audit Complete ═══`);
    console.log(`  Target: ${root}`);
    console.log(`  Production signals: ${rustResult.summary.productionFindings} | Test signals: ${rustResult.summary.testFindings}`);
    console.log(`  High×High: ${sv.highHigh} | High×Med: ${sv.highMedium} | Unwrap (prod/test): ${unwrapProd.length}/${unwrapTest.length}`);
    console.log(`  Find full report: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });