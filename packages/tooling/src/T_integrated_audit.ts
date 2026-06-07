// @cohbit/tooling — Integrated Repo Audit Workflow
// Point it at a file list and get a governed atlas audit.
// Orchestrates: scan → route → risk → retrieval → repair → audit
// No filesystem mutation. No authority granted.

import { scanRepository, type RepoScanResult } from './T3_scanner.js';
import { routeContent, type RoutingRecord, type AtlasTarget } from './T5_router.js';
import { scanRisks, type RiskWarning } from './T7_risk_scanner.js';
import { guardRetrieval, type RetrievalCandidate, type GuardedRetrievalResult } from './T15_retrieval_guard.js';
import { REPAIR_QUEUE, getOpenRepairs, type RepairTask } from './T8_repair_queue.js';
import { generateAuditMarkdown, type AuditReport } from './T17_audit.js';
import { runBenchmarkSuite, generateBenchmarkMarkdown, type BenchmarkSuite } from './T19_benchmark.js';

// ─── Types ─────────────────────────────────────────────────────

export interface IntegratedAuditResult {
    auditId: string;
    ranAt: string;
    scan: RepoScanResult;
    routing: { sample: RoutingRecord[]; summary: { routed: number; toCode: number; toTlt: number; toMath: number; toUnknown: number; toReceipt: number; } };
    risks: { totalRiskWarnings: number; sample: RiskWarning[] };
    retrieval: GuardedRetrievalResult;
    repair: { openRepairs: number; byType: Record<string, number> };
    audit: AuditReport;
    benchmark: { summary: string; slowest: string; } | undefined;
    recommendations: string[];
}

// ─── Sample routing ────────────────────────────────────────────

function sampleRouting(files: string[]): { summary: IntegratedAuditResult['routing']['summary']; sample: RoutingRecord[] } {
    const sample = files.slice(0, 20).map(f => routeContent(f));
    const summary = { routed: files.length, toCode: 0, toTlt: 0, toMath: 0, toUnknown: 0, toReceipt: 0 };
    for (const r of sample) {
        const atlas = r.targetAtlas;
        if (atlas === 'code-atlas') summary.toCode++;
        else if (atlas === 'tlt-atlas') summary.toTlt++;
        else if (atlas === 'math-atlas') summary.toMath++;
        else if (atlas === 'receipt-engine') summary.toReceipt++;
        else summary.toUnknown++;
    }
    return { sample, summary };
}

// ─── Orchestrator ──────────────────────────────────────────────

let auditCounter = 0;

export function auditRepository(
    filePaths: string[],
    options?: {
        includeBenchmark?: boolean;
        priorCandidates?: RetrievalCandidate[];
        repairLabel?: string;
    },
): IntegratedAuditResult {
    auditCounter += 1;

    // 1. Scan
    const scan = scanRepository(filePaths);

    // 2. Route
    const routing = sampleRouting(filePaths);

    // 3. Risk
    const riskWarnings: RiskWarning[] = [];
    for (const f of filePaths.slice(0, 50)) {
        riskWarnings.push(...scanRisks(f, f));
    }

    // 4. Retrieval Guard (on prior candidates if provided)
    const retrieval = guardRetrieval(options?.priorCandidates ?? []);

    // 5. Repair queue
    const openRepairs = getOpenRepairs();
    const byType: Record<string, number> = {};
    for (const r of openRepairs) {
        byType[r.repairType] = (byType[r.repairType] ?? 0) + 1;
    }

    // 6. Audit report
    const audit = (() => {
        const report = {
            generatedAt: new Date().toISOString(),
            toolRegistry: {} as any, repairQueue: {} as any, atlasStore: {} as any,
            overallStatus: 'healthy' as 'healthy' | 'warning' | 'degraded', recommendations: [] as string[],
        };
        // Fill from available data
        if (openRepairs.length > 5) report.overallStatus = 'degraded';
        else if (openRepairs.length > 0) report.overallStatus = 'warning';
        if (riskWarnings.some(w => w.severity === 'high')) {
            report.recommendations.push('High-severity risks detected. Review risk scanner output.');
        }
        if (scan.warnings.length > 0) {
            report.recommendations.push(`Scanner warnings: ${scan.warnings.join('; ')}`);
        }
        if (retrieval.warnings.length > 0) {
            report.recommendations.push(`Retrieval guard warnings: ${retrieval.warnings.length} entries flagged.`);
        }
        return report;
    })();

    // 7. Recommendations
    const recommendations: string[] = [
        `Atlas routing: code-atlas (${routing.summary.toCode} files), tlt-atlas (${routing.summary.toTlt} files), math-atlas (${routing.summary.toMath} files).`,
    ];
    if (scan.routingRecommendation.length > 0) {
        recommendations.push(`Recommended atlas targets: ${scan.routingRecommendation.join(', ')}.`);
    }
    if (riskWarnings.length > 0) {
        const highRisks = riskWarnings.filter(w => w.severity === 'high');
        recommendations.push(`Risk scan found ${riskWarnings.length} warnings, ${highRisks.length} high-severity.`);
    }
    if (openRepairs.length > 0) {
        recommendations.push(`${openRepairs.length} open repair tasks. Complete repairs before promoting memory.`);
    }
    if (scan.detectedArtifacts.other > 0) {
        recommendations.push(`${scan.detectedArtifacts.other} files were unclassifiable. Consider adding routing rules.`);
    }

    // 8. Optional benchmark
    let benchmark: IntegratedAuditResult['benchmark'] | undefined;
    if (options?.includeBenchmark) {
        const suite = runBenchmarkSuite();
        benchmark = { summary: `Passed: ${suite.summary.passed}, Failed: ${suite.summary.failed}`, slowest: suite.summary.slowest };
    }

    return {
        auditId: `AUDIT_${String(auditCounter).padStart(6, '0')}`,
        ranAt: new Date().toISOString(),
        scan,
        routing,
        risks: { totalRiskWarnings: riskWarnings.length, sample: riskWarnings.slice(0, 10) },
        retrieval,
        repair: { openRepairs: openRepairs.length, byType },
        audit,
        benchmark,
        recommendations,
    };
}

// ─── Output formatters ─────────────────────────────────────────

export function generateIntegratedAuditMarkdown(result: IntegratedAuditResult): string {
    const lines = [
        `# CohBit-Copilot Integrated Repo Audit`,
        `**Audit ID:** ${result.auditId} | **Ran:** ${result.ranAt}`,
        '',
        '## 1. Repository Scan',
        `- Files scanned: **${result.scan.filesScanned}**`,
        `- Code files: ${result.scan.detectedArtifacts.codeFiles} | Math docs: ${result.scan.detectedArtifacts.mathDocs} | Proof files: ${result.scan.detectedArtifacts.proofFiles}`,
        `- Language docs: ${result.scan.detectedArtifacts.languageDocs} | Schemas: ${result.scan.detectedArtifacts.schemas} | Receipts: ${result.scan.detectedArtifacts.receipts}`,
        `- Other: ${result.scan.detectedArtifacts.other} | Status: ${result.scan.status}`,
    ];
    if (result.scan.warnings.length > 0) {
        lines.push(`- ⚠ Warnings: ${result.scan.warnings.join('; ')}`);
    }

    lines.push('', '## 2. Atlas Routing',
        `- Routed ${result.routing.summary.routed} files`,
        `- code-atlas: ${result.routing.summary.toCode} | tlt-atlas: ${result.routing.summary.toTlt} | math-atlas: ${result.routing.summary.toMath} | receipt-engine: ${result.routing.summary.toReceipt}`,
        `- Recommended targets: ${result.scan.routingRecommendation.join(', ')}`,
    );

    lines.push('', '## 3. Risk Scan',
        `- Total risk warnings: **${result.risks.totalRiskWarnings}**`,
    );
    for (const w of result.risks.sample) {
        lines.push(`  - \`${w.riskId}\` ${w.name} (${w.severity}): ${w.recommendedAction}`);
    }

    lines.push('', '## 4. Retrieval Guard',
        `- Accepted: ${result.retrieval.accepted.length} | Rejected: ${result.retrieval.rejected.length}`,
        `- Evidence level: ${result.retrieval.evidenceLevel}`,
    );
    if (result.retrieval.warnings.length > 0) {
        lines.push(`- Warnings: ${result.retrieval.warnings.length}`);
    }

    lines.push('', '## 5. Repair Queue',
        `- Open repairs: ${result.repair.openRepairs}`,
    );
    for (const [type, count] of Object.entries(result.repair.byType)) {
        lines.push(`  - ${type}: ${count}`);
    }

    lines.push('', '## 6. Recommendations');
    for (const r of result.recommendations) {
        lines.push(`- ${r}`);
    }

    if (result.benchmark) {
        lines.push('', '## 7. Benchmark', `- ${result.benchmark.summary}`, `- Slowest: ${result.benchmark.slowest}`);
    }

    lines.push('', '---', '*Report generated by @cohbit/tooling Integrated Repo Audit Workflow.*');
    return lines.join('\n');
}

export function generateIntegratedAuditJson(result: IntegratedAuditResult): string {
    return JSON.stringify(result, null, 2);
}