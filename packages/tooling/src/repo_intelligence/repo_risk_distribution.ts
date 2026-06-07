// @cohbit/tooling — Repo Risk Distribution (v3.5)
// Computes risk concentration by file, module, and directory.
// Operating law: risk scores are signal-weighted, not defect-certified.

import type { EnrichedFinding } from '../T_rust_finding_enricher.js';
import type { SourceTestMapping } from './repo_test_map.js';

export interface FileRiskScore {
    file: string;
    p0: number; p1: number; p2: number; p3: number;
    total: number;
    riskScore: number;
    hasTests: boolean;
    testFiles: string[];
}

export interface ModuleRiskSummary {
    moduleName: string;
    fileCount: number;
    totalFindings: number;
    p0Count: number;
    p1Count: number;
    riskScore: number;
    testCoverage: 'covered' | 'partial' | 'uncovered';
    topFinding: string | null;
}

const P0_WEIGHT = 10;
const P1_WEIGHT = 5;
const P2_WEIGHT = 2;
const P3_WEIGHT = 1;

function deriveModuleName(file: string): string {
    const parts = file.replace(/\\/g, '/').split('/');
    const srcIdx = parts.indexOf('src');
    if (srcIdx >= 0 && parts.length > srcIdx + 1) {
        return parts[srcIdx + 1] ?? parts[parts.length - 2] ?? 'unknown';
    }
    return parts[parts.length - 2] ?? parts[parts.length - 1]?.replace(/\.[^.]+$/, '') ?? 'unknown';
}

function isProductionContext(ctx: string): boolean {
    return ctx === 'src' || ctx === 'example';
}

export function computeRiskDistribution(
    enrichedFindings: EnrichedFinding[],
    sourceTestMap: SourceTestMapping[],
    allFilePaths: string[],
): {
    fileRiskScores: FileRiskScore[];
    moduleRiskSummaries: ModuleRiskSummary[];
    topFilesToReview: FileRiskScore[];
    uncoveredHighRisk: FileRiskScore[];
} {
    // Group findings by file
    const byFile = new Map<string, EnrichedFinding[]>();
    for (const f of enrichedFindings) {
        if (!byFile.has(f.file)) byFile.set(f.file, []);
        byFile.get(f.file)!.push(f);
    }

    // Compute per-file risk scores
    const allFiles = new Set([...enrichedFindings.map(f => f.file), ...allFilePaths]);
    const fileRiskScores: FileRiskScore[] = [];

    for (const file of allFiles) {
        const findings = byFile.get(file) ?? [];
        const p0 = findings.filter(f =>
            f.severity === 'high' && f.confidence === 'high' && isProductionContext(f.fileContext)
        ).length;
        const p1 = findings.filter(f =>
            (f.severity === 'high' && f.confidence === 'medium') ||
            (f.severity === 'medium' && f.confidence === 'high' && isProductionContext(f.fileContext))
        ).length;
        const p2 = findings.filter(f =>
            (f.severity === 'high' && (f.fileContext === 'test' || f.fileContext === 'fixture')) ||
            (f.severity === 'medium' && f.confidence === 'medium') ||
            (f.severity === 'high' && f.confidence === 'low')
        ).length;
        const p3 = Math.max(0, findings.length - p0 - p1 - p2);

        const mapping = sourceTestMap.find(m => m.sourceFile === file);
        const hasTests = (mapping?.testCount ?? 0) > 0;

        fileRiskScores.push({
            file, p0, p1, p2, p3,
            total: findings.length,
            riskScore: p0 * P0_WEIGHT + p1 * P1_WEIGHT + p2 * P2_WEIGHT + p3 * P3_WEIGHT,
            hasTests,
            testFiles: mapping?.testFiles ?? [],
        });
    }

    fileRiskScores.sort((a, b) => b.riskScore - a.riskScore);
    const topFilesToReview = fileRiskScores.filter(f => f.total > 0).slice(0, 20);
    const uncoveredHighRisk = fileRiskScores.filter(f => f.riskScore > 0 && !f.hasTests);

    // Module summaries
    const byModule = new Map<string, FileRiskScore[]>();
    for (const frs of fileRiskScores) {
        const mod = deriveModuleName(frs.file);
        if (!byModule.has(mod)) byModule.set(mod, []);
        byModule.get(mod)!.push(frs);
    }

    const moduleRiskSummaries: ModuleRiskSummary[] = [];
    for (const [modName, files] of byModule) {
        const totalFindings = files.reduce((s, f) => s + f.total, 0);
        const p0Count = files.reduce((s, f) => s + f.p0, 0);
        const p1Count = files.reduce((s, f) => s + f.p1, 0);
        const riskScore = files.reduce((s, f) => s + f.riskScore, 0);
        const coveredCount = files.filter(f => f.hasTests).length;
        const testCoverage: ModuleRiskSummary['testCoverage'] =
            coveredCount === files.length ? 'covered' :
                coveredCount > 0 ? 'partial' : 'uncovered';

        const topFinding = files.find(f => f.p0 > 0)?.file ??
            files.find(f => f.p1 > 0)?.file ??
            files.find(f => f.total > 0)?.file ?? null;

        moduleRiskSummaries.push({
            moduleName: modName,
            fileCount: files.length,
            totalFindings,
            p0Count,
            p1Count,
            riskScore,
            testCoverage,
            topFinding,
        });
    }

    moduleRiskSummaries.sort((a, b) => b.riskScore - a.riskScore);
    return { fileRiskScores, moduleRiskSummaries, topFilesToReview, uncoveredHighRisk };
}