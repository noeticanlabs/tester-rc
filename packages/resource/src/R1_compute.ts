// @cohbit/resource — R1 Compute Budget Layer
// Governs CPU/GPU work with estimate → authorize → spend → receipt.
// Spec: Noetican Resource Layer v0.1 §5

export type BudgetStatus = 'pending' | 'authorized' | 'denied' | 'within_budget' | 'exceeded' | 'closed';

export interface ComputeBudget {
    computeBudgetId: string;
    workflowId: string;
    resourceType: 'cpu_time' | 'gpu_time' | 'proof_attempts';
    budgetLimit: number;
    unit: string;
    estimatedUse: number;
    actualUse: number;
    authorizationStatus: 'pending' | 'authorized' | 'denied';
    receiptId: string | undefined;
    status: BudgetStatus;
    createdAt: string;
}

let cCounter = 0;

export function createComputeBudget(params: {
    workflowId: string;
    resourceType: 'cpu_time' | 'gpu_time' | 'proof_attempts';
    budgetLimit: number;
    unit?: string;
    estimatedUse?: number;
}): ComputeBudget {
    cCounter++;
    return {
        computeBudgetId: `CBUD_${String(cCounter).padStart(6, '0')}`,
        workflowId: params.workflowId,
        resourceType: params.resourceType,
        budgetLimit: params.budgetLimit,
        unit: params.unit ?? 'seconds',
        estimatedUse: params.estimatedUse ?? 0,
        actualUse: 0,
        authorizationStatus: 'pending',
        receiptId: undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
}

export function authorizeCompute(budget: ComputeBudget, authorized: boolean): ComputeBudget {
    budget.authorizationStatus = authorized ? 'authorized' : 'denied';
    budget.status = authorized ? 'authorized' : 'denied';
    return budget;
}

export function recordCompute(budget: ComputeBudget, actualUse: number, receiptId?: string): ComputeBudget {
    budget.actualUse = actualUse;
    budget.receiptId = receiptId;
    budget.status = actualUse <= budget.budgetLimit ? 'within_budget' : 'exceeded';
    return budget;
}