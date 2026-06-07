// CohBit-Copilot v1.0 — Atlas Bridge Tests
import { describe, it, expect } from 'vitest';
import { classifyPatchFile, mapCommandToSemantics, type ClassifiedPatch } from '../src/atlas_bridge.js';
import type { PatchFile, EnglishCommandParse } from '../src/types.js';

describe('v1.0 — Patch Classification', () => {
    it('classifies a guarded division patch', () => {
        const patch: PatchFile = {
            path: 'src/math.ts', action: 'modify',
            beforeContent: '', afterContent: 'if (b === 0) { return null; } return a / b;',
            diff: '...',
        };
        const result = classifyPatchFile(patch, 'prop-001');
        expect(result.invariantIds).toContain('INV_006');
        expect(result.invariantIds).toContain('INV_008');
        expect(result.invariantIds).toContain('INV_011');
        expect(result.riskIds).toContain('RISK_001');
    });

    it('classifies a function definition', () => {
        const patch: PatchFile = {
            path: 'src/util.ts', action: 'create',
            beforeContent: null, afterContent: 'function foo(x: number): number { return x * 2; }',
            diff: '...',
        };
        const result = classifyPatchFile(patch, 'prop-002');
        expect(result.invariantIds).toContain('INV_001');
        expect(result.invariantIds).toContain('INV_008');
    });

    it('empty content returns low confidence', () => {
        const patch: PatchFile = { path: 'x.ts', action: 'modify', beforeContent: '', afterContent: '', diff: '' };
        const result = classifyPatchFile(patch, 'prop-003');
        expect(result.classificationConfidence).toBe('low');
        expect(result.invariantIds).toHaveLength(0);
    });

    it('complex patch returns high confidence', () => {
        const patch: PatchFile = {
            path: 'src/lib.ts', action: 'modify', beforeContent: '',
            afterContent: 'async function safeDiv(a: number, b: number): Promise<number | null> {\n  if (b === 0) return null;\n  return a / b;\n}',
            diff: '...',
        };
        const result = classifyPatchFile(patch, 'prop-004');
        expect(result.nodeTypes.length).toBeGreaterThanOrEqual(3);
        expect(result.classificationConfidence).toBe('high');
    });
});

describe('v1.0 — Command to Semantic Mapping', () => {
    it('maps ApplyPatch to Command + SafetyConstraint', () => {
        const cmd: EnglishCommandParse = {
            intent: 'ApplyPatch', confidence: 'high',
            targetFile: 'src/cli.ts', targetModule: undefined, sessionRef: undefined, testCommand: undefined,
            constraints: {}, unsafeReason: undefined, raw: 'apply',
        };
        const result = mapCommandToSemantics(cmd);
        expect(result.semanticUnitIds).toContain('SEM_002');
        expect(result.semanticUnitIds).toContain('SEM_010');
        expect(result.ambiguityDetected).toBe(false);
    });

    it('maps FixTests to RepairInstruction', () => {
        const cmd: EnglishCommandParse = {
            intent: 'FixTests', confidence: 'medium',
            targetFile: undefined, targetModule: undefined, sessionRef: undefined, testCommand: undefined,
            constraints: {}, unsafeReason: undefined, raw: 'fix tests',
        };
        const result = mapCommandToSemantics(cmd);
        expect(result.semanticUnitIds).toContain('SEM_011');
    });

    it('detects ambiguity on unsafe confidence', () => {
        const cmd: EnglishCommandParse = {
            intent: 'ProposePatch', confidence: 'unsafe',
            targetFile: undefined, targetModule: undefined, sessionRef: undefined, testCommand: undefined,
            constraints: {}, unsafeReason: 'Unsafe: file outside workspace', raw: 'propose',
        };
        const result = mapCommandToSemantics(cmd);
        expect(result.ambiguityDetected).toBe(true);
        expect(result.semanticUnitIds).toContain('SEM_018');
    });
});