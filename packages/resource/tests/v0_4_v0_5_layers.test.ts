import { describe, it, expect } from 'vitest';
import { createReceiptStorageBudget, checkReceiptStorageHealth } from '../src/R12_receipt_storage.js';
import { createEnvironmentalCostBudget, recordEnvironmentalCost } from '../src/R13_energy.js';
import { createPriorityScheduler, addCandidate, selectTopAction } from '../src/R16_scheduler.js';
import { createThrottleRecord, isBlocked, requiresHumanReview, isDeferred } from '../src/R17_throttle.js';

describe('R12 — Receipt Storage', () => {
    it('creates healthy', () => { expect(createReceiptStorageBudget({ workspaceId: 'w1' }).status).toBe('healthy'); });
    it('approaching at 85 percent', () => { expect(checkReceiptStorageHealth(createReceiptStorageBudget({ workspaceId: 'w1' }), 90, 100).status).toBe('approaching_capacity'); });
    it('at capacity', () => { expect(checkReceiptStorageHealth(createReceiptStorageBudget({ workspaceId: 'w1' }), 100, 100).status).toBe('at_capacity'); });
});
describe('R13 — Environmental Cost', () => {
    it('creates estimated', () => { expect(createEnvironmentalCostBudget({ workflowId: 'w1', costFamily: 'benchmark_compute', estimatedEnergyKwh: 0.12 }).status).toBe('estimated'); });
    it('records actual cost', () => { expect(recordEnvironmentalCost(createEnvironmentalCostBudget({ workflowId: 'w1', costFamily: 'benchmark_compute', estimatedEnergyKwh: 0.12 }), 0.08).status).toBe('recorded'); });
});
describe('R16 — Priority Scheduler', () => {
    it('starts evaluating', () => { expect(createPriorityScheduler({ workspaceId: 'w1' }).status).toBe('evaluating'); });
    it('selects top action by score', () => {
        const s = createPriorityScheduler({ workspaceId: 'w1' });
        addCandidate(s, 'resolve_blocker', 0.94, 'Blocks multiple routes.');
        addCandidate(s, 'polish_labels', 0.38, 'Useful but not blocking.');
        selectTopAction(s);
        expect(s.selectedAction).toBe('resolve_blocker');
    });
});
describe('R17 — Throttle', () => {
    it('creates active record', () => { expect(createThrottleRecord({ requestedAction: 'full_benchmark', reason: 'Budget exhausted', decision: 'reduce_scope' }).status).toBe('active'); });
    it('block is blocked', () => { expect(isBlocked('block')).toBe(true); expect(isBlocked('allow')).toBe(false); });
    it('require_human_review is detected', () => { expect(requiresHumanReview('require_human_review')).toBe(true); expect(requiresHumanReview('allow')).toBe(false); });
    it('defer and batch_later are deferred', () => { expect(isDeferred('defer')).toBe(true); expect(isDeferred('batch_later')).toBe(true); expect(isDeferred('allow')).toBe(false); });
});