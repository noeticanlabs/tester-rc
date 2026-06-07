// CohBit-Copilot v2.2 — Symlink Security Tests
// Covers: symlink escape, traversal, junction detection
// 
// Operating law: Symlink escape attempts are rejected.

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { resolveWorkspaceRoot, validateFilePath, checkSymlinkEscape } from '../src/path_safety.js';
import { isWithinWorkspaceSync } from '../src/path_safety.js';

const CWD = process.cwd();

// ═══════════════════════════════════════════════════════════════
// Symlink Escape Detection (via validateFilePath)
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Symlink Escape via validateFilePath', () => {
    it('normal path within workspace is accepted', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        const result = await validateFilePath('src/proposer.ts', root);
        expect(result.valid).toBe(true);
        expect(result.isSymlinkEscape).toBe(false);
        expect(result.isWithinWorkspace).toBe(true);
    });

    it('path outside workspace is rejected', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        const result = await validateFilePath('../outside/file.ts', root);
        expect(result.valid).toBe(false);
        expect(result.isWithinWorkspace).toBe(false);
    });

    it('null byte in path is rejected', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        const result = await validateFilePath('src/\0hidden.ts', root);
        expect(result.valid).toBe(false);
        expect(result.hasNullByte).toBe(true);
    });

    it('NTFS alternate data stream is rejected', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        const result = await validateFilePath('src/proposer.ts:hidden', root);
        expect(result.valid).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// Sync Containment Checks
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Sync Workspace Containment', () => {
    it('valid nested path passes sync check', () => {
        expect(isWithinWorkspaceSync('src/cli.ts', CWD)).toBe(true);
    });

    it('traversal path fails sync check', () => {
        expect(isWithinWorkspaceSync('../etc/passwd', CWD)).toBe(false);
    });

    it('null byte path fails sync check', () => {
        expect(isWithinWorkspaceSync('src/\0bad.ts', CWD)).toBe(false);
    });

    it('colon in filename fails sync check', () => {
        expect(isWithinWorkspaceSync('src/bad:stream', CWD)).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// Symlink Escape via checkSymlinkEscape (write-time TOCTOU guard)
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — checkSymlinkEscape Write-Time Guard', () => {
    it('existing file within workspace passes symlink check', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        const result = await checkSymlinkEscape('src/proposer.ts', root);
        expect(result.safe).toBe(true);
    });

    it('nonexistent file within workspace is considered safe for create', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        const result = await checkSymlinkEscape('src/new_file_xyz.ts', root);
        expect(result.safe).toBe(true);
    });

    it('non-existent parent dir returns safe for create operations', async () => {
        const root = await resolveWorkspaceRoot(CWD);
        // checkSymlinkEscape only checks realpath resolution.
        // If parent dir doesn't exist, it returns safe (for create ops).
        // Containment is separately enforced by validateFilePath.
        const result = await checkSymlinkEscape('src/nonexistent_dir/new_file.ts', root);
        expect(result.safe).toBe(true);
    });
});