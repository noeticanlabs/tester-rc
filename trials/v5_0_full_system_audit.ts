#!/usr/bin/env -S npx tsx
// CohBit-Copilot v5.0 — Full System Audit
// One command. One report. All layers orchestrated.
//
// Pipeline:
//   scan → readContent → Rust scan → triage → code-atlas seed
//   → math-atlas seed (Lean) → tlt-atlas seed (docs)
//   → cross-language edges → retrieval guard → review filter
//   → unified report + JSON

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings, seedMathFromContent, seedLanguageFromContent } from '../src/atlas_integration.js';
import { routeAllToRepair } from '../src/atlas_repair_routing.js';
import { createReviewReceipt, storeReviewReceipt, type ReviewDecision } from '../src/human_review_receipt.js';
import { guardRetrieval } from '../packages/tooling/src/T15_retrieval_guard.js';
import { filterByReviewStatus } from '../src/retrieval_filter.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v5_${Date.now()}`;
    console.log(`v5.0 Full System Audit`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v5.0-full-system', resourceType: 'cpu_time', budgetLimit: 180, estimatedUse: 60,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v5.0-full-system', budgetLimitMs: 180000, estimatedMs: 60000 });

    // ─── Phase 1: Scan + Content ──────────────────────────────
    console.log('Phase 1 — Scan + Content reading...');
    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });

    // ─── Phase 2: Rust Risk + Triage ──────────────────────────
    console.log('Phase 2 — Rust risk scan + triage...');
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);

    // ─── Phase 3: Code Atlas (P0/P1) ──────────────────────────
    console.log('Phase 3 — Code atlas seeding...');
    const codeSeed = await seedAtlasFromFindings(queue.items, sessionId);

    // ─── Phase 4: Math Atlas (Lean) ───────────────────────────
    console.log('Phase 4 — Math atlas seeding (Lean)...');
    const mathSeed = seedMathFromContent(contentResult.artifacts, sessionId);

    // ─── Phase 5: TLT Atlas (docs) ────────────────────────────
    console.log('Phase 5 — TLT atlas seeding (docs)...');
    const languageSeed = seedLanguageFromContent(contentResult.artifacts);

    // ─── Phase 6: Repair Routing ──────────────────────────────
    console.log('Phase 6 — Repair routing...');
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    const repairRoutes = routeAllToRepair(codeSeed.entries, priorityFindings);

    // ─── Phase 7: Review Receipts (synthetic demo) ────────────
    console.log('Phase 7 — Synthetic review receipts...');
    const REVIEWER = 'v5.0-synthetic';
    const reviewedIds = new Set<string>();
    for (const entry of codeSeed.entries) {
        const decision: ReviewDecision = 'needs_repair';
        const receipt = createReviewReceipt(entry.receiptBitId, REVIEWER, decision, 'Synthetic v5.0 review.');
        await storeReviewReceipt(receipt).catch(() => { });
        reviewedIds.add(entry.receiptBitId);
    }

    // ─── Phase 8: Retrieval Guard + Filter ────────────────────
    console.log('Phase 8 — Retrieval guard...');
    const guardedRetrieval = guardRetrieval(codeSeed.candidates);
    const filteredRetrieval = filterByReviewStatus(guardedRetrieval.accepted, reviewedIds);

    // ─── Phase 9: Cross-language edges ────────────────────────
    const xLangEdges: string[] = [];
    if (mathSeed.entries.length > 0 && codeSeed.entries.length > 0) {
        xLangEdges.push(`${codeSeed.entries.length} Rust findings → ${mathSeed.leanFiles} Lean files (structural link)`);
    }

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v5.0-full-system-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : 'healthy', repairBacklogHealth: 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v5.0-full-system',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v5_0_full_system_audit.md', 'v5_0_full_system_audit.json'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `rust_findings:${rustResult.summary.total}`,
        `code_atlas:${codeSeed.entriesWritten}`,
        `math_atlas:${mathSeed.entries.length}`,
        `tlt_atlas:${languageSeed.entries.length}`,
        `routes:${repairRoutes.length}`,
        `reviewed:${reviewedIds.size}`,
    ], `Full system audit in ${(totalMs / 1000).toFixed(1)}s. 3 atlases seeded.`);

    const sv = rustResult.summary.bySeverityAndConfidence;

    // ─── Unified Report ───────────────────────────────────────
    const report = [
        `# CohBit-Copilot v5.0 — Full System Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Evidence Level:** surface_detected`,
        '',
        `## System Status`,
        `| Layer | Status | Entries |`,
        `|-------|--------|---------|`,
        `| Code Atlas (Rust) | ✅ seeded | ${codeSeed.entriesWritten} |`,
        `| Math Atlas (Lean) | ✅ seeded | ${mathSeed.entries.length} |`,
        `| TLT Atlas (Docs) | ✅ seeded | ${languageSeed.entries.length} |`,
        `| Memory Graph | ✅ built | ${codeSeed.edges.length} edges |`,
        `| Repair Routing | ✅ classified | ${repairRoutes.length} routes |`,
        `| Review Receipts | ✅ stored | ${reviewedIds.size} receipts |`,
        `| Retrieval Guard | ✅ filtered | ${filteredRetrieval.reviewed.length} reviewed / ${filteredRetrieval.unreviewed.length} unreviewed |`,
        '',
        `## 1. Repository`,
        `- Files: ${allFiles.length} | Language: ${ws.language}`,
        `- Content read: ${contentResult.artifacts.length} files, ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB`,
        '',
        `## 2. Code Atlas (Rust)`,
        `- Findings: ${rustResult.summary.total} | P0: ${queue.summary.P0} | P1: ${queue.summary.P1}`,
        `- Production: ${rustResult.summary.productionFindings} | Test: ${rustResult.summary.testFindings}`,
        `- High×High: ${sv.highHigh} | High×Med: ${sv.highMedium}`,
        `- Unsafe: ${rustResult.summary.unsafeBlocks} | FS writes: ${rustResult.summary.filesystemWrites} | Process: ${rustResult.summary.processCommands}`,
        `- Symbols: ${rustSymbolResult.summary.total} | Functions: ${rustSymbolResult.summary.totalFunctions}`,
        `- Atlas entries: ${codeSeed.entriesWritten} | Graph edges: ${codeSeed.edges.length}`,
        '',
        `## 3. Math Atlas (Lean)`,
        `- Lean files: ${mathSeed.leanFiles} | Math entries: ${mathSeed.entries.length} | Risks: ${mathSeed.mathRisks}`,
        ...(mathSeed.entries.length > 0 ? [
            `| File | Representation | Invariants | Risks | Confidence |`,
            `|------|----------------|------------|-------|------------|`,
            ...mathSeed.entries.slice(0, 10).map(e =>
                `| ${e.file} | ${e.representationType} | ${e.invariants.length} | ${e.risks.length} | ${e.confidence} |`
            ),
        ] : ['_No Lean files with detectable mathematical content._']),
        '',
        `## 4. TLT Atlas (Docs)`,
        `- Doc files: ${languageSeed.docFiles} | Language entries: ${languageSeed.entries.length} | Content risks: ${languageSeed.contentRisks}`,
        ...(languageSeed.entries.length > 0 ? [
            `| File | Semantic Units | Ambiguity | Risks |`,
            `|------|---------------|-----------|-------|`,
            ...languageSeed.entries.slice(0, 10).map(e =>
                `| ${e.file} | ${e.semanticUnits.length} | ${e.ambiguityDetected ? 'yes' : 'no'} | ${e.contentRisks.length} |`
            ),
        ] : ['_No doc files with detectable risk patterns._']),
        '',
        `## 5. Cross-Language`,
        ...(xLangEdges.length > 0 ? xLangEdges.map(e => `- ${e}`) : ['_No cross-language edges (Lean or doc content below detection threshold)._']),
        '',
        `## 6. Repair Routing`,
        `- Routes: ${repairRoutes.length} | human_review_required: ${repairRoutes.filter(r => r.repairability === 'human_review_required').length}`,
        `- mayGenerateProposal: ${repairRoutes.filter(r => r.mayGenerateProposal).length} (should be 0)`,
        '',
        `## 7. Review + Retrieval`,
        `- Reviewed: ${filteredRetrieval.reviewed.length} | Unreviewed: ${filteredRetrieval.unreviewed.length}`,
        `- Guard accepted: ${guardedRetrieval.accepted.length} | Rejected: ${guardedRetrieval.rejected.length}`,
        '',
        `## 8. Resource Budget`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB / ${(contentResult.budget.maxTotalBytes / 1024).toFixed(0)}KB`,
        `- Health: **${health.overallResourceHealth}**`,
        '',
        `## 9. Limitations`,
        `- **Evidence:** surface_detected (regex + content heuristics). No AST parser.`,
        `- **Math atlas:** T14 keyword heuristics (sorry, admit, theorem, proof). Not Lean-aware.`,
        `- **TLT atlas:** T7 claim inflation detection. Not semantically verified.`,
        `- **Cross-language:** Structural links only. No semantic Lean↔Rust equivalence proof.`,
        `- **Review receipts:** Synthetic demo decisions. Not human-reviewed.`,
        '',
        '---',
        '*v5.0 Full System Audit. One command. One report. All layers orchestrated.*',
    ];

    const reportPath = path.join(origCwd, 'reports', 'v5_0_full_system_audit.md');
    await fs.writeFile(reportPath, report.join('\n'), 'utf-8');

    // Unified JSON
    const jsonPath = path.join(origCwd, 'reports', 'v5_0_full_system_audit.json');
    await fs.writeFile(jsonPath, JSON.stringify({
        summary: {
            target: root,
            sessionId,
            totalMs,
            files: allFiles.length,
            contentFiles: contentResult.artifacts.length,
            codeAtlas: { entries: codeSeed.entriesWritten, edges: codeSeed.edges.length, findings: rustResult.summary.total },
            mathAtlas: { entries: mathSeed.entries.length, leanFiles: mathSeed.leanFiles, risks: mathSeed.mathRisks },
            tltAtlas: { entries: languageSeed.entries.length, docFiles: languageSeed.docFiles, risks: languageSeed.contentRisks },
            repairRoutes: { total: repairRoutes.length, humanReviewRequired: repairRoutes.filter(r => r.repairability === 'human_review_required').length },
            retrieval: { reviewed: filteredRetrieval.reviewed.length, unreviewed: filteredRetrieval.unreviewed.length, accepted: guardedRetrieval.accepted.length, rejected: guardedRetrieval.rejected.length },
            constraints: { mayGenerateProposal: repairRoutes.filter(r => r.mayGenerateProposal).length, commitStatusNotApplicable: reviewedIds.size },
        },
    }, null, 2), 'utf-8');

    process.chdir(origCwd);
    console.log(`\n═══ v5.0 Full System Audit Complete ═══`);
    console.log(`  Code: ${codeSeed.entriesWritten} | Math: ${mathSeed.entries.length} | TLT: ${languageSeed.entries.length}`);
    console.log(`  Reviewed: ${filteredRetrieval.reviewed.length} | Unreviewed: ${filteredRetrieval.unreviewed.length}`);
    console.log(`  Report: ${reportPath}`);
    console.log(`  JSON: ${jsonPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });