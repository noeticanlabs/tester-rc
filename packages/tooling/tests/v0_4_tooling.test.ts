import { describe, it, expect, beforeEach } from 'vitest';
import { scanRepository } from '../src/T3_scanner.js';
import { generateAuditReport, generateAuditMarkdown } from '../src/T17_audit.js';
import { REPAIR_QUEUE } from '../src/T8_repair_queue.js';
import { enqueueRepair } from '../src/T8_repair_queue.js';

describe('T3 — Repository Scanner', () => {
    it('scans code files correctly', () => {
        const result = scanRepository(['src/main.ts', 'src/lib.rs', 'src/app.py']);
        expect(result.filesScanned).toBe(3);
        expect(result.detectedArtifacts.codeFiles).toBe(3);
        expect(result.routingRecommendation).toContain('code-atlas');
    });

    it('scans mixed files with correct classification', () => {
        const files = ['src/main.ts', 'docs/guide.md', 'proof.lean', 'theorem_notes.txt'];
        const result = scanRepository(files);
        expect(result.detectedArtifacts.codeFiles).toBe(1);
        expect(result.detectedArtifacts.languageDocs).toBe(1);
        expect(result.detectedArtifacts.proofFiles).toBe(1);
        expect(result.detectedArtifacts.mathDocs).toBe(1);
    });

    it('detects receipt files', () => {
        const result = scanRepository(['receipts/cohbit_entry.json']);
        expect(result.detectedArtifacts.receipts).toBe(1);
        expect(result.routingRecommendation).toContain('receipt-engine');
    });

    it('unknown files produce warning', () => {
        const result = scanRepository(['data.bin', 'image.png']);
        expect(result.detectedArtifacts.other).toBe(2);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('routing recommendation is empty for unknown only', () => {
        const result = scanRepository(['data.bin']);
        expect(result.routingRecommendation).toContain('unknown');
    });

    it('scan IDs are unique', () => {
        const r1 = scanRepository(['a.ts']);
        const r2 = scanRepository(['b.rs']);
        expect(r1.scanId).not.toBe(r2.scanId);
    });

    it('math-named docs route to math-atlas', () => {
        const result = scanRepository(['theorem_proof.md']);
        expect(result.detectedArtifacts.mathDocs).toBe(1);
        expect(result.routingRecommendation).toContain('math-atlas');
    });
});

describe('T17 — Audit Reporter', () => {
    beforeEach(() => { REPAIR_QUEUE.length = 0; });

    it('generates audit report with all sections', () => {
        const report = generateAuditReport(5, ['entry1', 'entry2']);
        expect(report.toolRegistry.toolCount).toBeGreaterThan(0);
        expect(report.repairQueue.totalCount).toBe(0);
        expect(report.atlasStore.entryCount).toBe(5);
        expect(report.overallStatus).toBe('healthy');
    });

    it('healthy when queue is empty', () => {
        const report = generateAuditReport(1);
        expect(report.overallStatus).toBe('healthy');
    });

    it('warning when repairs are open', () => {
        enqueueRepair({ sourceRecordId: 'S1', repairType: 'code_repair', problem: 'p', requiredAction: 'a' });
        const report = generateAuditReport(1);
        expect(report.overallStatus).toBe('warning');
    });

    it('degraded when > 5 open repairs', () => {
        for (let i = 0; i < 6; i++) {
            enqueueRepair({ sourceRecordId: `S${i}`, repairType: 'code_repair', problem: 'p', requiredAction: 'a' });
        }
        const report = generateAuditReport(1);
        expect(report.overallStatus).toBe('degraded');
    });

    it('generates markdown report', () => {
        const md = generateAuditMarkdown(3, ['e1']);
        expect(md).toContain('# CohBit-Copilot Audit Report');
        expect(md).toContain('## Tool Registry');
        expect(md).toContain('## Repair Queue');
        expect(md).toContain('## Atlas Store');
        expect(md).toContain('## Recommendations');
    });

    it('includes recommendations when empty atlas store', () => {
        const report = generateAuditReport(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.recommendations.some(r => r.includes('empty'))).toBe(true);
    });

    it('byPriority and byCategory are populated', () => {
        enqueueRepair({ sourceRecordId: 'S1', repairType: 'code_repair', problem: 'p', requiredAction: 'a', priority: 'high' });
        enqueueRepair({ sourceRecordId: 'S2', repairType: 'proof_gap_repair', problem: 'p2', requiredAction: 'a2', priority: 'high' });
        const report = generateAuditReport(1);
        expect(report.repairQueue.byPriority['high']).toBe(2);
        expect(report.repairQueue.byCategory['code_repair']).toBe(1);
        expect(report.repairQueue.byCategory['proof_gap_repair']).toBe(1);
    });
});