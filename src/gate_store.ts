// CohBit-Copilot v11.x — Gate Record Persistence
// Disk-backed gate record store replacing in-memory Map.
// Makes the seven-gate lifecycle durable across CLI processes.
//
// Storage target: .cohbit/gate_records/<proposalId>.json
//
// Operating law:
//   Gate records persist the lifecycle of governed proposals.
//   They do not authorize, mutate, apply, verify, or commit.
//   A persisted record is a memory artifact, not a proof of correctness.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GateRecord } from './types.js';

// ─── Types ─────────────────────────────────────────────────────

export interface StoredGateRecordEnvelope {
    schemaVersion: '1.0';
    storedAt: string;
    proposalId: string;
    record: GateRecord;
}

// ─── Path helpers ──────────────────────────────────────────────

function gateRecordsDir(): string {
    return path.join(process.cwd(), '.cohbit', 'gate_records');
}

function gateRecordPath(proposalId: string): string {
    return path.join(gateRecordsDir(), `${proposalId}.json`);
}

async function ensureDir(): Promise<void> {
    await fs.mkdir(gateRecordsDir(), { recursive: true });
}

// ─── Safety ────────────────────────────────────────────────────

/**
 * Validate proposalId to prevent path traversal.
 * Rejects: empty, path separators, parent directory references, null bytes.
 */
function validateProposalId(id: string): void {
    if (!id || id.trim().length === 0) {
        throw new Error('proposalId must not be empty');
    }
    if (id.includes('/') || id.includes('\\')) {
        throw new Error('proposalId must not contain path separators');
    }
    if (id.includes('..')) {
        throw new Error('proposalId must not contain parent directory references');
    }
    if (id.includes('\0')) {
        throw new Error('proposalId must not contain null bytes');
    }
}

// ─── Core API ──────────────────────────────────────────────────

/**
 * Persist a gate record to disk.
 * Uses atomic write pattern: write to temp file, then rename.
 */
export async function saveGateRecord(record: GateRecord): Promise<void> {
    const proposalId = record.proposal.proposalId;
    validateProposalId(proposalId);
    await ensureDir();

    const envelope: StoredGateRecordEnvelope = {
        schemaVersion: '1.0',
        storedAt: new Date().toISOString(),
        proposalId,
        record,
    };

    const targetPath = gateRecordPath(proposalId);
    const tempPath = targetPath + '.tmp';

    const json = JSON.stringify(envelope, null, 2);
    await fs.writeFile(tempPath, json, 'utf-8');
    await fs.rename(tempPath, targetPath);
}

/**
 * Load a gate record from disk.
 * Returns undefined if the record does not exist.
 */
export async function loadGateRecord(proposalId: string): Promise<GateRecord | undefined> {
    validateProposalId(proposalId);

    const filePath = gateRecordPath(proposalId);
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const envelope: StoredGateRecordEnvelope = JSON.parse(raw);

        if (!envelope.schemaVersion || !envelope.record || !envelope.record.proposal) {
            throw new Error('Malformed gate record envelope — missing required fields');
        }

        return envelope.record;
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return undefined;
        }
        throw new Error(`Failed to load gate record ${proposalId}: ${err.message}`);
    }
}

/**
 * Update an existing gate record on disk.
 * Equivalent to saveGateRecord — overwrites with current state.
 */
export async function updateGateRecord(record: GateRecord): Promise<void> {
    return saveGateRecord(record);
}

/**
 * List all gate record proposal IDs currently on disk.
 */
export async function listGateRecords(): Promise<GateRecord[]> {
    await ensureDir();

    const entries = await fs.readdir(gateRecordsDir());
    const records: GateRecord[] = [];

    for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const proposalId = entry.replace('.json', '');
        try {
            const record = await loadGateRecord(proposalId);
            if (record) {
                records.push(record);
            }
        } catch {
            // Skip unreadable records
        }
    }

    return records;
}

/**
 * Delete a gate record from disk.
 */
export async function deleteGateRecord(proposalId: string): Promise<void> {
    validateProposalId(proposalId);

    const filePath = gateRecordPath(proposalId);
    try {
        await fs.unlink(filePath);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return; // Already gone — not an error
        }
        throw err;
    }
}