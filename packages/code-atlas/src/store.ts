// @cohbit/code-atlas — Atlas Store v1.0
// Persistent receipt-indexed atlas entries in .cohbit/atlas/
//
// Directory structure:
//   .cohbit/atlas/entries/<receiptBitId>.json  — one atlas entry per receipt
//   .cohbit/atlas/index.jsonl                   — append-only query index
//
// Governing law:
//   The Atlas stores memory. Receipts decide what persists.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ─── Types ─────────────────────────────────────────────────────

export interface AtlasEntry {
    receiptBitId: string;
    proposalId: string;
    invariants: string[];
    transitionId?: string;
    sessionId: string;
    evidenceLevel: string;
    claimStatus: 'draft' | 'receipted' | 'stale';
    riskIds: string[];
    limitations: string[];
    storedAt: string;
}

// ─── Paths ─────────────────────────────────────────────────────

function atlasDir(): string {
    return path.join(process.cwd(), '.cohbit', 'atlas');
}

function entriesDir(): string {
    return path.join(atlasDir(), 'entries');
}

function indexPath(): string {
    return path.join(atlasDir(), 'index.jsonl');
}

function entryPath(bitId: string): string {
    return path.join(entriesDir(), `${bitId}.json`);
}

async function ensureDirs(): Promise<void> {
    await fs.mkdir(entriesDir(), { recursive: true });
}

// ─── Store ─────────────────────────────────────────────────────

/**
 * Store an atlas entry.
 * Writes a JSON file named by receipt bitId and appends an index line.
 */
export async function storeAtlasEntry(entry: AtlasEntry): Promise<void> {
    await ensureDirs();

    // Write the entry file
    const filePath = entryPath(entry.receiptBitId);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');

    // Append to index
    const indexLine = JSON.stringify({
        receiptBitId: entry.receiptBitId,
        invariants: entry.invariants,
        storedAt: entry.storedAt,
    }) + '\n';
    await fs.appendFile(indexPath(), indexLine, 'utf-8');
}

// ─── Query ─────────────────────────────────────────────────────

/**
 * Retrieve an atlas entry by receipt bitId.
 */
export async function queryByReceipt(bitId: string): Promise<AtlasEntry | null> {
    try {
        const content = await fs.readFile(entryPath(bitId), 'utf-8');
        return JSON.parse(content) as AtlasEntry;
    } catch {
        return null;
    }
}

/**
 * Retrieve all atlas entries that reference a given invariant.
 */
export async function queryByInvariant(invariantId: string): Promise<AtlasEntry[]> {
    const results: AtlasEntry[] = [];
    try {
        const files = await fs.readdir(entriesDir());
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(entriesDir(), file), 'utf-8');
                const entry = JSON.parse(content) as AtlasEntry;
                if (entry.invariants.includes(invariantId)) {
                    results.push(entry);
                }
            } catch {
                // Skip unreadable entries
            }
        }
    } catch {
        // Directory may not exist yet
    }
    return results;
}

/**
 * List recent atlas entries.
 */
export async function listRecentAtlasEntries(limit = 20): Promise<AtlasEntry[]> {
    const results: AtlasEntry[] = [];
    try {
        const files = await fs.readdir(entriesDir());
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
        for (const file of jsonFiles.slice(0, limit)) {
            try {
                const content = await fs.readFile(path.join(entriesDir(), file), 'utf-8');
                results.push(JSON.parse(content) as AtlasEntry);
            } catch {
                // Skip
            }
        }
    } catch {
        // Directory may not exist yet
    }
    return results;
}

// ─── v8.6: Index Rebuild ───────────────────────────────────────

/**
 * Rebuild the atlas index from the entries directory.
 * Reads all entry files and writes a clean index with no duplicates.
 * Call after batch seeding to prevent index growth over repeated runs.
 */
export async function rebuildAtlasIndex(): Promise<number> {
    try {
        const files = await fs.readdir(entriesDir());
        const lines: string[] = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(entriesDir(), file), 'utf-8');
                const entry = JSON.parse(content) as AtlasEntry;
                lines.push(JSON.stringify({
                    receiptBitId: entry.receiptBitId,
                    invariants: entry.invariants,
                    storedAt: entry.storedAt,
                }));
            } catch {
                // Skip unreadable entries
            }
        }
        await fs.writeFile(indexPath(), lines.join('\n') + '\n', 'utf-8');
        return lines.length;
    } catch {
        return 0;
    }
}
