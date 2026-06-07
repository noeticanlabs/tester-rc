// @cohbit/resource — R9 Proof Search Budget Layer
// Governs theorem/proof attempt resources (attempts, time, stop conditions).
// Spec: Noetican Resource Layer v0.1 §13

export type ProofStopCondition = 'proof_found' | 'missing_definition_detected' | 'budget_exhausted' | 'unsafe_placeholder_detected';

export interface ProofSearchBudget {
    proofSearchBudgetId: string; theoremCandidateId: string;
    allowedAttempts: number; usedAttempts: number; maxSeconds: number;
    strategy: string; stopConditions: ProofStopCondition[];
    status: 'pending' | 'active' | 'budget_exhausted' | 'proof_found' | 'blocked';
    createdAt: string;
}

let pCounter = 0;

export function createProofSearchBudget(params: {
    theoremCandidateId: string; allowedAttempts: number; maxSeconds: number;
    strategy?: string; stopConditions?: ProofStopCondition[];
}): ProofSearchBudget {
    pCounter++;
    return {
        proofSearchBudgetId: `PBUD_${String(pCounter).padStart(6, '0')}`,
        theoremCandidateId: params.theoremCandidateId,
        allowedAttempts: params.allowedAttempts, usedAttempts: 0,
        maxSeconds: params.maxSeconds,
        strategy: params.strategy ?? 'dependency_first_then_tactic_search',
        stopConditions: params.stopConditions ?? ['proof_found', 'missing_definition_detected', 'budget_exhausted', 'unsafe_placeholder_detected'],
        status: 'pending', createdAt: new Date().toISOString(),
    };
}

export function recordProofAttempt(budget: ProofSearchBudget): ProofSearchBudget {
    budget.usedAttempts++;
    budget.status = 'active';
    if (budget.usedAttempts >= budget.allowedAttempts) budget.status = 'budget_exhausted';
    return budget;
}

export function blockProofSearch(budget: ProofSearchBudget, reason: ProofStopCondition): ProofSearchBudget {
    budget.status = reason === 'proof_found' ? 'proof_found' : 'blocked';
    return budget;
}