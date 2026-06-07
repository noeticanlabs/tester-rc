// @cohbit/resource — R18 Resource Receipt Layer
// Records what was requested, authorized, spent, blocked, and created.
// Spec: Noetican Resource Layer v0.1 §22

export interface ResourceReceipt {
    resourceReceiptId: string; workflowId: string;
    authorizedResources: string[]; actualResources: string[];
    outputsCreated: string[]; efficiencySummary: string;
    status: 'open' | 'closed'; createdAt: string;
}

let rrCounter = 0;

export function createResourceReceipt(params: {
    workflowId: string; authorizedResources: string[]; outputsCreated?: string[];
}): ResourceReceipt {
    rrCounter++;
    return {
        resourceReceiptId: `RRCPT_${String(rrCounter).padStart(6, '0')}`,
        workflowId: params.workflowId,
        authorizedResources: params.authorizedResources, actualResources: [],
        outputsCreated: params.outputsCreated ?? [], efficiencySummary: '',
        status: 'open', createdAt: new Date().toISOString(),
    };
}

export function closeResourceReceipt(receipt: ResourceReceipt, actualResources: string[], summary: string): ResourceReceipt {
    receipt.actualResources = actualResources;
    receipt.efficiencySummary = summary;
    receipt.status = 'closed';
    return receipt;
}