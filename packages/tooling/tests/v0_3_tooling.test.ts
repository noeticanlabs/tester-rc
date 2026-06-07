import { describe, it, expect, beforeEach } from 'vitest';
import { validateReceiptRecord, validateCanonicalRecord, validateRepairRecord } from '../src/T6_validator.js';
import { enqueueRepair, getOpenRepairs, completeRepair, repairQueueSize, getRepairsByPriority, REPAIR_QUEUE } from '../src/T8_repair_queue.js';
import { analyzeMath } from '../src/T14_math_adapter.js';

describe('T6 — Schema Validator', () => {
    it('valid receipt passes validation', () => {
        const r = validateReceiptRecord({ receiptId: 'R1', transitionId: 'T1', invariantId: 'INV_006', evidenceLevel: 'unit_tested', verifierStatus: 'accepted', createdAt: '2026-01-01' });
        expect(r.valid).toBe(true);
    });
    it('missing receiptId fails', () => {
        const r = validateReceiptRecord({ transitionId: 'T1' });
        expect(r.valid).toBe(false);
        expect(r.errors.length).toBeGreaterThan(0);
    });
    it('accepted with not_formalized proof warns', () => {
        const r = validateReceiptRecord({ receiptId: 'R1', transitionId: 'T1', invariantId: 'INV_006', evidenceLevel: 'unit_tested', verifierStatus: 'accepted', proofStatus: 'not_formalized', createdAt: '2026-01-01' });
        expect(r.valid).toBe(true);
        expect(r.warnings.length).toBeGreaterThan(0);
    });
    it('invalid canonical changeType fails', () => {
        const r = validateCanonicalRecord({ entryId: 'E1', changeType: 'deleted', claimStatus: 'draft_engineering_claim' });
        expect(r.valid).toBe(false);
    });
    it('valid canonical record passes', () => {
        const r = validateCanonicalRecord({ entryId: 'E1', changeType: 'created', claimStatus: 'receipted_claim' });
        expect(r.valid).toBe(true);
    });
    it('valid repair record passes', () => {
        const r = validateRepairRecord({ repairId: 'R1', linkedReceiptId: 'L1', failureReason: 'null encoding', requiredAction: 'Use Result type' });
        expect(r.valid).toBe(true);
    });
});

describe('T8 — Repair Queue', () => {
    beforeEach(() => { REPAIR_QUEUE.length = 0; });
    it('enqueues a repair task', () => {
        const task = enqueueRepair({ sourceRecordId: 'SRC1', repairType: 'code_repair', problem: 'Nullable return', requiredAction: 'Replace with Result' });
        expect(task.repairTaskId).toMatch(/^REPAIR_\d{6}$/);
        expect(task.status).toBe('open');
        expect(repairQueueSize()).toBe(1);
    });
    it('retrieves open repairs', () => {
        enqueueRepair({ sourceRecordId: 'S1', repairType: 'proof_gap_repair', problem: 'p', requiredAction: 'a' });
        enqueueRepair({ sourceRecordId: 'S2', repairType: 'code_repair', problem: 'p2', requiredAction: 'a2' });
        expect(getOpenRepairs()).toHaveLength(2);
    });
    it('completes a repair', () => {
        const t = enqueueRepair({ sourceRecordId: 'S1', repairType: 'notation_repair', problem: 'p', requiredAction: 'a' });
        expect(completeRepair(t.repairTaskId)).toBe(true);
        expect(getOpenRepairs()).toHaveLength(0);
    });
    it('filters by priority', () => {
        enqueueRepair({ sourceRecordId: 'S1', repairType: 'code_repair', problem: 'p', requiredAction: 'a', priority: 'high' });
        enqueueRepair({ sourceRecordId: 'S2', repairType: 'code_repair', problem: 'p2', requiredAction: 'a2', priority: 'low' });
        expect(getRepairsByPriority('high')).toHaveLength(1);
    });
});

describe('T14 — Math Adapter', () => {
    it('detects theorem and proof patterns', () => {
        const r = analyzeMath('Theorem: All admissible transitions preserve constraints. Proof: by induction.', 'theorem.md');
        expect(r.representationType).toBe('TheoremStatement');
        expect(r.invariantsDetected).toContain('MINV_MATH_006');
        expect(r.invariantsDetected).toContain('MINV_MATH_008');
        expect(r.modelFamilies).toContain('ConstraintSystemModel');
    });
    it('detects category theory patterns', () => {
        const r = analyzeMath('A functor F: C → D preserves composition of morphisms.', 'category.md');
        expect(r.modelFamilies).toContain('CategoryModel');
        expect(r.invariantsDetected).toContain('MINV_MATH_002');
    });
    it('detects simulation-as-proof risk', () => {
        const r = analyzeMath('The simulation proves the theorem conclusively.', 'sim.md');
        expect(r.risksDetected).toContain('RISK_MATH_002');
    });
    it('equation content detected as representation type', () => {
        const r = analyzeMath('x = y + z * 2', 'eq.txt');
        expect(r.representationType).toBe('Equation');
    });
    it('clean math content returns low confidence', () => {
        const r = analyzeMath('hello world', 'notes.txt');
        expect(r.confidence).toBe('low');
    });
});