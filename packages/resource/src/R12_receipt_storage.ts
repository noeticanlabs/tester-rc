// @cohbit/resource — R12 Receipt / Audit Storage Budget Layer
// Controls retention of receipts, audits, and snapshots.
// Spec: Noetican Resource Layer v0.1 §16

export interface ReceiptStorageBudget {
    receiptStorageBudgetId: string; workspaceId: string;
    receiptCount: number; auditCount: number; snapshotCount: number;
    retentionPolicy: string; status: 'healthy' | 'approaching_capacity' | 'at_capacity';
    createdAt: string;
}

let rsCounter = 0;

export function createReceiptStorageBudget(params: {
    workspaceId: string; receiptCount?: number; auditCount?: number; snapshotCount?: number;
    retentionPolicy?: string;
}): ReceiptStorageBudget {
    rsCounter++;
    return {
        receiptStorageBudgetId: `RSBUD_${String(rsCounter).padStart(6, '0')}`,
        workspaceId: params.workspaceId,
        receiptCount: params.receiptCount ?? 0, auditCount: params.auditCount ?? 0,
        snapshotCount: params.snapshotCount ?? 0,
        retentionPolicy: params.retentionPolicy ?? 'keep_receipts_archive_old_logs',
        status: 'healthy', createdAt: new Date().toISOString(),
    };
}

export function checkReceiptStorageHealth(budget: ReceiptStorageBudget, totalCount: number, capacityLimit: number): ReceiptStorageBudget {
    budget.receiptCount = totalCount;
    if (totalCount >= capacityLimit) budget.status = 'at_capacity';
    else if (totalCount >= capacityLimit * 0.85) budget.status = 'approaching_capacity';
    else budget.status = 'healthy';
    return budget;
}