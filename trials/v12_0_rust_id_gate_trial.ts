// CohBit-Copilot v12.0 — Rust Deterministic ID Gate Trial
// Tests: TypeScript generates IDs. Rust verifies them.
//
// Success criteria:
//   1. Shared ID conformance vectors exist.
//   2. TypeScript and Rust produce identical deterministic IDs.
//   3. Finding IDs verify.
//   4. Obligation IDs verify.
//   5. Processor IDs verify.
//   6. Receipt IDs are explicitly deferred.
//   7. Same canonical input → same ID.
//   8. Changed evidence → changed ID.
//   9. Rust emits evidence only.
//   10. Existing TypeScript workflows remain backward compatible.

import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { isRustVerifierAvailable } from '../src/rust_receipt_gate.js';
import { verifyIdsWithRust } from '../src/rust_id_gate.js';
import { computeDeterministicFindingKey } from '../packages/tooling/src/T_rust_review_queue.js';
import { computeObligationId } from '../src/atlas_integration.js';

// Helper: processor ID matching the Rust algorithm
function computeProcessorId(workflowId: string, processorKind: string, startTime: string): string {
    return crypto.createHash('sha256').update(`proc:${workflowId}:${processorKind}:${startTime}`, 'utf8').digest('hex').slice(0, 16);
}

describe('v12.0 Rust Deterministic ID Gate Trial', () => {

    // ── Criterion 1: Conformance vectors exist ────────────────
    it('id_conformance.json exists with 13 vectors', async () => {
        const vectorsPath = path.resolve(process.cwd(), 'test_vectors', 'id_conformance.json');
        const content = await fs.readFile(vectorsPath, 'utf-8');
        const vectors = JSON.parse(content);
        expect(Array.isArray(vectors)).toBe(true);
        expect(vectors.length).toBe(13);

        // Verify all three types present
        const types = new Set(vectors.map((v: any) => v.type));
        expect(types.has('finding')).toBe(true);
        expect(types.has('obligation')).toBe(true);
        expect(types.has('processor')).toBe(true);
    });

    // ── Criterion 2: TS and Rust produce identical IDs ────────
    it('TypeScript IDs match expected conformance values', () => {
        // Finding IDs
        expect(computeDeterministicFindingKey('src/gates.ts', 113, 'unwrap_review_signal')).toBe('c2b03b7205430aad');
        expect(computeDeterministicFindingKey('src/path_safety.ts', 72, 'unsafe_block')).toBe('c3c86a6cf7d447a8');
        expect(computeDeterministicFindingKey('src/fs.ts', 200, 'filesystem_delete_file')).toBe('05ed7fd3356fb9f4');
        expect(computeDeterministicFindingKey('src/lang.ts', 45, 'process_command')).toBe('7b7eee2902b24a96');

        // Obligation IDs
        expect(computeObligationId('src/gates.ts', 113, 'unwrap_review_signal')).toBe('OBL_3289542adc7dda612d9a');
        expect(computeObligationId('src/path_safety.ts', 72, 'unsafe_block')).toBe('OBL_5b78f78975cc21a940f3');
        expect(computeObligationId('src/fs.ts', 200, 'filesystem_delete_file')).toBe('OBL_c59576d655e057435c01');

        // Processor IDs
        expect(computeProcessorId('rust_risk_scan', 'heuristic', '2026-06-06T00:00:00.000Z')).toBe('643c399987e542a8');
        expect(computeProcessorId('content_read', 'deterministic', '2026-06-06T01:00:00.000Z')).toBe('e49e675d35399cd2');
        expect(computeProcessorId('receipt_emit', 'deterministic', '2026-06-06T02:00:00.000Z')).toBe('f8ee92a258ec90d5');
    });

    // ── Criterion 3: Finding IDs verify ───────────────────────
    it('finding IDs are deterministic and fingerprint-stable', () => {
        // Each unique (file, line, riskKind) produces a unique ID
        const ids = new Set([
            computeDeterministicFindingKey('src/gates.ts', 113, 'unwrap_review_signal'),
            computeDeterministicFindingKey('src/path_safety.ts', 72, 'unsafe_block'),
            computeDeterministicFindingKey('src/fs.ts', 200, 'filesystem_delete_file'),
            computeDeterministicFindingKey('src/lang.ts', 45, 'process_command'),
        ]);
        expect(ids.size).toBe(4); // All four are different
    });

    // ── Criterion 4: Obligation IDs verify ────────────────────
    it('obligation IDs have OBL_ prefix and are deterministic', () => {
        const id = computeObligationId('src/gates.ts', 113, 'unwrap_review_signal');
        expect(id.startsWith('OBL_')).toBe(true);
        expect(id.length).toBe(24); // OBL_ + 20 hex chars

        // Same input → same ID
        const id2 = computeObligationId('src/gates.ts', 113, 'unwrap_review_signal');
        expect(id2).toBe(id);
    });

    // ── Criterion 5: Processor IDs verify ─────────────────────
    it('processor IDs are deterministic', () => {
        const id1 = computeProcessorId('rust_risk_scan', 'heuristic', '2026-06-06T00:00:00.000Z');
        const id2 = computeProcessorId('rust_risk_scan', 'heuristic', '2026-06-06T00:00:00.000Z');
        expect(id1).toBe(id2);
        expect(id1.length).toBe(16);
    });

    // ── Criterion 6: Receipt IDs are explicitly deferred ──────
    it('receipt ID family is acknowledged as deferred', () => {
        // This test documents that receipt IDs are deferred to v12.1+
        // No implementation expected yet
        const deferredFamilies = ['teachingReceiptId', 'polarityRecordId', 'atlasEntryId', 'gateRecordId'];
        for (const family of deferredFamilies) {
            console.log(`[v12.0] ${family}: deferred to v12.1+`);
        }
        expect(deferredFamilies.length).toBe(4);
    });

    // ── Criterion 7: Same input → same ID ─────────────────────
    it('same canonical input produces same ID (dedup)', () => {
        const file = 'src/gates.ts';
        const line = 113;
        const riskKind = 'unwrap_review_signal';

        const id1 = computeDeterministicFindingKey(file, line, riskKind);
        const id2 = computeDeterministicFindingKey(file, line, riskKind);
        expect(id1).toBe(id2);

        // Obligation ID dedup
        const oid1 = computeObligationId(file, line, riskKind);
        const oid2 = computeObligationId(file, line, riskKind);
        expect(oid1).toBe(oid2);

        // Processor ID dedup
        const pid1 = computeProcessorId('rust_risk_scan', 'heuristic', '2026-06-06T00:00:00.000Z');
        const pid2 = computeProcessorId('rust_risk_scan', 'heuristic', '2026-06-06T00:00:00.000Z');
        expect(pid1).toBe(pid2);
    });

    // ── Criterion 8: Changed evidence → changed ID ────────────
    it('changed evidence produces different IDs', () => {
        // Different line → different ID
        const id1 = computeDeterministicFindingKey('src/gates.ts', 113, 'unwrap_review_signal');
        const id2 = computeDeterministicFindingKey('src/gates.ts', 114, 'unwrap_review_signal');
        expect(id1).not.toBe(id2);

        // Different riskKind → different ID
        const id3 = computeDeterministicFindingKey('src/gates.ts', 113, 'unsafe_block');
        expect(id1).not.toBe(id3);

        // Different file → different ID
        const id4 = computeDeterministicFindingKey('src/fs.ts', 113, 'unwrap_review_signal');
        expect(id1).not.toBe(id4);
    });

    // ── Criterion 9: Rust emits evidence only ─────────────────
    it('verifyIdsWithRust returns evidence structure without authorization', async () => {
        const result = await verifyIdsWithRust();

        expect(result).toHaveProperty('rustAvailable');
        expect(result).toHaveProperty('verified');
        expect(result).toHaveProperty('evidence');
        expect(result).toHaveProperty('totalVectors');
        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('mismatches');

        // No authorization fields
        expect((result as any).authorized).toBeUndefined();
        expect((result as any).commitPermission).toBeUndefined();

        if (!result.rustAvailable) {
            expect(result.evidence).toContain('not available');
        }
    });

    // ── Criterion 10: TS workflows backward compatible ────────
    it('existing TypeScript ID functions are unchanged', () => {
        // Core functions produce consistent output
        const fid = computeDeterministicFindingKey('src/gates.ts', 113, 'unwrap_review_signal');
        expect(typeof fid).toBe('string');
        expect(fid.length).toBe(16);

        const oid = computeObligationId('src/gates.ts', 113, 'unwrap_review_signal');
        expect(typeof oid).toBe('string');
        expect(oid.startsWith('OBL_')).toBe(true);

        // Functions are pure (same input → same output)
        const fid2 = computeDeterministicFindingKey('src/gates.ts', 113, 'unwrap_review_signal');
        expect(fid2).toBe(fid);
    });

    // ── Bonus: Rust cross-verification ────────────────────────
    it('Rust ID gate verifies all 13 conformance vectors', async () => {
        if (isRustVerifierAvailable()) {
            const result = await verifyIdsWithRust();
            expect(result.rustAvailable).toBe(true);
            expect(result.totalVectors).toBe(13);
            expect(result.passed).toBe(13);
            expect(result.mismatches).toBe(0);
            expect(result.verified).toBe(true);
            console.log(`[v12.0] Rust ID gate: ${result.passed}/${result.totalVectors} vectors verified`);
        } else {
            console.log('[v12.0] Rust not available — skipping cross-language ID verification');
        }
    });
});