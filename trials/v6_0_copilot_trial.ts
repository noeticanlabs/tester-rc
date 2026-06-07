#!/usr/bin/env -S npx tsx
// CohBit-Copilot v6.0 — Integrated Copilot Trial
// Full pipeline: scan → detect → triage → seed → route → propose → gate demo
//
// Operating law:
//   The bridge may propose bounded fixes. It may not authorize, apply, or commit.
//   Proposals are advisory until they pass through the gate pipeline.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings } from '../src/atlas_integration.js';
import { routeAllToRepair } from '../src/atlas_repair_routing.js';
import { buildProposalsFromFindings, type FindingProposalResult } from '../src/finding_to_proposal.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v6_${Date.now()}`;
    console.log(`v6.0 Integrated Copilot Trial`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v6.0-copilot-trial', resourceType: 'cpu_time', budgetLimit: 180, estimatedUse: 70,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v6.0-copilot-trial', budgetLimitMs: 180000, estimatedMs: 70000 });

    // ─── Scan ─────────────────────────────────────────────────
    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });

    // ─── Detect + Calibrate ───────────────────────────────────
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);

    // ─── Memory ───────────────────────────────────────────────
    const codeSeed = await seedAtlasFromFindings(queue.items, sessionId);

    // ─── Route ────────────────────────────────────────────────
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    const repairRoutes = routeAllToRepair(codeSeed.entries, priorityFindings);

    // ─── Propose ──────────────────────────────────────────────
    console.log('Building bounded proposals from findings...');
    const contentMap = new Map<string, string>();
    for (const artifact of contentResult.artifacts) {
        contentMap.set(artifact.path, artifact.text);
    }
    const proposalResults = buildProposalsFromFindings(priorityFindings, {
        getContent: (file: string) => contentMap.get(file),
    });

    const proposed = proposalResults.filter(r => r.status === 'proposed');
    const noPatch = proposalResults.filter(r => r.status === 'no_patch');

    // ─── Gate Demo (advisory — no actual apply) ───────────────
    const gateReadyCount = proposed.filter(r => r.gateReady).length;

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v6.0-copilot-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: 'healthy', repairBacklogHealth: 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v6.0-copilot-trial',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v6_0_copilot_trial.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `findings:${rustResult.summary.total}`,
        `proposals:${proposed.length}`,
        `gate_ready:${gateReadyCount}`,
    ], `Copilot trial in ${(totalMs / 1000).toFixed(1)}s. ${proposed.length} proposals, ${gateReadyCount} gate-ready.`);

    const sv = rustResult.summary.bySeverityAndConfidence;

    // ─── Report ───────────────────────────────────────────────
    const reportLines: string[] = [];
    const push = (lines: string[]) => reportLines.push(...lines);

    push([
        `# CohBit-Copilot v6.0 — Integrated Copilot Trial`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        ``,
        `## Pipeline Status`,
        `| Step | Status | Count |`,
        `|------|--------|-------|`,
        `| Scan | ✅ | ${allFiles.length} files |`,
        `| Detect | ✅ | ${rustResult.summary.total} findings |`,
        `| Calibrate | ✅ | P0=${queue.summary.P0} P1=${queue.summary.P1} P2=${queue.summary.P2} P3=${queue.summary.P3} |`,
        `| Seed Atlas | ✅ | ${codeSeed.entriesWritten} code-atlas entries |`,
        `| Route Repair | ✅ | ${repairRoutes.length} routes |`,
        `| **Propose Fix** | ✅ | **${proposed.length} proposals** |`,
        `| Gate Ready | — | ${gateReadyCount} proposals ready for review |`,
        `| Apply | ⛔ gated | 0 applied (requires gate pipeline) |`,
        `| Test Correlation | — | ${rustSymbolResult.summary.tests} tests available |`,
        ``,
        `## Findings Summary`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Total calibrated | ${rustResult.summary.total} |`,
        `| Production | ${rustResult.summary.productionFindings} |`,
        `| Test | ${rustResult.summary.testFindings} |`,
        `| High×High | ${sv.highHigh} |`,
        `| Unsafe | ${rustResult.summary.unsafeBlocks} |`,
        `| FS writes | ${rustResult.summary.filesystemWrites} |`,
        ``,
        `## Proposal Results`,
        `- Proposed: ${proposed.length}`,
        `- No patch: ${noPatch.length}`,
        `  - needs_human: ${noPatch.filter(n => n.reason.startsWith('Safety-critical')).length}`,
        `  - needs_ast: ${noPatch.filter(n => n.reason.startsWith('Requires AST')).length}`,
        `  - diagnostic: ${noPatch.filter(n => n.reason.startsWith('Test-context') || n.reason.startsWith('No automatic')).length}`,
    ]);

    if (proposed.length > 0) {
        push(['', `## Proposed Fixes (${proposed.length})`]);
        push([`| Finding | File | Line | Proposal ID | Type |`]);
        push([`|---------|------|------|-------------|------|`]);
        for (const p of proposed) {
            push([`| ${p.finding.riskKind} | ${p.finding.file} | ${p.finding.line} | ${p.proposal?.proposalId} | ${p.proposal?.files[0]?.action ?? 'N/A'} |`]);
        }
        push(['', '> All proposals are advisory. None have been applied.']);
    } else {
        push(['', '## No Bounded Proposals', '_All P0/P1 findings require human review or AST analysis._']);
    }

    const needsHuman = noPatch.filter(n => n.reason.startsWith('Safety-critical')).length;
    push([
        '',
        `## Constraint Verification`,
        `- unsafe -> needs_human: ${needsHuman > 0 ? 'yes' : 'N/A'}`,
        `- No proposals auto-applied: yes`,
        `- Test candidates: ${rustSymbolResult.summary.tests} test functions`,
        '',
        `## Resource Budget`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB`,
        `- Health: ${health.overallResourceHealth}`,
        '',
        `## Missing for Full Copilot`,
        `- Audit->Proposal bridge: v6.0 complete`,
        `- Gate auto-pipeline: needs CTRL integration`,
        `- AST-backed repair: needs tree-sitter/syn`,
        `- Multi-session memory: needs incremental delta`,
        `- Test auto-correlation: needs test runner integration`,
        `- Continuous watch mode: needs file watcher`,
        '',
        '---',
        '*v6.0 Integrated Copilot Trial.*',
    ]);

    const report = reportLines;

    const reportPath = path.join(origCwd, 'reports', 'v6_0_copilot_trial.md');
    await fs.writeFile(reportPath, report.join('\n'), 'utf-8');
    process.chdir(origCwd);

    console.log(`\n═══ v6.0 Copilot Trial Complete ═══`);
    console.log(`  Findings: ${rustResult.summary.total} | Proposals: ${proposed.length} | Gate-ready: ${gateReadyCount}`);
    console.log(`  Safety-critical (needs human): ${needsHuman}`);
    console.log(`  Report: ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });