// @cohbit/tlt-atlas v0.6.0 — L5 Meaning Invariant Tests
import { describe, it, expect } from 'vitest';
import { MEANING_INVARIANTS, getMeaningInvariant, listReceiptRequired } from '../src/L5_meaning_invariant.js';

describe('v0.6 — Meaning Invariants', () => {
    it('has 20 meaning invariants', () => { expect(MEANING_INVARIANTS.size).toBe(20); });
    it('retrieves by ID', () => { expect(getMeaningInvariant('MINV_003')!.name).toBe('SafetyConstraint'); });
    it('SafetyConstraint requires receipt', () => { expect(getMeaningInvariant('MINV_003')!.receiptRequired).toBe(true); });
    it('DirectRequest does not require receipt', () => { expect(getMeaningInvariant('MINV_001')!.receiptRequired).toBe(false); });
    it('each invariant has preserveAcrossLanguages and failureModes', () => { for (const m of MEANING_INVARIANTS.values()) { expect(m.preserveAcrossLanguages.length).toBeGreaterThan(0); expect(m.failureModes.length).toBeGreaterThan(0); } });
    it('receipt-required invariants include SafetyConstraint, RiskReduction, Warning', () => { const ids = listReceiptRequired().map(m => m.id); expect(ids).toContain('MINV_003'); expect(ids).toContain('MINV_004'); expect(ids).toContain('MINV_014'); });
});