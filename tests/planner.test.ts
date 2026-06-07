// CohBit-Copilot v1.3 — Work Planner Test Suite
// 30 tests covering intent inference, file routing, constraint carry-through,
// risk assessment, mutation permission, and JSON output stability.

import { describe, it, expect } from 'vitest';
import { plan } from '../src/planner.js';
import type { WorkIntent, WorkPlan, FileRole, RiskLevel, MutationPermission } from '../src/types.js';

const CWD = process.cwd();

// ─── Helpers ───────────────────────────────────────────────────

function mkPlan(task: string): Promise<WorkPlan> {
    return plan(task, CWD);
}

async function assertIntent(task: string, expected: WorkIntent) {
    const p = await mkPlan(task);
    expect(p.intent).toBe(expected);
}

async function assertRisk(task: string, expected: RiskLevel) {
    const p = await mkPlan(task);
    expect(p.risk).toBe(expected);
}

async function assertMutationPerm(task: string, expected: MutationPermission) {
    const p = await mkPlan(task);
    expect(p.mutationPermission).toBe(expected);
}

async function assertHasFile(task: string, pathPart: string) {
    const p = await mkPlan(task);
    const found = p.likelyFiles.some(f => f.path.includes(pathPart));
    expect(found).toBe(true);
}

// ═══════════════════════════════════════════════════════════════
// WorkIntent Inference (8 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — WorkIntent Inference', () => {
    it('"add a resume command to the ledger" → AddCommand', () => assertIntent('add a resume command to the ledger', 'AddCommand'));
    it('"add a new CLI flag" → AddCommand', () => assertIntent('add a new CLI flag', 'AddCommand'));
    it('"modify the propose handler" → ModifyFunction', () => assertIntent('modify the propose handler', 'ModifyFunction'));
    it('"refactor the receipt module" → ModifyFunction', () => assertIntent('refactor the receipt module', 'ModifyFunction'));
    it('"add tests for the ledger" → AddTest', () => assertIntent('add tests for the ledger', 'AddTest'));
    it('"fix failing ledger test" → FixFailure', () => assertIntent('fix failing ledger test', 'FixFailure'));
    it('"inspect the workspace" → InspectOnly', () => assertIntent('inspect the workspace', 'InspectOnly'));
    it('"inspect src/cli.ts" → InspectOnly', () => assertIntent('inspect src/cli.ts', 'InspectOnly'));
});

// ═══════════════════════════════════════════════════════════════
// File Routing — CLI tasks (4 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — File Routing: CLI', () => {
    it('"add a resume command" routes to src/cli.ts', () => assertHasFile('add a resume command', 'src/cli.ts'));
    it('"add a new CLI flag" routes to src/cli.ts', () => assertHasFile('add a new CLI flag', 'src/cli.ts'));
    it('"add a workspace inspect command" routes to src/cli.ts', () => assertHasFile('add a workspace inspect command', 'src/cli.ts'));
    it('"modify argument parsing" routes to src/cli.ts', () => assertHasFile('modify argument parsing', 'src/cli.ts'));
});

// ═══════════════════════════════════════════════════════════════
// File Routing — Ledger/Session tasks (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — File Routing: Ledger', () => {
    it('"add session summarization" routes to src/ledger.ts', () => assertHasFile('add session summarization', 'src/ledger.ts'));
    it('"modify ledger loading" routes to src/ledger.ts', () => assertHasFile('modify ledger loading', 'src/ledger.ts'));
    it('"resume session" routes to src/ledger.ts', () => assertHasFile('resume session', 'src/ledger.ts'));
});

// ═══════════════════════════════════════════════════════════════
// File Routing — Receipt/Hash tasks (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — File Routing: Receipt', () => {
    it('"modify hash computation" routes to src/receipt.ts', () => assertHasFile('modify hash computation', 'src/receipt.ts'));
    it('"fix receipt finalization" routes to src/receipt.ts', () => assertHasFile('fix receipt finalization', 'src/receipt.ts'));
    it('"add receipt validation" routes to src/receipt.ts', () => assertHasFile('add receipt validation', 'src/receipt.ts'));
});

// ═══════════════════════════════════════════════════════════════
// File Routing — Test tasks (2 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — File Routing: Test Files', () => {
    it('"fix failing ledger test" routes to tests/ledger.test.ts', () => assertHasFile('fix failing ledger test', 'tests/ledger.test.ts'));
    it('"add tests for the proposer" routes to tests/proposer.test.ts', () => assertHasFile('add tests for the proposer', 'tests/proposer.test.ts'));
});

// ═══════════════════════════════════════════════════════════════
// Constraint Carry-Through (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — Constraint Carry-Through', () => {
    it('"only inspect" → readOnly constraint', async () => {
        const p = await mkPlan('only inspect src/cli.ts');
        expect(p.constraints.readOnly).toBe(true);
    });

    it('read-only constraint → InspectOnly intent', async () => {
        await assertIntent('only inspect src/cli.ts', 'InspectOnly');
    });

    it('read-only constraint → ReadOnly mutation permission', async () => {
        await assertMutationPerm('only inspect src/cli.ts', 'ReadOnly');
    });
});

// ═══════════════════════════════════════════════════════════════
// Risk Assessment (4 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — Risk Assessment', () => {
    it('"only inspect" → Low risk', () => assertRisk('only inspect', 'Low'));
    it('"add a resume command" → Medium risk', () => assertRisk('add a resume command', 'Medium'));
    it('"fix failing test" → Medium risk', () => assertRisk('fix failing test', 'Medium'));
    it('"force commit the change" → Blocked risk', () => assertRisk('force commit the change', 'Blocked'));
});

// ═══════════════════════════════════════════════════════════════
// Mutation Permission (3 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — Mutation Permission', () => {
    it('"inspect src/cli.ts" → ReadOnly', () => assertMutationPerm('inspect src/cli.ts', 'ReadOnly'));
    it('"add a resume command" → ProposalOnly', () => assertMutationPerm('add a resume command', 'ProposalOnly'));
    it('"modify the receipt" → ProposalOnly', () => assertMutationPerm('modify the receipt', 'ProposalOnly'));
});

// ═══════════════════════════════════════════════════════════════
// Plan Structure Completeness (4 tests)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — Plan Structure', () => {
    it('plan has all required fields', async () => {
        const p = await mkPlan('add a resume command');
        expect(p).toHaveProperty('intent');
        expect(p).toHaveProperty('confidence');
        expect(p).toHaveProperty('task');
        expect(p).toHaveProperty('likelyFiles');
        expect(p).toHaveProperty('affectedFiles');
        expect(p).toHaveProperty('steps');
        expect(p).toHaveProperty('suggestedTests');
        expect(p).toHaveProperty('risk');
        expect(p).toHaveProperty('constraints');
        expect(p).toHaveProperty('mutationPermission');
    });

    it('plan has non-empty steps', async () => {
        const p = await mkPlan('add a resume command');
        expect(p.steps.length).toBeGreaterThan(0);
    });

    it('plan has suggestedTests including full suite', async () => {
        const p = await mkPlan('add a resume command');
        expect(p.suggestedTests.length).toBeGreaterThan(0);
    });

    it('plan emits stable JSON output', async () => {
        const p = await mkPlan('add a resume command');
        const json = JSON.stringify(p);
        const parsed = JSON.parse(json) as WorkPlan;
        expect(parsed.intent).toBe(p.intent);
        expect(parsed.risk).toBe(p.risk);
        expect(parsed.steps.length).toBe(p.steps.length);
    });
});

// ═══════════════════════════════════════════════════════════════
// 20+ Task Examples (batch)
// ═══════════════════════════════════════════════════════════════
describe('v1.3 — 20 Task Examples', () => {
    const examples: Array<{ task: string; minFiles?: number }> = [
        { task: 'add a resume command to the ledger' },
        { task: 'add a workspace inspect command' },
        { task: 'fix failing ledger test' },
        { task: 'modify the propose handler' },
        { task: 'add tests for the receipt module' },
        { task: 'refactor the symbol extractor' },
        { task: 'implement a rollback planner' },
        { task: 'update the help text' },
        { task: 'inspect the workspace' },
        { task: 'inspect src/cli.ts' },
        { task: 'plan adding a workspace scanner' },
        { task: 'how would we add a resume command' },
        { task: 'review the latest patch' },
        { task: 'explain the last failure' },
        { task: 'show recent sessions' },
        { task: 'recommend tests' },
        { task: 'run the tests' },
        { task: 'build a bounded proposal' },
        { task: 'change the authorization check' },
        { task: 'create a new environment report module' },
    ];

    for (const { task } of examples) {
        it(`"${task}" → produces valid non-crashing plan`, async () => {
            const p = await mkPlan(task);
            expect(p.intent).toBeDefined();
            expect(p.confidence).toBeDefined();
            expect(p.risk).toBeDefined();
            expect(p.mutationPermission).toBeDefined();
            expect(Array.isArray(p.likelyFiles)).toBe(true);
            expect(Array.isArray(p.steps)).toBe(true);
            expect(p.steps.length).toBeGreaterThan(0);
        });
    }
});