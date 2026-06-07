// @cohbit/resource — R17 Throttle / Refusal Layer
// Blocks or slows actions when resources, authority, or risk exceed limits.
// Refusal is a valid resource-governance action.
// Spec: Noetican Resource Layer v0.1 §21

export type ThrottleDecision = 'allow' | 'allow_with_warning' | 'defer' | 'reduce_scope' | 'batch_later' | 'require_human_review' | 'block';

export interface ThrottleRecord {
    throttleDecisionId: string; requestedAction: string;
    reason: string; decision: ThrottleDecision;
    safeReplacement: string | undefined; status: 'active';
    createdAt: string;
}

let thCounter = 0;

export function createThrottleRecord(params: {
    requestedAction: string; reason: string; decision: ThrottleDecision;
    safeReplacement?: string;
}): ThrottleRecord {
    thCounter++;
    return {
        throttleDecisionId: `THROT_${String(thCounter).padStart(6, '0')}`,
        requestedAction: params.requestedAction, reason: params.reason,
        decision: params.decision, safeReplacement: params.safeReplacement,
        status: 'active', createdAt: new Date().toISOString(),
    };
}

export function isBlocked(decision: ThrottleDecision): boolean {
    return decision === 'block';
}

export function requiresHumanReview(decision: ThrottleDecision): boolean {
    return decision === 'require_human_review';
}

export function isDeferred(decision: ThrottleDecision): boolean {
    return decision === 'defer' || decision === 'batch_later';
}