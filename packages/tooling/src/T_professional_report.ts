// @cohbit/tooling — T Professional Audit Report Generator (v3.6)
// Generates professional-grade audit reports from v3.3–v3.5 pipeline output.
// Optionally passes through TLT claim guard for language discipline.
//
// Operating law:
//   Findings are review signals, not verified defects.
//   No claim may exceed its evidence level.
//   Report generation never mutates code.
//   Boundary status is per-finding, not just pipeline-level.

import type { EnrichedFinding } from './T_rust_finding_enricher.js';
import type { ReviewQueue, ReviewQueueItem } from './T_rust_review_queue.js';
import type { RustRiskScanResult } from './T_rust_risk_scanner.js';
import type { RepoIntelligence } from './repo_intelligence/index.js';

// ─── Report Input ────────────────────────────────────────────────

export interface ProfessionalReportInput {
    // Core findings
    enrichedFindings: EnrichedFinding[];
    reviewQueue: ReviewQueue;

    // Scanner data
    scanResult: RustRiskScanResult;

    // Repo intelligence (v3.5)
    repoIntel: RepoIntelligence;

    // Symbol counts
    symbolSummary?: { total: number; totalFunctions: number; tests: number };

    // Resource
    computeTimeMs: number;
    contentBytesRead: number;

    // Options
    mode: 'internal' | 'technical' | 'public';
    jsonOutputPath?: string;
    tltVerify?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────

function severityWeight(s: string): number {
    return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

function confidenceWeight(c: string): number {
    return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}

function border(): string {
    return '---';
}

function h1(text: string): string { return `# ${text}`; }
function h2(text: string): string { return `## ${text}`; }
function h3(text: string): string { return `### ${text}`; }

function note(text: string): string {
    return `> ⚠ ${text}`;
}

function table(headers: string[], rows: string[][]): string {
    const header = `| ${headers.join(' | ')} |`;
    const sep = `|${headers.map(() => '-------').join('|')}|`;
    const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
    return `${header}\n${sep}\n${body}`;
}

// ─── Section Generators ──────────────────────────────────────────

function execSummary(input: ProfessionalReportInput): string {
    const { reviewQueue, repoIntel, scanResult, computeTimeMs, contentBytesRead } = input;
    const s = reviewQueue.summary;
    const p0 = scanResult.summary.bySeverityAndConfidence;

    let overallStatus = 'healthy';
    if (s.P0 > 0) overallStatus = 'degraded';
    else if (s.P1 > 5) overallStatus = 'warning';

    return [
        h1('CohBit-Copilot — Professional Audit Report'),
        `**Audit ID:** PRO_${Date.now().toString(36).toUpperCase()}`,
        `**Generated:** ${new Date().toISOString()}`,
        `**Mode:** ${input.mode}`,
        '',
        h2('Executive Summary'),
        `- **Overall Status:** ${overallStatus}`,
        `- **Files analyzed:** ${repoIntel.totalFiles}`,
        `- **Findings:** ${scanResult.summary.total} total (P0: ${s.P0}, P1: ${s.P1}, P2: ${s.P2}, P3: ${s.P3})`,
        `- **Production findings:** ${scanResult.summary.productionFindings}`,
        `- **Test findings:** ${scanResult.summary.testFindings}`,
        `- **High×High:** ${p0.highHigh} | **High×Med:** ${p0.highMedium}`,
        `- **Unsafe blocks:** ${scanResult.summary.unsafeBlocks} | **FS writes:** ${scanResult.summary.filesystemWrites} | **Process commands:** ${scanResult.summary.processCommands}`,
        `- **Top risk modules:** ${repoIntel.moduleRiskSummaries.slice(0, 3).map(m => m.moduleName).join(', ')}`,
        `- **Compute:** ${(computeTimeMs / 1000).toFixed(1)}s | **Content:** ${(contentBytesRead / 1024).toFixed(0)}KB`,
        '',
        note('Findings are review signals, not verified defects. No mutation was performed during this audit.'),
        '',
    ].join('\n');
}

function repoOverview(input: ProfessionalReportInput): string {
    const { repoIntel, symbolSummary } = input;
    const fi = repoIntel.fileIndex;

    return [
        h2('Repository Overview'),
        table(
            ['Category', 'Count'],
            [
                ['Source files', String(fi.sources.length)],
                ['Test files', String(fi.tests.length)],
                ['Config files', String(fi.configs.length)],
                ['Docs', String(fi.docs.length)],
                ['Other', String(fi.others.length)],
                ['Total', String(fi.all.length)],
                ['Generated (excluded)', String(fi.generated.length)],
            ],
        ),
        '',
        symbolSummary ? [
            `**Symbols:** ${symbolSummary.total} total — ${symbolSummary.totalFunctions} functions, ${symbolSummary.tests} tests`,
        ].join('\n') : '',
        '',
        `**Source-to-test mappings:** ${repoIntel.sourceTestMap.filter(m => m.testCount > 0).length} sources have identified tests`,
    ].join('\n');
}

function riskDistribution(input: ProfessionalReportInput): string {
    const { reviewQueue, repoIntel, scanResult } = input;
    const s = reviewQueue.summary;
    const sv = scanResult.summary.bySeverityAndConfidence;

    // Top 10 modules by risk
    const topModules = repoIntel.moduleRiskSummaries.slice(0, 10);
    const modRows = topModules.map(m => [
        m.moduleName,
        String(m.fileCount),
        String(m.p0Count),
        String(m.p1Count),
        String(m.riskScore),
        m.testCoverage,
    ]);

    return [
        h2('Risk Distribution'),
        h3('Severity × Confidence Matrix'),
        table(
            ['', 'High Conf', 'Med Conf', 'Low Conf'],
            [
                ['High Sev', String(sv.highHigh), String(sv.highMedium), String(sv.highLow)],
                ['Med Sev', String(sv.mediumHigh), String(sv.mediumMedium), String(sv.mediumLow)],
                ['Low Sev', String(sv.lowHigh), String(sv.lowMedium), String(sv.lowLow)],
            ],
        ),
        '',
        h3('Priority Distribution'),
        table(
            ['Priority', 'Count', 'Action'],
            [
                ['P0', String(s.P0), 'Review immediately'],
                ['P1', String(s.P1), 'Review at next opportunity'],
                ['P2', String(s.P2), 'Review during maintenance'],
                ['P3', String(s.P3), 'Review if bandwidth permits'],
            ],
        ),
        '',
        h3('Risk by Module (Top 10)'),
        table(
            ['Module', 'Files', 'P0', 'P1', 'Risk Score', 'Test Coverage'],
            modRows,
        ),
    ].join('\n');
}

function topReviewTargets(input: ProfessionalReportInput): string {
    const { repoIntel } = input;
    const top = repoIntel.topFilesToReview.slice(0, 10);
    if (top.length === 0) return h2('Top Review Targets') + '\n\n_No findings to review._';

    const rows = top.map(f => [
        f.file,
        String(f.p0),
        String(f.p1),
        String(f.riskScore),
        f.hasTests ? '✅' : '❌',
    ]);

    return [
        h2('Top Review Targets'),
        table(['File', 'P0', 'P1', 'Risk Score', 'Tests?'], rows),
        '',
        note('Priority order: P0 (10pt) → P1 (5pt) → P2 (2pt) → P3 (1pt).'),
    ].join('\n');
}

function uncoveredHighRisk(input: ProfessionalReportInput): string {
    const { repoIntel } = input;
    const uncov = repoIntel.uncoveredHighRisk.slice(0, 10);
    if (uncov.length === 0) {
        return h2('Uncovered High-Risk Files') + '\n\n_No uncovered high-risk files detected._';
    }

    const rows = uncov.map(f => [f.file, String(f.riskScore), String(f.p0), String(f.p1)]);

    return [
        h2('Uncovered High-Risk Files'),
        note('These files have risk findings but no identified test coverage. Review and add tests before modifying.'),
        '',
        table(['File', 'Risk Score', 'P0', 'P1'], rows),
    ].join('\n');
}

function evidenceRichFindings(input: ProfessionalReportInput): string {
    const { reviewQueue } = input;
    const p0Items = reviewQueue.items.filter(i => i.priority === 'P0');
    const p1Items = reviewQueue.items.filter(i => i.priority === 'P1');
    const items = [...p0Items, ...p1Items].slice(0, 15);

    if (items.length === 0) {
        return h2('Evidence-Rich Findings') + '\n\n_No P0 or P1 findings._';
    }

    const sections: string[] = [h2('Evidence-Rich Findings (P0 + P1)')];

    for (const item of items) {
        const fnInfo = item.functionName ? ` | **Function:** ${item.functionName}` : '';
        const modInfo = item.moduleName ? ` | **Module:** ${item.moduleName}` : '';
        const pubInfo = item.isPublic ? ' | **Public:** yes' : '';
        const testInfo = item.isTestFunction ? ' | **Test context:** yes' : '';
        const implInfo = item.implContext ? ` | **Context:** ${item.implContext}` : '';

        sections.push(
            '',
            h3(`${item.priority} — ${item.riskKind}`),
            `**File:** ${item.file} | **Line:** ${item.line}${fnInfo}${modInfo}${pubInfo}${testInfo}${implInfo}`,
            '',
            `**Severity:** ${item.severity} | **Confidence:** ${item.confidence} | **Evidence:** ${item.evidenceLevel}`,
        );

        // Boundary status
        sections.push(
            `**Claim:** ${item.claimStatus ?? 'review_signal'} | **Mutation:** ${item.mutationStatus ?? 'none'} | **Proposal:** ${item.proposalStatus ?? 'not_applicable'} | **Commit:** ${item.commitStatus ?? 'not_applicable'}`,
        );

        // Code window
        if (item.codeWindow && item.codeWindow.length > 0) {
            sections.push('', '**Code:**', '```');
            for (const cw of item.codeWindow) {
                sections.push(cw);
            }
            sections.push('```');
        }

        // Evidence notes
        if (item.evidenceNotes && item.evidenceNotes.length > 0) {
            sections.push('', '**Evidence:**');
            for (const note of item.evidenceNotes) {
                sections.push(`- ${note}`);
            }
        }

        // False positive notes
        if (item.falsePositiveNotes && item.falsePositiveNotes.length > 0) {
            sections.push('', '**May be benign because:**');
            for (const note of item.falsePositiveNotes) {
                sections.push(`- ${note}`);
            }
        }

        // Recommended inspection
        if (item.recommendedInspection && item.recommendedInspection.length > 0) {
            sections.push('', '**Recommended inspection:**');
            for (const rec of item.recommendedInspection) {
                sections.push(`- ${rec}`);
            }
        }

        // Suggested evidence
        if (item.suggestedEvidence && item.suggestedEvidence.length > 0) {
            sections.push('', '**Suggested evidence:**');
            for (const ev of item.suggestedEvidence) {
                sections.push(`- ${ev}`);
            }
        }

        sections.push('', `**Recommended action:** ${item.recommendedAction}`);
        sections.push('', border());
    }

    return sections.join('\n');
}

function testCoverageSuggestions(input: ProfessionalReportInput): string {
    const { repoIntel } = input;
    const uncovered = repoIntel.sourceTestMap.filter(m => m.testCount === 0);
    const partiallyCovered = repoIntel.sourceTestMap.filter(m => m.testCount > 0 && m.testCount < 3);

    if (uncovered.length === 0 && partiallyCovered.length === 0) {
        return h2('Test Coverage Suggestions') + '\n\n_All sources have test coverage._';
    }

    const sections: string[] = [h2('Test Coverage Suggestions')];

    if (uncovered.length > 0) {
        sections.push(
            '',
            h3(`Sources with no identified tests (${uncovered.length})`),
            note('These source files have no matching test files by naming convention. Verify manually.'),
        );
        const uncovRows = uncovered.slice(0, 10).map(m => [m.sourceFile, '0']);
        sections.push(table(['Source File', 'Tests Found'], uncovRows));
    }

    if (partiallyCovered.length > 0) {
        sections.push(
            '',
            h3(`Sources with limited test coverage (${partiallyCovered.length})`),
        );
        const partRows = partiallyCovered.slice(0, 10).map(m => [m.sourceFile, String(m.testCount)]);
        sections.push(table(['Source File', 'Tests Found'], partRows));
    }

    return sections.join('\n');
}

function refusalBoundary(input: ProfessionalReportInput): string {
    const { enrichedFindings } = input;

    return [
        h2('Refusal / Proposal Boundary'),
        note('This audit observed, classified, and reported. It did NOT authorize, mutate, apply, or commit.'),
        '',
        '| Boundary | Status |',
        '|----------|--------|',
        '| Evidence level | surface_detected (regex) / syntax_checked (AST-lite) |',
        '| Claim status | review_signal (all findings) |',
        '| Mutation status | none (no files were modified) |',
        '| Proposal status | not_applicable (no proposals were generated) |',
        '| Commit status | not_applicable (no commits were authorized) |',
        '| Auto-proposal | refused (all findings are gated behind human review) |',
        '',
        `**Proposal-eligible findings:** ${enrichedFindings.filter(f =>
            f.severity === 'high' && f.confidence === 'high' && (f.fileContext === 'src' || f.fileContext === 'example')
        ).length}`,
        '',
        note('Every finding in this report is a review signal, not a certified defect. No code was mutated. No commits were made.'),
    ].join('\n');
}

function limitations(input: ProfessionalReportInput): string {
    return [
        h2('Limitations'),
        '- **Evidence level:** Regex-based pattern detection (`surface_detected`) with optional AST-lite structural context (`syntax_checked`).',
        '- **Not a Rust compiler:** Does not resolve macros, generics, or trait bounds.',
        '- **Path-heuristic test mapping:** Source-to-test mapping uses naming conventions, not symbol-level analysis.',
        '- **Guard detection is local:** Nearby guard detection scans ±3 lines only. Cross-function guards are not detected.',
        '- **Budget limits:** Content budget (50MB/500 files) may exclude large repositories.',
        '- **No runtime analysis:** Does not execute code, track allocations, or profile performance.',
        '- **Language scope:** Currently optimized for Rust. Non-Rust files receive generic file classification only.',
        '',
        note('This report is a professional audit signal. It is not a security certification, a correctness guarantee, or a replacement for human code review.'),
    ].join('\n');
}

// ─── Main Generator ──────────────────────────────────────────────

export function generateProfessionalReport(input: ProfessionalReportInput): string {
    const sections: string[] = [
        execSummary(input),
        repoOverview(input),
        riskDistribution(input),
        topReviewTargets(input),
        uncoveredHighRisk(input),
        evidenceRichFindings(input),
        testCoverageSuggestions(input),
        refusalBoundary(input),
        limitations(input),
    ];

    if (input.jsonOutputPath) {
        sections.push(
            h2('Machine-Readable Output'),
            `JSON output written to: \`${input.jsonOutputPath}\``,
            '',
            'The JSON file contains the full review queue with enriched findings, repo intelligence, and resource budget data.',
        );
    }

    sections.push(
        '',
        border(),
        '*CohBit-Copilot v3.6 Professional Audit Report. Read-only. No mutation. Findings are review signals, not verified defects.*',
    );

    return sections.join('\n\n');
}

// ─── JSON Generator ──────────────────────────────────────────────

export interface ProfessionalReportJson {
    auditId: string;
    generatedAt: string;
    mode: string;
    summary: {
        totalFiles: number;
        totalFindings: number;
        p0: number; p1: number; p2: number; p3: number;
    };
    reviewQueue: ReviewQueue;
    repoIntel: {
        topFilesToReview: { file: string; riskScore: number; p0: number; p1: number }[];
        uncoveredHighRisk: { file: string; riskScore: number }[];
        moduleRiskSummaries: { moduleName: string; riskScore: number; p0Count: number }[];
    };
    boundary: {
        mutationStatus: string;
        proposalStatus: string;
        commitStatus: string;
    };
}

export function generateProfessionalReportJson(
    input: ProfessionalReportInput,
    auditId: string,
): string {
    const { reviewQueue, repoIntel } = input;

    const json: ProfessionalReportJson = {
        auditId,
        generatedAt: new Date().toISOString(),
        mode: input.mode,
        summary: {
            totalFiles: repoIntel.totalFiles,
            totalFindings: reviewQueue.summary.total,
            p0: reviewQueue.summary.P0,
            p1: reviewQueue.summary.P1,
            p2: reviewQueue.summary.P2,
            p3: reviewQueue.summary.P3,
        },
        reviewQueue,
        repoIntel: {
            topFilesToReview: repoIntel.topFilesToReview.map(f => ({
                file: f.file, riskScore: f.riskScore, p0: f.p0, p1: f.p1,
            })),
            uncoveredHighRisk: repoIntel.uncoveredHighRisk.map(f => ({
                file: f.file, riskScore: f.riskScore,
            })),
            moduleRiskSummaries: repoIntel.moduleRiskSummaries.slice(0, 10).map(m => ({
                moduleName: m.moduleName, riskScore: m.riskScore, p0Count: m.p0Count,
            })),
        },
        boundary: {
            mutationStatus: 'none',
            proposalStatus: 'not_applicable',
            commitStatus: 'not_applicable',
        },
    };

    return JSON.stringify(json, null, 2);
}