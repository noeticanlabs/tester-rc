// @cohbit/resource — R15 Risk Budget Layer
// Controls tolerated risk for a workflow.
// Spec: Noetican Resource Layer v0.1 §19

export type RiskType = 'proof_overclaim_risk' | 'public_claim_risk' | 'stale_memory_risk' | 'security_risk' | 'resource_waste_risk' | 'license_risk' | 'environmental_cost_risk' | 'data_loss_risk';

export interface RiskBudget {
    riskBudgetId: string; workflowId: string;
    maximumAllowedRisk: 'low' | 'medium' | 'high';
    detectedRisks: RiskType[]; decision: 'allow' | 'warn' | 'block_until_repaired';
    status: 'active'; createdAt: string;
}

let riskCounter = 0;

export function createRiskBudget(params: {
    workflowId: string; maximumAllowedRisk: 'low' | 'medium' | 'high';
    detectedRisks?: RiskType[];
}): RiskBudget {
    riskCounter++;
    return {
        riskBudgetId: `RISK_BUD_${String(riskCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, maximumAllowedRisk: params.maximumAllowedRisk,
        detectedRisks: params.detectedRisks ?? [],
        decision: 'allow', status: 'active', createdAt: new Date().toISOString(),
    };
}

const RISK_SEVERITY: Record<RiskType, 'low' | 'medium' | 'high'> = {
    proof_overclaim_risk: 'high', public_claim_risk: 'high', stale_memory_risk: 'medium',
    security_risk: 'high', resource_waste_risk: 'low', license_risk: 'medium',
    environmental_cost_risk: 'low', data_loss_risk: 'high',
};

export function assessRisk(budget: RiskBudget): RiskBudget {
    const hasHigh = budget.detectedRisks.some(r => RISK_SEVERITY[r] === 'high');
    const hasMedium = budget.detectedRisks.some(r => RISK_SEVERITY[r] === 'medium');

    if (budget.maximumAllowedRisk === 'high') {
        if (hasHigh) budget.decision = 'warn';
        else budget.decision = 'allow';
    } else if (budget.maximumAllowedRisk === 'medium') {
        if (hasHigh) budget.decision = 'block_until_repaired';
        else if (hasMedium) budget.decision = 'warn';
        else budget.decision = 'allow';
    } else {
        // low tolerance
        if (hasHigh || hasMedium) budget.decision = 'block_until_repaired';
        else budget.decision = 'allow';
    }
    return budget;
}

export function shouldBlock(budget: RiskBudget): boolean {
    return budget.decision === 'block_until_repaired';
}