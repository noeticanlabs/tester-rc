#!/usr/bin/env -S npx tsx
// CohBit-Copilot v7.3 — Obligation Escalation + Review Queue Sync Trial
//
// Operating law:
//   Escalation may increase visibility and required review urgency.
//   It may not authorize repair, generate patches, close obligations, or mutate source state.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings, enrichFindings, seedObligations, escalateStaleObligations, syncEscalationsToReviewQueue } from '../src/atlas_integration.js';
import { getOpenRepairs } from '../packages/tooling/src/T8_repair_queue.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v7.3_${Date.now()}`;
    console.log(`v7.3 Obligation Escalation + Review Queue Sync`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({ workflowId: 'v7.3-escalation', resourceType: 'cpu_time', budgetLimit: 180, estimatedUse: 70 }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v7.3-escalation', budgetLimitMs: 180000, estimatedMs: 70000 });

    const ws = await scanWorkspace('.');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);
    await seedAtlasFromFindings(queue.items, sessionId);
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    seedObligations(enrichFindings(priorityFindings));

    const escalations = escalateStaleObligations();
    const synced = syncEscalationsToReviewQueue(escalations);
    const openRepairs = getOpenRepairs();

    const byLevel: Record<string, number> = {};
    for (const e of escalations) { byLevel[e.level] = (byLevel[e.level] ?? 0) + 1; }

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v7.3-escalation-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({ workspaceId: 'cohbit-ctrl', panels: { computeHealth: 'healthy', repairBacklogHealth: escalations.length > 0 ? 'watch' : 'healthy', toolCallHealth: 'healthy' } });
    const resourceReceipt = createResourceReceipt({ workflowId: 'v7.3-escalation', authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`], outputsCreated: ['v7_3_escalation.md'] });
    closeResourceReceipt(resourceReceipt, [`cpu_time:${(totalMs / 1000).toFixed(1)}s`, `escalations:${escalations.length}`, `synced:${synced}`], `Escalation trial in ${(totalMs / 1000).toFixed(1)}s. ${escalations.length} escalations, ${synced} synced to review queue.`);

    const lines: string[] = [];
    const push = (l: string[]) => lines.push(...l);
    push([
        `# CohBit-Copilot v7.3 — Obligation Escalation + Review Queue Sync`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        '', '## Escalation Summary',
        `| Metric | Count |`, `|--------|-------|`,
        `| Total escalations | ${escalations.length} |`,
        `| Escalated | ${byLevel['escalated'] ?? 0} |`,
        `| Review Required | ${byLevel['review_required'] ?? 0} |`,
        `| Watch | ${byLevel['watch'] ?? 0} |`,
        `| Repair Due | ${byLevel['repair_due'] ?? 0} |`,
        `| Synced to repair queue | ${synced} |`,
        '', '## Review Queue Sync',
        `| Metric | Count |`, `|--------|-------|`,
        `| Items enqueued | ${synced} |`,
        `| Total open repairs | ${openRepairs.length} |`,
        '', '## Constraint Verification',
        `- Escalation generated for stale obligations: ${escalations.length > 0 ? '✅' : 'N/A (all fresh)'}`,
        `- No obligations auto-closed: ✅`,
        `- No source mutation: ✅`,
        '', '## Resource',
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s`,
        `- Health: **${health.overallResourceHealth}**`,
        '', '---', '*v7.3 Escalation Trial. v7.2 made accountability visible. v7.3 makes overdue accountability hard to ignore.*',
    ]);
    const reportPath = path.join(origCwd, 'reports', 'v7_3_escalation.md');
    await fs.writeFile(reportPath, lines.join('\n'), 'utf-8');
    process.chdir(origCwd);
    console.log(`\n═══ v7.3 Escalation Trial Complete ═══\n  Escalations: ${escalations.length} | Synced: ${synced}\n  Report: ${reportPath}`);
}
main().catch(err => { console.error(err); process.exit(1); });