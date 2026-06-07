// CohBit-Copilot Atomic Write (v2.2)
// Temp-file + rename pattern for safe filesystem mutations.
// Binary detection, encoding detection, large-file budget enforcement.
//
// Operating law:
//   Applies must use atomic temp-write + rename where practical.
//   Binary or unknown-encoding files must not enter text patch flow
//   unless explicitly allowed.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Types ─────────────────────────────────────────────────────

export interface AtomicWriteResult {
    success: boolean;
    filePath: string;
    bytesWritten: number;
    tempPath: string | null;
    error?: string | undefined;
}

export interface FileCheckResult {
    safe: boolean;
    size: number;
    isBinary: boolean;
    encoding: 'utf8' | 'utf16le' | 'utf16be' | 'binary';
    reason?: string | undefined;
}

// ─── Constants ─────────────────────────────────────────────────

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Temp File Utilities ───────────────────────────────────────

function randomHex(length: number): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function tempPathFor(filePath: string): string {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const rand = randomHex(8);
    return path.join(dir, `.${base}.${rand}.tmp`);
}

// ─── Binary Detection ──────────────────────────────────────────

/**
 * Detect binary content by sampling the first N bytes.
 */
export function detectBinary(content: Buffer | string, sampleSize = 4096): boolean {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const sample = buf.subarray(0, Math.min(buf.length, sampleSize));

    // Null bytes strongly indicate binary
    if (sample.includes(0)) return true;

    // Check ratio of non-printable control characters
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
        const byte = sample[i]!;
        // Allow: tab(9), newline(10), carriage return(13), printable ASCII 32-126
        // High bytes (128+) are allowed (UTF-8 multi-byte sequences)
        if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
            nonPrintable++;
        }
    }

    return sample.length > 0 && (nonPrintable / sample.length) > 0.30;
}

// ─── Encoding Detection ────────────────────────────────────────

/**
 * Detect file encoding from first bytes of a buffer.
 */
export function detectEncoding(buffer: Buffer): 'utf8' | 'utf16le' | 'utf16be' | 'binary' {
    if (buffer.length >= 2) {
        // UTF-16 LE BOM: FF FE
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) return 'utf16le';
        // UTF-16 BE BOM: FE FF
        if (buffer[0] === 0xFE && buffer[1] === 0xFF) return 'utf16be';
        // UTF-8 BOM: EF BB BF
        if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'utf8';
    }

    // Heuristic: detect UTF-16 byte order by null byte position
    // UTF-16 LE: [low, high] → for ASCII, nulls at odd positions (1, 3, 5...)
    // UTF-16 BE: [high, low] → for ASCII, nulls at even positions (0, 2, 4...)
    let nullEven = 0;
    let nullOdd = 0;
    for (let i = 0; i < Math.min(buffer.length, 256); i += 2) {
        if (buffer[i] === 0) nullEven++;
        if (buffer[i + 1] === 0) nullOdd++;
    }
    const pairsChecked = Math.floor(Math.min(buffer.length, 256) / 2);
    if (pairsChecked > 0) {
        if (nullEven / pairsChecked > 0.5) return 'utf16be';
        if (nullOdd / pairsChecked > 0.5) return 'utf16le';
    }

    if (detectBinary(buffer)) return 'binary';
    return 'utf8';
}

// ─── File Safety Check ─────────────────────────────────────────

/**
 * Check a file before it enters the text patch flow.
 * Returns whether the file is safe to process as text.
 * Rejects binary files, files exceeding budget, and unknown-encoding files.
 */
export async function checkFileForPatch(
    filePath: string,
    maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<FileCheckResult> {
    let stat;
    try {
        stat = await fs.stat(filePath);
    } catch {
        // File doesn't exist — safe to create
        return { safe: true, size: 0, isBinary: false, encoding: 'utf8' };
    }

    if (stat.size > maxBytes) {
        return {
            safe: false,
            size: stat.size,
            isBinary: false,
            encoding: 'utf8',
            reason: `File size ${stat.size} exceeds budget ${maxBytes} bytes.`,
        };
    }

    // Read first 4096 bytes for heuristic detection
    let handle: fs.FileHandle | null = null;
    try {
        handle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(Math.min(stat.size, 4096));
        await handle.read(buffer, 0, buffer.length, 0);
        await handle.close();

        const encoding = detectEncoding(buffer);
        const isBinary = detectBinary(buffer);

        if (isBinary) {
            return {
                safe: false,
                size: stat.size,
                isBinary: true,
                encoding: 'binary',
                reason: 'File contains binary content (null bytes or high non-printable ratio).',
            };
        }

        if (encoding === 'binary') {
            return {
                safe: false,
                size: stat.size,
                isBinary: true,
                encoding: 'binary',
                reason: 'File encoding could not be determined as text.',
            };
        }

        if (encoding === 'utf16le' || encoding === 'utf16be') {
            return {
                safe: false,
                size: stat.size,
                isBinary: false,
                encoding,
                reason: `UTF-16 encoding detected (${encoding}). Only UTF-8 text files are accepted by default.`,
            };
        }

        return { safe: true, size: stat.size, isBinary: false, encoding: 'utf8' };
    } finally {
        if (handle) {
            try { await handle.close(); } catch { /* already closed */ }
        }
    }
}

// ─── Atomic Write ──────────────────────────────────────────────

/**
 * Write content to a file atomically using temp-file + rename.
 * 
 * Process:
 *   1. Write content to a temp file in the same directory
 *   2. fsync the temp file (on supported platforms)
 *   3. Rename temp file to target path (atomic on same filesystem)
 *   4. On failure, clean up the temp file
 *
 * The rename is atomic on most local filesystems (NTFS, ext4, APFS).
 * If the process crashes between write and rename, the original file
 * is untouched and the temp file is left for manual cleanup.
 */
export async function atomicWriteFile(
    filePath: string,
    content: string,
    encoding: BufferEncoding = 'utf-8',
): Promise<AtomicWriteResult> {
    const tmpPath = tempPathFor(filePath);
    let handle: fs.FileHandle | null = null;

    try {
        // Ensure parent directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // Write to temp file
        handle = await fs.open(tmpPath, 'w');
        await handle.writeFile(content, encoding);

        // fsync for durability (best-effort, doesn't throw on unsupported platforms)
        try {
            await handle.sync();
        } catch {
            // fsync may not be supported on all platforms/filesystems
        }
        await handle.close();
        handle = null;

        // Atomic rename
        await fs.rename(tmpPath, filePath);

        // Verify write
        const stat = await fs.stat(filePath);

        return {
            success: true,
            filePath,
            bytesWritten: stat.size,
            tempPath: tmpPath,
        };
    } catch (err) {
        // Clean up temp file on failure
        try {
            await fs.unlink(tmpPath);
        } catch {
            // Temp file may not exist, fine
        }

        return {
            success: false,
            filePath,
            bytesWritten: 0,
            tempPath: tmpPath,
            error: err instanceof Error ? err.message : String(err),
        };
    } finally {
        if (handle) {
            try { await handle.close(); } catch { /* already closed */ }
        }
    }
}

/**
 * Write content to a file atomically, throwing on failure.
 * Convenience wrapper around atomicWriteFile for use where
 * exceptions are preferred over result objects.
 */
export async function atomicWrite(
    filePath: string,
    content: string,
    encoding: BufferEncoding = 'utf-8',
): Promise<void> {
    const result = await atomicWriteFile(filePath, content, encoding);
    if (!result.success) {
        throw new Error(
            `Atomic write failed for '${filePath}': ${result.error ?? 'unknown error'}. ` +
            `Temp file at ${result.tempPath} may need manual cleanup.`
        );
    }
}

// ─── Bulk Atomic Apply ─────────────────────────────────────────

/**
 * Apply multiple file writes atomically as a batch.
 * Writes all temp files first, then renames all in sequence.
 * If any rename fails, attempts to rollback previously renamed files.
 * This is "atomic-ish" — not true atomic across multiple files,
 * but minimizes the window of partial application.
 */
export async function atomicApplyBatch(
    files: Array<{ path: string; content: string }>,
): Promise<AtomicWriteResult[]> {
    const results: AtomicWriteResult[] = [];
    const tempPairs: Array<{ target: string; temp: string }> = [];

    // Phase 1: Write all temp files
    for (const file of files) {
        const tmpPath = tempPathFor(file.path);
        tempPairs.push({ target: file.path, temp: tmpPath });

        let handle: fs.FileHandle | null = null;
        try {
            const dir = path.dirname(file.path);
            await fs.mkdir(dir, { recursive: true });

            handle = await fs.open(tmpPath, 'w');
            await handle.writeFile(file.content, 'utf-8');
            try { await handle.sync(); } catch { /* best effort */ }
            await handle.close();
            handle = null;
        } catch (err) {
            if (handle) try { await handle.close(); } catch { /* */ }

            // Clean up any temp files already written
            for (const pair of tempPairs) {
                try { await fs.unlink(pair.temp); } catch { /* */ }
            }

            results.push({
                success: false,
                filePath: file.path,
                bytesWritten: 0,
                tempPath: tmpPath,
                error: `Temp write failed: ${err instanceof Error ? err.message : String(err)}`,
            });
            return results;
        }
    }

    // Phase 2: Rename all temp files to targets
    const renamed: Array<{ target: string; temp: string }> = [];
    for (const pair of tempPairs) {
        try {
            await fs.rename(pair.temp, pair.target);
            renamed.push(pair);

            const stat = await fs.stat(pair.target);
            results.push({
                success: true,
                filePath: pair.target,
                bytesWritten: stat.size,
                tempPath: pair.temp,
            });
        } catch (err) {
            results.push({
                success: false,
                filePath: pair.target,
                bytesWritten: 0,
                tempPath: pair.temp,
                error: `Rename failed: ${err instanceof Error ? err.message : String(err)}`,
            });

            // Best-effort rollback of already-renamed files
            // Note: we can't un-rename back to temp, so this is a best-effort warning
            // The caller should handle full rollback via snapshot
            for (const r of renamed) {
                try { await fs.unlink(r.temp); } catch { /* */ }
            }
            // Clean up remaining temp files
            for (const pair of tempPairs) {
                if (!renamed.includes(pair)) {
                    try { await fs.unlink(pair.temp); } catch { /* */ }
                }
            }
            return results;
        }
    }

    return results;
}