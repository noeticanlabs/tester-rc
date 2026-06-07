// @cohbit/code-atlas — L13 Canonical Pattern Memory (v8.7)
// Aggregates individual findings/obligations into canonical patterns
// above the file/line level.
//
// Pattern identity: sha256(riskKind + sorted(invariantIds).join(","))[0:24]
// Two findings with the same riskKind and invariant family → same patternHash.
//
// Persistence: .cohbit/atlas/canonical_patterns.json
//
// Operating law:
//   Canonical patterns aggregate findings, not duplicate them.
//   hitCount tracks occurrence count across all files.
//   sourceFiles tracks which files contain the pattern.
//   obligationRefs links to per-file/line obligations.
//   Patterns do not authorize repairs or mutate source files.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Minimal obligation shape needed for pattern aggregation — avoids circular dependency with atlas_integration. */
export interface ObligationPatternRef {
    finding: { riskKind: string; file: string };
    obligation: { repairId: string; linkedReceiptId: string };
}

// ─── Types ─────────────────────────────────────────────────────

export interface CanonicalPattern {
    patternHash: string;
    riskKind: string;
    invariantIds: string[];
    failureModeIds: string[];
    hitCount: number;
    sourceFiles: string[];
    sourceModules: string[];
    obligationRefs: string[];
    receiptRefs: string[];
    firstSeen: string;
    lastSeen: string;
    status: 'active' | 'resolved' | 'stale';
}

export interface CanonicalPatternStore {
    version: 'v8.7';
    lastRun: string;
    patterns: Record<string, CanonicalPattern>;
}

// ─── Identity ──────────────────────────────────────────────────

/**
 * Compute a canonical pattern hash from riskKind and invariant IDs.
 * Same riskKind + same invariants → same patternHash across all runs.
 */
export function computePatternHash(riskKind: string, invariantIds: string[]): string {
    const sorted = [...invariantIds].sort().join(',');
    const input = `pattern:${riskKind}:${sorted}`;
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 24);
}

// ─── Paths ─────────────────────────────────────────────────────

function patternsPath(): string {
    return path.join(process.cwd(), '.cohbit', 'atlas', 'canonical_patterns.json');
}

// ─── Load / Save ───────────────────────────────────────────────

export async function loadCanonicalPatterns(): Promise<CanonicalPatternStore> {
    try {
        const raw = await fs.readFile(patternsPath(), 'utf-8');
        const store = JSON.parse(raw) as CanonicalPatternStore;
        if (store.version !== 'v8.7') {
            return { version: 'v8.7', lastRun: '', patterns: {} };
        }
        return store;
    } catch {
        return { version: 'v8.7', lastRun: '', patterns: {} };
    }
}

export async function saveCanonicalPatterns(store: CanonicalPatternStore): Promise<void> {
    const dir = path.dirname(patternsPath());
    await fs.mkdir(dir, { recursive: true });
    store.lastRun = new Date().toISOString();
    await fs.writeFile(patternsPath(), JSON.stringify(store, null, 2), 'utf-8');
}

// ─── Aggregation ───────────────────────────────────────────────

/**
 * Aggregate obligation records into canonical patterns.
 * Each obligation with the same riskKind + invariantIds maps to one pattern.
 * Repeated calls update hitCount, merge sourceFiles, and deduplicate refs.
 */
export function aggregatePatterns(
    obligations: ObligationPatternRef[],
    existingStore: CanonicalPatternStore,
    riskInvariantMap: Map<string, { invariantIds: string[]; failureModeIds: string[] }>,
): { store: CanonicalPatternStore; newPatterns: number; updatedPatterns: number } {
    let newPatterns = 0;
    let updatedPatterns = 0;
    const now = new Date().toISOString();
    const store: CanonicalPatternStore = {
        version: 'v8.7',
        lastRun: now,
        patterns: { ...existingStore.patterns },
    };

    for (const oblig of obligations) {
        const riskKind = oblig.finding.riskKind;
        const mapping = riskInvariantMap.get(riskKind);
        if (!mapping) continue;

        const patternHash = computePatternHash(riskKind, mapping.invariantIds);
        const existing = store.patterns[patternHash];

        const file = oblig.finding.file;
        const module = file.split('/').slice(0, -1).join('/') || file;

        if (existing) {
            // Update existing pattern
            existing.hitCount += 1;
            if (!existing.sourceFiles.includes(file)) {
                existing.sourceFiles.push(file);
                existing.sourceFiles.sort();
            }
            if (!existing.sourceModules.includes(module)) {
                existing.sourceModules.push(module);
                existing.sourceModules.sort();
            }
            if (!existing.obligationRefs.includes(oblig.obligation.repairId)) {
                existing.obligationRefs.push(oblig.obligation.repairId);
                existing.obligationRefs.sort();
            }
            // receiptRefs from the obligation's linked receipt
            const receiptBitId = oblig.obligation.linkedReceiptId;
            if (receiptBitId && !existing.receiptRefs.includes(receiptBitId)) {
                existing.receiptRefs.push(receiptBitId);
                existing.receiptRefs.sort();
            }
            existing.lastSeen = now;
            // Status: if all linked obligations are resolved, mark resolved
            existing.status = 'active';
            updatedPatterns++;
        } else {
            // New pattern
            store.patterns[patternHash] = {
                patternHash,
                riskKind,
                invariantIds: [...mapping.invariantIds],
                failureModeIds: [...mapping.failureModeIds],
                hitCount: 1,
                sourceFiles: [file],
                sourceModules: [module],
                obligationRefs: [oblig.obligation.repairId],
                receiptRefs: oblig.obligation.linkedReceiptId ? [oblig.obligation.linkedReceiptId] : [],
                firstSeen: now,
                lastSeen: now,
                status: 'active',
            };
            newPatterns++;
        }
    }

    return { store, newPatterns, updatedPatterns };
}