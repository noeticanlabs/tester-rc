// @cohbit/resource — R7 Human Attention Budget Layer
// Human attention is treated as scarce. Controls escalation triggers.
// Spec: Noetican Resource Layer v0.1 §11

export type ReviewType = 'public_release' | 'theorem_claim' | 'CTRL_verification_claim' | 'license_change' | 'security_sensitive_output' | 'high_cost_workflow' | 'ambiguous_authority' | 'major_repair_closure' | 'canon_freeze';

export interface HumanAttentionBudget {
    humanAttentionBudgetId: string; reviewTarget: string; reviewType: ReviewType;
    estimatedMinutes: number; priority: 'high' | 'medium' | 'low';
    reason: string; status: 'queued' | 'in_review' | 'completed';
    createdAt: string;
}

let hCounter = 0;

export function createHumanAttentionBudget(params: {
    reviewTarget: string; reviewType: ReviewType; estimatedMinutes: number;
    priority: 'high' | 'medium' | 'low'; reason: string;
}): HumanAttentionBudget {
    hCounter++;
    return {
        humanAttentionBudgetId: `HABUD_${String(hCounter).padStart(6, '0')}`,
        reviewTarget: params.reviewTarget, reviewType: params.reviewType,
        estimatedMinutes: params.estimatedMinutes, priority: params.priority,
        reason: params.reason, status: 'queued',
        createdAt: new Date().toISOString(),
    };
}

export const HIGH_PRIORITY_REVIEW_TYPES: ReviewType[] = [
    'public_release', 'theorem_claim', 'CTRL_verification_claim',
    'security_sensitive_output', 'canon_freeze',
];

export function isHighPriorityReview(budget: HumanAttentionBudget): boolean {
    return HIGH_PRIORITY_REVIEW_TYPES.includes(budget.reviewType);
}