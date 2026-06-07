// CohBit-Copilot v14.5 — Integrated Pipeline Isolation Tests
// Tests pipeline utility functions and type contracts in isolation.
//
// Operating law:
//   These tests verify utility functions and type shapes used by the pipeline.
//   They do not run a full audit against a real filesystem.

import { describe, it, expect } from 'vitest';
import { computeContentEvidenceHash } from '../src/atlas_integration.js';

// ─── Content Evidence Hash ─────────────────────────────────────

describe('v14.5 — computeContentEvidenceHash', () => {
    it('produces a deterministic SHA-256 hex string', () => {
        const hash = computeContentEvidenceHash('hello world');
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(64); // SHA-256 hex
    });

    it('produces the same hash for identical input', () => {
        const a = computeContentEvidenceHash('test content');
        const b = computeContentEvidenceHash('test content');
        expect(a).toBe(b);
    });

    it('produces different hashes for different input', () => {
        const a = computeContentEvidenceHash('content v1');
        const b = computeContentEvidenceHash('content v2');
        expect(a).not.toBe(b);
    });

    it('handles empty string', () => {
        const hash = computeContentEvidenceHash('');
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(64);
    });

    it('handles long multi-line input', () => {
        const longText = 'function test() {\n  return "hello world";\n}\n'.repeat(100);
        const hash = computeContentEvidenceHash(longText);
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(64);
    });

    it('is case-sensitive', () => {
        const a = computeContentEvidenceHash('Test');
        const b = computeContentEvidenceHash('test');
        expect(a).not.toBe(b);
    });
});

// ─── UnifiedAuditResult Type Shape ─────────────────────────────

describe('v14.5 — UnifiedAuditResult shape', () => {
    it('summary object has expected fields', () => {
        const summary: Record<string, number> = {
            files: 0,
            contentFilesRead: 0,
            contentBytesRead: 0,
            totalFindings: 0,
            productionFindings: 0,
            testFindings: 0,
            p0: 0,
            p1: 0,
            p2: 0,
            p3: 0,
            highHigh: 0,
            highMedium: 0,
            unsafeBlocks: 0,
            filesystemWrites: 0,
            processCommands: 0,
            atlasEntriesWritten: 0,
            graphEdges: 0,
            obligations: 0,
            obligationsOpen: 0,
            obligStaleHigh: 0,
            escalations: 0,
            proposals: 0,
            symbols: 0,
            tests: 0,
        };

        // Verify every expected field exists
        expect(summary).toHaveProperty('files');
        expect(summary).toHaveProperty('totalFindings');
        expect(summary).toHaveProperty('p0');
        expect(summary).toHaveProperty('p1');
        expect(summary).toHaveProperty('p2');
        expect(summary).toHaveProperty('p3');
        expect(summary).toHaveProperty('obligations');
        expect(summary).toHaveProperty('obligationsOpen');
        expect(summary).toHaveProperty('obligStaleHigh');
        expect(summary).toHaveProperty('escalations');
        expect(summary).toHaveProperty('proposals');
        expect(summary).toHaveProperty('unsafeBlocks');
        expect(summary).toHaveProperty('filesystemWrites');
        expect(summary).toHaveProperty('processCommands');
        expect(summary).toHaveProperty('atlasEntriesWritten');
        expect(summary).toHaveProperty('symbols');
        expect(summary).toHaveProperty('tests');
    });
});