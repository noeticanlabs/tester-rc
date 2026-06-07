// @cohbit/resource — R3 Storage Budget Layer
// Controls disk and database growth.
// Spec: Noetican Resource Layer v0.1 §7

export interface StorageBudget {
    storageBudgetId: string; workflowId: string; storageType: 'disk_storage' | 'database_storage' | 'receipt_writes';
    hardLimitBytes: number; currentBytes: number;
    status: 'pending' | 'within_budget' | 'near_limit' | 'limit_reached';
    createdAt: string;
}

let sCounter = 0;

export function createStorageBudget(params: {
    workflowId: string; storageType: 'disk_storage' | 'database_storage' | 'receipt_writes';
    hardLimitBytes: number; currentBytes?: number;
}): StorageBudget {
    sCounter++;
    return {
        storageBudgetId: `SBUD_${String(sCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, storageType: params.storageType,
        hardLimitBytes: params.hardLimitBytes, currentBytes: params.currentBytes ?? 0,
        status: 'pending', createdAt: new Date().toISOString(),
    };
}

export function checkStorageLimit(budget: StorageBudget, currentBytes: number): StorageBudget {
    budget.currentBytes = currentBytes;
    if (currentBytes >= budget.hardLimitBytes) budget.status = 'limit_reached';
    else if (currentBytes >= budget.hardLimitBytes * 0.85) budget.status = 'near_limit';
    else budget.status = 'within_budget';
    return budget;
}