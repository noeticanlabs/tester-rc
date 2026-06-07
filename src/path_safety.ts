// CohBit-Copilot Path Safety (v2.2)
// Workspace containment, symlink detection, Windows path normalization,
// case-collision detection, and null-byte rejection.
//
// Operating law:
//   Filesystem safety must be verified before mutation.
//   Path validity must be resolved against the real workspace root.
//
// Authority boundary:
//   Path safety applies to all read/write operations through the filesystem bridge.
//   It gates before fs.ts, never after.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ─── Types ─────────────────────────────────────────────────────

export interface PathValidationResult {
    valid: boolean;
    normalizedPath: string;
    realPath: string | null;   // fs.realpath result, null if doesn't exist yet
    isWithinWorkspace: boolean;
    isSymlinkEscape: boolean;
    hasNullByte: boolean;
    hasTraversalAttempt: boolean;
    caseCollision: boolean;
    caseCollisionExistingPath?: string | undefined;
    warnings: string[];
    error?: string | undefined;
}

export interface WorkspaceRootInfo {
    canonicalRoot: string;
    normalizedRoot: string;
    isSymlink: boolean;
    realRoot: string;
}

// ─── Constants ─────────────────────────────────────────────────

// NTFS forbidden filenames (reserved device names)
const NTFS_RESERVED_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

const isWindows = process.platform === 'win32';

// ─── 1. Workspace Root Resolution ──────────────────────────────

/**
 * Resolve the canonical workspace root.
 * On all platforms: resolves symlinks on the root directory itself.
 * Returns the normalized, realpath-resolved root.
 */
export async function resolveWorkspaceRoot(cwd?: string): Promise<WorkspaceRootInfo> {
    const raw = cwd ?? process.cwd();
    const normalizedRoot = path.normalize(raw);
    let realRoot: string;
    let isSymlink = false;

    try {
        realRoot = await fs.realpath(normalizedRoot);
        isSymlink = realRoot !== path.resolve(normalizedRoot);
    } catch {
        // If realpath fails (e.g., directory doesn't exist), fall back to resolve
        realRoot = path.resolve(normalizedRoot);
    }

    // On Windows, lowercase for case-insensitive comparison
    const canonicalRoot = isWindows ? realRoot.toLowerCase() : realRoot;

    return {
        canonicalRoot,
        normalizedRoot,
        isSymlink,
        realRoot,
    };
}

// ─── 2. Path Validation — Composite Check ─────────────────────

/**
 * Primary path validation gate.
 * Called before any read or write operation in fs.ts.
 * Returns a comprehensive PathValidationResult.
 */
export async function validateFilePath(
    filePath: string,
    workspaceRootInfo: WorkspaceRootInfo,
    knownPaths?: Set<string> | undefined,
): Promise<PathValidationResult> {
    const warnings: string[] = [];
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(workspaceRootInfo.realRoot, normalizedPath);

    // ── Null byte check (highest priority rejection) ──────────
    if (filePath.includes('\0') || normalizedPath.includes('\0')) {
        return {
            valid: false,
            normalizedPath,
            realPath: null,
            isWithinWorkspace: false,
            isSymlinkEscape: false,
            hasNullByte: true,
            hasTraversalAttempt: false,
            caseCollision: false,
            warnings,
            error: 'Path contains null byte — rejected for safety.',
        };
    }

    // ── NTFS alternate data stream check ──────────────────────
    // On all platforms: reject colon in filename portion (ADS syntax)
    const fileName = path.basename(normalizedPath);
    if (fileName.includes(':')) {
        // Allow colon in directory portion on Windows only (e.g., C:\)
        if (!isWindows || fileName.includes(':')) {
            return {
                valid: false,
                normalizedPath,
                realPath: null,
                isWithinWorkspace: false,
                isSymlinkEscape: false,
                hasNullByte: false,
                hasTraversalAttempt: false,
                caseCollision: false,
                warnings,
                error: `Path contains alternate data stream syntax: '${fileName}'. Rejected.`,
            };
        }
    }

    // ── NTFS reserved name check ──────────────────────────────
    const baseNameNoExt = path.basename(fileName, path.extname(fileName)).toUpperCase();
    if (NTFS_RESERVED_NAMES.has(baseNameNoExt)) {
        warnings.push(`Path references reserved NTFS device name: ${baseNameNoExt}.`);
    }

    // ── Workspace containment check ───────────────────────────
    let isWithin: boolean;
    if (isWindows) {
        // Case-insensitive prefix check on Windows
        isWithin = resolvedPath.toLowerCase().startsWith(workspaceRootInfo.canonicalRoot);
        // Also verify after resolving the path separator normalization
        if (isWithin) {
            const relativePart = resolvedPath.slice(workspaceRootInfo.realRoot.length);
            // Check no .. components remain in the resolved relative part
            const segments = relativePart.replace(/^[\\/]+/, '').split(/[\\/]/);
            if (segments.includes('..')) {
                isWithin = false;
                warnings.push('Resolved path contains parent-directory traversal (..) outside workspace boundary.');
            }
        }
    } else {
        isWithin = resolvedPath.startsWith(workspaceRootInfo.realRoot + path.sep) ||
            resolvedPath === workspaceRootInfo.realRoot;
        if (isWithin) {
            const relativePart = resolvedPath.slice(workspaceRootInfo.realRoot.length);
            const segments = relativePart.replace(/^\//, '').split('/');
            if (segments.includes('..')) {
                isWithin = false;
                warnings.push('Resolved path contains parent-directory traversal (..) outside workspace boundary.');
            }
        }
    }

    if (!isWithin) {
        return {
            valid: false,
            normalizedPath,
            realPath: null,
            isWithinWorkspace: false,
            isSymlinkEscape: false,
            hasNullByte: false,
            hasTraversalAttempt: true,
            caseCollision: false,
            warnings,
            error: `Path '${resolvedPath}' is outside workspace root '${workspaceRootInfo.realRoot}'. Rejected.`,
        };
    }

    // ── Trailing dot/space normalization warning (Windows) ────
    if (isWindows) {
        const trimmedName = fileName.replace(/[. ]+$/, '');
        if (trimmedName !== fileName && trimmedName.length > 0) {
            warnings.push(`Path has trailing dots/spaces: '${fileName}'. Windows strips these — may reference unexpected file.`);
        }
    }

    // ── Symlink escape check ──────────────────────────────────
    let realPath: string | null = null;
    let isSymlinkEscape = false;

    try {
        // Only resolve if the file actually exists
        realPath = await fs.realpath(resolvedPath);
        // Check if the real path is within the workspace
        if (isWindows) {
            isSymlinkEscape = !realPath.toLowerCase().startsWith(workspaceRootInfo.canonicalRoot);
        } else {
            isSymlinkEscape = !realPath.startsWith(workspaceRootInfo.realRoot + path.sep) &&
                realPath !== workspaceRootInfo.realRoot;
        }
        if (isSymlinkEscape) {
            warnings.push(`Symlink escape detected: '${resolvedPath}' resolves to '${realPath}' which is outside workspace.`);
            // For read operations, we warn. For write operations, we reject.
            // The caller decides based on the context.
        }
    } catch {
        // File doesn't exist yet (create action) — realpath will fail, which is fine
        // For create operations, we still need to verify the parent directory
        try {
            const parentDir = path.dirname(resolvedPath);
            realPath = await fs.realpath(parentDir);
            if (isWindows) {
                if (!realPath.toLowerCase().startsWith(workspaceRootInfo.canonicalRoot)) {
                    isSymlinkEscape = true;
                    warnings.push(`Parent directory '${parentDir}' resolves outside workspace via symlink.`);
                }
            } else {
                if (!realPath.startsWith(workspaceRootInfo.realRoot + path.sep) && realPath !== workspaceRootInfo.realRoot) {
                    isSymlinkEscape = true;
                    warnings.push(`Parent directory '${parentDir}' resolves outside workspace via symlink.`);
                }
            }
            // For creates, the real path would be realParent + fileName
            realPath = path.join(realPath, fileName);
        } catch {
            // Parent doesn't exist either — will be created by mkdir
            // Fall back to the resolved path
            realPath = null;
        }
    }

    // ── Case collision check (Windows only) ───────────────────
    let caseCollision = false;
    let caseCollisionExistingPath: string | undefined;

    if (isWindows && knownPaths) {
        const lowerTarget = resolvedPath.toLowerCase();
        for (const existing of knownPaths) {
            const lowerExisting = path.resolve(workspaceRootInfo.realRoot, existing).toLowerCase();
            if (lowerExisting === lowerTarget && existing !== path.relative(workspaceRootInfo.realRoot, resolvedPath)) {
                caseCollision = true;
                caseCollisionExistingPath = existing;
                warnings.push(`Case-insensitive collision: '${filePath}' collides with existing '${existing}'.`);
                break;
            }
        }
    }

    // ── UNC path warning (Windows) ────────────────────────────
    if (isWindows && (resolvedPath.startsWith('\\\\') || resolvedPath.startsWith('//'))) {
        warnings.push('UNC network path detected — may reference remote resources.');
    }

    return {
        valid: !isSymlinkEscape || warnings.length === 0, // valid for read-only if only warnings
        normalizedPath,
        realPath,
        isWithinWorkspace: true,
        isSymlinkEscape,
        hasNullByte: false,
        hasTraversalAttempt: false,
        caseCollision,
        caseCollisionExistingPath,
        warnings,
    };
}

// ─── 3. Symlink-Specific Check ────────────────────────────────

/**
 * Lightweight check: does a path resolve outside the workspace via symlink?
 * Called before write operations to ensure safety.
 */
export async function checkSymlinkEscape(
    filePath: string,
    workspaceRootInfo: WorkspaceRootInfo,
): Promise<{ safe: boolean; realPath: string | null; warning?: string }> {
    const resolvedPath = path.resolve(workspaceRootInfo.realRoot, filePath);

    try {
        const realPath = await fs.realpath(resolvedPath);
        const safe = isWindows
            ? realPath.toLowerCase().startsWith(workspaceRootInfo.canonicalRoot)
            : (realPath.startsWith(workspaceRootInfo.realRoot + path.sep) || realPath === workspaceRootInfo.realRoot);

        if (!safe) {
            return {
                safe: false,
                realPath,
                warning: `Symlink escape: '${resolvedPath}' → '${realPath}' (outside workspace)`,
            };
        }
        return { safe: true, realPath };
    } catch {
        // File doesn't exist — check parent
        try {
            const parentDir = path.dirname(resolvedPath);
            const realParent = await fs.realpath(parentDir);
            const safe = isWindows
                ? realParent.toLowerCase().startsWith(workspaceRootInfo.canonicalRoot)
                : (realParent.startsWith(workspaceRootInfo.realRoot + path.sep) || realParent === workspaceRootInfo.realRoot);

            if (!safe) {
                return {
                    safe: false,
                    realPath: path.join(realParent, path.basename(filePath)),
                    warning: `Parent directory symlink escape: '${parentDir}' → '${realParent}' (outside workspace)`,
                };
            }
            return { safe: true, realPath: path.join(realParent, path.basename(filePath)) };
        } catch {
            // Parent doesn't exist either — assume safe for create operations
            return { safe: true, realPath: null };
        }
    }
}

// ─── 4. Simple Containment Check (no I/O) ─────────────────────

/**
 * Fast synchronous containment check without filesystem I/O.
 * Suitable for pre-filtering paths before expensive operations.
 */
export function isWithinWorkspaceSync(filePath: string, workspaceRoot: string): boolean {
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(workspaceRoot, normalized);

    if (isWindows) {
        const lowerResolved = resolved.toLowerCase();
        const lowerRoot = workspaceRoot.toLowerCase();
        if (!lowerResolved.startsWith(lowerRoot)) return false;
        // Check for .. traversal in the relative portion
    } else {
        if (!resolved.startsWith(workspaceRoot + path.sep) && resolved !== workspaceRoot) return false;
    }

    // Check no null bytes
    if (filePath.includes('\0')) return false;

    // Check no alternate data stream (colon in filename)
    const baseName = path.basename(normalized);
    if (baseName.includes(':')) return false;

    // Check relative portion for .. components after resolve
    if (isWindows) {
        const relativePart = resolved.slice(workspaceRoot.length).replace(/^[\\/]+/, '');
        const segments = relativePart.split(/[\\/]/);
        return !segments.includes('..');
    } else {
        const relativePart = resolved.slice(workspaceRoot.length).replace(/^\//, '');
        const segments = relativePart.split('/');
        return !segments.includes('..');
    }
}

// ─── 5. Case Collision Detection ───────────────────────────────

/**
 * Given a set of known relative paths and a proposed path,
 * detect Windows case-insensitive collisions.
 */
export function detectCaseCollision(
    filePath: string,
    knownPaths: Set<string>,
    workspaceRoot: string,
): { collision: boolean; existingPath?: string } {
    if (!isWindows) return { collision: false };

    const lowerTarget = path.resolve(workspaceRoot, filePath).toLowerCase();

    for (const existing of knownPaths) {
        const lowerExisting = path.resolve(workspaceRoot, existing).toLowerCase();
        if (lowerExisting === lowerTarget) {
            // Same file, but check if casing differs
            const resolvedTarget = path.resolve(workspaceRoot, filePath);
            const resolvedExisting = path.resolve(workspaceRoot, existing);
            if (resolvedTarget !== resolvedExisting) {
                return { collision: true, existingPath: existing };
            }
        }
    }

    return { collision: false };
}

// ─── 6. Utility: Reject Path for Write ─────────────────────────

/**
 * Throws if path is unsafe for mutation.
 * Safe for read if isSymlinkEscape but within workspace (warns only).
 */
export function assertSafeForWrite(result: PathValidationResult): void {
    if (!result.valid) {
        throw new Error(
            `Path safety violation: ${result.error ?? 'Path rejected for write.'} ` +
            `Warnings: ${result.warnings.join('; ') || '(none)'}`
        );
    }
    if (result.isSymlinkEscape) {
        throw new Error(
            `Path safety violation: symlink escape detected for '${result.normalizedPath}'. ` +
            `Warnings: ${result.warnings.join('; ') || '(none)'}`
        );
    }
    if (result.hasNullByte) {
        throw new Error(`Path safety violation: null byte in path '${result.normalizedPath}'.`);
    }
}

/**
 * Returns true if path is safe for read-only access.
 * Symlink escapes produce warnings but not errors for read operations.
 */
export function isSafeForRead(result: PathValidationResult): boolean {
    if (result.hasNullByte) return false;
    if (!result.isWithinWorkspace) return false;
    if (result.hasTraversalAttempt) return false;
    return true;
}