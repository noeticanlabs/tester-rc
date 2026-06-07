// @cohbit/resource — R8 Network / External Access Budget Layer
// Controls external API calls. Purposeful, logged, and bounded.
// Spec: Noetican Resource Layer v0.1 §12

export type ExternalAccessType = 'web_search' | 'package_registry_lookup' | 'github_api' | 'zenodo_metadata' | 'doi_lookup' | 'external_paper_retrieval' | 'remote_proof_service' | 'remote_model_call';

export interface NetworkBudget {
    networkBudgetId: string; workflowId: string; externalAccessType: ExternalAccessType;
    allowedRequests: number; usedRequests: number; reason: string;
    status: 'pending' | 'authorized' | 'exhausted' | 'closed';
    createdAt: string;
}

let nCounter = 0;

export function createNetworkBudget(params: {
    workflowId: string; externalAccessType: ExternalAccessType;
    allowedRequests: number; reason: string;
}): NetworkBudget {
    nCounter++;
    return {
        networkBudgetId: `NBUD_${String(nCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, externalAccessType: params.externalAccessType,
        allowedRequests: params.allowedRequests, usedRequests: 0,
        reason: params.reason, status: 'authorized',
        createdAt: new Date().toISOString(),
    };
}

export function recordNetworkRequest(budget: NetworkBudget): NetworkBudget {
    budget.usedRequests++;
    if (budget.usedRequests >= budget.allowedRequests) budget.status = 'exhausted';
    return budget;
}

export function isExhausted(budget: NetworkBudget): boolean {
    return budget.status === 'exhausted';
}