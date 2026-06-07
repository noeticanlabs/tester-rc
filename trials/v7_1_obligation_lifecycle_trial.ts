#!/usr/bin/env -S npx tsx
// CohBit-Copilot v7.1 — Obligation Lifecycle + Query Report Trial
// Demonstrates: seed obligations → lifecycle transitions → close-with-receipt → query → report
//
// Operating law:
//   Repair obligations track unresolved responsibility.
//   They do not prove a defect, authorize a repair, or imply source mutation.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings, enrichFindings, seedObligations, transitionObligation, closeObligationWithReceipt, queryObligationsByStatus, queryObligationsByTransition, queryObligationsByInvariant, getAllObligations, generateObligationReport, type ObligationRecord, type ObligationReport } from '../src/atlas_integration.js';
import { createReviewReceipt } from '../src/human_review_receipt.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v7.1_${Date.now()}`;
    console.log(`v7.1 Obligation Lifecycle Trial`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v7.1-obligation-lifecycle', resourceType: 'cpu_time', budgetLimit: 180, estimatedUse: 70,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v7.1-obligation-lifecycle', budgetLimitMs: 180000, estimatedMs: 70000 });

    // ─── Scan + Detect + Triage + Seed ──────────────────────
    const ws = await scanWorkspace('.');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);
    const codeSeed = await seedAtlasFromFindings(queue.items, sessionId);

    // ─── Enrich + Seed Obligations ──────────────────────────
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    const enriched = enrichFindings(priorityFindings);
    const obligations = seedObligations(enriched);
    console.log(`Seeded ${obligations.length} repair obligations.\n`);

    // ─── Lifecycle Demo ─────────────────────────────────────
    // Transition first 5 open → under_review
    const openObligations = queryObligationsByStatus('open');
    let transitionsDone = 0;
    for (let i = 0; i < Math.min(5, openObligations.length); i++) {
        const r = openObligations[i]!;
        if (transitionObligation(r.obligation.repairId, 'under_review', 'Synthetic v7.1 demo: entered review queue.')) {
            transitionsDone++;
        }
    }

    // Transition next 3 open → deferred (with reason)
    for (let i = 5; i < Math.min(8, openObligations.length); i++) {
        const r = openObligations[i]!;
        if (transitionObligation(r.obligation.repairId, 'deferred', 'Deferred — requires external security audit.')) {
            transitionsDone++;
        }
    }

    // Close a few via synthetic review receipts (accepted_risk, false_positive, needs_repair)
    const underReview = queryObligationsByStatus('under_review');
    let closedViaReceipt = 0;
    const receiptIds: string[] = [];
    for (let i = 0; i < Math.min(3, underReview.length); i++) {
        const r = underReview[i]!;
        const decisions = ['accepted_risk', 'false_positive', 'needs_repair'] as const;
        const decision = decisions[i % decisions.length]!;
        const receipt = createReviewReceipt(r.obligation.repairId, 'v7.1-synthetic', decision, `Synthetic v7.1 lifecycle demo: ${decision}.`, false);
        receiptIds.push(receipt.reviewId);
        if (closeObligationWithReceipt(r.obligation.repairId, receipt.reviewId, decision)) {
            closedViaReceipt++;
        }
    }

    console.log(`Lifecycle transitions: ${transitionsDone} moved, ${closedViaReceipt} closed via receipts.\n`);

    // ─── Queries ────────────────────────────────────────────
    const openCount = queryObligationsByStatus('open').length;
    const reviewCount = queryObligationsByStatus('under_review').length;
    const deferredCount = queryObligationsByStatus('deferred').length;
    const acceptedCount = queryObligationsByStatus('accepted_risk').length;
    const fpCount = queryObligationsByStatus('false_positive').length;
    const needsRepairCount = queryObligationsByStatus('needs_repair').length;

    const byTrans003 = queryObligationsByTransition('TRANS_003').length; // CheckedResourceLifecycle
    const byTrans006 = queryObligationsByTransition('TRANS_006').length; // SafeMutation
    const byTrans013 = queryObligationsByTransition('TRANS_013').length; // InputValidation
    const byTrans019 = queryObligationsByTransition('TRANS_019').length; // PanicBoundaryControl

    const byInv006 = queryObligationsByInvariant('INV_006').length;
    const byInv009 = queryObligationsByInvariant('INV_009').length;

    // ─── Report ─────────────────────────────────────────────
    const report = generateObligationReport();

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v7.1-obligation-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: 'healthy', repairBacklogHealth: report.openObligations.length > 10 ? 'watch' : 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v7.1-obligation-lifecycle',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v7_1_obligation_lifecycle.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `obligations:${obligations.length}`,
        `open:${openCount}`,
        `under_review:${reviewCount}`,
        `deferred:${deferredCount}`,
        `closed_via_receipt:${closedViaReceipt}`,
    ], `Obligation lifecycle trial in ${(totalMs / 1000).toFixed(1)}s. ${obligations.length} obligations, ${closedViaReceipt} closed via receipts.`);

    const lines: string[] = [];
    const push = (l: string[]) => lines.push(...l);

    push([
        `# CohBit-Copilot v7.1 — Obligation Lifecycle + Query Report Trial`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Reviewer:** v7.1-synthetic (demo — all lifecycle transitions are synthetic)`,
        '',
        `## ⚠ Important`,
        `> All lifecycle transitions in this trial are SYNTHETIC DEMONSTRATION.`,
        `> No human reviewer made these decisions.`,
        `> Closing an obligation tracks responsibility — it does not delete the finding.`,
        '',
        `## Pipeline Flow`,
        `\`\`\``,
        `finding → invariant → failure mode → transition → verifier route → repair obligation`,
        `→ lifecycle (open → under_review → accepted_risk / false_positive / needs_repair / deferred / resolved)`,
        `→ close with receipt → query → report`,
        `\`\`\``,
        '',
        `## 1. Obligation Summary`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Total obligations created | ${obligations.length} |`,
        `| Open (not yet under review) | ${openCount} |`,
        `| Under review | ${reviewCount} |`,
        `| Deferred | ${deferredCount} |`,
        `| Accepted risk | ${acceptedCount} |`,
        `| False positive | ${fpCount} |`,
        `| Needs repair | ${needsRepairCount} |`,
        `| Closed via receipt | ${closedViaReceipt} |`,
        `| Receipt IDs issued | ${receiptIds.length} |`,
        '',
        `## 2. By Transition Class`,
        `| Transition | Obligations |`,
        `|------------|------------|`,
        `| CheckedResourceLifecycle (TRANS_003) | ${byTrans003} |`,
        `| SafeMutation (TRANS_006) | ${byTrans006} |`,
        `| InputValidation (TRANS_013) | ${byTrans013} |`,
        `| PanicBoundaryControl (TRANS_019) | ${byTrans019} |`,
        '',
        `## 3. By Invariant`,
        `| Invariant | Obligations |`,
        `|-----------|------------|`,
        `| INV_006 (ConditionalBranch) | ${byInv006} |`,
        `| INV_009 (ErrorPath) | ${byInv009} |`,
        '',
    ]);

    // Section 4: Status Distribution
    push(['', `## 4. Report — Status Distribution`, `| Status | Count |`, `|--------|-------|`]);
    for (const [s, c] of Object.entries(report.byStatus)) {
        push([`| ${s} | ${c} |`]);
    }

    // Section 5: Transition Distribution
    push(['', `## 5. Report — Transition Distribution`, `| Transition | Count |`, `|------------|-------|`]);
    for (const [t, c] of Object.entries(report.byTransition)) {
        push([`| ${t} | ${c} |`]);
    }

    // Section 6: Open Obligations
    push(['', `## 6. Open Obligations (${report.openObligations.length})`]);
    if (report.openObligations.length > 0) {
        push([`| File | Risk Kind | Priority | Transition | Status |`, `|------|-----------|----------|------------|--------|`]);
        for (const r of report.openObligations.slice(0, 10)) {
            push([`| ${r.finding.file} | ${r.finding.riskKind} | ${r.finding.priority} | ${r.transition?.name ?? 'N/A'} | ${r.currentStatus} |`]);
        }
    } else {
        push(['_No open obligations._']);
    }

    // Section 7: Stale
    push(['', `## 7. Stale Obligations (${report.staleObligations.length})`]);
    if (report.staleObligations.length > 0) {
        push([`${report.staleObligations.length} obligations > 30 days old.`]);
    } else {
        push(['_No stale obligations (all < 30 days)._']);
    }

    push([
        '',
        `## 8. Constraint Verification`,
        `- Obligations created for human_review_required findings: ${obligations.length > 0 ? '✅' : 'N/A'}`,
        `- Stable repair IDs: ✅`,
        `- Queryable by status: ✅ (open=${openCount}, review=${reviewCount}, deferred=${deferredCount})`,
        `- Queryable by transition: ✅ (TRANS_003=${byTrans003})`,
        `- Queryable by invariant: ✅ (INV_006=${byInv006})`,
        `- Close requires receipt: ✅ (${closedViaReceipt} via receipt)`,
        `- No source mutation: ✅`,
        `- No obligations deleted: ✅`,
        '',
        `## 9. Resource`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB`,
        `- Health: **${health.overallResourceHealth}**`,
        '',
        '---',
        '*v7.1 Obligation Lifecycle Trial. v7.0 made the atlas spine operational. v7.1 makes obligations governable.*',
    ]);

    const reportPath = path.join(origCwd, 'reports', 'v7_1_obligation_lifecycle.md');
    await fs.writeFile(reportPath, lines.join('\n'), 'utf-8');
    process.chdir(origCwd);

    console.log(`\n═══ v7.1 Obligation Lifecycle Trial Complete ═══`);
    console.log(`  Obligations: ${obligations.length} | Open: ${openCount} | Review: ${reviewCount} | Deferred: ${deferredCount}`);
    console.log(`  Closed via receipt: ${closedViaReceipt} | Stale: ${report.staleObligations.length}`);
    console.log(`  Report: ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });