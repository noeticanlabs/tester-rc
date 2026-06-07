// @cohbit/resource — R13 Energy / Environmental Cost Layer
// Tracks environmental and infrastructure cost estimates.
// Spec: Noetican Resource Layer v0.1 §17

export interface EnvironmentalCostBudget {
    environmentalCostId: string; workflowId: string;
    costFamily: string; estimatedEnergyKwh: number; actualEnergyKwh: number | null;
    avoidableRerun: boolean; costReductionStrategy: string;
    status: 'estimated' | 'recorded' | 'closed'; createdAt: string;
}

let eCounter = 0;

export function createEnvironmentalCostBudget(params: {
    workflowId: string; costFamily: string; estimatedEnergyKwh: number;
    avoidableRerun?: boolean; costReductionStrategy?: string;
}): EnvironmentalCostBudget {
    eCounter++;
    return {
        environmentalCostId: `ENVBUD_${String(eCounter).padStart(6, '0')}`,
        workflowId: params.workflowId, costFamily: params.costFamily,
        estimatedEnergyKwh: params.estimatedEnergyKwh, actualEnergyKwh: null,
        avoidableRerun: params.avoidableRerun ?? false,
        costReductionStrategy: params.costReductionStrategy ?? 'run_critical_only',
        status: 'estimated', createdAt: new Date().toISOString(),
    };
}

export function recordEnvironmentalCost(budget: EnvironmentalCostBudget, actualKwh: number): EnvironmentalCostBudget {
    budget.actualEnergyKwh = actualKwh;
    budget.status = 'recorded';
    return budget;
}