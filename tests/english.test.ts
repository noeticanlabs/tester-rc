// CohBit-Copilot v1.0E — English Capability Test Suite
// 50+ examples covering intent recognition, constraint detection, target extraction, and unsafe rejection.

import { describe, it, expect } from 'vitest';
import { parseOperatorEnglish } from '../src/english.js';
import type { OperatorIntent } from '../src/types.js';

function assertIntent(input: string, expected: OperatorIntent, confidence?: string) {
    const result = parseOperatorEnglish(input);
    expect(result.intent).toBe(expected);
    if (confidence) expect(result.confidence).toBe(confidence);
}

// ═══════════════════════════════════════════════════════════════
// Intent Recognition Tests (25)
// ═══════════════════════════════════════════════════════════════
describe('v1.0E — Intent Recognition', () => {
    it('show recent sessions → ShowRecent', () => assertIntent('show recent sessions', 'ShowRecent', 'high'));
    it('show history → ShowRecent', () => assertIntent('show history', 'ShowRecent', 'high'));
    it('recent sessions → ShowRecent', () => assertIntent('recent sessions', 'ShowRecent', 'medium'));
    it('resume latest → ResumeSession', () => assertIntent('resume latest', 'ResumeSession', 'high'));
    it('resume the latest session → ResumeSession', () => assertIntent('resume the latest session', 'ResumeSession', 'high'));
    it('explain the last failure → ExplainSession', () => assertIntent('explain the last failure', 'ExplainSession', 'high'));
    it('what happened → ExplainSession', () => assertIntent('what happened', 'ExplainSession', 'medium'));
    it('inspect the workspace → InspectWorkspace', () => assertIntent('inspect the workspace', 'InspectWorkspace', 'high'));
    it('inspect src/proposer.ts → InspectFile', () => assertIntent('inspect src/proposer.ts', 'InspectFile', 'high'));
    it('look at src/ledger.ts → InspectFile', () => assertIntent('look at src/ledger.ts', 'InspectFile', 'medium'));
    it('plan adding a workspace scanner → PlanChange', () => assertIntent('plan adding a workspace scanner', 'PlanChange', 'high'));
    it('how would we add a resume command → PlanChange', () => assertIntent('how would we add a resume command', 'PlanChange', 'medium'));
    it('propose a patch → ProposePatch', () => assertIntent('propose a patch', 'ProposePatch', 'high'));
    it('generate a bounded patch → ProposePatch', () => assertIntent('generate a bounded patch', 'ProposePatch', 'medium'));
    it('run the tests → RunTests', () => assertIntent('run the tests', 'RunTests', 'high'));
    it('review the patch → ReviewPatch', () => assertIntent('review the patch', 'ReviewPatch', 'high'));
    it('authorize the proposal → AuthorizePatch', () => assertIntent('authorize the proposal', 'AuthorizePatch', 'high'));
    it('apply the patch → ApplyPatch', () => assertIntent('apply the patch', 'ApplyPatch', 'high'));
    it('rollback the change → RollbackPatch', () => assertIntent('rollback the change', 'RollbackPatch', 'high'));
    it('undo the apply → RollbackPatch', () => assertIntent('undo the apply', 'RollbackPatch', 'high'));
    it('recommend tests → RecommendTests', () => assertIntent('recommend tests', 'RecommendTests', 'high'));
    it('suggest tests for the latest → RecommendTests', () => assertIntent('suggest tests for the latest', 'RecommendTests', 'high'));
    it('fix the failing tests → FixTests', () => assertIntent('fix the failing tests', 'FixTests', 'high'));
    it('repair the broken test → FixTests', () => assertIntent('repair the broken test', 'FixTests', 'medium'));
    it('bare inspect → InspectWorkspace (low confidence)', () => assertIntent('inspect', 'InspectWorkspace', 'low'));
});

// ═══════════════════════════════════════════════════════════════
// Constraint Detection Tests (12)
// ═══════════════════════════════════════════════════════════════
describe('v1.0E — Constraint Detection', () => {
    it('only inspect → readOnly + noApply', () => {
        const r = parseOperatorEnglish('only inspect src/ledger.ts');
        expect(r.constraints.readOnly).toBe(true);
        expect(r.constraints.noApply).toBe(true);
    });
    it('read-only please → readOnly', () => {
        const r = parseOperatorEnglish('read-only please explain what happened');
        expect(r.constraints.readOnly).toBe(true);
    });
    it('do not apply anything → noApply', () => {
        const r = parseOperatorEnglish('fix the tests but do not apply anything');
        expect(r.constraints.noApply).toBe(true);
    });
    it('proposal only → noApply', () => {
        const r = parseOperatorEnglish('create a proposal only');
        expect(r.constraints.noApply).toBe(true);
    });
    it('do not delete files → noDelete', () => {
        const r = parseOperatorEnglish('inspect but do not delete files');
        expect(r.constraints.noDelete).toBe(true);
    });
    it('create it if missing → allowCreate', () => {
        const r = parseOperatorEnglish('create it if missing');
        expect(r.constraints.allowCreate).toBe(true);
    });
    it('one file only → maxFiles=1', () => {
        const r = parseOperatorEnglish('propose a patch, one file only');
        expect(r.constraints.maxFiles).toBe(1);
    });
    it('only a single file → maxFiles=1', () => {
        const r = parseOperatorEnglish('only a single file please');
        expect(r.constraints.maxFiles).toBe(1);
    });
    it('two files → maxFiles=2', () => {
        const r = parseOperatorEnglish('apply to two files');
        expect(r.constraints.maxFiles).toBe(2);
    });
    it('no mutations → readOnly', () => {
        const r = parseOperatorEnglish('no mutations, just inspect');
        expect(r.constraints.readOnly).toBe(true);
    });
    it('keep existing files → noDelete', () => {
        const r = parseOperatorEnglish('keep existing files, do not remove');
        expect(r.constraints.noDelete).toBe(true);
    });
    it('allow create and new file', () => {
        const r = parseOperatorEnglish('allow create and new file generation');
        expect(r.constraints.allowCreate).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
// Target Extraction Tests (10)
// ═══════════════════════════════════════════════════════════════
describe('v1.0E — Target Extraction', () => {
    it('extracts file path from inspect', () => {
        const r = parseOperatorEnglish('inspect src/cli.ts');
        expect(r.targetFile).toBe('src/cli.ts');
    });
    it('extracts file path from look at', () => {
        const r = parseOperatorEnglish('look at src/english.ts');
        expect(r.targetFile).toBe('src/english.ts');
    });
    it('extracts module name', () => {
        const r = parseOperatorEnglish('inspect module ledger');
        expect(r.targetModule).toBe('ledger');
    });
    it('extracts session ref abc123', () => {
        const r = parseOperatorEnglish('show session abc123');
        expect(r.sessionRef).toBe('abc123');
    });
    it('extracts latest session ref', () => {
        const r = parseOperatorEnglish('resume latest');
        expect(r.sessionRef).toBe('latest');
    });
    it('extracts cargo test command', () => {
        const r = parseOperatorEnglish('run cargo test -p my-crate');
        expect(r.testCommand).toBe('cargo test -p my-crate');
    });
    it('extracts npm test command', () => {
        const r = parseOperatorEnglish('run npm run test:unit');
        expect(r.testCommand).toBe('npm run test:unit');
    });
    it('extracts go test command', () => {
        const r = parseOperatorEnglish('run go test -v ./...');
        expect(r.testCommand).toBe('go test -v ./...');
    });
    it('extracts pytest command', () => {
        const r = parseOperatorEnglish('run pytest tests/test_cli.py -x');
        expect(r.testCommand).toBe('pytest tests/test_cli.py -x');
    });
    it('extracts dotnet test command', () => {
        const r = parseOperatorEnglish('run dotnet test --filter Category=Unit');
        expect(r.testCommand).toBeDefined();
        expect(r.testCommand).toContain('dotnet test');
    });
});

// ═══════════════════════════════════════════════════════════════
// Unsafe Rejection Tests (8)
// ═══════════════════════════════════════════════════════════════
describe('v1.0E — Unsafe Rejection', () => {
    it('force commit → unsafe', () => {
        const r = parseOperatorEnglish('force commit the patch');
        expect(r.confidence).toBe('unsafe');
        expect(r.unsafeReason).toBeDefined();
    });
    it('delete everything → unsafe', () => {
        const r = parseOperatorEnglish('delete everything and rebuild');
        expect(r.confidence).toBe('unsafe');
    });
    it('apply without review → unsafe', () => {
        const r = parseOperatorEnglish('apply the patch without review');
        expect(r.confidence).toBe('unsafe');
    });
    it('bypass authorization → unsafe', () => {
        const r = parseOperatorEnglish('bypass the authorization gate');
        expect(r.confidence).toBe('unsafe');
    });
    it('skip tests → unsafe', () => {
        const r = parseOperatorEnglish('apply but skip tests');
        expect(r.confidence).toBe('unsafe');
    });
    it('rewrite the whole repo → unsafe', () => {
        const r = parseOperatorEnglish('rewrite the whole repo');
        expect(r.confidence).toBe('unsafe');
    });
    it('force apply → unsafe', () => {
        const r = parseOperatorEnglish('force apply the change now');
        expect(r.confidence).toBe('unsafe');
    });
    it('commit without approval → unsafe', () => {
        const r = parseOperatorEnglish('commit without approval');
        expect(r.confidence).toBe('unsafe');
    });
});

// ═══════════════════════════════════════════════════════════════
// Edge / Ambiguous Tests (5)
// ═══════════════════════════════════════════════════════════════
describe('v1.0E — Edge Cases', () => {
    it('empty string → Unknown, low', () => {
        const r = parseOperatorEnglish('');
        expect(r.intent).toBe('Unknown');
        expect(r.confidence).toBe('low');
    });
    it('gibberish → Unknown, low', () => {
        const r = parseOperatorEnglish('asdfjkl qwerpoiu');
        expect(r.intent).toBe('Unknown');
        expect(r.confidence).toBe('low');
    });
    it('bare fix → ProposePatch, low', () => {
        const r = parseOperatorEnglish('fix it');
        expect(r.intent).toBe('ProposePatch');
        expect(r.confidence).toBe('low');
    });
    it('bare test → RunTests, low', () => {
        const r = parseOperatorEnglish('test');
        expect(r.intent).toBe('RunTests');
        expect(r.confidence).toBe('low');
    });
    it('run the thing → Unknown, low', () => {
        const r = parseOperatorEnglish('run the thing');
        expect(r.intent).toBe('Unknown');
        expect(r.confidence).toBe('low');
    });
});

// ═══════════════════════════════════════════════════════════════
// Capability Score Summary
// ═══════════════════════════════════════════════════════════════
describe('v1.0E — Capability Score', () => {
    it('produces a capability score report', () => {
        const tests = [
            // Intent recognition
            { input: 'show recent sessions', intent: 'ShowRecent' },
            { input: 'resume latest', intent: 'ResumeSession' },
            { input: 'explain the last failure', intent: 'ExplainSession' },
            { input: 'inspect the workspace', intent: 'InspectWorkspace' },
            { input: 'inspect src/proposer.ts', intent: 'InspectFile' },
            { input: 'plan adding a scanner', intent: 'PlanChange' },
            { input: 'propose a patch', intent: 'ProposePatch' },
            { input: 'run the tests', intent: 'RunTests' },
            { input: 'review the patch', intent: 'ReviewPatch' },
            { input: 'authorize the proposal', intent: 'AuthorizePatch' },
            { input: 'apply the patch', intent: 'ApplyPatch' },
            { input: 'rollback the change', intent: 'RollbackPatch' },
            { input: 'recommend tests', intent: 'RecommendTests' },
            { input: 'fix the failing tests', intent: 'FixTests' },
            { input: 'inspect', intent: 'InspectWorkspace' },
            // Constraint detection
            { input: 'only inspect', check: (r: any) => r.constraints.readOnly === true },
            { input: 'do not apply anything', check: (r: any) => r.constraints.noApply === true },
            { input: 'do not delete files', check: (r: any) => r.constraints.noDelete === true },
            { input: 'create it if missing', check: (r: any) => r.constraints.allowCreate === true },
            { input: 'one file only', check: (r: any) => r.constraints.maxFiles === 1 },
            // Target extraction
            { input: 'inspect src/cli.ts', check: (r: any) => r.targetFile === 'src/cli.ts' },
            { input: 'show session abc123', check: (r: any) => r.sessionRef === 'abc123' },
            { input: 'run cargo test -p my-crate', check: (r: any) => r.testCommand === 'cargo test -p my-crate' },
        ];

        let intentCorrect = 0;
        let intentTotal = 0;
        let constraintCorrect = 0;
        let targetCorrect = 0;
        let unsafeTotal = 0;
        let unsafeCorrect = 0;

        for (const t of tests) {
            const r = parseOperatorEnglish(t.input);
            if ('intent' in t) {
                intentTotal++;
                if (r.intent === (t as any).intent) intentCorrect++;
            }
            if ('check' in t) {
                const ok = (t as any).check(r);
                if (t.input.includes('inspect src') || t.input.includes('show session') || t.input.includes('run cargo')) {
                    targetCorrect += ok ? 1 : 0;
                } else {
                    constraintCorrect += ok ? 1 : 0;
                }
            }
        }

        // Unsafe: verify all 8 unsafe examples are caught
        const unsafeInputs = [
            'force commit', 'delete everything', 'apply without review',
            'bypass authorization', 'skip tests', 'rewrite the whole repo',
            'force apply', 'commit without approval',
        ];
        for (const inp of unsafeInputs) {
            unsafeTotal++;
            const r = parseOperatorEnglish(inp);
            if (r.confidence === 'unsafe') unsafeCorrect++;
        }

        console.log(`\nv1.0E English Capability Score:`);
        console.log(`  Intent recognition: ${intentCorrect}/${intentTotal}`);
        console.log(`  Constraint detection: ${constraintCorrect}/5`);
        console.log(`  Target extraction: ${targetCorrect}/3`);
        console.log(`  Unsafe rejection: ${unsafeCorrect}/${unsafeTotal}`);
        console.log(`  Overall: ${intentCorrect + constraintCorrect + targetCorrect + unsafeCorrect}/${intentTotal + 5 + 3 + unsafeTotal}\n`);

        // All must pass for the test to pass
        expect(intentCorrect).toBe(intentTotal);
        expect(constraintCorrect).toBe(5);
        expect(targetCorrect).toBe(3);
        expect(unsafeCorrect).toBe(unsafeTotal);
    });
});