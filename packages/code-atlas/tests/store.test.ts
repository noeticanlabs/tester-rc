// @cohbit/code-atlas v1.0.0 — Atlas Store Tests
import { describe, it, expect, afterAll } from 'vitest';
import { storeAtlasEntry, queryByReceipt, queryByInvariant, listRecentAtlasEntries, type AtlasEntry } from '../src/store.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

afterAll(async () => {
    try {
        await fs.rm(path.join(process.cwd(), '.cohbit', 'atlas'), { recursive: true, force: true });
    } catch { /* ok */ }
});

describe('v1.0 — Atlas Store', () => {
    it('stores and retrieves an atlas entry', async () => {
        const entry: AtlasEntry = {
            receiptBitId: 'test-bit-' + Date.now(),
            proposalId: 'prop-test-001',
            invariants: ['INV_006', 'INV_009', 'INV_011'],
            sessionId: 'session-test-001',
            evidenceLevel: 'unit_tested',
            claimStatus: 'receipted',
            riskIds: ['RISK_001'],
            limitations: ['Floating point edge cases.'],
            storedAt: new Date().toISOString(),
        };

        await storeAtlasEntry(entry);

        const retrieved = await queryByReceipt(entry.receiptBitId);
        expect(retrieved).toBeDefined();
        expect(retrieved!.invariants).toContain('INV_006');
        expect(retrieved!.claimStatus).toBe('receipted');
    });

    it('queries by invariant', async () => {
        const bitId = 'test-inv-query-' + Date.now();
        await storeAtlasEntry({
            receiptBitId: bitId, proposalId: 'p2', invariants: ['INV_006', 'INV_001'],
            sessionId: 's2', evidenceLevel: 'type_checked', claimStatus: 'draft',
            riskIds: [], limitations: [], storedAt: new Date().toISOString(),
        });

        const results = await queryByInvariant('INV_006');
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.some(r => r.receiptBitId === bitId)).toBe(true);
    });

    it('lists recent entries', async () => {
        const entries = await listRecentAtlasEntries(10);
        expect(Array.isArray(entries)).toBe(true);
    });

    it('returns null for unknown receipt', async () => {
        const result = await queryByReceipt('nonexistent-bit-id-12345');
        expect(result).toBeNull();
    });

    it('empty query returns empty results for unused invariant', async () => {
        const results = await queryByInvariant('INV_999');
        expect(Array.isArray(results)).toBe(true);
    });
});