#!/usr/bin/env -S npx tsx
// CohBit-Copilot v4.0 — Memory-Aware Atlas Audit
// Wires calibrated findings into the Code Atlas memory system.
// Stores P0/P1 findings as atlas entries, builds memory graph edges,
// and runs the retrieval guard.
//
// Operating law:
//   Atlas integration may map findings, store advisory memory, build structural
//   graph edges, and feed retrieval guard. It may not certify defects, authorize
//   repairs, mutate source files, promote evidence level, or commit state.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings } from '../src/atlas_integration.js';
import { RISK_INVARIANT_MAP } from '../src/atlas_integration.js';
import { guardRetrieval } from '../packages/tooling/src/T15_retrieval_guard.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v4.0_${Date.now()}`;
    console.log(`v4.0 Memory-Aware Atlas Audit`);
    console.log(`Target: ${root}\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v4.0-memory-audit', resourceType: 'cpu_time', budgetLimit: 120, estimatedUse: 40,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v4.0-memory-audit', budgetLimitMs: 120000, estimatedMs: 40000 });

    // ─── Scan + Content Reading ───────────────────────────────
    const ws = await scanWorkspace('.');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });

    // ─── Risk Scan + Triage ───────────────────────────────────
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const rustSymbolResult = extractRustSymbolBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);

    // ─── Atlas Seeding (P0/P1 only) ───────────────────────────
    console.log('Seeding atlas memory from P0/P1 findings...');
    const seedResult = await seedAtlasFromFindings(queue.items, sessionId);

    // ─── Retrieval Guard ──────────────────────────────────────
    const guardedRetrieval = guardRetrieval(seedResult.candidates);

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v4.0-memory-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: computeBudget.status === 'exceeded' ? 'scarce' : 'healthy', repairBacklogHealth: 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v4.0-memory-audit',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v4_0_memory_audit.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `findings:${rustResult.summary.total}`,
        `seeded:${seedResult.entriesWritten}`,
        `edges:${seedResult.edges.length}`,
    ], `Memory audit in ${(totalMs / 1000).toFixed(1)}s. ${seedResult.entriesWritten} entries, ${seedResult.edges.length} graph edges.`);

    // ─── Invariant Coverage ───────────────────────────────────
    const invariantCoverage = new Map<string, { name: string; count: number; topRisk: string }>();
    for (const entry of seedResult.entries) {
        for (const invId of entry.invariants) {
            const existing = invariantCoverage.get(invId);
            if (existing) {
                existing.count++;
            } else {
                const mapping = RISK_INVARIANT_MAP.get(entry.transitionId?.replace('TRANS_', '') ?? '');
                invariantCoverage.set(invId, {
                    name: invId,
                    count: 1,
                    topRisk: mapping?.riskKind ?? 'unknown',
                });
            }
        }
    }

    // ─── Failure Mode Coverage ────────────────────────────────
    const failureCoverage = new Map<string, { count: number; severity: string }>();
    for (const entry of seedResult.entries) {
        for (const failId of entry.riskIds) {
            const existing = failureCoverage.get(failId);
            if (existing) existing.count++;
            else failureCoverage.set(failId, { count: 1, severity: failId.startsWith('FAIL_MEM') ? 'high' : 'medium' });
        }
    }

    // ─── Report ───────────────────────────────────────────────
    const sv = rustResult.summary.bySeverityAndConfidence;

    const report = [
        `# CohBit-Copilot v4.0 — Memory-Aware Atlas Audit`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Evidence Level:** surface_detected (regex scan, not AST-verified)`,
        '',
        `## ⚠ Important`,
        `> Atlas entries in this audit are **advisory memory records** derived from surface-detected findings.`,
        `> They are **not proof of defect**, not verified repairs, and **not gate-pipeline receipts**`,
        `> unless explicitly linked to a receipt.`,
        '',
        `## 1. Summary`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Files | ${ws.totalFiles} | Language: ${ws.language} |`,
        `| Calibrated findings | ${rustResult.summary.total} |`,
        `| P0 (immediate) | **${queue.summary.P0}** |`,
        `| P1 (next) | **${queue.summary.P1}** |`,
        `| P2/P3 (lower) | ${queue.summary.P2 + queue.summary.P3} |`,
        `| P0/P1 seeded to atlas | **${seedResult.entriesWritten}** |`,
        `| Memory graph edges | ${seedResult.edges.length} |`,
        '',
        `## 2. Atlas Store`,
        `- Entries written to \`.cohbit/atlas/entries/\``,
        `- Written: ${seedResult.entriesWritten} | Errors: ${seedResult.errors.length}`,
        `- All entries: \`claimStatus=draft\`, \`evidenceLevel=surface_detected\``,
        ...(seedResult.errors.length > 0 ? [
            `- ⚠ Errors: ${seedResult.errors.join('; ')}`,
        ] : []),
        '',
        `## 3. Invariant Coverage`,
        `| Invariant | Name | Findings | Top Risk Context |`,
        `|-----------|------|----------|-----------------|`,
        ...[...invariantCoverage.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 15)
            .map(([id, info]) => `| ${id} | — | ${info.count} | ${info.topRisk} |`),
        '',
        `## 4. Failure Mode Coverage`,
        `| Failure Mode | Findings | Severity |`,
        `|-------------|----------|----------|`,
        ...[...failureCoverage.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(([id, info]) => `| ${id} | ${info.count} | **${info.severity}** |`),
        '',
        `## 5. Memory Graph Summary`,
        `- Graph ID: ${seedResult.graph?.graphId ?? 'none'}`,
        `- Total edges: ${seedResult.edges.length}`,
        `- Edge types: finding→file (uses_invariant), file→invariant (maps_to), invariant→failure_mode (blocked_by)`,
        ...(seedResult.edges.length > 0 ? [
            `- Files linked: ${new Set(seedResult.edges.map(e => e.from)).size + new Set(seedResult.edges.map(e => e.to)).size} nodes`,
        ] : []),
        '',
        `## 6. Retrieval Guard`,
        `- Candidates: ${guardedRetrieval.accepted.length} accepted / ${guardedRetrieval.rejected.length} rejected`,
        `- Evidence level: ${guardedRetrieval.evidenceLevel}`,
        ...(guardedRetrieval.warnings.length > 0 ? [`- Warnings: ${guardedRetrieval.warnings.length}`] : []),
        '',
        `## 7. Calibrated Signal Summary`,
        `| High×High | High×Med | Medium×High | Medium×Med | Low×Low |`,
        `|-----------|----------|-------------|------------|---------|`,
        `| ${sv.highHigh} | ${sv.highMedium} | ${sv.mediumHigh} | ${sv.mediumMedium} | ${sv.lowLow} |`,
        '',
        `## 8. Resource Budget`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB / ${(contentResult.budget.maxTotalBytes / 1024).toFixed(0)}KB`,
        `- Health: **${health.overallResourceHealth}**`,
        '',
        `## 9. Limitations`,
        `- **All entries are draft** — claimStatus=draft, evidenceLevel=surface_detected`,
        `- **Deterministic memory IDs only** — sha256(session+finding+file+line).slice(0,32)`,
        `- **P0/P1 only** — P2/P3 findings not stored (gated behind config)`,
        `- **Heuristic mapping** — riskKind→invariant is fixed, not context-aware`,
        `- **No cross-language edges** — Rust-only analysis`,
        `- **Append-only storage** — no deduplication or conflict resolution`,
        '',
        `---`,
        `*v4.0 Memory-Aware Audit. v3.0 made it real. v3.1 made it precise. v3.2 made it actionable. v4.0 makes it rememberable.*`,
    ];

    const outPath = path.join(origCwd, 'reports', 'v4_0_memory_audit.md');
    await fs.writeFile(outPath, report.join('\n'), 'utf-8');
    process.chdir(origCwd);

    console.log(`\n═══ v4.0 Memory-Aware Atlas Audit Complete ═══`);
    console.log(`  P0/P1 seeded: ${seedResult.entriesWritten} | Edges: ${seedResult.edges.length}`);
    console.log(`  Invariants touched: ${invariantCoverage.size} | Failure modes: ${failureCoverage.size}`);
    console.log(`  Report: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });