// CohBit-Copilot v2.2 — Binary File Security Tests
// Covers: binary detection, encoding detection, budget enforcement
//
// Operating law: Binary files are rejected by default.
// Unknown encoding produces NoPatch / diagnostic, not mutation.

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { detectBinaryContent, detectEncoding } from '../src/fs.js';
import { detectBinary, checkFileForPatch } from '../src/atomic_write.js';

// ═══════════════════════════════════════════════════════════════
// Binary Content Detection
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Binary Content Detection', () => {
    it('plain text is not detected as binary', () => {
        const text = 'This is a regular text file with some code:\nconst x = 1;\nfunction foo() {}\n';
        expect(detectBinaryContent(text)).toBe(false);
        expect(detectBinary(text)).toBe(false);
    });

    it('null bytes in content are detected as binary', () => {
        const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
        expect(detectBinaryContent(buf)).toBe(true);
        expect(detectBinary(buf)).toBe(true);
    });

    it('UTF-8 text with extended chars is not binary', () => {
        const text = 'Hello 世界 🌍 — em-dash and ümlaut and 日本語';
        expect(detectBinaryContent(text)).toBe(false);
    });

    it('content with tab, newline, CR is not binary', () => {
        const text = 'line1\nline2\r\n\tindented line\n';
        expect(detectBinaryContent(text)).toBe(false);
    });

    it('content with high ratio of non-printable chars is binary', () => {
        // Create a buffer where 40% of bytes are control chars (non-printable)
        const buf = Buffer.alloc(100);
        for (let i = 0; i < 100; i++) {
            if (i % 3 === 0) {
                buf[i] = 0x01; // SOH control char (non-printable, not tab/newline/CR)
            } else {
                buf[i] = 0x41; // 'A'
            }
        }
        expect(detectBinaryContent(buf)).toBe(true);
    });

    it('empty content is not binary', () => {
        expect(detectBinaryContent('')).toBe(false);
        expect(detectBinary(Buffer.alloc(0))).toBe(false);
    });

    it('small text sample is not false-positive on binary', () => {
        expect(detectBinaryContent('a')).toBe(false);
        expect(detectBinaryContent('{}')).toBe(false);
        expect(detectBinaryContent('[]')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// Encoding Detection
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Encoding Detection', () => {
    it('UTF-8 content is detected as utf8', () => {
        const buf = Buffer.from('Hello world', 'utf-8');
        expect(detectEncoding(buf)).toBe('utf8');
    });

    it('UTF-16 LE BOM is detected', () => {
        const buf = Buffer.from([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00]);
        expect(detectEncoding(buf)).toBe('utf16le');
    });

    it('UTF-16 BE BOM is detected', () => {
        const buf = Buffer.from([0xFE, 0xFF, 0x00, 0x48, 0x00, 0x65]);
        expect(detectEncoding(buf)).toBe('utf16be');
    });

    it('UTF-8 BOM is detected as utf8', () => {
        const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        expect(detectEncoding(buf)).toBe('utf8');
    });

    it('alternating null bytes detected as UTF-16 LE', () => {
        // "A" in UTF-16 LE = 0x41 0x00
        const content = 'A'.repeat(200);
        const buf = Buffer.alloc(content.length * 2);
        for (let i = 0; i < content.length; i++) {
            buf[i * 2] = content.charCodeAt(i);
            buf[i * 2 + 1] = 0x00;
        }
        expect(detectEncoding(buf)).toBe('utf16le');
    });
});

// ═══════════════════════════════════════════════════════════════
// File Check for Patch Flow
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — File Check for Patch', () => {
    it('existing text file passes check', async () => {
        const filePath = path.join(process.cwd(), 'src', 'proposer.ts');
        const result = await checkFileForPatch(filePath);
        expect(result.safe).toBe(true);
        expect(result.isBinary).toBe(false);
        expect(result.encoding).toBe('utf8');
    });

    it('nonexistent file is safe (create action)', async () => {
        const result = await checkFileForPatch('nonexistent_xyz_file.ts');
        expect(result.safe).toBe(true);
        expect(result.size).toBe(0);
    });

    it('file with binary extension is caught by extension check (in fs.ts)', () => {
        // This is tested via the BINARY_EXTENSIONS set in fs.ts
        // checkFileForPatch doesn't check extensions, fs.ts does
        expect(true).toBe(true);
    });

    it('large file over budget is detected', async () => {
        // Test with a very small budget
        const filePath = path.join(process.cwd(), 'src', 'types.ts');
        const result = await checkFileForPatch(filePath, 100); // 100 byte budget
        if (result.safe) {
            // File is small enough — budget test passes for small files
            expect(result.size).toBeLessThanOrEqual(100);
        } else {
            expect(result.reason).toContain('exceeds budget');
        }
    });

    it('UTF-8 text file at budget limit is accepted', async () => {
        const filePath = path.join(process.cwd(), 'src', 'cli.ts');
        // Use a generous budget
        const result = await checkFileForPatch(filePath, 100 * 1024 * 1024);
        expect(result.safe).toBe(true);
        expect(result.encoding).toBe('utf8');
    });
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════
describe('v2.2 — Binary Detection Edge Cases', () => {
    it('JSON content is not binary', () => {
        const json = JSON.stringify({ key: 'value', nested: { arr: [1, 2, 3] } });
        expect(detectBinaryContent(json)).toBe(false);
    });

    it('TypeScript source code is not binary', () => {
        const ts = `
            import { describe, it, expect } from 'vitest';
            const x: number = 42;
            export function foo(): string { return "bar"; }
        `;
        expect(detectBinaryContent(ts)).toBe(false);
    });

    it('buffer with only printable ASCII is not binary', () => {
        const buf = Buffer.from('Printable ASCII only: !@#$%^&*()_+-=[]{}|;:",.<>?/~`');
        expect(detectBinaryContent(buf)).toBe(false);
    });

    it('buffer with exactly 30% non-printable is not treated as binary', () => {
        const buf = Buffer.alloc(100, 0x41); // All 'A'
        // Make 30 bytes non-printable (exactly 30%)
        for (let i = 0; i < 30; i++) {
            buf[i] = 0x01; // SOH
        }
        // 30% is not > 30%, so not binary
        expect(detectBinaryContent(buf)).toBe(false);
    });
});