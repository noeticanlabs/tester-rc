#!/usr/bin/env -S npx tsx
// CohBit-Copilot v3.2 — Rust Finding Triage + Review Queue
// Builds a P0-P3 prioritized review queue from calibrated findings.
// Makes the audit actionable: tells reviewers what to review first and why.
//
// Operating law:
//   P0 means "review first," not "this is definitely broken."
//   Priority is a review signal, not a defect certification.
//   The queue is sorted by signal strength for practitioner utility.

import { scanWorkspace } from '../src/workspace.js';
import { auditRepository } from '../packages/tooling/src/T_integrated_audit.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue, findingsByPriority, reviewQueueToJson } from '../packages/tooling/src/T_rust_review_queue.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createToolCallBudget, recordToolCall } from '../packages/resource/src/R6_tool_calls.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    console.log(`v3.2 Triage + Review Queue Audit`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v3.2-triage-audit', resourceType: 'cpu_time', budgetLimit: 120, estimatedUse: 30,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v3.2-triage-audit', budgetLimitMs: 120000, estimatedMs: 30000 });
    const toolCallBudget = createToolCallBudget({ sessionId: 'v3.2-triage-audit', allowedToolCalls: 100 });

    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    recordToolCall(toolCallBudget);

    const contentResult = readContentFiles(readableFiles, { maxFileBytes: 2 * 1024 * 1024, maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });
    recordToolCall(toolCallBudget);

    const rustResult = scanRustContentBatch(contentResult.artifacts);
    recordToolCall(toolCallBudget);

    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    recordToolCall(toolCallBudget);

    const auditResult = auditRepository(allFiles, { includeBenchmark: false });
    recordToolCall(toolCallBudget);

    // ─── Build review queue ───────────────────────────────────
    const queue = buildReviewQueue(rustResult.findings);
    const p0 = findingsByPriority(queue, 'P0');
    const p1 = findingsByPriority(queue, 'P1');
    const p2 = findingsByPriority(queue, 'P2');

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v3.2-triage-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: {
            computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : 'healthy',
            repairBacklogHealth: auditResult.repair.openRepairs > 0 ? 'watch' : 'healthy',
            toolCallHealth: toolCallBudget.status === 'exhausted' ? 'scarce' : 'healthy',
        },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v3.2-triage-audit',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`, `tool_calls:${toolCallBudget.allowedToolCalls}`],
        outputsCreated: ['v3_2_triage_audit.md', 'v3_2_review_queue.json'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `findings:${rustResult.summary.total}`,
        `P0:${queue.summary.P0}`,
        `P1:${queue.summary.P1}`,
        `P2:${queue.summary.P2}`,
        `P3:${queue.summary.P3}`,
    ], `Triage audit in ${(totalMs / 1000).toFixed(1)}s. Queue: ${queue.summary.P0} P0, ${queue.summary.P1} P1, ${queue.summary.P2} P2, ${queue.summary.P3} P3.`);

    const sv = rustResult.summary.bySeverityAndConfidence;

    const report = [
        `# CohBit-Copilot v3.2 — Triaged Review Queue Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Evidence Level:** surface_detected (regex scan, not AST-verified)`,
        '',
        `## Review Queue Summary`,
        `| Priority | Count | Action |`,
        `|----------|-------|--------|`,
        `| **P0** — Immediate | **${queue.summary.P0}** | Review now |`,
        `| **P1** — Next | **${queue.summary.P1}** | Review at next opportunity |`,
        `| **P2** — Regular | **${queue.summary.P2}** | Review during maintenance |`,
        `| **P3** — Low | **${queue.summary.P3}** | Review if bandwidth permits |`,
        `| **Total** | **${queue.summary.total}** | — |`,
    ];

    // P0 findings
    if (p0.length > 0) {
        report.push('', `## 🔴 P0 — Immediate Review (${p0.length})`);
        report.push('| File | Line | Risk Kind | Severity | Confidence | Recommended Action |');
        report.push('|------|------|-----------|----------|------------|---------------------|');
        for (const f of p0.slice(0, 20)) {
            report.push(`| ${f.file} | ${f.line} | ${f.riskKind} | **${f.severity}** | **${f.confidence}** | ${f.recommendedAction.substring(0, 80)}... |`);
        }
        report.push('', `> **${p0.length} production findings with high severity and high confidence. Review immediately.**`);
    } else {
        report.push('', `## 🟢 P0 — No Immediate Review Items`);
        report.push('_No high-severity, high-confidence findings in production code._');
    }

    // P1 findings
    if (p1.length > 0) {
        report.push('', `## 🟠 P1 — Next Review (${p1.length})`);
        report.push('| File | Line | Risk Kind | Severity | Confidence | Context |');
        report.push('|------|------|-----------|----------|------------|---------|');
        for (const f of p1.slice(0, 15)) {
            report.push(`| ${f.file} | ${f.line} | ${f.riskKind} | **${f.severity}** | ${f.confidence} | ${f.fileContext} |`);
        }
    }

    // Calibration context
    report.push('', `## Calibrated Signal Summary`);
    report.push(`| Metric | Value |`);
    report.push(`|--------|-------|`);
    report.push(`| Total calibrated findings | ${rustResult.summary.total} |`);
    report.push(`| Production context | ${rustResult.summary.productionFindings} |`);
    report.push(`| Test/fixture context | ${rustResult.summary.testFindings} |`);
    report.push(`| Bench context | ${rustResult.summary.benchmarkFindings} |`);
    report.push(`| High×High severity×conf | ${sv.highHigh} |`);
    report.push(`| High×Med severity×conf | ${sv.highMedium} |`);
    report.push(`| Medium×High severity×conf | ${sv.mediumHigh} |`);
    report.push('');

    // Legacy counts
    report.push(`## Legacy Category Summary`);
    report.push(`| Category | Count |`);
    report.push(`|----------|-------|`);
    report.push(`| unwrap/expect | ${rustResult.summary.unwrapExpect} |`);
    report.push(`| panic/todo/unimpl | ${rustResult.summary.panicTodo} |`);
    report.push(`| unsafe | ${rustResult.summary.unsafeBlocks} |`);
    report.push(`| filesystem writes | ${rustResult.summary.filesystemWrites} |`);
    report.push(`| process commands | ${rustResult.summary.processCommands} |`);
    report.push('');

    // Symbol summary
    report.push(`## Symbol Extraction`);
    report.push(`- ${rustSymbolResult.summary.total} symbols — ${rustSymbolResult.summary.totalFunctions} functions (${rustSymbolResult.summary.pubFunctions} public), ${rustSymbolResult.summary.tests} tests`);
    report.push('');

    // Resource
    report.push(`## Resource Budget`);
    report.push(`- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`);
    report.push(`- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB / ${(contentResult.budget.maxTotalBytes / 1024).toFixed(0)}KB`);
    report.push(`- Health: **${health.overallResourceHealth}**`);
    report.push('');

    // Limitations
    report.push(`## Limitations`);
    report.push(`- **Evidence:** surface_detected (regex). No AST parser. Priority is review signal, not defect certification.`);
    report.push(`- **Test context:** Path-heuristic classification. P0 only triggers in production (src/example) context.`);
    report.push('');

    report.push('---', '*v3.2 Triaged Audit. v3.0 made it real. v3.1 made it precise. v3.2 makes it actionable.*');

    // Write report
    const reportPath = path.join(origCwd, 'reports', 'v3_2_triage_audit.md');
    await fs.writeFile(reportPath, report.join('\n'), 'utf-8');

    // Write machine-readable queue JSON
    const jsonPath = path.join(origCwd, 'reports', 'v3_2_review_queue.json');
    await fs.writeFile(jsonPath, reviewQueueToJson(queue), 'utf-8');

    process.chdir(origCwd);

    console.log(`\n═══ v3.2 Triage Audit Complete ═══`);
    console.log(`  Queue: P0=${queue.summary.P0} P1=${queue.summary.P1} P2=${queue.summary.P2} P3=${queue.summary.P3}`);
    console.log(`  Report: ${reportPath}`);
    console.log(`  JSON: ${jsonPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });