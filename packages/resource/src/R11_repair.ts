// @cohbit/resource — R11 Repair Backlog Budget Layer
// Prevents unlimited open repair growth.
// Spec: Noetican Resource Layer v0.1 §15

export interface RepairBacklogBudget {
    repairBacklogBudgetId: string; workspaceId: string;
    openRepairs: number; criticalRepairs: number;
    maxAllowedTotal: number; maxAllowedCritical: number;
    backlogStatus: 'within_limit' | 'approaching_limit' | 'exceeded';
    status: 'active'; createdAt: string;
}

let rbCounter = 0;

export function createRepairBudget(params: {
    workspaceId: string; maxAllowedTotal: number; maxAllowedCritical?: number;
    openRepairs?: number; criticalRepairs?: number;
}): RepairBacklogBudget {
    rbCounter++;
    return {
        repairBacklogBudgetId: `RBUD_${String(rbCounter).padStart(6, '0')}`,
        workspaceId: params.workspaceId,
        openRepairs: params.openRepairs ?? 0, criticalRepairs: params.criticalRepairs ?? 0,
        maxAllowedTotal: params.maxAllowedTotal,
        maxAllowedCritical: params.maxAllowedCritical ?? Math.ceil(params.maxAllowedTotal * 0.1),
        backlogStatus: 'within_limit', status: 'active',
        createdAt: new Date().toISOString(),
    };
}

export function checkBacklogHealth(budget: RepairBacklogBudget, openTotal: number, critical: number): RepairBacklogBudget {
    budget.openRepairs = openTotal;
    budget.criticalRepairs = critical;
    if (critical >= budget.maxAllowedCritical || openTotal >= budget.maxAllowedTotal) {
        budget.backlogStatus = 'exceeded';
    } else if (openTotal >= budget.maxAllowedTotal * 0.7 || critical >= budget.maxAllowedCritical * 0.7) {
        budget.backlogStatus = 'approaching_limit';
    } else {
        budget.backlogStatus = 'within_limit';
    }
    return budget;
}

export function isHealthy(budget: RepairBacklogBudget): boolean {
    return budget.backlogStatus !== 'exceeded';
}