// Cohbit-Copilot Filesystem Bridge (v0.2)
// Connects the TypeScript gate pipeline to the real filesystem.
//
// Invariant:
//   Filesystem bridge may read, write through ApplyGate, and restore
//   through RollbackGate. It may not bypass gates, silently mutate
//   outside proposal bounds, or treat test passing as commit.
//
// Rollback strategy:
//   Primary: beforeContent from snapshot (self-contained, receipt-verifiable)
//   Optional safety check: git status / git diff
//   Not canonical: git checkout
//
// Large-file limit: files exceeding M_mem budget rejected before apply.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import * as crypto from 'node:crypto';
import type {
    ApplySnapshot,
    SnapshotFile,
    PatchProposal,
    PatchFile,
    TestResult,
    RollbackResult,
    TestRunConfig,
} from './types.js';
import { detectLanguage, defaultTestCommand, parseTestOutput as parseLangOutput } from './lang.js';
import {
    resolveWorkspaceRoot,
    validateFilePath,
    checkSymlinkEscape,
    isSafeForRead,
    assertSafeForWrite,
    type WorkspaceRootInfo,
} from './path_safety.js';
import { atomicWrite, checkFileForPatch } from './atomic_write.js';
import { isRustVerifierAvailable } from './rust_receipt_gate.js';

// ─── Constants ─────────────────────────────────────────────────

/** Maximum file size (bytes) that can be read into a text patch flow. Files exceeding this are rejected. */
const BUDGET_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Extensions known to be binary — these files are rejected by default. */
const BINARY_EXTENSIONS = new Set([
    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.wasm',
    '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.ttf', '.otf', '.woff', '.woff2',
    '.o', '.obj', '.class', '.pyc', '.pyo',
]);
// ─── Hashing ───────────────────────────────────────────────────
function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// ─── Workspace Root (lazy, cached) ─────────────────────────────
let _wsRoot: WorkspaceRootInfo | null = null;

async function getWsRoot(): Promise<WorkspaceRootInfo> {
    if (!_wsRoot) {
        _wsRoot = await resolveWorkspaceRoot();
    }
    return _wsRoot;
}

// ─── Binary File Detection ─────────────────────────────────────

function isBinaryExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
}

/**
 * Detect binary content by sampling the first N bytes.
 * Returns true if the content appears binary (contains null bytes
 * or has a high ratio of non-printable characters).
 */
export function detectBinaryContent(content: string | Buffer): boolean {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const sample = buf.subarray(0, Math.min(buf.length, 4096));

    // Null bytes strongly indicate binary
    if (sample.includes(0)) return true;

    // Check ratio of non-printable characters
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
        const byte = sample[i]!;
        // Allow: tab(9), newline(10), carriage return(13), printable ASCII 32-126
        // Also allow high bytes for UTF-8 multi-byte sequences
        if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
            nonPrintable++;
        }
    }

    // If more than 30% of the sample is non-printable control chars, treat as binary
    return sample.length > 0 && (nonPrintable / sample.length) > 0.30;
}

/**
 * Detect file encoding from first bytes.
 * Returns the likely encoding or 'binary' if undetermined.
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

    if (detectBinaryContent(buffer)) return 'binary';
    return 'utf8';
}

// ─── 1. Snapshot Workspace ─────────────────────────────────────
// Captures pre-state evidence: reads files, hashes content.
// Returns an ApplySnapshot with per-file beforeContent + beforeHash.
// v2.2: Validates path safety and binary content before reading.

export async function snapshotWorkspace(filePaths: string[]): Promise<ApplySnapshot> {
    const wsRoot = await getWsRoot();
    const files: SnapshotFile[] = [];
    const prePatchHashes: Record<string, string> = {};

    for (const filePath of filePaths) {
        // ── v2.2: Path safety validation ──────────────────────
        const validation = await validateFilePath(filePath, wsRoot);
        if (!isSafeForRead(validation)) {
            // Path is unsafe — skip with warning emitted by the path_safety module
            console.warn(`[PathSafety] Skipping unsafe path: ${filePath} — ${validation.error ?? 'outside workspace'}`);
            continue;
        }
        if (validation.warnings.length > 0) {
            for (const w of validation.warnings) {
                console.warn(`[PathSafety] ${filePath}: ${w}`);
            }
        }

        // ── v2.2: Binary file rejection ──────────────────────
        if (isBinaryExtension(filePath)) {
            console.warn(`[PathSafety] Skipping binary file (by extension): ${filePath}`);
            continue;
        }

        // ── v2.2: Large-file budget check ────────────────────
        let stat;
        try {
            stat = await fs.stat(filePath);
            if (stat.size > BUDGET_MAX_FILE_BYTES) {
                console.warn(`[PathSafety] File exceeds budget (${stat.size} > ${BUDGET_MAX_FILE_BYTES}): ${filePath}`);
                continue;
            }
        } catch {
            // File doesn't exist — 'create' action, no stat needed
        }

        let beforeContent: string;
        try {
            beforeContent = await fs.readFile(filePath, 'utf-8');
        } catch {
            // File doesn't exist yet — it's a 'create' action
            beforeContent = '';
        }

        // ── v2.2: Content-level binary detection ─────────────
        if (beforeContent.length > 0 && detectBinaryContent(beforeContent)) {
            console.warn(`[PathSafety] Skipping binary content (detected at read time): ${filePath}`);
            continue;
        }

        const beforeHash = hashContent(beforeContent);
        files.push({ path: filePath, beforeContent, beforeHash });
        prePatchHashes[filePath] = beforeHash;
    }

    return {
        appliedAt: new Date().toISOString(),
        filesModified: filePaths,
        files,
        prePatchHashes,
        postPatchHashes: {}, // populated after apply
    };
}

// ─── 2. Apply Patch ────────────────────────────────────────────
// Writes afterContent from a PatchProposal to the filesystem.
// Produces postPatchHashes for verification.
// On partial failure, rolls back all touched files.

export async function applyPatch(proposal: PatchProposal): Promise<{
    filesModified: string[];
    prePatchHashes: Record<string, string>;
    postPatchHashes: Record<string, string>;
    appliedFiles: string[];
    snapshotFiles: import('./types.js').SnapshotFile[];
}> {
    const wsRoot = await getWsRoot();
    const prePatchHashes: Record<string, string> = {};
    const postPatchHashes: Record<string, string> = {};
    const appliedFiles: string[] = [];
    const preContents: Map<string, string> = new Map();

    // ── v2.2: Pre-validate all paths and symlink safety before touching disk ──
    for (const pf of proposal.files) {
        const validation = await validateFilePath(pf.path, wsRoot);
        if (!isSafeForRead(validation)) {
            throw new Error(
                `Path safety violation: ${validation.error ?? 'Path rejected'} ` +
                `for '${pf.path}'. Proposal aborted before any writes.`
            );
        }
        // Symlink escape is fatal on write path
        if (validation.isSymlinkEscape) {
            throw new Error(
                `Path safety violation: symlink escape detected for '${pf.path}'. ` +
                `Proposal aborted before any writes.`
            );
        }
        // Binary files must not be written via text patch flow
        if (isBinaryExtension(pf.path)) {
            throw new Error(
                `Path safety violation: binary file extension '${pf.path}'. ` +
                `Use --allow-binary to bypass (not recommended).`
            );
        }
        if (detectBinaryContent(pf.afterContent)) {
            throw new Error(
                `Path safety violation: binary content detected in afterContent for '${pf.path}'.`
            );
        }
        if (validation.warnings.length > 0) {
            for (const w of validation.warnings) {
                console.warn(`[PathSafety] ${pf.path}: ${w}`);
            }
        }
    }

    for (const pf of proposal.files) {
        // Read pre-state
        let beforeContent: string;
        try {
            beforeContent = await fs.readFile(pf.path, 'utf-8');
        } catch {
            beforeContent = '';
        }
        preContents.set(pf.path, beforeContent);
        prePatchHashes[pf.path] = hashContent(beforeContent);
    }

    // Apply writes
    for (const pf of proposal.files) {
        try {
            // ── v2.2: Re-verify symlink safety at write time (TOCTOU defense) ──
            const symCheck = await checkSymlinkEscape(pf.path, wsRoot);
            if (!symCheck.safe) {
                throw new Error(
                    `Symlink escape detected at write time for '${pf.path}': ${symCheck.warning ?? 'unsafe path'}`
                );
            }

            // Ensure directory exists
            const dir = path.dirname(pf.path);
            await fs.mkdir(dir, { recursive: true });

            if (pf.action === 'delete') {
                await fs.unlink(pf.path);
            } else {
                await atomicWrite(pf.path, pf.afterContent, 'utf-8');
            }

            // Read back to verify
            let postContent: string;
            if (pf.action === 'delete') {
                postContent = '';
            } else {
                postContent = await fs.readFile(pf.path, 'utf-8');
            }
            postPatchHashes[pf.path] = hashContent(postContent);
            appliedFiles.push(pf.path);
        } catch (err) {
            // Partial apply failure — rollback all touched files
            for (const restored of appliedFiles) {
                const orig = preContents.get(restored);
                if (orig !== undefined) {
                    try {
                        await fs.writeFile(restored, orig, 'utf-8');
                    } catch {
                        // Best-effort rollback
                    }
                }
            }
            throw new Error(
                `Apply failed at ${pf.path}: ${err instanceof Error ? err.message : String(err)}. ` +
                `Rolled back ${appliedFiles.length} files.`
            );
        }
    }

    const snapshotFiles: SnapshotFile[] = [];
    for (const [filePath, beforeContent] of preContents) {
        snapshotFiles.push({
            path: filePath,
            beforeContent,
            beforeHash: prePatchHashes[filePath] ?? hashContent(beforeContent),
        });
    }

    return {
        filesModified: proposal.files.map(f => f.path),
        prePatchHashes,
        postPatchHashes,
        appliedFiles,
        snapshotFiles,
    };
}

// ─── 3. Rollback Workspace ─────────────────────────────────────
// Restores files from snapshot's beforeContent.
// Verifies post-rollback hash matches pre-state hash.
// On hash mismatch, aborts and emits DirtyWorkspace warning.

export async function rollbackWorkspace(snapshot: ApplySnapshot): Promise<RollbackResult> {
    const filesRestored: string[] = [];
    const warnings: string[] = [];
    let hashVerified = true;

    for (const file of snapshot.files) {
        try {
            // Restore from beforeContent
            if (file.beforeContent === '') {
                // File didn't exist pre-patch — delete it
                try {
                    await fs.unlink(file.path);
                } catch {
                    // Already gone, fine
                }
            } else {
                await atomicWrite(file.path, file.beforeContent, 'utf-8');
            }

            // Verify hash after restore
            let restoredContent: string;
            try {
                restoredContent = await fs.readFile(file.path, 'utf-8');
            } catch {
                restoredContent = '';
            }
            const restoredHash = hashContent(restoredContent);

            if (restoredHash !== file.beforeHash) {
                hashVerified = false;
                warnings.push(
                    `Hash mismatch for ${file.path}: expected ${file.beforeHash}, got ${restoredHash}. ` +
                    `Workspace may be dirty.`
                );
            }

            filesRestored.push(file.path);
        } catch (err) {
            warnings.push(
                `Rollback failed for ${file.path}: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    return {
        success: filesRestored.length > 0,
        filesRestored,
        hashVerified,
        warnings,
    };
}

// ─── 4. Run Project Tests ──────────────────────────────────────
// Executes a test command via subprocess.
// Default: "npm test"
// Parses output for pass/fail results.

function parseTestOutput(stdout: string, stderr: string): TestResult[] {
    const results: TestResult[] = [];

    // Try to parse common test runner output patterns
    const passPattern = /(\d+)\s+passing/i;
    const failPattern = /(\d+)\s+failing/i;
    const testNamePattern = /\s+(✓|✔|ok|PASS|pass)\s+(.+)/gi;
    const failNamePattern = /\s+(✗|✘|✕|×|FAIL|fail)\s+(.+)/gi;

    // Extract passing tests
    let match: RegExpExecArray | null;
    while ((match = testNamePattern.exec(stdout)) !== null) {
        const name = match[2]?.trim() ?? 'unknown';
        results.push({ name, passed: true, duration: 0 });
    }

    // Extract failing tests
    while ((match = failNamePattern.exec(stdout)) !== null) {
        const name = match[2]?.trim() ?? 'unknown';
        // Find error context near this failure
        const errorStart = stdout.indexOf(name);
        const errorContext = errorStart >= 0
            ? stdout.substring(errorStart, errorStart + 500)
            : stderr;
        results.push({
            name,
            passed: false,
            duration: 0,
            error: errorContext,
        });
    }

    // If no individual tests parsed but there's output, try numeric summary
    if (results.length === 0) {
        const passCount = parseInt(stdout.match(passPattern)?.[1] ?? '0', 10);
        const failCount = parseInt(stdout.match(failPattern)?.[1] ?? '0', 10);

        if (passCount > 0 || failCount > 0) {
            for (let i = 0; i < passCount; i++) {
                results.push({ name: `test_${i + 1}`, passed: true, duration: 0 });
            }
            for (let i = 0; i < failCount; i++) {
                results.push({
                    name: `test_${i + passCount + 1}`,
                    passed: false,
                    duration: 0,
                    error: stderr || stdout,
                });
            }
        }
    }

    return results;
}

export async function runProjectTests(config?: TestRunConfig): Promise<TestResult[]> {
    // ═══════ v0.4: Auto-detect language if no command specified ═══════
    // v11.2: Replaced exec() with spawn() to avoid shell-string injection.
    //        Tests that passed exec flags (e.g., "npm test -- --grep pattern")
    //        must now use --command with a full shell string (deprecated) or
    //        rely on auto-detection which builds safe argument arrays.
    let command: string;
    let language: import('./types.js').Language = 'unknown';

    if (config?.command) {
        command = config.command;
    } else {
        language = await detectLanguage(process.cwd());
        command = defaultTestCommand(language);
    }

    const emptyTestPolicy = config?.emptyTestPolicy ?? 'allow-with-notice';
    const timeoutMs = config?.timeoutMs ?? 30000;

    // Parse command into executable + args (no shell interpretation)
    const parts = command.split(/\s+/).filter(Boolean);
    const cmd = parts[0] ?? 'npm';
    const args = parts.slice(1);

    return new Promise<TestResult[]>((resolve, reject) => {
        const proc = spawn(cmd, args, {
            timeout: timeoutMs,
            cwd: process.cwd(),
            shell: false, // no shell interpretation — argv only
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
        proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

        proc.on('close', (code: number | null) => {
            // v0.4: Use language-aware parser when running without explicit command
            const results = !config?.command
                ? parseLangOutput(language, stdout, stderr)
                : parseTestOutput(stdout, stderr);

            if (results.length === 0) {
                if (emptyTestPolicy === 'reject') {
                    resolve([{
                        name: 'NoTestsFound',
                        passed: false,
                        duration: 0,
                        error: 'No tests found in project. Policy: reject on empty test suite.',
                    }]);
                } else {
                    resolve([{
                        name: 'NoTestsFound',
                        passed: true,
                        duration: 0,
                        error: 'No tests found. Policy: allow-with-notice.',
                    }]);
                }
                return;
            }

            if (code !== 0 && results.every(r => r.passed)) {
                resolve([{
                    name: 'ProcessExit',
                    passed: false,
                    duration: 0,
                    error: `Test process exited with code ${code ?? '?'}: ${stderr || stdout}`,
                }]);
                return;
            }

            resolve(results);
        });

        proc.on('error', (err: Error) => {
            reject(new Error(`Failed to start test process: ${err.message}`));
        });
    });
}
