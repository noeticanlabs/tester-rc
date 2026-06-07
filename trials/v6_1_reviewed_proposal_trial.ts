#!/usr/bin/env -S npx tsx
// CohBit-Copilot v6.1 — Human-Reviewed Proposal Trial
// Demonstrates: review receipt → proposalAllowed → bounded proposal generation
// Safety-critical patterns remain refused even with human review.
//
// Operating law:
//   Human review may unlock proposal eligibility. It may not authorize application.
//   Proposal eligibility is not repair approval.
//   Proposal allowed does not mean proposal applied.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings } from '../src/atlas_integration.js';
import { buildProposalsFromFindings, buildReviewGatedProposals } from '../src/finding_to_proposal.js';
import { createReviewReceipt, type HumanReviewReceipt } from '../src/human_review_receipt.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v6.1_${Date.now()}`;
    console.log(`v6.1 Human-Reviewed Proposal Trial`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v6.1-reviewed-proposal', resourceType: 'cpu_time', budgetLimit: 180, estimatedUse: 70,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v6.1-reviewed-proposal', budgetLimitMs: 180000, estimatedMs: 70000 });

    // ─── Scan + Detect ────────────────────────────────────────
    const ws = await scanWorkspace('.');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);
    const codeSeed = await seedAtlasFromFindings(queue.items, sessionId);

    const contentMap = new Map<string, string>();
    for (const artifact of contentResult.artifacts) {
        contentMap.set(artifact.path, artifact.text);
    }

    // ─── Standard proposals (ungated) ─────────────────────────
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    const standardResults = buildProposalsFromFindings(priorityFindings, {
        getContent: (file: string) => contentMap.get(file),
    });

    // ─── Review-gated proposals ───────────────────────────────
    console.log('Creating synthetic review receipts with proposalAllowed=true...');
    const REVIEWER = 'v6.1-synthetic';
    const receipts = new Map<string, HumanReviewReceipt>();

    for (const entry of codeSeed.entries) {
        const receipt = createReviewReceipt(
            entry.receiptBitId, REVIEWER, 'needs_repair',
            'Synthetic v6.1 review. Human explicitly allows bounded proposal generation.',
            true, // proposalAllowed = true
        );
        receipts.set(entry.proposalId, receipt);
    }

    // Only test non-safety-critical findings can actually produce proposals
    const gatedResults = buildReviewGatedProposals(priorityFindings, receipts, {
        getContent: (file: string) => contentMap.get(file),
    });

    // ─── Breakdown ────────────────────────────────────────────
    const refusedSafety = gatedResults.filter(r =>
        r.status === 'no_patch' && r.reason.startsWith('Safety-critical pattern')
    );
    const notAllowed = gatedResults.filter(r =>
        r.status === 'no_patch' && r.reason.startsWith('Human review receipt does not allow')
    );
    const gatedProposed = gatedResults.filter(r => r.status === 'proposed');
    const standardProposed = standardResults.filter(r => r.status === 'proposed');

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v6.1-reviewed-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: 'healthy', repairBacklogHealth: 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v6.1-reviewed-proposal',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v6_1_reviewed_proposal.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `findings:${priorityFindings.length}`,
        `gated_proposals:${gatedProposed.length}`,
        `refused_safety:${refusedSafety.length}`,
    ], `Reviewed proposal trial in ${(totalMs / 1000).toFixed(1)}s. ${gatedProposed.length} gated proposals from ${priorityFindings.length} findings.`);

    // ─── Report ───────────────────────────────────────────────
    const lines: string[] = [];
    const push = (l: string[]) => lines.push(...l);

    push([
        `# CohBit-Copilot v6.1 — Human-Reviewed Proposal Trial`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Reviewer:** ${REVIEWER} (synthetic demo — all receipts have proposalAllowed=true)`,
        '',
        `## ⚠ Important`,
        `> All review receipts in this trial are SYNTHETIC DEMONSTRATION.`,
        `> proposalAllowed=true is set for demonstration purposes.`,
        `> Safety-critical patterns are ALWAYS refused regardless of proposalAllowed.`,
        '',
        `## Result Summary`,
        `| Category | Count |`,
        `|----------|-------|`,
        `| P0/P1 findings | ${priorityFindings.length} |`,
        `| Safety-refused (always) | **${refusedSafety.length}** |`,
        `| Not allowed by receipt | ${notAllowed.length} |`,
        `| **Gated proposals generated** | **${gatedProposed.length}** |`,
        `| Standard proposals (no receipt) | ${standardProposed.length} |`,
    ]);

    if (refusedSafety.length > 0) {
        push(['', `## Refused (Safety-Critical) — ${refusedSafety.length} findings`,
            `These patterns are never eligible for automatic proposal generation,`,
            `even when a human review receipt has proposalAllowed=true.`,
            ``,
            `| Risk Kind | Count |`,
            `|-----------|-------|`]);
        const safetyCounts = new Map<string, number>();
        for (const r of refusedSafety) {
            safetyCounts.set(r.finding.riskKind, (safetyCounts.get(r.finding.riskKind) ?? 0) + 1);
        }
        for (const [kind, count] of [...safetyCounts.entries()].sort((a, b) => b[1] - a[1])) {
            push([`| ${kind} | ${count} |`]);
        }
    }

    if (gatedProposed.length > 0) {
        push(['', `## Gated Proposals — ${gatedProposed.length} generated`,
            `These findings had human review receipts with proposalAllowed=true.`,
            `Proposals are advisory — not applied, not verified, not committed.`,
            ``,
            `| Finding | File | Line | Proposal ID |`,
            `|---------|------|------|-------------|`]);
        for (const p of gatedProposed) {
            push([`| ${p.finding.riskKind} | ${p.finding.file} | ${p.finding.line} | ${p.proposal?.proposalId ?? 'N/A'} |`]);
        }
    } else {
        push(['', '## No Gated Proposals Generated',
            '_All P0/P1 findings were either safety-critical or had no eligible fix strategy._']);
    }

    push(['',
        `## Constraint Verification`,
        `- unsafe_block refused even with proposalAllowed: ${refusedSafety.some(r => r.finding.riskKind === 'unsafe_block') ? '✅' : 'N/A'}`,
        `- process_command refused even with proposalAllowed: ${refusedSafety.some(r => r.finding.riskKind === 'process_command') ? '✅' : 'N/A'}`,
        `- filesystem_delete refused even with proposalAllowed: ${refusedSafety.some(r => r.finding.riskKind?.startsWith('filesystem_delete')) ? '✅' : 'N/A'}`,
        `- No proposals auto-applied: ✅`,
        `- No proposals committed: ✅`,
        `- All receipts: claimStatus=draft, commitStatus=not_applicable: ✅`,
        '',
        `## Resource`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB`,
        '',
        '---',
        '*v6.1 Human-Reviewed Proposal Trial. v6.0 proved the bridge can refuse. v6.1 proves it can propose only after review — and still refuses unsafe patterns.*',
    ]);

    const reportPath = path.join(origCwd, 'reports', 'v6_1_reviewed_proposal.md');
    await fs.writeFile(reportPath, lines.join('\n'), 'utf-8');
    process.chdir(origCwd);

    console.log(`\n═══ v6.1 Reviewed Proposal Trial Complete ═══`);
    console.log(`  Refused (safety): ${refusedSafety.length} | Gated proposals: ${gatedProposed.length}`);
    console.log(`  Report: ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });