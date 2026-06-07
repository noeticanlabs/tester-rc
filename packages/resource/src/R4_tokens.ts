// @cohbit/resource — R4 Token / Context Budget Layer
// Tracks estimated vs actual token usage.
// Spec: Noetican Resource Layer v0.1 §8

export interface TokenBudget {
    tokenBudgetId: string; workflowId: string; tokenType: 'context_tokens' | 'embedding_tokens';
    budgetLimit: number; estimatedUse: number; actualUse: number;
    status: 'pending' | 'within_budget' | 'exceeded';
    createdAt: string;
}

let tCounter = 0;

export function createTokenBudget(params: {
    workflowId: string; tokenType: 'context_tokens' | 'embedding_tokens';
    budgetLimit: number; estimatedUse?: number;
}): TokenBudget {
    tCounter++;
    return {
        tokenBudgetId: `TBUD_${String(tCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, tokenType: params.tokenType,
        budgetLimit: params.budgetLimit,
        estimatedUse: params.estimatedUse ?? 0, actualUse: 0,
        status: 'pending', createdAt: new Date().toISOString(),
    };
}

export function recordTokenUse(budget: TokenBudget, actualUse: number): TokenBudget {
    budget.actualUse = actualUse;
    budget.status = actualUse <= budget.budgetLimit ? 'within_budget' : 'exceeded';
    return budget;
}