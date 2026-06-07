// @cohbit/tooling — T3 Repository Scanner
// Scans a local repository and identifies what kind of artifacts exist.
// Spec: Noetican Tooling Layer v0.1 §7
// Wraps workspace.ts with atlas-aware routing recommendations.

import { type AtlasTarget } from './T5_router.js';

export interface RepoScanResult {
    scanId: string;
    rootPath: string;
    filesScanned: number;
    detectedArtifacts: {
        codeFiles: number;
        mathDocs: number;
        proofFiles: number;
        languageDocs: number;
        schemas: number;
        receipts: number;
        other: number;
    };
    routingRecommendation: AtlasTarget[];
    status: 'scan_complete' | 'scan_failed';
    warnings: string[];
}

// ─── Extension-based file classification ───────────────────────

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.rs', '.py', '.c', '.cpp', '.go', '.java', '.cs', '.swift', '.kt']);
const PROOF_EXTENSIONS = new Set(['.lean', '.thy']);
const DOC_EXTENSIONS = new Set(['.md', '.txt', '.rst', '.adoc']);
const SCHEMA_EXTENSIONS = new Set(['.json', '.yaml', '.yml', '.toml', '.schema']);
const RECEIPT_PATTERNS = [/receipt/i, /cohbit/i];

function classifyFile(fileName: string): keyof RepoScanResult['detectedArtifacts'] {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (CODE_EXTENSIONS.has(ext)) return 'codeFiles';
    if (PROOF_EXTENSIONS.has(ext)) return 'proofFiles';
    if (DOC_EXTENSIONS.has(ext)) {
        // Check if document contains math-related naming
        if (/theorem|proof|math|lemma/.test(fileName.toLowerCase())) return 'mathDocs';
        return 'languageDocs';
    }
    // Check receipts before schemas (receipt .json files should not be schemas)
    if (RECEIPT_PATTERNS.some(p => p.test(fileName))) return 'receipts';
    if (SCHEMA_EXTENSIONS.has(ext) || ext === '.schema') return 'schemas';
    return 'other';
}

function buildRoutingRecommendation(artifacts: RepoScanResult['detectedArtifacts']): AtlasTarget[] {
    const routes: AtlasTarget[] = [];
    if (artifacts.codeFiles > 0) routes.push('code-atlas');
    if (artifacts.mathDocs > 0 || artifacts.proofFiles > 0) routes.push('math-atlas');
    if (artifacts.languageDocs > 0) routes.push('tlt-atlas');
    if (artifacts.receipts > 0) routes.push('receipt-engine');
    if (routes.length === 0) routes.push('unknown');
    return routes;
}

// ─── Scanner ───────────────────────────────────────────────────

let scanCounter = 0;

/**
 * Scan a list of file paths and classify by artifact type.
 * Uses file extension heuristics to determine atlas routing.
 */
export function scanRepository(filePaths: string[], rootPath?: string): RepoScanResult {
    scanCounter += 1;
    const artifacts: RepoScanResult['detectedArtifacts'] = {
        codeFiles: 0, mathDocs: 0, proofFiles: 0, languageDocs: 0,
        schemas: 0, receipts: 0, other: 0,
    };
    const warnings: string[] = [];

    for (const filePath of filePaths) {
        const category = classifyFile(filePath);
        artifacts[category]++;
    }

    if (artifacts.other === filePaths.length && filePaths.length > 0) {
        warnings.push('No recognizable artifact types found. All files classified as "other".');
    }

    return {
        scanId: `RSCAN_${String(scanCounter).padStart(6, '0')}`,
        rootPath: rootPath ?? '.',
        filesScanned: filePaths.length,
        detectedArtifacts: artifacts,
        routingRecommendation: buildRoutingRecommendation(artifacts),
        status: 'scan_complete',
        warnings,
    };
}