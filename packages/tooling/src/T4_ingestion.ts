// @cohbit/tooling — T4 File Ingestion Tools
// Turns raw files into Atlas artifacts with hashing and routing.
// Spec: Noetican Tooling Layer v0.1 §8

import * as crypto from 'node:crypto';

export interface IngestionResult {
    artifactId: string;
    filePath: string;
    fileHash: string;
    artifactType: 'source_file' | 'document' | 'proof_file' | 'receipt_file' | 'unknown';
    targetAtlas: string;
    ingestedAt: string;
    status: 'ingested';
}

// ─── Artifact type detection ───────────────────────────────────

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.rs', '.py', '.c', '.cpp', '.go', '.java']);
const PROOF_EXT = new Set(['.lean', '.thy']);
const DOC_EXT = new Set(['.md', '.txt', '.rst', '.adoc']);
const RECEIPT_EXT = new Set(['.json']);

function detectArtifactType(filePath: string, content: string): IngestionResult['artifactType'] {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    if (CODE_EXT.has(ext)) return 'source_file';
    if (PROOF_EXT.has(ext)) return 'proof_file';
    if (RECEIPT_EXT.has(ext) && filePath.toLowerCase().includes('receipt')) return 'receipt_file';
    if (DOC_EXT.has(ext)) return 'document';
    // fallback by content
    if (content.includes('theorem') || content.includes('proof')) return 'proof_file';
    if (content.includes('function ') || content.includes('import ')) return 'source_file';
    return 'unknown';
}

function detectTargetAtlas(artifactType: IngestionResult['artifactType']): string {
    switch (artifactType) {
        case 'source_file': return 'code-atlas';
        case 'proof_file': return 'math-atlas';
        case 'document': return 'tlt-atlas';
        case 'receipt_file': return 'receipt-engine';
        default: return 'unknown';
    }
}

// ─── Ingestion ─────────────────────────────────────────────────

let ingestCounter = 0;

export function ingestFile(filePath: string, content: string): IngestionResult {
    ingestCounter += 1;
    const artifactType = detectArtifactType(filePath, content);
    const fileHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    return {
        artifactId: `INGEST_${String(ingestCounter).padStart(6, '0')}`,
        filePath,
        fileHash,
        artifactType,
        targetAtlas: detectTargetAtlas(artifactType),
        ingestedAt: new Date().toISOString(),
        status: 'ingested',
    };
}

/**
 * Batch ingestion of multiple files.
 */
export function ingestFiles(files: Array<{ path: string; content: string }>): IngestionResult[] {
    return files.map(f => ingestFile(f.path, f.content));
}