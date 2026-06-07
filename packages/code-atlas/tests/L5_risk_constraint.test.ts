// @cohbit/code-atlas v0.6.0 — L5 Risk/Constraint Tests
import { describe, it, expect } from 'vitest';
import { FAILURE_MODES, RISK_TAGS, FORBIDDEN_COLLAPSES, getFailureMode, listFailuresBySeverity, listFailuresByFamily } from '../src/L5_risk_constraint.js';

describe('v0.6 — Failure Modes', () => {
    it('has 16 failure modes registered', () => { expect(FAILURE_MODES.size).toBe(16); });
    it('retrieves failure mode by ID', () => { expect(getFailureMode('FAIL_ARITH_001')!.name).toBe('DivisionByZero'); });
    it('high severity failures include DivisionByZero', () => { expect(listFailuresBySeverity('high').length).toBeGreaterThanOrEqual(10); });
    it('arithmetic_safety family has 2 entries', () => { expect(listFailuresByFamily('arithmetic_safety')).toHaveLength(2); });
    it('each failure mode has blockedBy and forbiddenStatus', () => { for (const f of FAILURE_MODES.values()) { expect(f.blockedBy.length).toBeGreaterThan(0); expect(f.forbiddenStatus).toBeTruthy(); } });
});
describe('v0.6 — Risk Tags', () => {
    it('has 8 risk tags', () => { expect(RISK_TAGS).toHaveLength(8); });
    it('includes StaleReceipt risk', () => { expect(RISK_TAGS.find(r => r.riskId === 'RISK_008')!.name).toBe('StaleReceipt'); });
});
describe('v0.6 — Forbidden Collapses', () => {
    it('has 6 forbidden collapses', () => { expect(FORBIDDEN_COLLAPSES).toHaveLength(6); });
    it('TestAsProof is high severity', () => { expect(FORBIDDEN_COLLAPSES.find(c => c.collapseId === 'COLLAPSE_002')!.severity).toBe('high'); });
});