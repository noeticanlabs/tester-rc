// @cohbit/resource — R5 Time Budget Layer
// Governs wall-clock limits and timeout enforcement.
// Spec: Noetican Resource Layer v0.1 §9

export interface TimeBudget {
    timeBudgetId: string; workflowId: string;
    budgetLimitMs: number; estimatedMs: number; actualElapsedMs: number;
    startTime: string; status: 'pending' | 'active' | 'within_budget' | 'timed_out' | 'completed';
    createdAt: string;
}

let tiCounter = 0;

export function createTimeBudget(params: {
    workflowId: string; budgetLimitMs: number; estimatedMs?: number;
}): TimeBudget {
    tiCounter++;
    return {
        timeBudgetId: `TBUD_${String(tiCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, budgetLimitMs: params.budgetLimitMs,
        estimatedMs: params.estimatedMs ?? 0, actualElapsedMs: 0,
        startTime: new Date().toISOString(), status: 'pending',
        createdAt: new Date().toISOString(),
    };
}

export function checkTimeout(budget: TimeBudget, elapsedMs: number): TimeBudget {
    budget.actualElapsedMs = elapsedMs;
    if (elapsedMs >= budget.budgetLimitMs) {
        budget.status = 'timed_out';
    } else {
        budget.status = 'within_budget';
    }
    return budget;
}

export function recordElapsed(budget: TimeBudget, elapsedMs: number): TimeBudget {
    budget.actualElapsedMs = elapsedMs;
    budget.status = elapsedMs >= budget.budgetLimitMs ? 'timed_out' : 'completed';
    return budget;
}