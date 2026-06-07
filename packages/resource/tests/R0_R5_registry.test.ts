import { describe, it, expect } from 'vitest';
import { RESOURCE_REGISTRY, isTracked, requiresReceipt } from '../src/R0_registry.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../src/R1_compute.js';
import { createMemoryBudget, checkMemoryLimit } from '../src/R2_memory.js';
import { createStorageBudget, checkStorageLimit } from '../src/R3_storage.js';
import { createTokenBudget, recordTokenUse } from '../src/R4_tokens.js';
import { createTimeBudget, checkTimeout, recordElapsed } from '../src/R5_time.js';

describe('R0 — Resource Registry', () => {
    it('has 18 resource types', () => { expect(RESOURCE_REGISTRY.size).toBe(18); });
    it('cpu_time is tracked and requires receipt', () => {
        expect(isTracked('cpu_time')).toBe(true);
        expect(requiresReceipt('cpu_time')).toBe(true);
    });
    it('human_review_minutes does not require receipt', () => {
        expect(requiresReceipt('human_review_minutes')).toBe(false);
    });
    it('context_tokens requires receipt', () => {
        expect(requiresReceipt('context_tokens')).toBe(true);
    });
});
describe('R1 — Compute', () => {
    it('creates pending budget', () => { const b = createComputeBudget({ workflowId: 'wf1', resourceType: 'cpu_time', budgetLimit: 300 }); expect(b.status).toBe('pending'); });
    it('authorize sets status', () => { const b = authorizeCompute(createComputeBudget({ workflowId: 'wf1', resourceType: 'cpu_time', budgetLimit: 100 }), true); expect(b.status).toBe('authorized'); });
    it('deny sets denied', () => { const b = authorizeCompute(createComputeBudget({ workflowId: 'wf1', resourceType: 'cpu_time', budgetLimit: 100 }), false); expect(b.status).toBe('denied'); });
    it('record within budget', () => { const b = recordCompute(createComputeBudget({ workflowId: 'wf1', resourceType: 'cpu_time', budgetLimit: 100 }), 50); expect(b.status).toBe('within_budget'); });
    it('record exceeded', () => { const b = recordCompute(createComputeBudget({ workflowId: 'wf1', resourceType: 'cpu_time', budgetLimit: 100 }), 150); expect(b.status).toBe('exceeded'); });
});
describe('R2 — Memory', () => {
    it('creates pending', () => { const b = createMemoryBudget({ workflowId: 'wf1', memoryFamily: 'graph', softLimitMb: 1024, hardLimitMb: 2048 }); expect(b.status).toBe('pending'); });
    it('within budget', () => { expect(checkMemoryLimit(createMemoryBudget({ workflowId: 'wf1', memoryFamily: 'g', softLimitMb: 1024, hardLimitMb: 2048 }), 512).status).toBe('within_budget'); });
    it('soft limit exceeded', () => { expect(checkMemoryLimit(createMemoryBudget({ workflowId: 'wf1', memoryFamily: 'g', softLimitMb: 1024, hardLimitMb: 2048 }), 1500).status).toBe('soft_limit_exceeded'); });
    it('hard limit breached', () => { expect(checkMemoryLimit(createMemoryBudget({ workflowId: 'wf1', memoryFamily: 'g', softLimitMb: 1024, hardLimitMb: 2048 }), 3000).status).toBe('hard_limit_breached'); });
});
describe('R3 — Storage', () => {
    it('creates pending', () => { const b = createStorageBudget({ workflowId: 'wf1', storageType: 'disk_storage', hardLimitBytes: 1000000 }); expect(b.status).toBe('pending'); });
    it('within budget', () => { expect(checkStorageLimit(createStorageBudget({ workflowId: 'wf1', storageType: 'disk_storage', hardLimitBytes: 1000000 }), 500000).status).toBe('within_budget'); });
    it('near limit at 85 percent', () => { expect(checkStorageLimit(createStorageBudget({ workflowId: 'wf1', storageType: 'disk_storage', hardLimitBytes: 1000000 }), 900000).status).toBe('near_limit'); });
    it('limit reached', () => { expect(checkStorageLimit(createStorageBudget({ workflowId: 'wf1', storageType: 'disk_storage', hardLimitBytes: 1000000 }), 1000000).status).toBe('limit_reached'); });
});
describe('R4 — Tokens', () => {
    it('creates pending', () => { const b = createTokenBudget({ workflowId: 'wf1', tokenType: 'context_tokens', budgetLimit: 100000 }); expect(b.status).toBe('pending'); });
    it('within budget', () => { expect(recordTokenUse(createTokenBudget({ workflowId: 'wf1', tokenType: 'context_tokens', budgetLimit: 100000 }), 50000).status).toBe('within_budget'); });
    it('exceeded', () => { expect(recordTokenUse(createTokenBudget({ workflowId: 'wf1', tokenType: 'context_tokens', budgetLimit: 100000 }), 150000).status).toBe('exceeded'); });
});
describe('R5 — Time', () => {
    it('creates pending', () => { const b = createTimeBudget({ workflowId: 'wf1', budgetLimitMs: 30000 }); expect(b.status).toBe('pending'); });
    it('within budget', () => { expect(checkTimeout(createTimeBudget({ workflowId: 'wf1', budgetLimitMs: 30000 }), 10000).status).toBe('within_budget'); });
    it('timed out', () => { expect(checkTimeout(createTimeBudget({ workflowId: 'wf1', budgetLimitMs: 30000 }), 30000).status).toBe('timed_out'); });
    it('recordElapsed completed under budget', () => { expect(recordElapsed(createTimeBudget({ workflowId: 'wf1', budgetLimitMs: 30000 }), 10000).status).toBe('completed'); });
    it('recordElapsed timed out', () => { expect(recordElapsed(createTimeBudget({ workflowId: 'wf1', budgetLimitMs: 30000 }), 30000).status).toBe('timed_out'); });
});