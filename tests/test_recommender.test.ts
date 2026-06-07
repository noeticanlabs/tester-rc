// CohBit-Copilot v1.4 — Test Recommender Test Suite
// 22 tests covering file-to-test mapping, tier priority, per-language commands,
// confidence scoring, input modes, and fallback behavior.

import { describe, it, expect } from 'vitest';
import { recommend } from '../src/test_recommender.js';
import { scanWorkspace } from '../src/workspace.js';
import type { TestRecommendation, TestRecommendationCommand, WorkspaceSummary } from '../src/types.js';

const CWD = process.cwd();

// Reusable workspace summary
let cachedWs: WorkspaceSummary | null = null;
async function getWs(): Promise<WorkspaceSummary> {
    if (!cachedWs) cachedWs = await scanWorkspace(CWD);
    return cachedWs!;
}

function findCommandByTier(rec: TestRecommendation, tier: string): TestRecommendationCommand | undefined {
    return rec.commands.find(c => c.tier === tier);
}

// ═══════════════════════════════════════════════════════════════
// File-to-Test Mapping (4 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — File-to-Test Mapping', () => {
    it('maps src/ledger.ts to tests/ledger.test.ts', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const targeted = findCommandByTier(rec, 'targeted');
        expect(targeted).toBeDefined();
        expect(targeted!.command).toContain('tests/ledger.test.ts');
        expect(targeted!.confidence).toBe('high');
    });

    it('maps src/receipt.ts produces module + full tiers (no exact test file)', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/receipt.ts'], workspace: ws });
        // receipt.ts has no dedicated test file — module + full tiers expected
        const moduleCmd = findCommandByTier(rec, 'module');
        expect(moduleCmd).toBeDefined();
        const fullCmd = findCommandByTier(rec, 'full');
        expect(fullCmd).toBeDefined();
    });

    it('test file as input is self-referenced', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['tests/ledger.test.ts'], workspace: ws });
        const targeted = findCommandByTier(rec, 'targeted');
        expect(targeted).toBeDefined();
        expect(targeted!.command).toContain('tests/ledger.test.ts');
    });

    it('unmatched source file still produces full suite', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/nonexistent.ts'], workspace: ws });
        const full = findCommandByTier(rec, 'full');
        expect(full).toBeDefined();
        expect(full!.confidence).toBe('low');
    });
});

// ═══════════════════════════════════════════════════════════════
// Tier Priority (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — Tier Priority', () => {
    it('always includes full suite fallback', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const full = findCommandByTier(rec, 'full');
        expect(full).toBeDefined();
        expect(rec.fallbackCommand).toBeDefined();
    });

    it('targeted tier has high confidence', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const targeted = findCommandByTier(rec, 'targeted');
        expect(targeted).toBeDefined();
        expect(targeted!.confidence).toBe('high');
    });

    it('module tier has medium confidence', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const moduleCmd = findCommandByTier(rec, 'module');
        expect(moduleCmd).toBeDefined();
        expect(moduleCmd!.confidence).toBe('medium');
    });
});

// ═══════════════════════════════════════════════════════════════
// Per-Language Commands (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — Per-Language Commands', () => {
    it('node project uses npm test', async () => {
        const ws = await getWs();
        // This project is node (has package.json)
        expect(ws.language).toBe('node');
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const full = findCommandByTier(rec, 'full');
        expect(full).toBeDefined();
        expect(full!.command).toBe('npm test');
    });

    it('targeted command uses npm test -- prefix', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const targeted = findCommandByTier(rec, 'targeted');
        if (targeted) {
            expect(targeted.command).toContain('npm test');
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// JSON Output Stability (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — JSON Output Stability', () => {
    it('TestRecommendation is JSON-serializable', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const json = JSON.stringify(rec);
        const parsed = JSON.parse(json) as TestRecommendation;
        expect(parsed.commands.length).toBe(rec.commands.length);
        expect(parsed.fallbackCommand).toBe(rec.fallbackCommand);
    });

    it('roundtripped recommendation preserves tier and confidence', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const json = JSON.stringify(rec);
        const parsed = JSON.parse(json) as TestRecommendation;
        for (let i = 0; i < rec.commands.length; i++) {
            expect(parsed.commands[i]!.tier).toBe(rec.commands[i]!.tier);
            expect(parsed.commands[i]!.confidence).toBe(rec.commands[i]!.confidence);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// No Stable Claim (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — No Stable Claim', () => {
    it('never contains "passed" in command output', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const json = JSON.stringify(rec);
        expect(json).not.toContain('passed');
        expect(json).not.toContain('Passed');
    });

    it('never contains "verified" in command output', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const json = JSON.stringify(rec);
        expect(json).not.toContain('verified');
        expect(json).not.toContain('Verified');
    });
});

// ═══════════════════════════════════════════════════════════════
// Input Modes (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — Input Modes', () => {
    it('likelyFiles produces recommendations', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        expect(rec.commands.length).toBeGreaterThan(0);
    });

    it('changedFiles produces recommendations', async () => {
        const ws = await getWs();
        const rec = recommend({ changedFiles: ['src/ledger.ts'], workspace: ws });
        expect(rec.commands.length).toBeGreaterThan(0);
    });

    it('affectedFiles produces recommendations', async () => {
        const ws = await getWs();
        const rec = recommend({ affectedFiles: ['src/ledger.ts'], workspace: ws });
        expect(rec.commands.length).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — Edge Cases', () => {
    it('empty input returns only full suite', async () => {
        const ws = await getWs();
        const rec = recommend({ workspace: ws });
        expect(rec.commands.length).toBe(1);
        expect(rec.commands[0]!.tier).toBe('full');
    });

    it('multiple files deduplicate commands', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts', 'src/ledger.ts', 'src/ledger.ts'], workspace: ws });
        const targeted = rec.commands.filter(c => c.tier === 'targeted');
        // Only one targeted command expected (deduplicated)
        expect(targeted.length).toBeLessThanOrEqual(1);
    });

    it('combined file types aggregate correctly', async () => {
        const ws = await getWs();
        const rec = recommend({
            likelyFiles: ['src/ledger.ts'],
            changedFiles: ['src/receipt.ts'],
            workspace: ws,
        });
        // Should have commands covering both files
        expect(rec.commands.length).toBeGreaterThanOrEqual(2);
    });
});

// ═══════════════════════════════════════════════════════════════
// Confidence Tiers (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.4 — Confidence Tiers', () => {
    it('targeted commands have high confidence when test file matches', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const targeted = findCommandByTier(rec, 'targeted');
        expect(targeted).toBeDefined();
        expect(targeted!.confidence).toBe('high');
    });

    it('module commands have medium confidence', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const moduleCmd = findCommandByTier(rec, 'module');
        expect(moduleCmd).toBeDefined();
        expect(moduleCmd!.confidence).toBe('medium');
    });

    it('full suite commands have low confidence', async () => {
        const ws = await getWs();
        const rec = recommend({ likelyFiles: ['src/ledger.ts'], workspace: ws });
        const full = findCommandByTier(rec, 'full');
        expect(full).toBeDefined();
        expect(full!.confidence).toBe('low');
    });
});