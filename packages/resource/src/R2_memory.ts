// @cohbit/resource — R2 Memory Budget Layer
// Prevents large memory operations from crashing workflows.
// Spec: Noetican Resource Layer v0.1 §6

export interface MemoryBudget {
    memoryBudgetId: string; workflowId: string; memoryFamily: string;
    softLimitMb: number; hardLimitMb: number;
    estimatedMb: number; actualPeakMb: number;
    status: 'pending' | 'within_budget' | 'soft_limit_exceeded' | 'hard_limit_breached';
    createdAt: string;
}

let mCounter = 0;

export function createMemoryBudget(params: {
    workflowId: string; memoryFamily: string; softLimitMb: number;
    hardLimitMb: number; estimatedMb?: number;
}): MemoryBudget {
    mCounter++;
    return {
        memoryBudgetId: `MBUD_${String(mCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, memoryFamily: params.memoryFamily,
        softLimitMb: params.softLimitMb, hardLimitMb: params.hardLimitMb,
        estimatedMb: params.estimatedMb ?? 0, actualPeakMb: 0,
        status: 'pending', createdAt: new Date().toISOString(),
    };
}

export function checkMemoryLimit(budget: MemoryBudget, currentMb: number): MemoryBudget {
    budget.actualPeakMb = Math.max(budget.actualPeakMb, currentMb);
    if (currentMb >= budget.hardLimitMb) budget.status = 'hard_limit_breached';
    else if (currentMb >= budget.softLimitMb) budget.status = 'soft_limit_exceeded';
    else budget.status = 'within_budget';
    return budget;
}