// CohBit-Copilot v11.x — Gate Store Persistence Tests
// Verifies disk-backed gate record persistence.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { propose, review, authorize } from '../src/gates.js';
import type { GateRecord } from '../src/types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as gateStore from '../src/gate_store.js';

const TEST_PROPOSAL_ID = 'prop-test-persistence-001';

// Override proposalId for deterministic testing
function makeTestRecord(id: string): GateRecord {
    const record = propose({
        description: 'test proposal',
        files: [{ path: 'src/test.ts', action: 'modify', beforeContent: 'old', afterContent: 'new', diff: '-old\n+new' }],
        estimatedSpend: { numer: 1, denom: 1 },
        estimatedDefect: { numer: 0, denom: 1 },
        requiredAuthority: { numer: 1, denom: 1 },
        policyHash: 'test-policy',
    });
    (record.proposal as any).proposalId = id;
    return record;
}

describe('gate_store', () => {
    beforeEach(async () => {
        try {
            await fs.rm(path.join(process.cwd(), '.cohbit', 'gate_records', `${TEST_PROPOSAL_ID}.json`), { force: true });
        } catch { /* ok */ }
    });

    afterEach(async () => {
        try {
            await fs.rm(path.join(process.cwd(), '.cohbit', 'gate_records', `${TEST_PROPOSAL_ID}.json`), { force: true });
        } catch { /* ok */ }
    });

    it('saves and loads a gate record', async () => {
        const record = makeTestRecord(TEST_PROPOSAL_ID);
        await gateStore.saveGateRecord(record);
        const loaded = await gateStore.loadGateRecord(TEST_PROPOSAL_ID);

        expect(loaded).toBeDefined();
        expect(loaded!.proposal.proposalId).toBe(TEST_PROPOSAL_ID);
        expect(loaded!.proposal.description).toBe('test proposal');
        expect(loaded!.status).toBe('PROPOSED');
        expect(loaded!.timeline).toHaveLength(1);
    });

    it('updates an existing gate record', async () => {
        const record = makeTestRecord(TEST_PROPOSAL_ID);
        await gateStore.saveGateRecord(record);

        // Use review() to advance status
        const reviewed = review(record, 'tester', true, 'approved');
        await gateStore.updateGateRecord(reviewed);

        const loaded = await gateStore.loadGateRecord(TEST_PROPOSAL_ID);
        expect(loaded!.status).toBe('REVIEW_PASSED');
    });

    it('lists stored gate records', async () => {
        const record = makeTestRecord(TEST_PROPOSAL_ID);
        await gateStore.saveGateRecord(record);

        const records = await gateStore.listGateRecords();
        const found = records.find(r => r.proposal.proposalId === TEST_PROPOSAL_ID);

        expect(found).toBeDefined();
        expect(found!.proposal.description).toBe('test proposal');
    });

    it('rejects proposalId with path traversal', async () => {
        const record = makeTestRecord('../../../etc/passwd');
        await expect(gateStore.saveGateRecord(record)).rejects.toThrow('path separators');
    });

    it('rejects proposalId with backslash traversal', async () => {
        const record = makeTestRecord('..\\..\\evil');
        await expect(gateStore.saveGateRecord(record)).rejects.toThrow('path separators');
    });

    it('rejects empty proposalId', async () => {
        const record = makeTestRecord('');
        await expect(gateStore.saveGateRecord(record)).rejects.toThrow('must not be empty');
    });

    it('rejects null byte in proposalId', async () => {
        const record = makeTestRecord('test\0bad');
        await expect(gateStore.saveGateRecord(record)).rejects.toThrow('null bytes');
    });

    it('returns undefined for missing record', async () => {
        const loaded = await gateStore.loadGateRecord('nonexistent-record-id');
        expect(loaded).toBeUndefined();
    });

    it('fails closed on malformed JSON', async () => {
        const dir = path.join(process.cwd(), '.cohbit', 'gate_records');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${TEST_PROPOSAL_ID}.json`), 'not valid json {', 'utf-8');

        await expect(gateStore.loadGateRecord(TEST_PROPOSAL_ID)).rejects.toThrow('Failed to load gate record');
    });

    it('persists to .cohbit/gate_records directory', async () => {
        const record = makeTestRecord(TEST_PROPOSAL_ID);
        await gateStore.saveGateRecord(record);

        const filePath = path.join(process.cwd(), '.cohbit', 'gate_records', `${TEST_PROPOSAL_ID}.json`);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        expect(parsed.schemaVersion).toBe('1.0');
        expect(parsed.proposalId).toBe(TEST_PROPOSAL_ID);
        expect(parsed.record).toBeDefined();
    });

    it('deletes a gate record', async () => {
        const record = makeTestRecord(TEST_PROPOSAL_ID);
        await gateStore.saveGateRecord(record);

        let loaded = await gateStore.loadGateRecord(TEST_PROPOSAL_ID);
        expect(loaded).toBeDefined();

        await gateStore.deleteGateRecord(TEST_PROPOSAL_ID);

        loaded = await gateStore.loadGateRecord(TEST_PROPOSAL_ID);
        expect(loaded).toBeUndefined();
    });
});