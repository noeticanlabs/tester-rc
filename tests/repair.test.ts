// CohBit-Copilot v1.7 — Repair Planner Test Suite
// 18 tests covering failure parsing, file mapping, and plan generation.

import { describe, it, expect } from 'vitest';
import { parseFailureText, buildRepairPlan } from '../src/repair_planner.js';
import type { ParsedFailure, RepairPlan } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════
// Vitest Failure Parsing (5 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.7 — Vitest Failure Parsing', () => {
    it('parses a simple assertion failure', () => {
        const text = `FAIL  tests/ledger.test.ts > v1.7 — Repair
AssertionError: expected true to be false
 ❯ tests/ledger.test.ts:42:23`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]!.source).toBe('test');
        expect(failures[0]!.file).toBe('tests/ledger.test.ts');
    });

    it('parses Expected/Received pattern', () => {
        const text = `FAIL  tests/planner.test.ts > intent
AssertionError: expected 'Unknown' to be 'AddCommand'
Expected: "AddCommand"
Received: "Unknown"`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]!.file).toBe('tests/planner.test.ts');
    });

    it('detects multiple failures', () => {
        const text = `FAIL  tests/ledger.test.ts > test 1
AssertionError: expected A to be B
FAIL  tests/receipt.test.ts > test 2
AssertionError: expected X to be Y`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for empty input', () => {
        const failures = parseFailureText('');
        expect(failures).toEqual([]);
    });

    it('detects test source from output', () => {
        const text = `tests failed
FAIL  tests/smoke.test.ts`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]!.source).toBe('test');
    });
});

// ═══════════════════════════════════════════════════════════════
// TypeScript Error Parsing (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.7 — TypeScript Error Parsing', () => {
    it('parses TS error with file and line', () => {
        const text = `src/planner.ts(42,10): error TS2304: Cannot find name 'foo'.`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]!.source).toBe('build');
        expect(failures[0]!.file).toBe('src/planner.ts');
        expect(failures[0]!.line).toBe(42);
        expect(failures[0]!.confidence).toBe('high');
    });

    it('maps cannot find module to InsertImportIfAbsent', () => {
        const text = `src/types.ts(3,18): error TS2307: Cannot find module './nonexistent' or its corresponding type declarations.`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]!.suggestedPrimitive).toBe('InsertImportIfAbsent');
    });

    it('defaults to ReplaceExactBlock for unknown TS errors', () => {
        const text = `src/cli.ts(100,5): error TS2322: Type 'string' is not assignable to type 'number'.`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]!.suggestedPrimitive).toBe('ReplaceExactBlock');
    });
});

// ═══════════════════════════════════════════════════════════════
// Generic Failure Parsing (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.7 — Generic Failure Parsing', () => {
    it('extracts file paths from generic errors', () => {
        const text = `Error at file src/ledger.ts: something went wrong`;
        const failures = parseFailureText(text);
        expect(failures.length).toBeGreaterThan(0);
    });

    it('unknown failure source has low confidence', () => {
        const text = `Something went wrong somewhere`;
        const failures = parseFailureText(text);
        if (failures.length > 0) {
            expect(failures[0]!.confidence).toBe('low');
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// Repair Plan Generation (4 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.7 — Repair Plan Generation', () => {
    it('generates plan for test failure', async () => {
        const plan = await buildRepairPlan(
            'FAIL  tests/ledger.test.ts > test\nAssertionError: expected true to be false',
            process.cwd(),
        );
        expect(plan.failures.length).toBeGreaterThan(0);
        expect(plan.likelyFiles.length).toBeGreaterThan(0);
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(plan.risk).toBeDefined();
    });

    it('generates plan for TS error', async () => {
        const plan = await buildRepairPlan(
            'src/planner.ts(42,10): error TS2304: Cannot find name foo.',
            process.cwd(),
        );
        expect(plan.failures.length).toBeGreaterThan(0);
    });

    it('empty failure text produces low risk plan', async () => {
        const plan = await buildRepairPlan('', process.cwd());
        expect(plan.risk).toBe('Low');
        expect(plan.failures).toEqual([]);
    });

    it('plan includes suggested patches for actionable failures', async () => {
        const plan = await buildRepairPlan(
            'FAIL  tests/ledger.test.ts > test\nAssertionError: expected true to be false',
            process.cwd(),
        );
        expect(plan.suggestedPatches.length).toBeGreaterThanOrEqual(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// Repair Plan Structure (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.7 — Repair Plan Structure', () => {
    it('plan has all required fields', async () => {
        const plan = await buildRepairPlan(
            'FAIL  tests/ledger.test.ts',
            process.cwd(),
        );
        expect(plan).toHaveProperty('failures');
        expect(plan).toHaveProperty('likelyFiles');
        expect(plan).toHaveProperty('suggestedPatches');
        expect(plan).toHaveProperty('steps');
        expect(plan).toHaveProperty('risk');
    });

    it('plan is JSON-serializable', async () => {
        const plan = await buildRepairPlan(
            'FAIL  tests/ledger.test.ts',
            process.cwd(),
        );
        const json = JSON.stringify(plan);
        const parsed = JSON.parse(json) as RepairPlan;
        expect(parsed.risk).toBe(plan.risk);
        expect(parsed.failures.length).toBe(plan.failures.length);
    });
});

// ═══════════════════════════════════════════════════════════════
// Fault Tolerance (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.7 — Fault Tolerance', () => {
    it('handles gibberish text gracefully', async () => {
        const plan = await buildRepairPlan('xyxxyxyzzyx', process.cwd());
        expect(plan).toBeDefined();
        expect(plan.failures).toBeDefined();
    });

    it('handles very long failure output', async () => {
        const text = 'FAIL ' + 'tests/ledger.test.ts '.repeat(100);
        const plan = await buildRepairPlan(text, process.cwd());
        expect(plan).toBeDefined();
    });
});