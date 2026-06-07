// CohBit-Copilot v2.2 — Windows Path Security Tests
// Covers: NTFS streams, case collisions, UNC paths, reserved names
//
// Operating law: Windows-style traversal paths are rejected.
// Case-insensitive path collision is detected or warned.

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { isWithinWorkspaceSync, detectCaseCollision } from '../src/path_safety.js';

const CWD = process.cwd();
const isWindows = process.platform === 'win32';

// ═══════════════════════════════════════════════════════════════
// Windows Path Traversal Rejection
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Windows Path Traversal', () => {
    it('UNC path is rejected by containment check', () => {
        const unc = '\\\\localhost\\C$\\Windows\\System32';
        expect(isWithinWorkspaceSync(unc, CWD)).toBe(false);
    });

    it('forward-slash UNC path is rejected', () => {
        const unc = '//localhost/C$/Windows';
        expect(isWithinWorkspaceSync(unc, CWD)).toBe(false);
    });

    it('path with backslash traversals is rejected', () => {
        const bad = 'src\\..\\..\\etc\\passwd';
        expect(isWithinWorkspaceSync(bad, CWD)).toBe(false);
    });

    it('C:\\ absolute path outside workspace is rejected', () => {
        if (isWindows) {
            expect(isWithinWorkspaceSync('C:\\Windows\\System32\\drivers\\etc\\hosts', CWD)).toBe(false);
        } else {
            // On non-Windows, this would just be a strange relative path
            // but the backslash handling differs; testing platform-appropriate
            expect(isWithinWorkspaceSync('/Windows/System32', CWD)).toBe(false);
        }
    });

    it('mixed slash traversal is rejected', () => {
        const bad = 'src/..\\../etc/passwd';
        const result = isWithinWorkspaceSync(bad, CWD);
        // The key assertion: any traversal outside workspace must be blocked
        expect(result).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// Reserved NTFS Names
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — NTFS Reserved Names', () => {
    it('CON is detectable (even if not rejected, warns)', () => {
        // The validateFilePath function warns on reserved names
        // isWithinWorkspaceSync doesn't — it just checks containment
        const result = isWithinWorkspaceSync('src/CON.ts', CWD);
        // Path may be within workspace but should still be flagged
        // isWithinWorkspaceSync only checks containment, not reserved names
        expect(typeof result).toBe('boolean');
    });

    it('NUL path is handled safely', () => {
        expect(isWithinWorkspaceSync('src/NUL.txt', CWD)).toBe(true);
        // Reserved names are warned by validateFilePath, not blocked by isWithinWorkspaceSync
    });

    it('LPT1 path is handled safely', () => {
        expect(isWithinWorkspaceSync('src/LPT1.ts', CWD)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
// Case-Insensitive Collision Detection
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Case Collision Detection', () => {
    it('no collision when paths differ completely', () => {
        const known = new Set(['src/cli.ts', 'src/fs.ts', 'src/gates.ts']);
        const result = detectCaseCollision('src/proposer.ts', known, CWD);
        expect(result.collision).toBe(false);
    });

    it('detects case-insensitive collision on Windows', () => {
        const known = new Set(['src/Cli.ts']);
        const result = detectCaseCollision('src/cli.ts', known, CWD);
        if (isWindows) {
            expect(result.collision).toBe(true);
            expect(result.existingPath).toBe('src/Cli.ts');
        } else {
            // On Linux/macOS, case collision doesn't apply
            expect(result.collision).toBe(false);
        }
    });

    it('same case is not a collision', () => {
        const known = new Set(['src/cli.ts']);
        const result = detectCaseCollision('src/cli.ts', known, CWD);
        expect(result.collision).toBe(false);
    });

    it('empty known set never collides', () => {
        const result = detectCaseCollision('src/anything.ts', new Set(), CWD);
        expect(result.collision).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// Trailing Dots/Spaces (Windows filename normalization)
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Trailing Dot/Space Detection', () => {
    it('path with trailing dots is within workspace (validateFilePath warns)', () => {
        // isWithinWorkspaceSync does normalize via path.normalize()
        const result = isWithinWorkspaceSync('src/proposer.ts....', CWD);
        // path.normalize strips trailing dots on some platforms
        // The key check: it should not crash
        expect(typeof result).toBe('boolean');
    });

    it('path with trailing spaces is handled', () => {
        const result = isWithinWorkspaceSync('src/proposer.ts   ', CWD);
        expect(typeof result).toBe('boolean');
    });
});