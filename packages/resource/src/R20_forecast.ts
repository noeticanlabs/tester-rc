// @cohbit/resource — R20 Resource Forecast Layer
// Predicts future resource pressure so scarcity doesn't surprise us.
// A responsible system forecasts before scarcity breaks the workflow.
// Spec: Noetican Resource Layer v0.1 §24

export interface ResourceForecast {
    resourceForecastId: string; workspaceId: string;
    forecastWindowDays: number;
    predictedStorageGrowthMb: number; predictedOpenRepairs: number;
    predictedBottleneck: string; recommendedAction: string;
    status: 'active'; createdAt: string;
}

let rfCounter = 0;

export function createResourceForecast(params: {
    workspaceId: string; forecastWindowDays?: number;
    predictedStorageGrowthMb?: number; predictedOpenRepairs?: number;
    predictedBottleneck?: string; recommendedAction?: string;
}): ResourceForecast {
    rfCounter++;
    return {
        resourceForecastId: `RFORE_${String(rfCounter).padStart(6, '0')}`,
        workspaceId: params.workspaceId, forecastWindowDays: params.forecastWindowDays ?? 30,
        predictedStorageGrowthMb: params.predictedStorageGrowthMb ?? 0,
        predictedOpenRepairs: params.predictedOpenRepairs ?? 0,
        predictedBottleneck: params.predictedBottleneck ?? 'none_predicted',
        recommendedAction: params.recommendedAction ?? 'Continue monitoring.',
        status: 'active', createdAt: new Date().toISOString(),
    };
}