// @cohbit/resource — R19 Resource Health Dashboard Layer
// Shows live resource state across 12 panels.
// Dashboards must show scarcity, not only availability.
// Spec: Noetican Resource Layer v0.1 §23

export type HealthStatus = 'healthy' | 'watch' | 'limited' | 'scarce' | 'low';

export interface ResourceHealth {
    resourceHealthId: string; workspaceId: string;
    computeHealth: HealthStatus; memoryHealth: HealthStatus;
    storageHealth: HealthStatus; repairBacklogHealth: HealthStatus;
    proofSearchHealth: HealthStatus; humanReviewHealth: HealthStatus;
    environmentalCostHealth: HealthStatus; tokenHealth: HealthStatus;
    toolCallHealth: HealthStatus; receiptStorageHealth: HealthStatus;
    authorityHealth: HealthStatus; riskBudgetHealth: HealthStatus;
    overallResourceHealth: 'healthy' | 'usable_with_limits' | 'degraded' | 'critical';
    createdAt: string;
}

const HEALTH_SEVERITY: Record<HealthStatus, number> = {
    healthy: 0, low: 1, watch: 2, limited: 3, scarce: 4,
};

let rhCounter = 0;

export function createResourceHealth(params: {
    workspaceId: string; panels?: Partial<Record<keyof Omit<ResourceHealth, 'resourceHealthId' | 'workspaceId' | 'overallResourceHealth' | 'createdAt'>, HealthStatus>>;
}): ResourceHealth {
    rhCounter++;
    const defaults = {
        computeHealth: 'healthy' as HealthStatus, memoryHealth: 'healthy' as HealthStatus,
        storageHealth: 'healthy' as HealthStatus, repairBacklogHealth: 'healthy' as HealthStatus,
        proofSearchHealth: 'healthy' as HealthStatus, humanReviewHealth: 'healthy' as HealthStatus,
        environmentalCostHealth: 'healthy' as HealthStatus, tokenHealth: 'healthy' as HealthStatus,
        toolCallHealth: 'healthy' as HealthStatus, receiptStorageHealth: 'healthy' as HealthStatus,
        authorityHealth: 'healthy' as HealthStatus, riskBudgetHealth: 'healthy' as HealthStatus,
    };
    const panels = { ...defaults, ...params.panels };
    const worst = Math.max(...Object.values(panels).map(h => HEALTH_SEVERITY[h] ?? 0));
    let overall: ResourceHealth['overallResourceHealth'] = 'healthy';
    if (worst >= 4) overall = 'critical';
    else if (worst >= 3) overall = 'degraded';
    else if (worst >= 2) overall = 'usable_with_limits';

    return {
        resourceHealthId: `RHEALTH_${String(rhCounter).padStart(6, '0')}`,
        workspaceId: params.workspaceId,
        ...panels,
        overallResourceHealth: overall,
        createdAt: new Date().toISOString(),
    };
}