// CohBit-Copilot v2.1 — English Parser Security Tests
// Covers: adversarial phrasing, bypass attempts, constraint enforcement

import { describe, it, expect } from 'vitest';
import { parseOperatorEnglish } from '../src/english.js';

// ═══════════════════════════════════════════════════════════════
// Unsafe Detection (4 tests)
// ═══════════════════════════════════════════════════════════════
describe('v2.1 — Unsafe Detection', () => {
    it('"apply without authorization" → unsafe', () => {
        const r = parseOperatorEnglish('apply without authorization');
        expect(r.confidence).toBe('unsafe');
    });

    it('"push directly to main" → unsafe', () => {
        const r = parseOperatorEnglish('push directly to main');
        expect(r.confidence).toBe('unsafe');
    });

    it('"skip verification" → unsafe', () => {
        const r = parseOperatorEnglish('skip verification');
        expect(r.confidence).toBe('unsafe');
    });

    it('normal command is not unsafe', () => {
        const r = parseOperatorEnglish('add a resume command');
        expect(r.confidence).not.toBe('unsafe');
    });
});

// ═══════════════════════════════════════════════════════════════
// Constraint Enforcement (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v2.1 — Constraint Enforcement', () => {
    it('"propose only, no apply" → noApply constraint', () => {
        const r = parseOperatorEnglish('propose only, no apply');
        expect(r.constraints.noApply).toBe(true);
    });

    it('readOnly implies noApply', () => {
        const r = parseOperatorEnglish('only inspect src/cli.ts');
        expect(r.constraints.readOnly).toBe(true);
        expect(r.constraints.noApply).toBe(true);
    });

    it('"do not delete" → noDelete constraint', () => {
        const r = parseOperatorEnglish('modify the file but do not delete anything');
        expect(r.constraints.noDelete).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
// Fault Tolerance (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v2.1 — English Fault Tolerance', () => {
    it('very long task description handled gracefully', () => {
        const longText = 'add a test for the ' + 'very '.repeat(500) + 'long module';
        const r = parseOperatorEnglish(longText);
        expect(r.intent).toBeDefined();
    });

    it('unicode/emoji in task description handled', () => {
        const r = parseOperatorEnglish('fix the 🐛 in ledger 📊 module');
        expect(r.intent).toBeDefined();
    });

    it('empty string returns Unknown', () => {
        const r = parseOperatorEnglish('');
        expect(r.intent).toBe('Unknown');
        expect(r.confidence).toBe('low');
    });
});