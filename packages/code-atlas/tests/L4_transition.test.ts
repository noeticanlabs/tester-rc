// @cohbit/code-atlas v0.5.0 — L4 Transition Tests
import { describe, it, expect } from 'vitest';
import {
    CORE_TRANSITIONS, GOVERNANCE_TRANSITIONS, ALL_TRANSITIONS,
    getTransition, listByKind, listByInvariant,
    TRANS_001, TRANS_021,
} from '../src/L4_transition.js';

describe('v0.5 — Transition Registry', () => {
    it('has 22 total transitions (20 core + 2 governance)', () => {
        expect(ALL_TRANSITIONS.size).toBe(22);
        expect(CORE_TRANSITIONS).toHaveLength(20);
        expect(GOVERNANCE_TRANSITIONS).toHaveLength(2);
    });

    it('retrieves transition by ID', () => {
        expect(getTransition('TRANS_001')!.name).toBe('GuardedDivision');
        expect(getTransition('TRANS_999')).toBeUndefined();
    });

    it('each transition has all required fields', () => {
        for (const t of ALL_TRANSITIONS.values()) {
            expect(t.transitionId).toMatch(/^TRANS_\d{3}$/);
            expect(t.name).toBeTruthy();
            expect(t.stateBefore).toBeTruthy();
            expect(t.stateAfter).toBeTruthy();
            expect(t.commitCondition).toBeTruthy();
            expect(t.rejectCondition).toBeTruthy();
            expect(t.usesInvariants.length).toBeGreaterThan(0);
        }
    });

    it('GuardedDivision references INV_006, INV_009, INV_011, INV_025', () => {
        expect(TRANS_001.usesInvariants).toContain('INV_006');
        expect(TRANS_001.usesInvariants).toContain('INV_009');
        expect(TRANS_001.usesInvariants).toContain('INV_011');
        expect(TRANS_001.usesInvariants).toContain('INV_025');
    });

    it('EvidenceClaimGate is a governance transition', () => {
        expect(TRANS_021.kind).toBe('governance');
    });
});

describe('v0.5 — Query by Kind', () => {
    it('listByKind core_code returns 20', () => {
        expect(listByKind('core_code')).toHaveLength(20);
    });

    it('listByKind governance returns 2', () => {
        expect(listByKind('governance')).toHaveLength(2);
    });
});

describe('v0.5 — Query by Invariant', () => {
    it('INV_006 ConditionalBranch appears in many transitions', () => {
        const ts = listByInvariant('INV_006');
        expect(ts.length).toBeGreaterThan(10);
    });

    it('INV_025 CommitReceipt is referenced by governance and core', () => {
        const ts = listByInvariant('INV_025');
        expect(ts.map(t => t.transitionId)).toContain('TRANS_001');
        expect(ts.map(t => t.transitionId)).toContain('TRANS_021');
    });
});