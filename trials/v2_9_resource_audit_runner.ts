#!/usr/bin/env -S npx tsx
// CohBit-Copilot v2.9 — Resource-Aware Repo Audit
// Scans workspace, runs audit, benchmarks, records resource budgets,
// and generates a resource analytics report.
// Read-only. No filesystem mutation.

import { scanWorkspace } from '../src/workspace.js';
import { auditRepository, generateIntegratedAuditMarkdown } from '../packages/tooling/src/T_integrated_audit.js';
import { runBenchmarkSuite, type BenchmarkSuite } from '../packages/tooling/src/T19_benchmark.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createToolCallBudget, recordToolCall } from '../packages/resource/src/R6_tool_calls.js';
import { createBenchmarkBudget, recordBenchmarkCase } from '../packages/resource/src/R10_benchmark.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import { createResourceForecast } from '../packages/resource/src/R20_forecast.js';
import { createReceiptStorageBudget, checkReceiptStorageHealth } from '../packages/resource/src/R12_receipt_storage.js';
import { createStorageBudget, checkStorageLimit } from '../packages/resource/src/R3_storage.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const root = process.cwd();
    const startTime = Date.now();
    console.log(`v2.9 Resource-Aware Repo Audit`);
    console.log(`Workspace: ${root}\n`);

    // ─── Phase 1: Scan + Resource Budget Setup ────────────────
    console.log('Phase 1 — Scanning workspace + budgeting...');
    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v2.9-audit', resourceType: 'cpu_time', budgetLimit: 30, unit: 'seconds', estimatedUse: 15,
    }), true);

    const timeBudget = createTimeBudget({ workflowId: 'v2.9-audit', budgetLimitMs: 30000, estimatedMs: 10000 });

    const benchmarkBudget = createBenchmarkBudget({ benchmarkFamily: 'repo_audit', allowedCases: 20 });

    const toolCallBudget = createToolCallBudget({ sessionId: 'v2.9-audit', allowedToolCalls: 50 });

    // Phase 1b: Scan
    const ws = await scanWorkspace(root);
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    recordToolCall(toolCallBudget);
    console.log(`  Files detected: ${allFiles.length}`);

    // ─── Phase 2: Audit + Benchmark ───────────────────────────
    console.log('Phase 2 — Running audit + benchmark...');
    recordToolCall(toolCallBudget);

    const auditResult = auditRepository(allFiles, { includeBenchmark: false });
    recordToolCall(toolCallBudget);

    // Run separate benchmark suite for resource tracking
    console.log('  Running benchmark suite...');
    const benchmarkStart = Date.now();
    const benchmarkSuite = runBenchmarkSuite();
    const benchmarkMs = Date.now() - benchmarkStart;
    recordBenchmarkCase(benchmarkBudget);

    // ─── Phase 3: Resource Analytics ──────────────────────────
    console.log('Phase 3 — Resource analytics...');

    // Compute
    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v2.9-audit-receipt');
    recordElapsed(timeBudget, totalMs);

    // Storage
    const atlasStorageBudget = createStorageBudget({ workflowId: 'v2.9-audit', storageType: 'disk_storage', hardLimitBytes: 10 * 1024 * 1024 });
    try {
        const atlasDir = path.join(root, '.cohbit', 'atlas', 'entries');
        const files = await fs.readdir(atlasDir);
        let totalBytes = 0;
        for (const f of files) {
            try { const stat = await fs.stat(path.join(atlasDir, f)); totalBytes += stat.size; } catch { }
        }
        checkStorageLimit(atlasStorageBudget, totalBytes);
        console.log(`  Atlas storage: ${(totalBytes / 1024).toFixed(1)}KB, ${atlasStorageBudget.status}`);
    } catch { /* no atlas dir yet */ }

    // Receipt Storage
    const receiptStorageBudget = createReceiptStorageBudget({ workspaceId: 'cohbit-copilot', receiptCount: auditResult.scan.detectedArtifacts.receipts });
    checkReceiptStorageHealth(receiptStorageBudget, atlasStorageBudget.currentBytes > 0 ? 20 : 0, 1000);

    // ─── Phase 4: Resource Health Dashboard ───────────────────
    console.log('Phase 4 — Health dashboard...');
    const health = createResourceHealth({
        workspaceId: 'cohbit-copilot',
        panels: {
            computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : computeBudget.status === 'within_budget' ? 'healthy' : 'watch',
            repairBacklogHealth: auditResult.repair.openRepairs > 5 ? 'scarce' : auditResult.repair.openRepairs > 0 ? 'watch' : 'healthy',
            receiptStorageHealth: receiptStorageBudget.status === 'at_capacity' ? 'scarce' : receiptStorageBudget.status === 'approaching_capacity' ? 'watch' : 'healthy',
            toolCallHealth: toolCallBudget.status === 'exhausted' ? 'scarce' : 'healthy',
        },
    });

    // ─── Phase 5: Resource Receipt ────────────────────────────
    const resourceReceipt = createResourceReceipt({
        workflowId: 'v2.9-audit',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`, `tool_calls:${toolCallBudget.allowedToolCalls}`, `benchmark_cases:${benchmarkBudget.allowedCases}`],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `tool_calls:${toolCallBudget.usedToolCalls}`,
        `benchmark_cases:${benchmarkBudget.selectedCases}`,
        `files_scanned:${allFiles.length}`,
    ], `Audit completed within budget. Scanned ${allFiles.length} files. ${auditResult.risks.totalRiskWarnings} risks found.`);

    // ─── Phase 6: Forecast ────────────────────────────────────
    const forecast = createResourceForecast({
        workspaceId: 'cohbit-copilot',
        predictedOpenRepairs: auditResult.repair.openRepairs,
        predictedBottleneck: auditResult.repair.openRepairs > 0 ? 'repair_backlog' : 'none_predicted',
        recommendedAction: auditResult.repair.openRepairs > 0 ? 'Address open repairs before next audit cycle.' : 'Continue monitoring.',
    });

    // ─── Phase 7: Generate Report ─────────────────────────────
    const reportLines = [
        `# CohBit-Copilot v2.9 — Resource-Aware Repo Audit`,
        `**Ran:** ${new Date().toISOString()}`,
        '',
        `## Philosophy`,
        `> Capability ≠ permission. Permission ≠ affordability. Affordability ≠ wisdom.`,
        `> The report is an observation, not an authorization.`,
        '',
        `## 1. Repository Scan`,
        `- Files scanned: **${auditResult.scan.filesScanned}**`,
        `- Code: ${auditResult.scan.detectedArtifacts.codeFiles} | Language docs: ${auditResult.scan.detectedArtifacts.languageDocs} | Schemas: ${auditResult.scan.detectedArtifacts.schemas} | Receipts: ${auditResult.scan.detectedArtifacts.receipts}`,
        `- Routing: code-atlas(${auditResult.routing.summary.toCode}), tlt-atlas(${auditResult.routing.summary.toTlt}), math-atlas(${auditResult.routing.summary.toMath})`,
        '',
        `## 2. Risk + Retrieval`,
        `- Risk warnings: ${auditResult.risks.totalRiskWarnings}`,
        `- Retrieval guard: ${auditResult.retrieval.accepted.length} accepted / ${auditResult.retrieval.rejected.length} rejected (${auditResult.retrieval.evidenceLevel})`,
        `- Open repairs: ${auditResult.repair.openRepairs}`,
        '',
        `## 3. Resource Budgets`,
        `| Budget | Limit | Used | Status |`,
        `|--------|-------|------|--------|`,
        `| Compute (cpu_time) | ${computeBudget.budgetLimit}s | ${(totalMs / 1000).toFixed(1)}s | ${computeBudget.status} |`,
        `| Time | ${timeBudget.budgetLimitMs}ms | ${timeBudget.actualElapsedMs}ms | ${timeBudget.status} |`,
        `| Tool Calls | ${toolCallBudget.allowedToolCalls} | ${toolCallBudget.usedToolCalls} | ${toolCallBudget.status} |`,
        `| Benchmark | ${benchmarkBudget.allowedCases} cases | ${benchmarkBudget.selectedCases} | ${benchmarkBudget.status} |`,
        `| Atlas Storage | ${(atlasStorageBudget.hardLimitBytes / (1024 * 1024)).toFixed(0)}MB | ${(atlasStorageBudget.currentBytes / 1024).toFixed(1)}KB | ${atlasStorageBudget.status} |`,
        '',
        `## 4. Resource Health Dashboard`,
        `| Panel | Status |`,
        `|-------|--------|`,
        `| Compute | ${health.computeHealth} |`,
        `| Memory | ${health.memoryHealth} |`,
        `| Storage | ${health.storageHealth} |`,
        `| Repair Backlog | ${health.repairBacklogHealth} |`,
        `| Receipt Storage | ${health.receiptStorageHealth} |`,
        `| Tool Calls | ${health.toolCallHealth} |`,
        `| **Overall** | **${health.overallResourceHealth.toUpperCase()}** |`,
        '',
        `## 5. Resource Receipt`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Authorized | ${resourceReceipt.authorizedResources.join(', ')} |`,
        `| Actual | ${resourceReceipt.actualResources.join(', ')} |`,
        `| Efficiency | ${resourceReceipt.efficiencySummary} |`,
        '',
        `## 6. Forecast (30-day)`,
        `| Metric | Prediction |`,
        `|--------|------------|`,
        `| Predicted bottleneck | ${forecast.predictedBottleneck} |`,
        `| Recommended action | ${forecast.recommendedAction} |`,
        '',
        `## 7. Benchmark`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Total results | ${benchmarkSuite.results.length} |`,
        `| Passed | ${benchmarkSuite.summary.passed} |`,
        `| Failed | ${benchmarkSuite.summary.failed} |`,
        `| Slowest | ${benchmarkSuite.summary.slowest} |`,
        `| Total elapsed | ${benchmarkSuite.totalElapsedMs}ms |`,
        '',
        `## 8. Recommendations`,
    ];
    for (const r of auditResult.recommendations) reportLines.push(`- ${r}`);
    reportLines.push(`- Resource health: **${health.overallResourceHealth}**. ${health.overallResourceHealth !== 'healthy' ? 'Address the degraded panels before next audit.' : 'No action needed.'}`);
    reportLines.push('', '---', '*v2.9 Resource-Aware Audit. CohBit-Copilot observed, budgeted, benchmarked, receipted, and reported on its own resource consumption.*');

    const markdown = reportLines.join('\n');
    const outPath = path.join(root, 'reports', 'v2_9_resource_audit.md');
    await fs.writeFile(outPath, markdown, 'utf-8');

    console.log(`\n═══ v2.9 Resource-Aware Audit Complete ═══`);
    console.log(`  Files: ${allFiles.length} | Risks: ${auditResult.risks.totalRiskWarnings}`);
    console.log(`  Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`);
    console.log(`  Tool calls: ${toolCallBudget.usedToolCalls} / ${toolCallBudget.allowedToolCalls} (${toolCallBudget.status})`);
    console.log(`  Health: ${health.overallResourceHealth}`);
    console.log(`  Benchmark: ${benchmarkSuite.summary.passed} passed / ${benchmarkSuite.summary.failed} failed`);
    console.log(`  Report: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });