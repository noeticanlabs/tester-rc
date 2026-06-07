import { describe, it, expect } from 'vitest';
import { ingestFile, ingestFiles } from '../src/T4_ingestion.js';
import { analyzeCode } from '../src/T12_code_adapter.js';
import { analyzeLanguage } from '../src/T13_language_adapter.js';
import { emitReceipt, validateReceiptClaim } from '../src/T9_receipt_engine.js';

describe('T4 — Ingestion', () => {
    it('ingests .ts file as source_file → code-atlas', () => {
        const r = ingestFile('src/main.ts', 'const x = 1;');
        expect(r.artifactType).toBe('source_file');
        expect(r.targetAtlas).toBe('code-atlas');
        expect(r.fileHash).toHaveLength(64);
    });
    it('ingests .lean file as proof_file → math-atlas', () => {
        const r = ingestFile('proof.lean', 'theorem foo : 1 = 1 := rfl');
        expect(r.artifactType).toBe('proof_file');
        expect(r.targetAtlas).toBe('math-atlas');
    });
    it('ingests .md file as document → tlt-atlas', () => {
        const r = ingestFile('readme.md', '# Title');
        expect(r.artifactType).toBe('document');
        expect(r.targetAtlas).toBe('tlt-atlas');
    });
    it('batch ingestion returns correct count', () => {
        const results = ingestFiles([
            { path: 'a.ts', content: 'x' },
            { path: 'b.rs', content: 'fn main(){}' },
        ]);
        expect(results).toHaveLength(2);
        expect(results.every(r => r.status === 'ingested')).toBe(true);
    });
    it('empty content gets hashed', () => {
        const r = ingestFile('empty.txt', '');
        expect(r.fileHash).toHaveLength(64);
    });
});
describe('T12 — Code Adapter', () => {
    it('detects ConditionalBranch, Return, ResultOrOption', () => {
        const r = analyzeCode('if (b === 0) { return null; } return a / b;', 'math.ts');
        expect(r.invariantsDetected).toContain('INV_006');
        expect(r.invariantsDetected).toContain('INV_008');
        expect(r.invariantsDetected).toContain('INV_011');
        expect(r.risksDetected).toContain('RISK_001');
    });
    it('detects FunctionDefinition', () => {
        const r = analyzeCode('function foo(x: number): number { return x * 2; }', 'util.ts');
        expect(r.invariantsDetected).toContain('INV_001');
    });
    it('async function triggers AsyncContinuation', () => {
        const r = analyzeCode('async function fetch() { await delay(100); }', 'api.ts');
        expect(r.invariantsDetected).toContain('INV_022');
    });
});
describe('T13 — Language Adapter', () => {
    it('maps ApplyPatch to Command + SafetyConstraint', () => {
        const r = analyzeLanguage('apply patch', 'ApplyPatch');
        expect(r.intentLabel).toBe('Command');
        expect(r.semanticUnits).toContain('SEM_002');
        expect(r.semanticUnits).toContain('SEM_010');
    });
    it('maps FixTests to Repair', () => {
        const r = analyzeLanguage('fix tests', 'FixTests');
        expect(r.intentLabel).toBe('Repair');
        expect(r.semanticUnits).toContain('SEM_011');
    });
    it('unknown intent returns Clarification with low confidence', () => {
        const r = analyzeLanguage('do something', 'Unknown');
        expect(r.intentLabel).toBe('Clarification');
        expect(r.confidence).toBe(0.3);
        expect(r.ambiguityDetected).toBe(true);
    });
});
describe('T9 — Receipt Engine', () => {
    it('emits receipt with correct fields', () => {
        const r = emitReceipt({ domain: 'code', sourceId: 'src/main.ts', transition: 'draft_to_accepted', evidenceLevel: 'unit_tested', status: 'accepted' });
        expect(r.receiptId).toMatch(/^RCPT_\d{6}$/);
        expect(r.domain).toBe('code');
        expect(r.status).toBe('accepted');
    });
    it('validates accepted with no evidence as invalid', () => {
        const r = emitReceipt({ domain: 'code', sourceId: 'x', transition: 't', evidenceLevel: 'none', status: 'accepted' });
        expect(validateReceiptClaim(r).valid).toBe(false);
    });
    it('validates accepted with unit_tested as valid', () => {
        const r = emitReceipt({ domain: 'code', sourceId: 'x', transition: 't', evidenceLevel: 'unit_tested', status: 'accepted' });
        expect(validateReceiptClaim(r).valid).toBe(true);
    });
    it('emits receipts with unique IDs', () => {
        const r1 = emitReceipt({ domain: 'code', sourceId: 'a', transition: 't', evidenceLevel: 'syntax_checked', status: 'accepted_with_limitations' });
        const r2 = emitReceipt({ domain: 'math', sourceId: 'b', transition: 't', evidenceLevel: 'proof_sketch', status: 'proof_pending' });
        expect(r1.receiptId).not.toBe(r2.receiptId);
    });
});