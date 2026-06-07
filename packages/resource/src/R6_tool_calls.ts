// @cohbit/resource — R6 Tool Call Budget Layer
// Controls how many tool calls can be made per workflow or session.
// Spec: Noetican Resource Layer v0.1 §10

export interface ToolCallBudget {
    toolCallBudgetId: string; sessionId: string;
    allowedToolCalls: number; usedToolCalls: number;
    throttlePolicy: string; priorityOrder: string[];
    status: 'active' | 'exhausted' | 'throttled'; createdAt: string;
}

const SAFETY_CRITICAL_PRIORITY = ['CTRL_status', 'receipt_freshness', 'repair_blockers', 'export_overclaim', 'schema_validity', 'retrieval_guard'];

let tcCounter = 0;

export function createToolCallBudget(params: { sessionId: string; allowedToolCalls: number; throttlePolicy?: string }): ToolCallBudget {
    tcCounter++;
    return {
        toolCallBudgetId: `TCBUD_${String(tcCounter).padStart(6, '0')}`,
        sessionId: params.sessionId, allowedToolCalls: params.allowedToolCalls,
        usedToolCalls: 0, throttlePolicy: params.throttlePolicy ?? 'prioritize_safety_checks',
        priorityOrder: SAFETY_CRITICAL_PRIORITY, status: 'active',
        createdAt: new Date().toISOString(),
    };
}

export function recordToolCall(budget: ToolCallBudget): ToolCallBudget {
    budget.usedToolCalls++;
    if (budget.usedToolCalls >= budget.allowedToolCalls) budget.status = 'exhausted';
    return budget;
}

export function isExhausted(budget: ToolCallBudget): boolean { return budget.status === 'exhausted'; }
export function remainingCalls(budget: ToolCallBudget): number { return Math.max(0, budget.allowedToolCalls - budget.usedToolCalls); }