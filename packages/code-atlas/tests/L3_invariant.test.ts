// @cohbit/code-atlas v0.4.0 — L3 Invariant Tests
// Verifies all 25 atomic invariants, 16 composites, registry queries, and family grouping.

import { describe, it, expect } from 'vitest';
import {
    ATOMIC_INVARIANTS, COMPOSITE_INVARIANTS,
    getInvariant, resolveComposite, listByFamily, getReceiptRequiredInvariants,
    INV_001, INV_006, INV_009, INV_011, INV_023, INV_025,
    CINV_001, CINV_016,
} from '../src/L3_invariant.js';

describe('v0.4 — Atomic Invariants', () => {
    it('all 25 atomic invariants are registered', () => {
        expect(ATOMIC_INVARIANTS.size).toBe(25);
    });

    it('each invariant has all required fields', () => {
        for (const inv of ATOMIC_INVARIANTS.values()) {
            expect(inv.id).toMatch(/^INV_\d{3}$/);
            expect(inv.name).toBeTruthy();
            expect(inv.kind).toBe('atomic');
            expect(inv.family).toBeTruthy();
            expect(inv.definition).toBeTruthy();
            expect(inv.preconditions.length).toBeGreaterThan(0);
            expect(inv.postconditions.length).toBeGreaterThan(0);
            expect(inv.failureModes.length).toBeGreaterThan(0);
            expect(typeof inv.receiptRequired).toBe('boolean');
        }
    });

    it('retrieves invariant by ID', () => {
        const inv = getInvariant('INV_006');
        expect(inv).toBeDefined();
        expect(inv!.id).toBe('INV_006');
        expect(inv!.name).toBe('ConditionalBranch');
    });

    it('returns undefined for unknown invariant', () => {
        expect(getInvariant('INV_999')).toBeUndefined();
    });
});

describe('v0.4 — Composite Invariants', () => {
    it('all 16 composite invariants are registered', () => {
        expect(COMPOSITE_INVARIANTS.size).toBe(16);
    });

    it('retrieves composite by ID', () => {
        const cinv = getInvariant('CINV_001');
        expect(cinv).toBeDefined();
        expect(cinv!.name).toBe('GuardedArithmetic');
        expect(cinv!.kind).toBe('composite');
    });

    it('GuardedArithmetic resolves to 5 correct constituent atoms', () => {
        const atoms = resolveComposite('CINV_001');
        expect(atoms).toHaveLength(5);
        const ids = atoms.map(a => a.id);
        expect(ids).toContain('INV_006'); // ConditionalBranch
        expect(ids).toContain('INV_009'); // ErrorPath
        expect(ids).toContain('INV_011'); // ResultOrOption
        expect(ids).toContain('INV_023'); // TestAssertion
        expect(ids).toContain('INV_025'); // CommitReceipt
    });

    it('resolveComposite returns empty for unknown ID', () => {
        expect(resolveComposite('CINV_999')).toEqual([]);
    });

    it('ClaimEvidenceAlignment constituents include verification + receipt', () => {
        const atoms = resolveComposite('CINV_016');
        const ids = atoms.map(a => a.id);
        expect(ids).toContain('INV_023');
        expect(ids).toContain('INV_024');
        expect(ids).toContain('INV_025');
    });
});

describe('v0.4 — Family Grouping', () => {
    it('control_flow family has 2 invariants', () => {
        const family = listByFamily('control_flow');
        expect(family).toHaveLength(2);
        const names = family.map(f => f.name);
        expect(names).toContain('ConditionalBranch');
        expect(names).toContain('Loop');
    });

    it('failure_handling family has 3 invariants', () => {
        const family = listByFamily('failure_handling');
        expect(family).toHaveLength(3);
        const names = family.map(f => f.name);
        expect(names).toContain('ErrorPath');
        expect(names).toContain('ExceptionOrPanic');
        expect(names).toContain('ResultOrOption');
    });

    it('receipt family has 1 invariant', () => {
        const family = listByFamily('receipt');
        expect(family).toHaveLength(1);
        expect(family[0]!.name).toBe('CommitReceipt');
    });
});

describe('v0.4 — Receipt-Required Filtering', () => {
    it('getReceiptRequiredInvariants returns subset', () => {
        const required = getReceiptRequiredInvariants();
        expect(required.length).toBeGreaterThan(10);
        expect(required.length).toBeLessThan(25);
    });

    it('Mutation requires receipt', () => {
        const inv = ATOMIC_INVARIANTS.get('INV_005')!;
        expect(inv.receiptRequired).toBe(true);
    });

    it('FunctionDefinition does not require receipt', () => {
        const inv = ATOMIC_INVARIANTS.get('INV_001')!;
        expect(inv.receiptRequired).toBe(false);
    });

    it('receipt-required list includes high-risk invariants', () => {
        const required = getReceiptRequiredInvariants();
        const ids = required.map(r => r.id);
        expect(ids).toContain('INV_005'); // Mutation
        expect(ids).toContain('INV_006'); // ConditionalBranch
        expect(ids).toContain('INV_009'); // ErrorPath
        expect(ids).toContain('INV_025'); // CommitReceipt
    });
});