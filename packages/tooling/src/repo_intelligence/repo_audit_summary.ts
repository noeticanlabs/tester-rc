// @cohbit/tooling — Repo Audit Summary (v3.5)
// Orchestrator: builds the full repo intelligence report.
// Operating law: observes and reports. Does not certify, authorize, or mutate.

import type { EnrichedFinding } from '../T_rust_finding_enricher.js';
import { buildFileIndex, type RepoFileIndex } from './repo_file_index.js';
import { buildSourceTestMap, type SourceTestMapping } from './repo_test_map.js';
import { computeRiskDistribution, type FileRiskScore, type ModuleRiskSummary } from './repo_risk_distribution.js';

export type { RepoFileIndex, SourceTestMapping, FileRiskScore, ModuleRiskSummary };

export interface RepoIntelligence {
    fileIndex: RepoFileIndex;
    sourceTestMap: SourceTestMapping[];
    fileRiskScores: FileRiskScore[];
    moduleRiskSummaries: ModuleRiskSummary[];
    topFilesToReview: FileRiskScore[];
    uncoveredHighRisk: FileRiskScore[];
    totalFindings: number;
    totalFiles: number;
    generatedAt: string;
}

export function buildRepoIntelligence(
    enrichedFindings: EnrichedFinding[],
    allFilePaths: string[],
): RepoIntelligence {
    const fileIndex = buildFileIndex(allFilePaths);
    const sourceTestMap = buildSourceTestMap(fileIndex.sources, fileIndex.tests);
    const dist = computeRiskDistribution(enrichedFindings, sourceTestMap, allFilePaths);

    const allFileSet = new Set([...enrichedFindings.map(f => f.file), ...allFilePaths]);

    return {
        fileIndex,
        sourceTestMap,
        fileRiskScores: dist.fileRiskScores,
        moduleRiskSummaries: dist.moduleRiskSummaries,
        topFilesToReview: dist.topFilesToReview,
        uncoveredHighRisk: dist.uncoveredHighRisk,
        totalFindings: enrichedFindings.length,
        totalFiles: allFileSet.size,
        generatedAt: new Date().toISOString(),
    };
}