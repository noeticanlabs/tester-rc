// @cohbit/code-atlas v0.9.0 — L6–L9 Registry Tests
import { describe, it, expect } from 'vitest';
import { PROJECTIONS, getProjectionsByTransition, getProjectionsByLanguage } from '../src/L6_projection.js';
import { VERIFIER_ROUTES, EVIDENCE_CLAIM_CEILINGS } from '../src/L7_verifier.js';
import { RECEIPTS, listByStatus } from '../src/L8_receipt.js';
import { REPAIR_OBLIGATIONS, listOpenRepairs } from '../src/L9_repair_obligation.js';

describe('v0.9 — L6 Language Projection', () => {
    it('has 5 projections for GuardedDivision', () => { expect(PROJECTIONS).toHaveLength(5); });
    it('filters by transition', () => { expect(getProjectionsByTransition('TRANS_001')).toHaveLength(5); });
    it('filters by language', () => { expect(getProjectionsByLanguage('rust')).toHaveLength(1); expect(getProjectionsByLanguage('typescript')[0]!.projectionStatus).toBe('repair_required'); });
});
describe('v0.9 — L7 Verifier Routes', () => {
    it('has 6 verifier routes', () => { expect(VERIFIER_ROUTES.size).toBe(6); });
    it('evidence claim ceilings cover 11 levels', () => { expect(Object.keys(EVIDENCE_CLAIM_CEILINGS)).toHaveLength(11); });
});
describe('v0.9 — L8 Receipts', () => {
    it('has 2 receipts', () => { expect(RECEIPTS.size).toBe(2); });
    it('lists repair_required receipts', () => { expect(listByStatus('repair_required')).toHaveLength(1); });
});
describe('v0.9 — L9 Repairs', () => {
    it('has 1 repair obligation', () => { expect(REPAIR_OBLIGATIONS.size).toBe(1); });
    it('lists open repairs', () => { expect(listOpenRepairs()).toHaveLength(1); });
});