import { describe, it, expect } from 'vitest';
import { createToolCallBudget, recordToolCall, isExhausted, remainingCalls } from '../src/R6_tool_calls.js';
import { createRepairBudget, checkBacklogHealth, isHealthy } from '../src/R11_repair.js';
import { createAuthorityBudget, canSpendAuthority, spendAuthority, type AuthorityAction } from '../src/R14_authority.js';
import { createRiskBudget, assessRisk, shouldBlock } from '../src/R15_risk.js';
import { createResourceReceipt, closeResourceReceipt } from '../src/R18_receipt.js';

describe('R6 — Tool Calls', () => {
    it('creates with active status', () => {
        const b = createToolCallBudget({ sessionId: 's1', allowedToolCalls: 10 });
        expect(b.status).toBe('active');
        expect(b.usedToolCalls).toBe(0);
    });
    it('records calls and exhausts', () => {
        const b = createToolCallBudget({ sessionId: 's1', allowedToolCalls: 3 });
        recordToolCall(b); recordToolCall(b);
        expect(remainingCalls(b)).toBe(1);
        recordToolCall(b);
        expect(isExhausted(b)).toBe(true);
    });
    it('priority order includes safety checks', () => {
        const b = createToolCallBudget({ sessionId: 's1', allowedToolCalls: 5 });
        expect(b.priorityOrder).toContain('CTRL_status');
        expect(b.priorityOrder).toContain('retrieval_guard');
    });
});
describe('R11 — Repair Backlog', () => {
    it('creates within_limit', () => { const b = createRepairBudget({ workspaceId: 'w1', maxAllowedTotal: 100 }); expect(b.backlogStatus).toBe('within_limit'); });
    it('approaching at 70 percent', () => { expect(checkBacklogHealth(createRepairBudget({ workspaceId: 'w1', maxAllowedTotal: 100 }), 75, 2).backlogStatus).toBe('approaching_limit'); });
    it('exceeded at limit', () => { expect(checkBacklogHealth(createRepairBudget({ workspaceId: 'w1', maxAllowedTotal: 100 }), 100, 1).backlogStatus).toBe('exceeded'); });
    it('critical exceeded at max', () => { expect(checkBacklogHealth(createRepairBudget({ workspaceId: 'w1', maxAllowedTotal: 100, maxAllowedCritical: 5 }), 50, 5).backlogStatus).toBe('exceeded'); });
    it('isHealthy false when exceeded', () => { expect(isHealthy(checkBacklogHealth(createRepairBudget({ workspaceId: 'w1', maxAllowedTotal: 100 }), 100, 1))).toBe(false); });
});
describe('R14 — Authority', () => {
    it('can spend granted authority', () => {
        const b = createAuthorityBudget({ sessionId: 's1', grantedAuthority: ['emit_receipt', 'close_repair'] });
        expect(canSpendAuthority(b, 'emit_receipt')).toBe(true);
    });
    it('cannot spend blocked authority', () => {
        const b = createAuthorityBudget({ sessionId: 's1', grantedAuthority: ['emit_receipt'], blockedAuthority: ['emit_receipt'] });
        expect(canSpendAuthority(b, 'emit_receipt')).toBe(false);
    });
    it('cannot spend un-granted authority', () => {
        const b = createAuthorityBudget({ sessionId: 's1', grantedAuthority: ['close_repair'] });
        expect(canSpendAuthority(b, 'emit_receipt')).toBe(false);
    });
    it('spend moves from granted to spent', () => {
        const b = createAuthorityBudget({ sessionId: 's1', grantedAuthority: ['emit_receipt'] });
        spendAuthority(b, 'emit_receipt');
        expect(b.authoritySpent).toContain('emit_receipt');
        expect(b.grantedAuthority).not.toContain('emit_receipt');
        expect(canSpendAuthority(b, 'emit_receipt')).toBe(false);
    });
});
describe('R15 — Risk', () => {
    it('low tolerance with proof_overclaim blocks', () => {
        const b = createRiskBudget({ workflowId: 'w1', maximumAllowedRisk: 'low', detectedRisks: ['proof_overclaim_risk'] });
        expect(assessRisk(b).decision).toBe('block_until_repaired');
    });
    it('medium tolerance with proof_overclaim blocks', () => {
        const b = createRiskBudget({ workflowId: 'w1', maximumAllowedRisk: 'medium', detectedRisks: ['proof_overclaim_risk'] });
        expect(assessRisk(b).decision).toBe('block_until_repaired');
    });
    it('high tolerance with proof_overclaim warns', () => {
        const b = createRiskBudget({ workflowId: 'w1', maximumAllowedRisk: 'high', detectedRisks: ['proof_overclaim_risk'] });
        expect(assessRisk(b).decision).toBe('warn');
    });
    it('no risks allows', () => { expect(assessRisk(createRiskBudget({ workflowId: 'w1', maximumAllowedRisk: 'low' })).decision).toBe('allow'); });
    it('shouldBlock returns true when blocked', () => { expect(shouldBlock(assessRisk(createRiskBudget({ workflowId: 'w1', maximumAllowedRisk: 'low', detectedRisks: ['proof_overclaim_risk'] })))).toBe(true); });
});
describe('R18 — Resource Receipt', () => {
    it('creates open', () => { const r = createResourceReceipt({ workflowId: 'w1', authorizedResources: ['cpu_time:300s'] }); expect(r.status).toBe('open'); });
    it('closes with actuals', () => {
        const r = createResourceReceipt({ workflowId: 'w1', authorizedResources: ['cpu_time:300s'] });
        closeResourceReceipt(r, ['cpu_time:74s'], 'Within budget');
        expect(r.status).toBe('closed');
        expect(r.actualResources).toContain('cpu_time:74s');
        expect(r.efficiencySummary).toBe('Within budget');
    });
});