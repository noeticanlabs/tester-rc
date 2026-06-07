// @cohbit/resource — R10 Benchmark Budget Layer
// Controls benchmark run resources. Prioritizes boundary cases first.
// Spec: Noetican Resource Layer v0.1 §14

export interface BenchmarkBudget {
    benchmarkBudgetId: string; benchmarkFamily: string;
    allowedCases: number; selectedCases: number;
    selectionStrategy: string; status: 'pending' | 'authorized' | 'exhausted';
    createdAt: string;
}

let bmCounter = 0;

export function createBenchmarkBudget(params: {
    benchmarkFamily: string; allowedCases: number; selectedCases?: number;
    selectionStrategy?: string;
}): BenchmarkBudget {
    bmCounter++;
    return {
        benchmarkBudgetId: `BBUD_${String(bmCounter).padStart(6, '0')}`,
        benchmarkFamily: params.benchmarkFamily,
        allowedCases: params.allowedCases, selectedCases: params.selectedCases ?? 0,
        selectionStrategy: params.selectionStrategy ?? 'critical_boundary_first',
        status: 'authorized', createdAt: new Date().toISOString(),
    };
}

export function recordBenchmarkCase(budget: BenchmarkBudget): BenchmarkBudget {
    budget.selectedCases++;
    if (budget.selectedCases >= budget.allowedCases) budget.status = 'exhausted';
    return budget;
}