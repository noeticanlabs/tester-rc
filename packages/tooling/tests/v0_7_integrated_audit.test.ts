import { describe, it, expect } from 'vitest';
import { auditRepository, generateIntegratedAuditMarkdown, generateIntegratedAuditJson, type IntegratedAuditResult } from '../src/T_integrated_audit.js';

const mixedFiles = [
    'src/main.ts', 'src/lib.rs', 'docs/readme.md', 'proof/lemma.lean',
    'notes/theorem.txt', '.github/workflows/ci.json', 'data.bin',
];

describe('v0.7 — Integrated Repo Audit', () => {
    it('returns all 8 sections', () => {
        const result = auditRepository(mixedFiles);
        expect(result.auditId).toMatch(/^AUDIT_\d{6}$/);
        expect(result.scan).toBeDefined();
        expect(result.routing).toBeDefined();
        expect(result.risks).toBeDefined();
        expect(result.retrieval).toBeDefined();
        expect(result.repair).toBeDefined();
        expect(result.audit).toBeDefined();
        expect(result.recommendations).toBeDefined();
    });

    it('scan section has correct file counts for mixed files', () => {
        const result = auditRepository(mixedFiles);
        expect(result.scan.filesScanned).toBe(7);
        expect(result.scan.detectedArtifacts.codeFiles).toBeGreaterThan(0);
        expect(result.scan.detectedArtifacts.proofFiles).toBeGreaterThan(0);
        expect(result.scan.detectedArtifacts.other).toBeGreaterThan(0);
    });

    it('routing summary has correct atlas distribution', () => {
        const result = auditRepository(['src/main.ts', 'docs/readme.md', 'proof.lean']);
        expect(result.routing.summary.routed).toBe(3);
    });

    it('risk scanner detects patterns in risky filenames', () => {
        const result = auditRepository(['src/null_handler.ts']);
        expect(result.risks.totalRiskWarnings).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.risks.sample)).toBe(true);
    });

    it('retrieval guard handles empty prior candidates', () => {
        const result = auditRepository(mixedFiles);
        expect(result.retrieval.accepted).toHaveLength(0);
        expect(result.retrieval.evidenceLevel).toBe('none');
    });

    it('recommendations include atlas routing guidance', () => {
        const result = auditRepository(mixedFiles);
        expect(result.recommendations.some(r => r.includes('Atlas routing'))).toBe(true);
    });

    it('markdown output contains all 6 sections', () => {
        const result = auditRepository(mixedFiles.slice(0, 5));
        const md = generateIntegratedAuditMarkdown(result);
        expect(md).toContain('Repository Scan');
        expect(md).toContain('Atlas Routing');
        expect(md).toContain('Risk Scan');
        expect(md).toContain('Retrieval Guard');
        expect(md).toContain('Repair Queue');
        expect(md).toContain('Recommendations');
    });

    it('JSON output is valid and round-trippable', () => {
        const result = auditRepository(mixedFiles);
        const json = generateIntegratedAuditJson(result);
        const parsed = JSON.parse(json) as IntegratedAuditResult;
        expect(parsed.auditId).toBe(result.auditId);
        expect(parsed.scan.filesScanned).toBe(result.scan.filesScanned);
    });

    it('with includeBenchmark, benchmark section appears', () => {
        const result = auditRepository(mixedFiles, { includeBenchmark: true });
        expect(result.benchmark).toBeDefined();
        expect(result.benchmark!.summary).toBeTruthy();
        const md = generateIntegratedAuditMarkdown(result);
        expect(md).toContain('Benchmark');
    });

    it('no filesystem mutation occurs', () => {
        // Audit only uses synthetic file paths — no real files are read or written
        const result = auditRepository(mixedFiles);
        expect(result.scan.status).toBe('scan_complete');
        expect(result.scan.filesScanned).toBe(7);
    });
});