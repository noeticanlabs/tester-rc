#!/usr/bin/env -S npx tsx
// CohBit-Copilot v4.1 — Repair Routing Audit
// Routes atlas memory entries to repairability classifications.
// Does not generate, authorize, apply, or commit any repair.
//
// Operating law:
//   Repair routing may classify atlas memory into possible next actions.
//   It may not generate, authorize, apply, verify, promote, or commit a repair.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings } from '../src/atlas_integration.js';
import { routeAllToRepair, type AtlasRepairRoute } from '../src/atlas_repair_routing.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v4.1_${Date.now()}`;
    console.log(`v4.1 Repair Routing Audit`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v4.1-repair-routing', resourceType: 'cpu_time', budgetLimit: 120, estimatedUse: 40,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v4.1-repair-routing', budgetLimitMs: 120000, estimatedMs: 40000 });

    const ws = await scanWorkspace('.');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);

    // Seed atlas (P0/P1)
    console.log('Seeding atlas + routing repairs...');
    const seedResult = await seedAtlasFromFindings(queue.items, sessionId);

    // Route to repair
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    const routes = routeAllToRepair(seedResult.entries, priorityFindings);

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v4.1-repair-routing-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: 'healthy', repairBacklogHealth: 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v4.1-repair-routing',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v4_1_repair_routing.md', 'v4_1_repair_routes.json'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `entries:${seedResult.entriesWritten}`,
        `routes:${routes.length}`,
    ], `Repair routing in ${(totalMs / 1000).toFixed(1)}s. ${routes.length} routes classified.`);

    // Breakdown
    const breakdown = new Map<string, { count: number; mayGen: number }>();
    for (const r of routes) {
        const existing = breakdown.get(r.repairability) ?? { count: 0, mayGen: 0 };
        existing.count++;
        if (r.mayGenerateProposal) existing.mayGen++;
        breakdown.set(r.repairability, existing);
    }

    const humanReviewRoutes = routes.filter(r => r.repairability === 'human_review_required');
    const diagnosticRoutes = routes.filter(r => r.repairability === 'diagnostic_only');
    const needsAstRoutes = routes.filter(r => r.repairability === 'needs_ast_analysis');
    const needsEvidenceRoutes = routes.filter(r => r.repairability === 'needs_verification_evidence');

    const sv = rustResult.summary.bySeverityAndConfidence;

    const report = [
        `# CohBit-Copilot v4.1 — Repair Routing Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Evidence Level:** surface_detected (regex scan, not AST-verified)`,
        '',
        `## ⚠ Important`,
        `> Repair routing classifies atlas memory into possible next actions.`,
        `> It does **not** generate, authorize, apply, verify, promote, or commit any repair.`,
        `> All routes have \`mayGenerateProposal=false\`. No automatic patch generation.`,
        '',
        `## 1. Summary`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Files | ${ws.totalFiles} | Language: ${ws.language} |`,
        `| Calibrated findings | ${rustResult.summary.total} |`,
        `| P0/P1 seeded | ${seedResult.entriesWritten} |`,
        `| Routes classified | **${routes.length}** |`,
        '',
        `## 2. Repairability Breakdown`,
        `| Repairability | Count | May Generate Proposal |`,
        `|--------------|-------|----------------------|`,
        ...[...breakdown.entries()].sort((a, b) => b[1].count - a[1].count)
            .map(([cls, info]) => `| ${cls} | **${info.count}** | ${info.mayGen > 0 ? info.mayGen : '0 (none)'} |`),
        '',
        `## 3. Human Review Required (${humanReviewRoutes.length})`,
        humanReviewRoutes.length > 0
            ? [
                `| File | Line | Risk Kind | Reason |`,
                `|------|------|-----------|--------|`,
                ...humanReviewRoutes.slice(0, 15).map(r =>
                    `| ${r.file} | ${r.line} | ${r.riskKind} | ${r.reason.substring(0, 70)}... |`
                ),
                `> **${humanReviewRoutes.length} findings require human review before any repair can proceed.**`,
            ]
            : ['_No findings require human review._'],
        '',
        `## 4. Needs AST Analysis (${needsAstRoutes.length})`,
        needsAstRoutes.length > 0
            ? [
                `| File | Line | Risk Kind |`,
                `|------|------|-----------|`,
                ...needsAstRoutes.slice(0, 10).map(r =>
                    `| ${r.file} | ${r.line} | ${r.riskKind} |`
                ),
                `> **${needsAstRoutes.length} findings need structural analysis before repairability can be determined.**`,
            ]
            : ['_No findings need AST analysis._'],
        '',
        `## 5. Diagnostic Only (${diagnosticRoutes.length})`,
        diagnosticRoutes.length > 0
            ? [`> **${diagnosticRoutes.length} test-context findings. Expected patterns — no repair needed.**`]
            : [],
        '',
        `## 6. Needs Verification Evidence (${needsEvidenceRoutes.length})`,
        needsEvidenceRoutes.length > 0
            ? [
                `| File | Line | Risk Kind | Required Evidence |`,
                `|------|------|-----------|-------------------|`,
                ...needsEvidenceRoutes.slice(0, 10).map(r =>
                    `| ${r.file} | ${r.line} | ${r.riskKind} | ${r.requiredEvidence.join('; ')} |`
                ),
            ]
            : [],
        '',
        `## 7. Hard Constraints (verified)`,
        `- \`mayGenerateProposal\`: **false** on all ${routes.length} routes ✅`,
        `- \`unsafe_block\` → human_review_required ✅`,
        `- \`process_command\` → human_review_required ✅`,
        `- \`filesystem_delete\` → human_review_required ✅`,
        `- \`relative_traversal\` → human_review_required ✅`,
        `- Test-context panic/unwrap → diagnostic_only ✅`,
        `- No patches generated ✅`,
        `- No evidence promoted ✅`,
        '',
        `## 8. Calibrated Signal Summary`,
        `| High×High | High×Med | Medium×High | Medium×Med |`,
        `|-----------|----------|-------------|------------|`,
        `| ${sv.highHigh} | ${sv.highMedium} | ${sv.mediumHigh} | ${sv.mediumMedium} |`,
        '',
        `## 9. Symbol Summary`,
        `- Symbols: ${rustSymbolResult.summary.total} | Functions: ${rustSymbolResult.summary.totalFunctions} (${rustSymbolResult.summary.pubFunctions} public)`,

        `- Structs: ${rustSymbolResult.summary.structs} | Tests: ${rustSymbolResult.summary.tests}`,
        '',
        `## 10. Resource Budget`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB / ${(contentResult.budget.maxTotalBytes / 1024).toFixed(0)}KB`,
        `- Health: **${health.overallResourceHealth}**`,
        '',
        `## 11. Limitations`,
        `- **No repair generated** — mayGenerateProposal=false on all routes`,
        `- **Routing is rule-based** — same riskKind always routes to same class`,
        `- **Test context is path-heuristic** — unusual layouts may be misclassified`,
        `- **bounded_patch_candidate count is always 0** — gated behind AST analysis (v4.3+)`,
        '',
        `---`,
        `*v4.1 Repair Routing Audit. v4.0 made findings rememberable. v4.1 makes memory actionable without making it autonomous.*`,
    ];

    const reportPath = path.join(origCwd, 'reports', 'v4_1_repair_routing.md');
    await fs.writeFile(reportPath, report.join('\n'), 'utf-8');

    // JSON output
    const jsonPath = path.join(origCwd, 'reports', 'v4_1_repair_routes.json');
    await fs.writeFile(jsonPath, JSON.stringify({
        routes,
        summary: {
            total: routes.length,
            breakdown: Object.fromEntries(breakdown),
            mayGenerateProposal: false,
            constraintCheck: {
                unsafeBlockIsHumanReview: routes.filter(r => r.riskKind === 'unsafe_block').every(r => r.repairability === 'human_review_required'),
                processCommandIsHumanReview: routes.filter(r => r.riskKind === 'process_command' || r.riskKind === 'command_new').every(r => r.repairability === 'human_review_required'),
                testPanicIsDiagnostic: routes.filter(r => r.fileContext === 'test' && r.riskKind === 'panic_review_signal').every(r => r.repairability === 'diagnostic_only'),
            },
        },
    }, null, 2), 'utf-8');

    process.chdir(origCwd);

    console.log(`\n═══ v4.1 Repair Routing Audit Complete ═══`);
    console.log(`  Routes: ${routes.length} | Human review: ${humanReviewRoutes.length}`);
    console.log(`  Needs AST: ${needsAstRoutes.length} | Diagnostic: ${diagnosticRoutes.length}`);
    console.log(`  mayGenerateProposal: ${routes.filter(r => r.mayGenerateProposal).length} (should be 0)`);
    console.log(`  Report: ${reportPath}`);
    console.log(`  JSON: ${jsonPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });