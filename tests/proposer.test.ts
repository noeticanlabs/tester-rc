// Cohbit-Copilot v0.7 — Bounded Patch Proposal Tests
// 12 tests validating proposer safety, edge cases, and gate integration.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { proposeBoundedPatch } from '../src/proposer.js';
import { propose, review, authorize } from '../src/gates.js';
import type { PatchScope, CohBitReceipt } from '../src/types.js';

let tempDir: string;

beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `proposer-v07-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

const defaultScope: PatchScope = {
    allowedPaths: [],
    maxFiles: 10,
    maxBytesChanged: 100000,
    allowCreate: true,
    allowModify: true,
    allowDelete: false,
};

// ═══ 1. Exact one-file replacement ══════════════════════════════
it('1. proposes exact one-file replacement', async () => {
    const filePath = path.join(tempDir, 'target.ts');
    await fs.writeFile(filePath, 'export function add(a,b) { return a + b + 1; }', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'target.ts',
        findBlock: 'return a + b + 1;',
        replaceBlock: 'return a + b;',
        scope: defaultScope,
    });

    expect(result.status).toBe('proposed');
    if (result.status === 'proposed') {
        expect(result.proposal.files).toHaveLength(1);
        expect(result.proposal.files[0]!.action).toBe('modify');
        expect(result.proposal.files[0]!.afterContent).toContain('return a + b;');
        expect(result.proposal.files[0]!.afterContent).not.toContain('+ 1');
    }
});

// ═══ 2. Rejects if path outside workspace ═══════════════════════
it('2. rejects if target path outside workspace', async () => {
    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: '../outside/file.ts',
        findBlock: 'x',
        replaceBlock: 'y',
        scope: defaultScope,
    });
    expect(result.status).toBe('no_patch');
});

// ═══ 3. Rejects if file not in allowedPaths ══════════════════════
it('3. rejects if file not in allowedPaths', async () => {
    const filePath = path.join(tempDir, 'restricted.ts');
    await fs.writeFile(filePath, 'const x = 1;', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'restricted.ts',
        findBlock: 'x = 1',
        replaceBlock: 'x = 2',
        scope: { ...defaultScope, allowedPaths: ['src/'] },
    });
    expect(result.status).toBe('no_patch');
});

// ═══ 4. Rejects if exact block not found ═════════════════════════
it('4. rejects if exact block not found', async () => {
    const filePath = path.join(tempDir, 'nonexistent.ts');
    await fs.writeFile(filePath, 'actual content', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'nonexistent.ts',
        findBlock: 'this text does not exist',
        replaceBlock: 'nothing',
        scope: defaultScope,
    });
    expect(result.status).toBe('no_patch');
});

// ═══ 5. Rejects if block appears multiple times ═════════════════
it('5. rejects if exact block appears multiple times', async () => {
    const filePath = path.join(tempDir, 'duplicate.ts');
    await fs.writeFile(filePath, 'const x = 1;\nconst x = 1;\n', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'duplicate.ts',
        findBlock: 'const x = 1;',
        replaceBlock: 'const x = 2;',
        scope: defaultScope,
    });
    expect(result.status).toBe('no_patch');
});

// ═══ 6. Rejects if byte budget exceeded ══════════════════════════
it('6. rejects if byte budget exceeded', async () => {
    const filePath = path.join(tempDir, 'large.ts');
    await fs.writeFile(filePath, 'short text', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'large.ts',
        findBlock: 'short text',
        replaceBlock: 'x'.repeat(10000),
        scope: { ...defaultScope, maxBytesChanged: 10 },
    });
    expect(result.status).toBe('no_patch');
});

// ═══ 7. Creates file when allowCreate=true ═══════════════════════
it('7. creates file when allowCreate=true', async () => {
    const result = await proposeBoundedPatch({
        cwd: tempDir,
        createPath: 'newfile.ts',
        content: 'export const hello = "world";',
        scope: defaultScope,
    });

    expect(result.status).toBe('proposed');
    if (result.status === 'proposed') {
        expect(result.proposal.files[0]!.action).toBe('create');
        expect(result.proposal.files[0]!.beforeContent).toBeNull();
        expect(result.proposal.files[0]!.afterContent).toBe('export const hello = "world";');
    }
});

// ═══ 8. Rejects create when allowCreate=false ════════════════════
it('8. rejects create when allowCreate=false', async () => {
    const result = await proposeBoundedPatch({
        cwd: tempDir,
        createPath: 'nope.ts',
        content: 'nope',
        scope: { ...defaultScope, allowCreate: false },
    });
    expect(result.status).toBe('no_patch');
});

// ═══ 9. Proposal does not write file ═════════════════════════════
it('9. proposal does not write file', async () => {
    const filePath = path.join(tempDir, 'readonly.ts');
    const original = 'return a + b + 1;';
    await fs.writeFile(filePath, original, 'utf-8');

    await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'readonly.ts',
        findBlock: original,
        replaceBlock: 'return a + b;',
        scope: defaultScope,
    });

    // File must remain unchanged
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe(original);
});

// ═══ 10. Generated proposal passes ProposalGate ═════════════════
it('10. generated proposal passes ProposalGate', async () => {
    const filePath = path.join(tempDir, 'gate-test.ts');
    await fs.writeFile(filePath, 'return a + b + 1;', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'gate-test.ts',
        findBlock: 'return a + b + 1;',
        replaceBlock: 'return a + b;',
        scope: defaultScope,
    });

    expect(result.status).toBe('proposed');
    if (result.status === 'proposed') {
        const record = propose({
            description: result.proposal.description,
            files: result.proposal.files.map(f => ({
                path: f.path,
                action: f.action,
                beforeContent: f.beforeContent,
                afterContent: f.afterContent,
                diff: f.diff,
            })),
            estimatedSpend: result.proposal.estimatedSpend,
            estimatedDefect: result.proposal.estimatedDefect,
            requiredAuthority: result.proposal.requiredAuthority,
            policyHash: result.proposal.policyHash,
        });
        expect(record.status).toBe('PROPOSED');
        expect(record.proposal.files).toHaveLength(1);
    }
});

// ═══ 11. Full seven-gate trial ══════════════════════════════════
it('11. generated proposal can run through full gate pipeline', async () => {
    const filePath = path.join(tempDir, 'full-pipeline.ts');
    await fs.writeFile(filePath, 'export default function add(a,b) { return a + b + 1; }', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'full-pipeline.ts',
        findBlock: 'return a + b + 1;',
        replaceBlock: 'return a + b;',
        scope: defaultScope,
    });

    expect(result.status).toBe('proposed');
    if (result.status === 'proposed') {
        // 1. Propose
        let record = propose({
            description: result.proposal.description,
            files: result.proposal.files.map(f => ({
                path: f.path,
                action: f.action,
                beforeContent: f.beforeContent,
                afterContent: f.afterContent,
                diff: f.diff,
            })),
            estimatedSpend: result.proposal.estimatedSpend,
            estimatedDefect: result.proposal.estimatedDefect,
            requiredAuthority: result.proposal.requiredAuthority,
            policyHash: result.proposal.policyHash,
        });
        expect(record.status).toBe('PROPOSED');

        // 2. Review
        record = review(record, 'developer', true, 'Approved');
        expect(record.status).toBe('REVIEW_PASSED');

        // 3. Authorize
        const receipt: CohBitReceipt = {
            bitId: '',
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 11, denom: 1 },
            wedge: {
                version: '0.7',
                domainId: 'v07',
                policyHash: result.proposal.policyHash,
                fromState: '0'.repeat(64),
                toState: '0'.repeat(64),
                actionHash: '0'.repeat(64),
                spend: { numer: 0, denom: 1 },
                defect: { numer: 1, denom: 1 },
                prescribedEnvelope: { numer: 1, denom: 1 },
                authority: { numer: 0, denom: 1 },
                certificateHash: '0'.repeat(64),
            },
        };
        record = authorize(record, {
            domainId: 'v07',
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 11, denom: 1 },
            memoryBudget: 1000000,
            traceBudget: 1000000,
        }, receipt);
        expect(record.status).toBe('AUTHORIZED');

        // 4. Apply, Test, Receipt gates would follow in a real trial
        // (covered by existing v0.2/v0.4 trials)
    }
});

// ═══ 12. Off-by-one pattern recognition ═════════════════════════
it('12. recognizes off-by-one failure and proposes fix', async () => {
    const filePath = path.join(tempDir, 'offbyone.ts');
    await fs.writeFile(filePath, 'function add(a,b) { return a + b + 1; }', 'utf-8');

    const result = await proposeBoundedPatch({
        cwd: tempDir,
        targetPath: 'offbyone.ts',
        failureText: 'AssertionError: expected 5 but got 6 — off by one',
        testResults: [
            { name: 'test_add', passed: false, duration: 0, error: 'expected 5, got 6: assertion failed' },
        ],
        scope: defaultScope,
    });

    expect(result.status).toBe('proposed');
    if (result.status === 'proposed') {
        expect(result.proposal.files[0]!.afterContent).toContain('return a + b;');
        expect(result.proposal.files[0]!.afterContent).not.toContain('+ 1');
    }
});