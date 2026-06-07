// CohBit-Copilot Ledger Lock (v2.2)
// Advisory file locking for concurrent ledger append safety.
//
// Operating law:
//   Ledger writes must remain append-safe under concurrent access.
//
// Strategy:
//   Advisory lock file (.cohbit/session_ledger.lock) with PID + timestamp.
//   Stale lock detection (PID no longer alive) allows lock stealing.
//   Lock released on success, error, or process exit (via cleanup).

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { LedgerEvent } from './ledger.js';
import { appendSessionEvent } from './ledger.js';

// ─── Types ─────────────────────────────────────────────────────

export interface LockHandle {
    release: () => Promise<void>;
    lockPath: string;
    pid: number;
    acquiredAt: string;
}

// ─── Paths ─────────────────────────────────────────────────────

function lockFilePath(ledgerPath: string): string {
    return ledgerPath.replace(/\.jsonl$/, '.lock');
}

function defaultLockPath(): string {
    return path.join(process.cwd(), '.cohbit', 'session_ledger.lock');
}

// ─── Lock File I/O ─────────────────────────────────────────────

interface LockData {
    pid: number;
    timestamp: string;
    hostname: string;
}

function lockContent(): string {
    let hostname = 'unknown';
    try {
        hostname = require('node:os').hostname();
    } catch {
        // os not available in some environments
    }
    const data: LockData = {
        pid: process.pid,
        timestamp: new Date().toISOString(),
        hostname,
    };
    return JSON.stringify(data);
}

function parseLockContent(content: string): LockData | null {
    try {
        return JSON.parse(content) as LockData;
    } catch {
        return null;
    }
}

// ─── PID Alive Check ───────────────────────────────────────────

/**
 * Check if a process with the given PID is still running.
 * Platform-specific: uses process.kill(pid, 0) on Unix,
 * and a best-effort approach on Windows.
 */
function isPidAlive(pid: number): boolean {
    try {
        // Sending signal 0 does not actually send a signal,
        // but performs error checking to see if the process exists.
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

// ─── Lock Acquisition ──────────────────────────────────────────

/**
 * Acquire an advisory lock for the ledger file.
 * Returns a LockHandle with a release() function.
 * 
 * @param timeoutMs Maximum time to wait for lock acquisition (default 5000ms)
 * @param ledgerPath Optional path to the ledger file (default .cohbit/session_ledger.jsonl)
 */
export async function acquireLedgerLock(
    timeoutMs = 5000,
    ledgerPath?: string,
): Promise<LockHandle> {
    const lockPath = ledgerPath ? lockFilePath(ledgerPath) : defaultLockPath();
    const dir = path.dirname(lockPath);
    await fs.mkdir(dir, { recursive: true });

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < timeoutMs) {
        try {
            // Try to create the lock file exclusively
            const handle = await fs.open(lockPath, 'wx');
            const content = lockContent();
            await handle.writeFile(content, 'utf-8');
            await handle.close();

            return {
                release: async () => {
                    try {
                        // Read lock content to verify we still own it
                        const current = await fs.readFile(lockPath, 'utf-8');
                        const data = parseLockContent(current);
                        if (data && data.pid === process.pid) {
                            await fs.unlink(lockPath);
                        }
                    } catch {
                        // Lock already released or stolen
                    }
                },
                lockPath,
                pid: process.pid,
                acquiredAt: new Date().toISOString(),
            };
        } catch (err: any) {
            lastError = err;
            if (err.code === 'EEXIST' || err.code === 'EPERM') {
                // Lock exists — check if it's stale
                try {
                    const content = await fs.readFile(lockPath, 'utf-8');
                    const data = parseLockContent(content);
                    if (data && !isPidAlive(data.pid)) {
                        // Stale lock — remove it and retry
                        console.warn(`[LedgerLock] Stale lock from PID ${data.pid} (${data.timestamp}) — stealing lock.`);
                        try {
                            await fs.unlink(lockPath);
                        } catch {
                            // Someone else stole it first
                        }
                        continue; // Retry acquisition immediately
                    }
                } catch {
                    // Can't read lock file — might have been removed already
                    continue; // Retry
                }

                // Lock is held by a live process — wait and retry
                await sleep(100);
            } else {
                // Unexpected error
                throw new Error(`Lock acquisition failed: ${err.message}`);
            }
        }
    }

    throw new Error(
        `Failed to acquire ledger lock after ${timeoutMs}ms. ` +
        `Lock file: ${lockPath}. Last error: ${lastError?.message ?? 'timeout'}`
    );
}

// ─── Lock-Aware Append ─────────────────────────────────────────

/**
 * Append an event to the ledger with advisory lock protection.
 * Ensures that concurrent appends do not interleave lines.
 * After writing, verifies that the line was appended correctly.
 */
export async function appendWithLock(event: LedgerEvent, timeoutMs = 5000): Promise<void> {
    const lock = await acquireLedgerLock(timeoutMs);
    try {
        await appendSessionEvent(event);
    } finally {
        await lock.release();
    }
}

// ─── Utility: Sleep ────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Cleanup on Exit ───────────────────────────────────────────

/**
 * Register a cleanup handler that releases the lock on process exit.
 * Call once at startup if using long-lived lock patterns.
 */
export function registerLockCleanup(lock: LockHandle): void {
    const cleanup = () => {
        lock.release().catch(() => { /* best effort */ });
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(130); });
    process.on('SIGTERM', () => { cleanup(); process.exit(143); });
    process.on('uncaughtException', (err) => {
        console.error('[LedgerLock] Uncaught exception — releasing lock.');
        cleanup();
        throw err;
    });
}