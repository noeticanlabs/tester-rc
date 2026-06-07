// CohBit-Copilot v8.1 — Integrated Audit Pipeline
// One command, one report, one JSON. Consolidates v3.0–v7.3.
// v8.1 adds: deterministic identity, obligation persistence, rerun stability.
//
// Operating law:
//   The pipeline observes, enriches, and reports. It does not authorize,
//   apply, verify, or commit source code changes. It does not mutate the
//   audited repository's source files. However, it does write side effects
//   to the local .cohbit/ directory: atlas entries, obligations, and
//   Markdown/JSON reports under reports/. These are repo-local artifacts,
//   not source mutations.

import { scanWorkspace } from './workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { extractRustSymbolBatch } from '../packages/tooling/src/T_rust_symbol_extractor.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import {
    seedAtlasFromFindings,
    enrichFindings,
    reconcileObligations,
    loadObligationStore,
    persistObligationStore,
    generateDashboard,
    escalateStaleObligations,
    generateObligationReport,
    computeContentEvidenceHash,
    type PersistedObligationStore,
    type ReconciliationResult,
} from './atlas_integration.js';
import { buildProposalsFromFindings } from './finding_to_proposal.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import { withProcessor, withProcessorSync, aggregateProcessorResults, type ProcessorFragment } from '../packages/tooling/src/resource/R21_processor_runtime.js';
import { generateProfessionalReport, generateProfessionalReportJson } from '../packages/tooling/src/T_professional_report.js';
import { buildRepoIntelligence } from '../packages/tooling/src/repo_intelligence/repo_audit_summary.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface UnifiedAuditResult {
    target: string;
    sessionId: string;
    ranAt: string;
    totalMs: number;
    summary: {
        files: number;
        contentFilesRead: number;
        contentBytesRead: number;
        totalFindings: number;
        productionFindings: number;
        testFindings: number;
        p0: number;
        p1: number;
        p2: number;
        p3: number;
        highHigh: number;
        highMedium: number;
        unsafeBlocks: number;
        filesystemWrites: number;
        processCommands: number;
        atlasEntriesWritten: number;
        graphEdges: number;
        obligations: number;
        obligationsOpen: number;
        obligStaleHigh: number;
        escalations: number;
        proposals: number;
        symbols: number;
        tests: number;
    };
    reconciliation?: ReconciliationResult;
    processorFragments?: ProcessorFragment[];
}

export async function runIntegratedAudit(targetPath: string): Promise<UnifiedAuditResult> {
    const root = path.resolve(targetPath);
    const sessionId = `v8.1_${Date.now()}`;
    const startTime = Date.now();

    const origCwd = process.cwd();
    process.chdir(root);

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v8.0-integrated-audit', resourceType: 'cpu_time', budgetLimit: 300, estimatedUse: 100,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v8.0-integrated-audit', budgetLimitMs: 300000, estimatedMs: 100000 });
    const budgetId = computeBudget.computeBudgetId;

    // R21: Track processor fragments for all audit phases
    const processorResults: { processor: import('../packages/tooling/src/resource/R21_processor_runtime.js').RuntimeProcessorResult<any>['processor']; receiptFragment: ProcessorFragment; }[] = [];

    // ─── Phase 1: Scan + Content ──────────────────────────────
    const ws = await scanWorkspace('.');
    const allFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.configFiles, ...ws.docsFiles];
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];

    // R21 Phase 1 — content_read
    const contentReadResult = withProcessorSync("content_read", budgetId, () =>
        readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 }),
        { inputSummary: `files:${readableFiles.length}`, evidenceLevel: "surface_detected" }
    );
    processorResults.push({ processor: contentReadResult.processor, receiptFragment: contentReadResult.receiptFragment });
    const contentResult = contentReadResult.result;

    // ─── Phase 2: Rust Scan + Triage ──────────────────────────

    // R21 Phase 2a — rust_risk_scan
    const rustScanResult = withProcessorSync("rust_risk_scan", budgetId, () =>
        scanRustContentBatch(contentResult.artifacts),
        { inputSummary: `artifacts:${contentResult.artifacts.length}`, evidenceLevel: "surface_detected" }
    );
    processorResults.push({ processor: rustScanResult.processor, receiptFragment: rustScanResult.receiptFragment });
    const rustResult = rustScanResult.result;

    // R21 Phase 2b — rust_ast_lite_parse
    const symbolResult = withProcessorSync("rust_ast_lite_parse", budgetId, () =>
        extractRustSymbolBatch(contentResult.artifacts),
        { inputSummary: `artifacts:${contentResult.artifacts.length}` }
    );
    processorResults.push({ processor: symbolResult.processor, receiptFragment: symbolResult.receiptFragment });
    const rustSymbolResult = symbolResult.result;

    // R21 Phase 2c — review_queue_build
    const queueResult = withProcessorSync("review_queue_build", budgetId, () =>
        buildReviewQueue(rustResult.findings),
        { inputSummary: `findings:${rustResult.summary.total}` }
    );
    processorResults.push({ processor: queueResult.processor, receiptFragment: queueResult.receiptFragment });
    const queue = queueResult.result;

    // ─── Phase 3: Atlas Memory ────────────────────────────────
    const codeSeed = await seedAtlasFromFindings(queue.items, sessionId);

    // v8.6: Rebuild atlas index to prevent duplicate index lines
    const { rebuildAtlasIndex } = await import('../packages/code-atlas/src/store.js');
    await rebuildAtlasIndex();

    // ─── Phase 3.5: Load previous obligation state ────────────
    const previousStore = await loadObligationStore();

    // ─── Phase 4: Enrich + Reconcile Obligations ──────────────
    const priorityFindings = queue.items.filter(f => f.priority === 'P0' || f.priority === 'P1');
    const enriched = enrichFindings(priorityFindings);

    // Build content evidence hash map from content artifacts
    const contentEvidenceHashes = new Map<string, string>();
    for (const artifact of contentResult.artifacts) {
        contentEvidenceHashes.set(artifact.path, computeContentEvidenceHash(artifact.text));
    }

    // R21 Phase 3 — obligation_reconcile
    const reconWrapper = withProcessorSync(
        "obligation_reconcile",
        budgetId,
        () => {
            const recon = reconcileObligations(enriched, contentEvidenceHashes, previousStore);
            recon.records; // seeds obligationStore for dashboard/escalation/report
            return recon;
        },
        { inputSummary: `findings:${priorityFindings.length} previous:${previousStore?.obligations?.length ?? 0}` },
    );
    processorResults.push({ processor: reconWrapper.processor, receiptFragment: reconWrapper.receiptFragment });
    const recon = reconWrapper.result;

    // Persist updated obligation state
    await persistObligationStore(root);

    // v8.7: Aggregate canonical patterns from obligations
    const { aggregateCanonicalPatternsFromObligations } = await import('./atlas_integration.js');
    const patternResult = await aggregateCanonicalPatternsFromObligations();

    // ─── Phase 5: Dashboard + Escalation ──────────────────────
    const dashboard = generateDashboard();
    const escalations = escalateStaleObligations();
    const obligationReport = generateObligationReport();
    const reconResult: ReconciliationResult = recon.result;

    // ─── Phase 6: Proposal Bridge ─────────────────────────────
    const contentMap = new Map<string, string>();
    for (const artifact of contentResult.artifacts) {
        contentMap.set(artifact.path, artifact.text);
    }
    const proposalResults = buildProposalsFromFindings(priorityFindings, {
        getContent: (file: string) => contentMap.get(file),
    });
    const proposals = proposalResults.filter(r => r.status === 'proposed');

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v8.0-integrated-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: root,
        panels: { computeHealth: 'healthy', repairBacklogHealth: dashboard.health.open > 10 ? 'watch' : 'healthy', toolCallHealth: 'healthy' },
    });

    // R21 Phase 4 — receipt_emit
    const receiptEmitResult = withProcessorSync(
        "receipt_emit",
        budgetId,
        () => {
            const resourceReceipt = createResourceReceipt({
                workflowId: 'v8.0-integrated-audit',
                authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`, `content_budget:${contentResult.budget.maxTotalBytes}`],
                outputsCreated: ['v8_0_integrated_audit.md', 'v8_0_integrated_audit.json'],
            });
            closeResourceReceipt(resourceReceipt, [
                `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
                `findings:${rustResult.summary.total}`,
                `atlas:${codeSeed.entriesWritten}`,
                `obligations:${obligationReport.total}`,
                `proposals:${proposals.length}`,
            ], `Integrated audit in ${(totalMs / 1000).toFixed(1)}s. ${rustResult.summary.total} findings, ${codeSeed.entriesWritten} atlas entries, ${obligationReport.total} obligations.`);
            return resourceReceipt;
        },
        { inputSummary: `findings:${rustResult.summary.total} obligations:${obligationReport.total} proposals:${proposals.length}` },
    );
    processorResults.push({ processor: receiptEmitResult.processor, receiptFragment: receiptEmitResult.receiptFragment });
    const resourceReceipt = receiptEmitResult.result;

    // R21 Phase 5 — resource_accounting
    const resourceAccountingResult = withProcessorSync(
        "resource_accounting",
        budgetId,
        () => {
            const r21Summary = aggregateProcessorResults(
                processorResults.map(r => ({ processor: r.processor, result: undefined, receiptFragment: r.receiptFragment }))
            );
            return r21Summary;
        },
        { inputSummary: `processors:${processorResults.length}` },
    );
    processorResults.push({ processor: resourceAccountingResult.processor, receiptFragment: resourceAccountingResult.receiptFragment });
    const r21Summary = resourceAccountingResult.result;

    const sv = rustResult.summary.bySeverityAndConfidence;

    // ─── Build repoIntel for professional report ─────────────────
    const repointel = buildRepoIntelligence(enriched as any, allFiles);

    // ─── v13.0 Professional Report ───────────────────────────────
    const auditId = `v13.0_${Date.now().toString(36).toUpperCase()}`;
    const proReportInput = {
        enrichedFindings: (enriched as any),
        reviewQueue: queue,
        scanResult: rustResult,
        repoIntel: repointel,
        symbolSummary: rustSymbolResult.summary,
        computeTimeMs: totalMs,
        contentBytesRead: contentResult.budgetUsed.totalBytes,
        mode: 'internal' as const,
        jsonOutputPath: path.join(origCwd, 'reports', 'v13_0_professional_audit.json'),
    };

    let proReport = generateProfessionalReport(proReportInput);
    const proJson = generateProfessionalReportJson(proReportInput, auditId);

    // ─── Trust-Kernel Evidence Section ───────────────────────────
    let rustKernelsAvailable = false;
    try {
        const { isRustVerifierAvailable: checkRust } = await import('./rust_receipt_gate.js');
        rustKernelsAvailable = checkRust();
    } catch {
        rustKernelsAvailable = false;
    }
    proReport += '\n\n';
    proReport += [
        '## Trust-Kernel Evidence (v12)',
        '',
        '| Kernel | Version | Available | Evidence-Only |',
        '|--------|---------|-----------|---------------|',
        `| Receipt Verification | v11.8 | ${rustKernelsAvailable ? '✅' : '⚠'} | ${rustKernelsAvailable ? '✅' : '⚠'} |`,
        `| Path Safety | v11.9 | ${rustKernelsAvailable ? '✅' : '⚠'} | ${rustKernelsAvailable ? '✅' : '⚠'} |`,
        `| Deterministic IDs | v12.0 | ${rustKernelsAvailable ? '✅' : '⚠'} | ${rustKernelsAvailable ? '✅' : '⚠'} |`,
        `| Audit Scanner | v12.1 | ${rustKernelsAvailable ? '✅' : '⚠'} | ${rustKernelsAvailable ? '✅' : '⚠'} |`,
        `| Policy / Admissibility | v12.2 | ${rustKernelsAvailable ? '✅' : '⚠'} | ${rustKernelsAvailable ? '✅' : '⚠'} |`,
        '',
        rustKernelsAvailable
            ? '**all available | all evidence-only | no authority seized**'
            : '> ⚠ Rust toolchain not detected — trust-kernel evidence unavailable. Install cargo + Rust to enable. See [Trust Kernel Report](docs/trust_kernel_report.md).',
        '',
    ].join('\n');

    // ─── Resource Processor Map ──────────────────────────────────
    proReport += '\n';
    proReport += '## Resource Processor Map (R21)\n\n';
    proReport += '| Processor | Logic | Evidence Level | CPU (ms) |\n';
    proReport += '|-----------|-------|---------------|----------|\n';
    for (const pr of processorResults) {
        const p = pr.processor;
        proReport += `| ${p.kind ?? 'unknown'} | ${p.logic ?? 'deterministic'} | ${p.evidenceLevel ?? 'none'} | ${p.cpuMs ?? '?'} |\n`;
    }
    proReport += '\n';

    // ─── Obligations + Reconciliation ────────────────────────────
    proReport += [
        '## Obligations & Reconciliation',
        '',
        '| Metric | Value |',
        '|--------|-------|',
        `| Total obligations | ${obligationReport.total} |`,
        `| Open | ${obligationReport.openObligations.length} |`,
        `| Stale | ${obligationReport.staleObligations.length} |`,
        `| Escalations | ${escalations.length} |`,
        `| New (this run) | ${reconResult.newCount} |`,
        `| Existing unchanged | ${reconResult.existingCount} |`,
        `| Changed | ${reconResult.changedCount} |`,
        `| Duplicates prevented | ${reconResult.duplicatesPrevented} |`,
        '',
        `---`,
        '',
        `*CohBit-Copilot v13.0 Professional Audit Report. Read-only. No mutation. Findings are review signals, not verified defects. [Trust Kernel Report →](docs/trust_kernel_report.md)*`,
        '',
    ].join('\n');

    // ─── File output ─────────────────────────────────────────────
    const reportPath = path.join(origCwd, 'reports', 'v13_0_professional_audit.md');
    await fs.mkdir(path.join(origCwd, 'reports'), { recursive: true });
    await fs.writeFile(reportPath, proReport, 'utf-8');

    const jsonPath = path.join(origCwd, 'reports', 'v13_0_professional_audit.json');
    await fs.writeFile(jsonPath, proJson, 'utf-8');

    process.chdir(origCwd);

    return {
        target: root, sessionId, ranAt: new Date().toISOString(), totalMs,
        reconciliation: reconResult,
        processorFragments: processorResults.map(r => r.receiptFragment),
        summary: {
            files: allFiles.length, contentFilesRead: contentResult.artifacts.length,
            contentBytesRead: contentResult.budgetUsed.totalBytes,
            totalFindings: rustResult.summary.total, productionFindings: rustResult.summary.productionFindings,
            testFindings: rustResult.summary.testFindings,
            p0: queue.summary.P0, p1: queue.summary.P1, p2: queue.summary.P2, p3: queue.summary.P3,
            highHigh: sv.highHigh, highMedium: sv.highMedium,
            unsafeBlocks: rustResult.summary.unsafeBlocks, filesystemWrites: rustResult.summary.filesystemWrites, processCommands: rustResult.summary.processCommands,
            atlasEntriesWritten: codeSeed.entriesWritten, graphEdges: codeSeed.edges.length,
            obligations: obligationReport.total, obligationsOpen: obligationReport.openObligations.length,
            obligStaleHigh: dashboard.aging.staleHigh.length, escalations: escalations.length,
            proposals: proposals.length, symbols: rustSymbolResult.summary.total, tests: rustSymbolResult.summary.tests,
        },
    };
}