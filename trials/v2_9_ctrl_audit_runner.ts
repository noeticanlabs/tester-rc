#!/usr/bin/env -S npx tsx
// CohBit-Copilot v2.9 — CTRL Repo Audit
// Runs the full resource-aware audit against the CohBit-CTRL project.

import { scanWorkspace } from '../src/workspace.js';
import { auditRepository } from '../packages/tooling/src/T_integrated_audit.js';
import { runBenchmarkSuite } from '../packages/tooling/src/T19_benchmark.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createToolCallBudget, recordToolCall } from '../packages/resource/src/R6_tool_calls.js';
import { createBenchmarkBudget, recordBenchmarkCase } from '../packages/resource/src/R10_benchmark.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import { createResourceForecast } from '../packages/resource/src/R20_forecast.js';
import { createReceiptStorageBudget, checkReceiptStorageHealth } from '../packages/resource/src/R12_receipt_storage.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    console.log(`v2.9 Resource-Aware CTRL Audit`);
    console.log(`Target: ${root}\n`);

    // Change to target directory for scanWorkspace (it uses process.cwd())
    const origCwd = process.cwd();
    process.chdir(root);

    const startTime = Date.now();

    // ─── Phase 1: Budget + Scan ──────────────────────────────
    console.log('Phase 1 — Budgeting + scan...');
    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v2.9-ctrl-audit', resourceType: 'cpu_time', budgetLimit: 60, estimatedUse: 20,
    }), true);

    const timeBudget = createTimeBudget({ workflowId: 'v2.9-ctrl-audit', budgetLimitMs: 60000, estimatedMs: 15000 });
    const toolCallBudget = createToolCallBudget({ sessionId: 'v2.9-ctrl-audit', allowedToolCalls: 50 });
    const benchmarkBudget = createBenchmarkBudget({ benchmarkFamily: 'ext_repo_audit', allowedCases: 20 });

    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    recordToolCall(toolCallBudget);
    console.log(`  Files: ${allFiles.length} | Language: ${ws.language}`);

    // ─── Phase 2: Audit ──────────────────────────────────────
    console.log('Phase 2 — Audit...');
    recordToolCall(toolCallBudget);
    const auditResult = auditRepository(allFiles, { includeBenchmark: false });
    recordToolCall(toolCallBudget);

    // ─── Phase 3: Benchmark ──────────────────────────────────
    console.log('Phase 3 — Benchmark...');
    const benchmarkSuite = runBenchmarkSuite();
    recordBenchmarkCase(benchmarkBudget);

    // ─── Phase 4: Resource Analytics ─────────────────────────
    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v2.9-ctrl-audit-receipt');
    recordElapsed(timeBudget, totalMs);

    // ─── Phase 5: Health Dashboard ───────────────────────────
    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: {
            computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : computeBudget.status === 'within_budget' ? 'healthy' : 'watch',
            repairBacklogHealth: auditResult.repair.openRepairs > 5 ? 'scarce' : auditResult.repair.openRepairs > 0 ? 'watch' : 'healthy',
            toolCallHealth: toolCallBudget.status === 'exhausted' ? 'scarce' : 'healthy',
        },
    });

    // ─── Phase 6: Resource Receipt ───────────────────────────
    const resourceReceipt = createResourceReceipt({
        workflowId: 'v2.9-ctrl-audit',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`, `tool_calls:${toolCallBudget.allowedToolCalls}`],
        outputsCreated: ['v2_9_ctrl_audit.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `tool_calls:${toolCallBudget.usedToolCalls}`,
        `files_scanned:${allFiles.length}`,
        `risks_found:${auditResult.risks.totalRiskWarnings}`,
    ], `Audit completed in ${(totalMs / 1000).toFixed(1)}s. ${auditResult.risks.totalRiskWarnings} risks, ${auditResult.repair.openRepairs} open repairs.`);

    // ─── Phase 7: Forecast ───────────────────────────────────
    const forecast = createResourceForecast({
        workspaceId: 'cohbit-ctrl',
        predictedOpenRepairs: auditResult.repair.openRepairs,
        predictedBottleneck: auditResult.risks.totalRiskWarnings > 5 ? 'risk_backlog' : 'none_predicted',
        recommendedAction: auditResult.repair.openRepairs > 0 ? 'Review open repairs.' : 'Continue monitoring.',
    });

    // ─── Phase 8: Report ─────────────────────────────────────
    const report = [
        `# CohBit-Copilot v2.9 — CTRL Resource-Aware Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        '',
        `## Philosophy`,
        `> Capability ≠ permission. Permission ≠ affordability. Affordability ≠ wisdom.`,
        `> The report is an observation, not an authorization.`,
        '',
        `## 1. Repository`,
        `- Files: **${auditResult.scan.filesScanned}** | Language: ${ws.language}`,
        `- Code: ${auditResult.scan.detectedArtifacts.codeFiles} | Math docs: ${auditResult.scan.detectedArtifacts.mathDocs} | Proof: ${auditResult.scan.detectedArtifacts.proofFiles} | Language docs: ${auditResult.scan.detectedArtifacts.languageDocs}`,
        `- Schemas: ${auditResult.scan.detectedArtifacts.schemas} | Receipts: ${auditResult.scan.detectedArtifacts.receipts} | Other: ${auditResult.scan.detectedArtifacts.other}`,
        '',
        `## 2. Risks + Retrieval`,
        `- Risk warnings: **${auditResult.risks.totalRiskWarnings}**`,
        `- Retrieval guard: ${auditResult.retrieval.accepted.length} accepted / ${auditResult.retrieval.rejected.length} rejected (${auditResult.retrieval.evidenceLevel})`,
        '',
        `## 3. Resource Budgets`,
        `| Budget | Limit | Used | Status |`,
        `|--------|-------|------|--------|`,
        `| Compute | ${computeBudget.budgetLimit}s | ${(totalMs / 1000).toFixed(1)}s | ${computeBudget.status} |`,
        `| Time | ${timeBudget.budgetLimitMs}ms | ${timeBudget.actualElapsedMs}ms | ${timeBudget.status} |`,
        `| Tool Calls | ${toolCallBudget.allowedToolCalls} | ${toolCallBudget.usedToolCalls} | ${toolCallBudget.status} |`,
        '',
        `## 4. Resource Health`,
        `| Panel | Status |`,
        `|-------|--------|`,
        `| Compute | ${health.computeHealth} |`,
        `| Repair Backlog | ${health.repairBacklogHealth} |`,
        `| Tool Calls | ${health.toolCallHealth} |`,
        `| **Overall** | **${health.overallResourceHealth.toUpperCase()}** |`,
        '',
        `## 5. Resource Receipt`,
        `| Authorized | ${resourceReceipt.authorizedResources.join(', ')} |`,
        `| Actual | ${resourceReceipt.actualResources.join(', ')} |`,
        `| Efficiency | ${resourceReceipt.efficiencySummary} |`,
        '',
        `## 6. Forecast (30-day)`,
        `- Bottleneck: ${forecast.predictedBottleneck}`,
        `- Action: ${forecast.recommendedAction}`,
        '',
        `## 7. Benchmark`,
        `- Passed: ${benchmarkSuite.summary.passed} / Failed: ${benchmarkSuite.summary.failed}`,
        `- Total: ${benchmarkSuite.totalElapsedMs}ms | Slowest: ${benchmarkSuite.summary.slowest}`,
        '',
        `## 8. Recommendations`,
    ];
    for (const r of auditResult.recommendations) report.push(`- ${r}`);
    report.push(`- Resource health: **${health.overallResourceHealth}**.`, '', '---', '*v2.9 CTRL Audit. CohBit-Copilot observed, budgeted, receipted, and reported on CohBit-CTRL without granting authority.*');

    const outPath = path.join(origCwd, 'reports', 'v2_9_ctrl_audit.md');
    await fs.writeFile(outPath, report.join('\n'), 'utf-8');

    // Restore cwd
    process.chdir(origCwd);

    console.log(`\n═══ v2.9 CTRL Audit Complete ═══`);
    console.log(`  Target: ${root}`);
    console.log(`  Files: ${allFiles.length} | Risks: ${auditResult.risks.totalRiskWarnings} | Language: ${ws.language}`);
    console.log(`  Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`);
    console.log(`  Health: ${health.overallResourceHealth}`);
    console.log(`  Report: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });